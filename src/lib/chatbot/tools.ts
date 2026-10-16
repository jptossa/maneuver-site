import type Anthropic from "@anthropic-ai/sdk";
import { addDays, format, parseISO, subDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { parseActivityInput, type RawInput } from "@/lib/activity-input";
import {
  ActivityNotFoundError,
  completeActivity,
  createActivity,
  getActivities,
  getActivity,
} from "@/lib/data";
import {
  ACTIVITY_TYPES,
  type ActivityStatus,
} from "@/lib/types";
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
  distance_km: {
    type: "number",
    description: "Kilometres. Omit if unknown; never guess.",
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

async function history(input: Record<string, unknown>): Promise<ToolOutcome> {
  const from = asString(input.from);
  const to = asString(input.to);
  if (!ISO_DATE.test(from) || !ISO_DATE.test(to) || from > to) {
    return fail("from and to must be yyyy-MM-dd dates with from <= to.");
  }
  const status = input.status;
  if (status !== undefined && status !== "completed" && status !== "planned" && status !== "all") {
    return fail('status must be "completed", "planned" or "all".');
  }

  return { content: await describeRange(from, to, status ?? "completed") };
}

/** JSON digest of the user's activities in a range: totals per status+type and the latest entries. */
async function describeRange(
  from: string,
  to: string,
  status: ActivityStatus | "all",
): Promise<string> {
  const rows = await getActivities({ from, to, status });

  const byType: Record<string, { sessions: number; minutes: number; km: number }> = {};
  for (const a of rows) {
    const t = (byType[`${a.status}:${a.type}`] ??= { sessions: 0, minutes: 0, km: 0 });
    t.sessions += 1;
    t.minutes += a.durationMin;
    t.km += a.distanceKm ?? 0;
  }

  const recent = rows.slice(-LIMITS.historyRows);
  return JSON.stringify({
    range: { from, to },
    totalEntries: rows.length,
    showingMostRecent: recent.length,
    totalsByStatusAndType: byType,
    activities: recent.map((a) => ({
      // Only planned entries expose an id: it is what complete_planned_activity takes.
      ...(a.status === "planned" && { id: a.id }),
      date: a.date,
      // Computed here: models are unreliable at date -> weekday arithmetic.
      weekday: format(parseISO(a.date), "EEEE"),
      type: a.type,
      status: a.status,
      minutes: a.durationMin,
      km: a.distanceKm,
      notes: a.notes,
    })),
  });
}

/**
 * Snapshot of the last 30 days (completed) and next 30 days (planned), loaded on
 * every signed-in request so the model never has to remember to look. Returns
 * null if the lookup fails, so the prompt can say history is unavailable instead
 * of letting the model guess.
 */
export async function loadHistorySnapshot(today: Date): Promise<string | null> {
  const iso = (d: Date) => format(d, "yyyy-MM-dd");
  try {
    return await describeRange(iso(subDays(today, 30)), iso(addDays(today, 30)), "all");
  } catch (e) {
    console.error("chatbot history snapshot failed", e);
    return null;
  }
}

async function write(
  status: ActivityStatus,
  input: Record<string, unknown>,
  today: Date,
): Promise<ToolOutcome> {
  const raw: RawInput = {
    date: asString(input.date),
    type: asString(input.type),
    durationMin: asString(input.duration_min),
    distanceKm: asString(input.distance_km),
    notes: asString(input.notes),
  };
  // Same rules as the forms, so the assistant can't save anything a user couldn't.
  const result = parseActivityInput(raw, today, status);
  if (!result.ok) {
    return fail(`Not saved. ${Object.values(result.errors).join(" ")}`);
  }

  await createActivity(result.value);
  revalidatePath("/activity");
  revalidatePath("/charts");
  const v = result.value;
  return {
    content: `Saved as ${status}: ${v.type}, ${v.durationMin} min${v.distanceKm !== null ? `, ${v.distanceKm} km` : ""} on ${v.date}.`,
    wrote: true,
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function complete(
  input: Record<string, unknown>,
  today: Date,
): Promise<ToolOutcome> {
  const id = asString(input.id);
  // Checked here so a made-up id is a clean error, not a database type error.
  if (!UUID.test(id)) {
    return fail("id must be the id of a planned entry from the history data.");
  }

  try {
    const planned = await getActivity(id);
    if (!planned || planned.status !== "planned") throw new ActivityNotFoundError();
    const date = await completeActivity(id, format(today, "yyyy-MM-dd"));
    revalidatePath("/activity");
    revalidatePath("/charts");
    return {
      content: `Marked done: ${planned.type}, ${planned.durationMin} min${planned.distanceKm !== null ? `, ${planned.distanceKm} km` : ""}, now recorded on ${date} (${format(parseISO(date), "EEEE")}).`,
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
): Promise<ToolOutcome> {
  const args =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};
  try {
    switch (name) {
      case "get_activity_history":
        return await history(args);
      case "log_activity":
        return await write("completed", args, today);
      case "plan_activity":
        return await write("planned", args, today);
      case "complete_planned_activity":
        return await complete(args, today);
      default:
        return fail(`Unknown tool: ${name}`);
    }
  } catch (e) {
    console.error(`chatbot tool ${name} failed`, e);
    return fail("That didn't work on our end. Please try again in a moment.");
  }
}
