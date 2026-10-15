import Link from "next/link";
import { buildHref } from "@/lib/href";
import { capitalize } from "@/lib/aggregate";
import { TIMESCALES, type Metric, type Timescale } from "@/lib/types";

export default function TimescaleTabs({
  path,
  scale,
  date,
  metric,
}: {
  path: string;
  scale: Timescale;
  date: string;
  metric?: Metric;
}) {
  return (
    <nav aria-label="Timescale">
      <ul>
        {TIMESCALES.map((s) => (
          <li key={s}>
            <Link
              href={buildHref(path, { scale: s, date, metric })}
              aria-current={s === scale ? "page" : undefined}
            >
              {s === scale ? <strong>{capitalize(s)}</strong> : capitalize(s)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
