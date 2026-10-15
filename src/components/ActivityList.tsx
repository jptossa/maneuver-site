import Link from "next/link";
import { deleteActivityAction } from "@/app/activity/actions";
import DeleteActivityButton from "@/components/DeleteActivityButton";
import { buildHref } from "@/lib/href";
import { activityLabel } from "@/lib/activity-catalog";
import { formatDuration } from "@/lib/aggregate";
import type { Activity, Bucket, Period } from "@/lib/types";

/**
 * Day scale: individual activities.
 * Other scales: one row per bucket (day or month), linking to a drill-down.
 */
export default function ActivityList({
  period,
  activities,
  buckets,
}: {
  period: Period;
  activities: Activity[];
  buckets: Bucket[];
}) {
  if (activities.length === 0) {
    return <p>No activity recorded for this period.</p>;
  }

  if (period.scale === "day") {
    return (
      <table>
        <thead>
          <tr>
            <th>Activity</th>
            <th>Duration</th>
            <th>Distance</th>
            <th>Notes</th>
            <th>
              <span hidden>Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {activities.map((a) => (
            <tr key={a.id}>
              <td>{activityLabel(a.type)}</td>
              <td>{formatDuration(a.durationMin)}</td>
              <td>{a.distanceKm === null ? "—" : `${a.distanceKm} km`}</td>
              <td>{a.notes ?? ""}</td>
              <td>
                <Link href={`/activity/${a.id}/edit`}>Edit</Link>
                <DeleteActivityButton
                  action={deleteActivityAction.bind(null, a.id)}
                  date={a.date}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  const drillScale = period.scale === "year" ? "month" : "day";
  const rows = buckets.filter((b) => b.sessions > 0);
  return (
    <table>
      <thead>
        <tr>
          <th>{period.scale === "year" ? "Month" : "Day"}</th>
          <th>Sessions</th>
          <th>Time</th>
          <th>Distance</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((b) => (
          <tr key={b.key}>
            <td>
              <Link
                href={buildHref("/activity", {
                  scale: drillScale,
                  date: b.start,
                })}
              >
                {b.key.length === 7 ? b.label : b.key}
              </Link>
            </td>
            <td>{b.sessions}</td>
            <td>{formatDuration(b.totalMin)}</td>
            <td>{b.totalKm} km</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
