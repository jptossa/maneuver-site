import type Anthropic from "@anthropic-ai/sdk";
import { addDays, format, parseISO, subDays } from "date-fns";
import { parseActivityInput, type RawInput } from "@/lib/activity-input";
import { ActivityNotFoundError } from "@/lib/activity-errors";
import type * as data from "@/lib/data";
import { estimateCalories } from "@/lib/calories";
import { guidelineProgress } from "@/lib/guidelines";
import { intensityOf, metEntry } from "@/lib/met";
import {
  ACTIVITY_TYPES,
  type Activity,
  type ActivityStatus,
} from "@/lib/types";
import {
  displayDistance,
  distanceUnit,
  formatDistance,
  parseDistanceUnit,
  type UnitSystem,
} from "@/lib/units";
import { LIMITS } from "./config";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const activityProperties = {
  date: {
    type: "string",
    description: "Date as yyyy-MM-dd.",
  },
  type: { type: "string", enum: [...ACTIVITY_TYPES] },
  duration_min: {
    type: "integer",
    description: "Whole minutes, 1 to 1440.",
  },
  distance: {
    type: "number",
    description: "Distance, in distance_unit. Omit if unknown; never guess.",
  },
  distance_unit: {
    type: "string",
    enum: ["mi", "km"],
    description:
      "The unit the user stated the distance in. Omit to use their preferred unit. Never convert distances yourself.",
  },
  notes: { type: "string", description: "Optional short note." },
} as const;

/** Tools offered to signed-in users only. Names double as the dispatch keys below. */
export const SIGNED_IN_TOOLS: Anthropic.Tool[] = [
  {
    name: "get_activity_history",
    description:
      "Read the user's own activities between two dates (inclusive). Returns totals per activity type plus the most recent individual entries.",
    input_schema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Start date, yyyy-MM-dd." },
        to: { type: "string", description: "End date, yyyy-MM-dd." },
        status: {
          type: "string",
          enum: ["completed", "planned", "all"],
          description: "Defaults to completed.",
        },
      },
      required: ["from", "to"],
    },
  },
  {
    name: "log_activity",
    description:
      "Record an activity the user has already done. The date must be today or earlier.",
    input_schema: {
      type: "object",
      properties: activityProperties,
      required: ["date", "type", "duration_min"],
    },
  },
  {
    name: "plan_activity",
    description:
      "Schedule an activity the user intends to do. The date must be today or later.",
    input_schema: {
      type: "object",
      properties: activityProperties,
      required: ["date", "type", "duration_min"],
    },
  },
  {
    name: "complete_planned_activity",
    description:
      "Mark one of the user's planned activities as done, keeping its planned type, duration and distance. Its date stays the same unless it is still in the future, in which case it moves to today. Use the id of a planned entry from the history data; never guess an id.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The id of a planned entry." },
      },
      required: ["id"],
    },
  },
];

/**
 * What the tools need from the outside world. The app uses live-env.ts (Supabase
 * via data.ts); the eval script passes an in-memory store, so the same tool code
 * runs against fake data.
 */
export interface ToolEnv {
  store: Pick<
    typeof data,
    "getActivities" | "getActivity" | "createActivity" | "completeActivity"
  >;
  /** Called after any write, e.g. to refresh cached pages. */
  onWrite: () => void;
}

export interface ToolOutcome {
  content: string;
  isError?: boolean;
  /** True when the user's data was changed. */
  wrote?: boolean;
}

function asString(v: unknown): string {
  return typeof v === "string" || typeof v === "number" ? String(v) : "";
}

function fail(message: string): ToolOutcome {
  return { content: message, isError: true };
}

async function history(
  env: ToolEnv,
  input: Record<string, unknown>,
  units: UnitSystem,
  weightKg: number | null,
): Promise<ToolOutcome> {
  const from = asString(input.from);
  const to = asString(input.to);
  if (!ISO_DATE.test(from) || !ISO_DATE.test(to) || from > to) {
    return fail("from and to must be yyyy-MM-dd dates with from <= to.");
  }
  const status = input.status;
  if (status !== undefined && status !== "completed" && status !== "planned" && status !== "all") {
    return fail('status must be "completed", "planned" or "all".');
  }

  const rows = await env.store.getActivities({ from, to, status: status ?? "completed" });
  return { content: JSON.stringify(digest(rows, from, to, units, weightKg)) };
}

/**
 * Digest of the user's activities in a range: totals per status+type and the latest entries.
 * Distances are in the user's preferred unit (`distanceUnit`), never raw km. Calories are
 * Compendium-based estimates and only present when the user has set their weight.
 */
