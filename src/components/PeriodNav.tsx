import Link from "next/link";
import { buildHref } from "@/lib/href";
import type { Metric, Period } from "@/lib/types";

export default function PeriodNav({
  path,
  period,
  metric,
}: {
  path: string;
  period: Period;
  metric?: Metric;
}) {
  const { scale } = period;
  return (
    <div>
      <Link href={buildHref(path, { scale, date: period.prevDate, metric })}>
        ← Previous
      </Link>{" "}
      <strong>{period.label}</strong>{" "}
      {period.hasNext ? (
        <Link href={buildHref(path, { scale, date: period.nextDate, metric })}>
          Next →
        </Link>
      ) : (
        <span aria-disabled="true">Next →</span>
      )}{" "}
      {!period.isCurrent && (
        <Link href={buildHref(path, { scale, metric })}>Today</Link>
      )}
    </div>
  );
}
