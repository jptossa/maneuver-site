import { formatDuration } from "@/lib/aggregate";
import { formatCalories } from "@/lib/calories";
import type { Summary } from "@/lib/types";
import { formatDistance, type UnitSystem } from "@/lib/units";

export default function SummaryCards({
  summary,
  units,
  calories,
}: {
  summary: Summary;
  units: UnitSystem;
  /** Estimated kcal for the period; omit to hide the card, null when weight isn't set. */
  calories?: number | null;
}) {
  const items = [
    ["Total time", formatDuration(summary.totalMin)],
    ["Distance", formatDistance(summary.totalKm, units)],
    ["Sessions", String(summary.sessions)],
    ["Active days", String(summary.activeDays)],
    ...(calories === undefined
      ? []
      : [["Calories (est.)", calories === null ? "Set your weight" : formatCalories(calories)]]),
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