function digest(
  rows: Activity[],
  from: string,
  to: string,
  units: UnitSystem,
  weightKg: number | null,
) {
  // Sum in km (storage unit), convert once at the end to avoid compounding rounding.
  const totals: Record<
    string,
    { sessions: number; minutes: number; km: number; kcal: number }
  > = {};
  for (const a of rows) {
    const t = (totals[`${a.status}:${a.type}`] ??= { sessions: 0, minutes: 0, km: 0, kcal: 0 });
    t.sessions += 1;
    t.minutes += a.durationMin;
    t.km += a.distanceKm ?? 0;
    t.kcal += estimateCalories(a, weightKg) ?? 0;
  }
  const byType = Object.fromEntries(
    Object.entries(totals).map(([key, t]) => [
      key,
      {
        sessions: t.sessions,
        minutes: t.minutes,
        distance: displayDistance(t.km, units),
        ...(weightKg !== null && { estimatedKcal: t.kcal }),
      },
    ]),
  );

  const recent = rows.slice(-LIMITS.historyRows);
  return {
    range: { from, to },
    distanceUnit: distanceUnit(units),
    // False means no calorie figures are included: tell the user to set their weight, don't guess.
    weightKnown: weightKg !== null,
    totalEntries: rows.length,
    showingMostRecent: recent.length,
    totalsByStatusAndType: byType,
    activities: recent.map((a) => {
      const met = metEntry(a.type, a.durationMin, a.distanceKm);
      return {
        // Only planned entries expose an id: it is what complete_planned_activity takes.
        ...(a.status === "planned" && { id: a.id }),
        date: a.date,
        // Computed here: models are unreliable at date -> weekday arithmetic.
        weekday: format(parseISO(a.date), "EEEE"),
        type: a.type,
        status: a.status,
        minutes: a.durationMin,
        distance: a.distanceKm === null ? null : displayDistance(a.distanceKm, units),
        ...(met && { intensity: intensityOf(met.met) }),
        ...(weightKg !== null && { estimatedKcal: estimateCalories(a, weightKg) }),
        notes: a.notes,
      };
    }),
  };
}

/**
 * Snapshot of the last 30 days (completed) and next 30 days (planned), loaded on
 * every signed-in request so the model never has to remember to look. Returns
 * null if the lookup fails, so the prompt can say history is unavailable instead
 * of letting the model guess.
 */
export async function loadHistorySnapshot(
  today: Date,
  env: ToolEnv,
  units: UnitSystem,
  weightKg: number | null,
): Promise<string | null> {
  const iso = (d: Date) => format(d, "yyyy-MM-dd");
  try {
    const from = iso(subDays(today, 30));
    const to = iso(addDays(today, 30));
    const rows = await env.store.getActivities({ from, to, status: "all" });
    // Weekly-target progress is counted here (the model is bad at arithmetic): completed
    // activity from the last 7 days including today.
    const weekFrom = iso(subDays(today, 6));
    const weekTo = iso(today);
    const week = rows.filter(
      (a) => a.status === "completed" && a.date >= weekFrom && a.date <= weekTo,
    );
    return JSON.stringify({
      ...digest(rows, from, to, units, weightKg),
      last7Days: { from: weekFrom, to: weekTo, ...guidelineProgress(week) },
    });
  } catch (e) {
    console.error("chatbot history snapshot failed", e);
    return null;
  }
}

async function write(
  env: ToolEnv,
  status: ActivityStatus,
  input: Record<string, unknown>,
  today: Date,
  units: UnitSystem,
): Promise<ToolOutcome> {
  // The model passes the unit the user stated; otherwise their preferred unit applies.
  let unit = distanceUnit(units);
  if (input.distance_unit !== undefined) {
    const stated = parseDistanceUnit(input.distance_unit);
    if (!stated) return fail('distance_unit must be "mi" or "km".');
    unit = stated;
  }
  const raw: RawInput = {
    date: asString(input.date),
    type: asString(input.type),
    durationMin: asString(input.duration_min),
    distance: asString(input.distance),
    notes: asString(input.notes),
  };
  // Same rules as the forms, so the assistant can't save anything a user couldn't.
  const result = parseActivityInput(raw, today, status, unit);
  if (!result.ok) {
    return fail(`Not saved. ${Object.values(result.errors).join(" ")}`);
  }

  await env.store.createActivity(result.value);
  env.onWrite();
  const v = result.value;
  return {
    content: `Saved as ${status}: ${v.type}, ${v.durationMin} min${v.distanceKm !== null ? `, ${formatDistance(v.distanceKm, units)}` : ""} on ${v.date}.`,
    wrote: true,
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function complete(
  env: ToolEnv,
  input: Record<string, unknown>,
  today: Date,
  units: UnitSystem,
): Promise<ToolOutcome> {
  const id = asString(input.id);
  // Checked here so a made-up id is a clean error, not a database type error.
  if (!UUID.test(id)) {
    return fail("id must be the id of a planned entry from the history data.");
  }

  try {
    const planned = await env.store.getActivity(id);
    if (!planned || planned.status !== "planned") throw new ActivityNotFoundError();
    const date = await env.store.completeActivity(id, format(today, "yyyy-MM-dd"));
    env.onWrite();
    return {
      content: `Marked done: ${planned.type}, ${planned.durationMin} min${planned.distanceKm !== null ? `, ${formatDistance(planned.distanceKm, units)}` : ""}, now recorded on ${date} (${format(parseISO(date), "EEEE")}).`,
      wrote: true,
    };
  } catch (e) {
    if (e instanceof ActivityNotFoundError) {
      return fail(
        "No planned activity with that id. It may already be completed or deleted.",
      );
    }
    throw e;
  }
}

/** Runs one tool call from the model. Never throws for bad input; errors go back to the model. */
export async function runTool(
  name: string,
  input: unknown,
  today: Date,
  env: ToolEnv,
  units: UnitSystem,
  weightKg: number | null,
): Promise<ToolOutcome> {
  const args =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};
  try {
    switch (name) {
      case "get_activity_history":
        return await history(env, args, units, weightKg);
      case "log_activity":
        return await write(env, "completed", args, today, units);
      case "plan_activity":
        return await write(env, "planned", args, today, units);
      case "complete_planned_activity":
        return await complete(env, args, today, units);
      default:
        return fail(`Unknown tool: ${name}`);
    }
  } catch (e) {
    console.error(`chatbot tool ${name} failed`, e);
    return fail("That didn't work on our end. Please try again in a moment.");
  }
}
