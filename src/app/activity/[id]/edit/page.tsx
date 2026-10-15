import { format } from "date-fns";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { updateActivityAction } from "@/app/activity/actions";
import ActivityForm from "@/components/ActivityForm";
import { getActivity } from "@/lib/data";
import { buildHref } from "@/lib/href";

export const metadata: Metadata = { title: "Edit activity · Maneuver" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function EditActivityForm({ params }: PageProps<"/activity/[id]/edit">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  await connection(); // "today" is request-time data

  // RLS hides other users' rows, so someone else's id looks the same as a missing one.
  const activity = await getActivity(id);
  if (!activity) notFound();

  const todayIso = format(new Date(), "yyyy-MM-dd");
  const planned = activity.status === "planned";

  return (
    <>
      <h1>{planned ? "Edit planned workout" : "Edit activity"}</h1>
      <ActivityForm
        action={updateActivityAction.bind(null, id, activity.status)}
        initial={{
          date: activity.date,
          type: activity.type,
          durationMin: String(activity.durationMin),
          distanceKm:
            activity.distanceKm === null ? "" : String(activity.distanceKm),
          notes: activity.notes ?? "",
        }}
        minDate={planned ? todayIso : undefined}
        maxDate={planned ? undefined : todayIso}
        cancelHref={buildHref("/activity", {
          scale: "day",
          date: activity.date,
        })}
        submitLabel="Save changes"
      />
    </>
  );
}

export default function EditActivityPage(
  props: PageProps<"/activity/[id]/edit">,
) {
  return (
    <Suspense fallback={<h1>Edit activity</h1>}>
      <EditActivityForm {...props} />
    </Suspense>
  );
}
