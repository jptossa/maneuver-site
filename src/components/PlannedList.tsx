import Link from "next/link";
import {
  completeActivityAction,
  deleteActivityAction,
} from "@/app/activity/actions";
import DeleteActivityButton from "@/components/DeleteActivityButton";
import { activityLabel } from "@/lib/activity-catalog";
import { formatDuration } from "@/lib/aggregate";
import type { Activity } from "@/lib/types";
import { formatDistance, type UnitSystem } from "@/lib/units";

/** Planned workouts in the viewed period. Renders nothing when there are none. */
export default function PlannedList({
  planned,
  todayIso,
  units,
}: {
  planned: Activity[];
  units: UnitSystem;
  /** Today, yyyy-MM-dd — plans dated before it are shown as overdue */
  todayIso: string;
}) {
  if (planned.length === 0) return null;

  return (
    <>
      <h2>Planned</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
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
          {planned.map((a) => (
            <tr key={a.id}>
              <td>
                {a.date}
                {a.date < todayIso && " (overdue)"}
              </td>
              <td>{activityLabel(a.type)}</td>
              <td>{formatDuration(a.durationMin)}</td>
              <td>
                {a.distanceKm === null
                  ? "—"
                  : formatDistance(a.distanceKm, units)}
              </td>
              <td>{a.notes ?? ""}</td>
              <td>
                <form action={completeActivityAction.bind(null, a.id)}>
                  <input type="hidden" name="date" value={a.date} />
                  <button type="submit">Mark done</button>
                </form>
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
    </>
  );
}
