import type Anthropic from "@anthropic-ai/sdk";
import { addDays, format, parseISO, subDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { parseActivityInput, type RawInput } from "@/lib/activity-input";
import { createActivity, getActivities } from "@/lib/data";
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
      default:
        return fail(`Unknown tool: ${name}`);
    }
  } catch (e) {
    console.error(`chatbot tool ${name} failed`, e);
    return fail("That didn't work on our end. Please try again in a moment.");
  }
}
