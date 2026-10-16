import { ACTIVITY_CATALOG, type CatalogType } from "./activity-catalog";

// Derived from ACTIVITY_CATALOG; keep the CHECK constraint in supabase/migrations in sync
// (latest: 0004_activity_types_expand.sql).
export const ACTIVITY_TYPES = Object.keys(ACTIVITY_CATALOG) as ActivityType[];
export type ActivityType = CatalogType;

// Keep in sync with the CHECK constraint in supabase/migrations/0003_activities_status.sql.
export const ACTIVITY_STATUSES = ["planned", "completed"] as const;
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];

export const TIMESCALES =["day", "week", "month", "year"] as const;
export type Timescale = (typeof TIMESCALES)[number];

/** How /charts series are grouped: one per activity type, or rolled up to its group. */
export const GROUPINGS = ["type", "group"] as const;
export type Grouping = (typeof GROUPINGS)[number];

export const METRICS =["minutes", "distance", "sessions", "calories"] as const;
export type Metric = (typeof METRICS)[number];

/** Mirrors a future Supabase `activities` row (minus user_id). */
export interface Activity {
  id: string;
  /** ISO date, yyyy-MM-dd */
  date: string;
  type: ActivityType;
  status: ActivityStatus;
  durationMin: number;
  distanceKm: number | null;
  notes?: string;
}

/** Fields a user supplies when logging or planning an activity (an Activity minus its id). */
export interface ActivityInput {
  date: string;
  type: ActivityType;
  status: ActivityStatus;
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
