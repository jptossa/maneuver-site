import Link from "next/link";
import { buildHref } from "@/lib/href";
import type { Grouping, Metric, Period } from "@/lib/types";

export default function PeriodNav({
  path,
  period,
  metric,
  by,
}: {
  path: string;
  period: Period;
  metric?: Metric;
  by?: Grouping;
}) {
  const { scale } = period;
  return (
    <div>
      <Link href={buildHref(path, { scale, date: period.prevDate, metric, by })}>
        ← Previous
      </Link>{" "}
      <strong>{period.label}</strong>{" "}
      {period.hasNext ? (
        <Link href={buildHref(path, { scale, date: period.nextDate, metric, by })}>
          Next →
        </Link>
      ) : (
        <span aria-disabled="true">Next →</span>
      )}{" "}
      {!period.isCurrent && (
        <Link href={buildHref(path, { scale, metric, by })}>Today</Link>
      )}
    </div>
  );
}
