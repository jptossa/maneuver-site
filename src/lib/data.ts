import { createClient } from "@/lib/supabase/server";
import type {
  Activity,
  ActivityInput,
  ActivityStatus,
  ActivityType,
} from "./types";

const COLUMNS = "id, date, type, status, duration_min, distance_km, notes";

/** Thrown when a row doesn't exist or isn't visible to the user (RLS). */
export class ActivityNotFoundError extends Error {
  constructor() {
    super("Activity not found.");
    this.name = "ActivityNotFoundError";
  }
}

function toRow(input: ActivityInput) {
  return {
    date: input.date,
    type: input.type,
    status: input.status,
    duration_min: input.durationMin,
    distance_km: input.distanceKm,
    notes: input.notes,
  };
}

interface ActivityRow {
  id: string;
  date: string;
  type: ActivityType;
  status: ActivityStatus;
  duration_min: number;
  distance_km: number | string | null;
  notes: string | null;
}

function toActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    status: row.status,
    durationMin: row.duration_min,
    distanceKm: row.distance_km === null ? null : Number(row.distance_km),
    notes: row.notes ?? undefined,
  };
}

/**
 * Single data-access seam: the signed-in user's activities in an inclusive
 * ISO date range (yyyy-MM-dd). Row Level Security scopes rows to the user.
 * `status` defaults to "completed" so stats and charts never include plans;
 * pass "planned" or "all" to see them.
 * Note: PostgREST caps responses at 1000 rows by default.
 */
export async function getActivities(range: {
  from: string;
  to: string;
  status?: ActivityStatus | "all";
}): Promise<Activity[]> {
  const supabase = await createClient();
  const status = range.status ?? "completed";
  let query = supabase
    .from("activities")
    .select(COLUMNS)
    .gte("date", range.from)
    .lte("date", range.to);
  if (status !== "all") query = query.eq("status", status);
  const { data, error } = await query.order("date").order("created_at");
  if (error) throw new Error(`Failed to load activities: ${error.message}`);
  return (data as ActivityRow[]).map(toActivity);
}

/** One of the signed-in user's activities, or null if it doesn't exist / isn't theirs. */
export async function getActivity(id: string): Promise<Activity | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activities")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load activity: ${error.message}`);
  return data ? toActivity(data as ActivityRow) : null;
}

/** Inserts an activity for the signed-in user (user_id defaults to auth.uid()). */
export async function createActivity(input: ActivityInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("activities").insert(toRow(input));
  if (error) throw new Error(`Failed to save activity: ${error.message}`);
}

export async function updateActivity(
  id: string,
  input: ActivityInput,
): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activities")
    .update(toRow(input))
    .eq("id", id)
    .select("id");
  if (error) throw new Error(`Failed to save activity: ${error.message}`);
  if (data.length === 0) throw new ActivityNotFoundError();
}

/**
 * Marks a planned activity as done and returns the date it now has. The date is
 * kept, unless it's still in the future, in which case it moves to `todayIso`
 * (yyyy-MM-dd).
 */
export async function completeActivity(
  id: string,
  todayIso: string,
): Promise<string> {
  const planned = await getActivity(id);
  if (!planned || planned.status !== "planned") throw new ActivityNotFoundError();

  const date = planned.date > todayIso ? todayIso : planned.date;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activities")
    .update({ status: "completed", date })
    .eq("id", id)
    .eq("status", "planned")
    .select("id");
  if (error) throw new Error(`Failed to complete activity: ${error.message}`);
  if (data.length === 0) throw new ActivityNotFoundError();
  return date;
}

export async function deleteActivity(id: string): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activities")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throw new Error(`Failed to delete activity: ${error.message}`);
  if (data.length === 0) throw new ActivityNotFoundError();
}

/** True if the signed-in user has logged anything at all (any period). */
export async function hasAnyActivity(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activities")
    .select("id")
    .limit(1);
  if (error) throw new Error(`Failed to load activities: ${error.message}`);
  return data.length > 0;
}
