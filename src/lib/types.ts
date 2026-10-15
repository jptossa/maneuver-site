// Keep in sync with the CHECK constraint in supabase/migrations/0001_activities.sql.
export const ACTIVITY_TYPES = [
  "walking",
  "running",
  "cycling",
  "hiking",
  "swimming",
  "commuting",
  "strength",
  "yoga",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const TIMESCALES = ["day", "week", "month", "year"] as const;
export type Timescale = (typeof TIMESCALES)[number];

export const METRICS = ["minutes", "distance", "sessions"] as const;
export type Metric = (typeof METRICS)[number];

/** Mirrors a future Supabase `activities` row (minus user_id). */
export interface Activity {
  id: string;
  /** ISO date, yyyy-MM-dd */
  date: string;
  type: ActivityType;
  durationMin: number;
  distanceKm: number | null;
  notes?: string;
}

/** Fields a user supplies when logging an activity (an Activity minus its id). */
export interface ActivityInput {
  date: string;
  type: ActivityType;
  durationMin: number;
  distanceKm: number | null;
  notes: string | null;
}

export interface Bucket {
  key: string;
  label: string;
  /** ISO date of first day covered */
  start: string;
  /** ISO date of last day covered */
  end: string;
  totalMin: number;
  totalKm: number;
  sessions: number;
  /** Value of the requested metric per activity type */
  byType: Record<ActivityType, number>;
}

export interface Summary {
  totalMin: number;
  totalKm: number;
  sessions: number;
  activeDays: number;
}

export interface Period {
  scale: Timescale;
  /** ISO date of the anchor day (clamped input) */
  date: string;
  start: string;
  end: string;
  label: string;
  prevDate: string;
  nextDate: string;
  isCurrent: boolean;
  /** false when the next period would start in the future */
  hasNext: boolean;
}
