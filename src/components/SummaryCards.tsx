import { formatDuration } from "@/lib/aggregate";
import type { Summary } from "@/lib/types";
import { formatDistance, type UnitSystem } from "@/lib/units";

export default function SummaryCards({
  summary,
  units,
}: {
  summary: Summary;
  units: UnitSystem;
}) {
  const items = [
    ["Total time", formatDuration(summary.totalMin)],
    ["Distance", formatDistance(summary.totalKm, units)],
    ["Sessions", String(summary.sessions)],
    ["Active days", String(summary.activeDays)],
  ];
  return (
    <dl>
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
