import {
  eachDayOfInterval,
  eachMonthOfInterval,
  format,
  parseISO,
} from "date-fns";
import {
  ACTIVITY_TYPES,
  type Activity,
  type ActivityType,
  type Bucket,
  type Metric,
  type Period,
  type Summary,
} from "./types";

export function metricValue(a: Activity, metric: Metric): number {
  switch (metric) {
    case "minutes":
      return a.durationMin;
    case "distance":
      return a.distanceKm ?? 0;
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
): Bucket {
  const byType = emptyByType();
  let totalMin = 0;
  let totalKm = 0;
  for (const a of items) {
    byType[a.type] = round1(byType[a.type] + metricValue(a, metric));
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
): Bucket[] {
  const start = parseISO(period.start);
  const end = parseISO(period.end);

  if (period.scale === "day") {
    return activities.map((a) =>
      makeBucket(a.id, capitalize(a.type), a.date, a.date, [a], metric),
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
      );
    });
  }

  const labelFmt = period.scale === "week" ? "EEE d" : "d";
  return eachDayOfInterval({ start, end }).map((d) => {
    const iso = format(d, "yyyy-MM-dd");
    const items = activities.filter((a) => a.date === iso);
    return makeBucket(iso, format(d, labelFmt), iso, iso, items, metric);
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
): { type: ActivityType; value: number }[] {
  const byType = emptyByType();
  for (const a of activities) {
    byType[a.type] = round1(byType[a.type] + metricValue(a, metric));
  }
  return ACTIVITY_TYPES.map((type) => ({ type, value: byType[type] })).filter(
    (t) => t.value > 0,
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
