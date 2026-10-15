import Link from "next/link";
import { buildHref } from "@/lib/href";
import {
  GROUPINGS,
  type Grouping,
  type Metric,
  type Timescale,
} from "@/lib/types";

const LABELS: Record<Grouping, string> = {
  type: "By type",
  group: "By group",
};

export default function GroupingToggle({
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
  by: Grouping;
}) {
  return (
    <nav aria-label="Grouping">
      <ul>
        {GROUPINGS.map((g) => (
          <li key={g}>
            <Link
              href={buildHref(path, { scale, date, metric, by: g })}
              aria-current={g === by ? "true" : undefined}
            >
              {g === by ? <strong>{LABELS[g]}</strong> : LABELS[g]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
