import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import {
  METRICS,
  TIMESCALES,
  type Metric,
  type Period,
  type Timescale,
} from "./types";

const ISO = "yyyy-MM-dd";
const WEEK_OPTS = { weekStartsOn: 1 } as const; // Monday

export function parseScale(value: string | string[] | undefined): Timescale {
  const v = Array.isArray(value) ? value[0] : value;
  return TIMESCALES.find((s) => s === v) ?? "week";
}

export function parseMetric(value: string | string[] | undefined): Metric {
  const v = Array.isArray(value) ? value[0] : value;
  return METRICS.find((m) => m === v) ?? "minutes";
}

/** Invalid or missing input falls back to `today`. */
export function parseDate(
  value: string | string[] | undefined,
  today: Date,
): Date {
  const v = Array.isArray(value) ? value[0] : value;
  if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const d = parseISO(v);
    if (isValid(d)) return d;
  }
  return today;
}

export function resolvePeriod(
  scale: Timescale,
  anchor: Date,
  today: Date,
): Period {
  let start: Date, end: Date, prev: Date, next: Date, label: string;
  switch (scale) {
    case "day":
      start = end = anchor;
      prev = addDays(anchor, -1);
      next = addDays(anchor, 1);
      label = format(anchor, "EEEE, MMM d, yyyy");
      break;
    case "week":
      start = startOfWeek(anchor, WEEK_OPTS);
      end = endOfWeek(anchor, WEEK_OPTS);
      prev = addWeeks(anchor, -1);
      next = addWeeks(anchor, 1);
      label = `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
      break;
    case "month":
      start = startOfMonth(anchor);
      end = endOfMonth(anchor);
      prev = addMonths(anchor, -1);
      next = addMonths(anchor, 1);
      label = format(anchor, "MMMM yyyy");
      break;
    case "year":
      start = startOfYear(anchor);
      end = endOfYear(anchor);
      prev = addYears(anchor, -1);
      next = addYears(anchor, 1);
      label = format(anchor, "yyyy");
      break;
  }
  const todayIso = format(today, ISO);
  const startIso = format(start, ISO);
  const endIso = format(end, ISO);
  return {
    scale,
    date: format(anchor, ISO),
    start: startIso,
    end: endIso,
    label,
    prevDate: format(prev, ISO),
    nextDate: format(next, ISO),
    isCurrent: startIso <= todayIso && todayIso <= endIso,
    hasNext: endIso < todayIso,
  };
}
