import {
  eachDayOfInterval,
  eachMonthOfInterval,
  format,
  parseISO,
} from "date-fns";
import {
  ACTIVITY_CATALOG,
  ACTIVITY_GROUPS,
  activityLabel,
  type ActivityGroup,
} from "./activity-catalog";
import {
  ACTIVITY_TYPES,
  type Activity,
  type ActivityType,
  type Bucket,
  type Metric,
  type Period,
  type Summary,
} from "./types";
import { kmToDisplay, type UnitSystem } from "./units";

/** Value of metric for one activity. Distance is returned in the user's display unit (storage is km). */
export function metricValue(
  a: Activity,
  metric: Metric,
  units: UnitSystem,
): number {
  switch (metric) {
    case "minutes":
      return a.durationMin;
    case "distance":
      return kmToDisplay(a.distanceKm ?? 0, units);
    case "sessions":
      return 1;
  }
}

function emptyByType(): Record<ActivityType, number> {
  return Object.fromEntries(ACTIVITY_TYPES.map((t) => [t, 0])) as Record<
    ActivityType,
    number
  >;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function makeBucket(
  key: string,
  label: string,
  start: string,
  end: string,
  items: Activity[],
  metric: Metric,
  units: UnitSystem,
): Bucket {
  const byType = emptyByType();
  let totalMin = 0;
  let totalKm = 0;
  for (const a of items) {
    byType[a.type] = round1(byType[a.type] + metricValue(a, metric, units));
    totalMin += a.durationMin;
    totalKm += a.distanceKm ?? 0;
  }
  return {
    key,
    label,
    start,
    end,
    totalMin,
    totalKm: round1(totalKm),
    sessions: items.length,
    byType,
  };
}

/**
 * day   -> one bucket per activity
 * week  -> 7 daily buckets
 * month -> one bucket per day of the month
 * year  -> 12 monthly buckets
 * Empty days/months are included as zero buckets.
 */
export function bucketActivities(
  activities: Activity[],
  period: Period,
  metric: Metric,
  units: UnitSystem,
): Bucket[] {
  const start = parseISO(period.start);
  const end = parseISO(period.end);

  if (period.scale === "day") {
    return activities.map((a) =>
      makeBucket(a.id, activityLabel(a.type), a.date, a.date, [a], metric, units),
    );
  }

  if (period.scale === "year") {
    return eachMonthOfInterval({ start, end }).map((m) => {
      const key = format(m, "yyyy-MM");
      const items = activities.filter((a) => a.date.startsWith(key));
      return makeBucket(
        key,
        format(m, "MMM"),
        `${key}-01`,
        `${key}-31`,
        items,
        metric,
        units,
      );
    });
  }

  const labelFmt = period.scale === "week" ? "EEE d" : "d";
  return eachDayOfInterval({ start, end }).map((d) => {
    const iso = format(d, "yyyy-MM-dd");
    const items = activities.filter((a) => a.date === iso);
    return makeBucket(iso, format(d, labelFmt), iso, iso, items, metric, units);
  });
}

export function summarize(activities: Activity[]): Summary {
  return {
    totalMin: activities.reduce((s, a) => s + a.durationMin, 0),
    totalKm: round1(activities.reduce((s, a) => s + (a.distanceKm ?? 0), 0)),
    sessions: activities.length,
    activeDays: new Set(activities.map((a) => a.date)).size,
  };
}

export function totalsByType(
  activities: Activity[],
  metric: Metric,
  units: UnitSystem,
): { type: ActivityType; value: number }[] {
  const byType = emptyByType();
  for (const a of activities) {
    byType[a.type] = round1(byType[a.type] + metricValue(a, metric, units));
  }
  return ACTIVITY_TYPES.map((type) => ({ type, value: byType[type] })).filter(
    (t) => t.value > 0,
  );
}

/** Sums a per-type breakdown into one value per activity group. */
export function rollUpByGroup(
  byType: Record<ActivityType, number>,
): Record<ActivityGroup, number> {
  const out = Object.fromEntries(ACTIVITY_GROUPS.map((g) => [g, 0])) as Record<
    ActivityGroup,
    number
  >;
  for (const t of ACTIVITY_TYPES) {
    const g = ACTIVITY_CATALOG[t].group;
    out[g] = round1(out[g] + byType[t]);
  }
  return out;
}

export function totalsByGroup(
  activities: Activity[],
  metric: Metric,
  units: UnitSystem,
): { group: ActivityGroup; value: number }[] {
  const byType = emptyByType();
  for (const a of activities) {
    byType[a.type] = round1(byType[a.type] + metricValue(a, metric, units));
  }
  const byGroup = rollUpByGroup(byType);
  return ACTIVITY_GROUPS.map((group) => ({ group, value: byGroup[group] })).filter(
    (g) => g.value > 0,
  );
}

export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
