import { formatDuration } from "@/lib/aggregate";
import type { Summary } from "@/lib/types";

export default function SummaryCards({ summary }: { summary: Summary }) {
  const items = [
    ["Total time", formatDuration(summary.totalMin)],
    ["Distance", `${summary.totalKm} km`],
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
