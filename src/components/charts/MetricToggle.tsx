import Link from "next/link";
import { buildHref } from "@/lib/href";
import { capitalize } from "@/lib/aggregate";
import { METRICS, type Grouping, type Metric, type Timescale } from "@/lib/types";

export default function MetricToggle({
  path,
  scale,
  date,
  metric,
  by,
}: {
  path: string;
  scale: Timescale;
  date: string;
  metric: Metric;
  by?: Grouping;
}) {
  return (
    <nav aria-label="Metric">
      <ul>
        {METRICS.map((m) => (
          <li key={m}>
            <Link
              href={buildHref(path, { scale, date, metric: m, by })}
              aria-current={m === metric ? "true" : undefined}
            >
              {m === metric ? <strong>{capitalize(m)}</strong> : capitalize(m)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
