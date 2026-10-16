import { randomUUID } from "node:crypto";
import { addDays, format } from "date-fns";
import { ActivityNotFoundError } from "@/lib/activity-errors";
import type { ToolEnv } from "@/lib/chatbot/tools";
import type {
  Activity,
  ActivityInput,
  ActivityStatus,
  ActivityType,
} from "@/lib/types";

/**
 * Fixed "today" for every eval run: Wednesday 2026-10-14. Seed data and expected
 * answers are relative to it, so results don't depend on the real date.
 */
export const TODAY = new Date(2026, 9, 14, 12, 0, 0);
export const iso = (d: Date) => format(d, "yyyy-MM-dd");
export const dayOffset = (n: number) => iso(addDays(TODAY, n));

/**
 * In-memory stand-in for src/lib/data.ts. It copies the behaviours the tools rely
 * on (date-range filter, "completed" by default, ActivityNotFoundError, a completed
 * date never in the future) but is not the real thing: it checks the assistant, not
 * Supabase.
 */
export class MemoryStore {
  rows: Activity[];

  constructor(rows: Activity[]) {
    this.rows = rows.map((r) => ({ ...r }));
  }

  snapshot(): Activity[] {
    return this.rows.map((r) => ({ ...r }));
  }

  env(): ToolEnv {
    return {
      store: {
        getActivities: async ({ from, to, status }) => {
          const wanted = status ?? "completed";
          return this.rows
            .filter(
              (r) =>
                r.date >= from &&
                r.date <= to &&
                (wanted === "all" || r.status === wanted),
            )
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((r) => ({ ...r }));
        },
        getActivity: async (id) => {
          const row = this.rows.find((r) => r.id === id);
          return row ? { ...row } : null;
        },
        createActivity: async (input: ActivityInput) => {
          this.rows.push({
            id: randomUUID(),
            date: input.date,
            type: input.type,
            status: input.status,
            durationMin: input.durationMin,
            distanceKm: input.distanceKm,
            notes: input.notes ?? undefined,
          });
        },
        completeActivity: async (id, todayIso) => {
          const row = this.rows.find((r) => r.id === id);
          if (!row || row.status !== "planned") throw new ActivityNotFoundError();
          if (row.date > todayIso) row.date = todayIso;
          row.status = "completed";
          return row.date;
        },
      },
      onWrite: () => {},
    };
  }
}

function row(
  status: ActivityStatus,
  offset: number,
  type: ActivityType,
  durationMin: number,
  distanceKm: number | null = null,
): Activity {
  return {
    id: randomUUID(),
    date: dayOffset(offset),
    type,
    status,
    durationMin,
    distanceKm,
  };
}

/** A believable month: lots of hiking and cycling, 4 yoga sessions, a few plans ahead. */
export function defaultSeed(): Activity[] {
  return [
    row("completed", -3, "hiking", 240, 12.5),
    row("completed", -12, "hiking", 180, 9),
    row("completed", -20, "hiking", 300, 15),
    row("completed", -5, "cycling", 60, 25),
    row("completed", -9, "cycling", 90, 40),
    row("completed", -2, "yoga", 30),
    row("completed", -7, "yoga", 45),
    row("completed", -14, "yoga", 30),
    row("completed", -21, "yoga", 60),
    row("completed", -1, "running", 35, 5),
    row("completed", -6, "running", 40, 6),
    row("completed", -15, "running", 30, 4.5),
    row("completed", -1, "walking", 25),
    row("completed", -4, "walking", 30),
    row("planned", 3, "hiking", 60), // Saturday 2026-10-17
    row("planned", 2, "yoga", 30), // Friday 2026-10-16
    row("planned", 1, "cycling", 45), // Thursday 2026-10-15
    row("planned", 4, "cycling", 90), // Sunday 2026-10-18 (second cycling plan: ambiguous)
  ];
}
