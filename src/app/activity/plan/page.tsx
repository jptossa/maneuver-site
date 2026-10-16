import { format } from "date-fns";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { createPlannedActivityAction } from "@/app/activity/actions";
import ActivityForm from "@/components/ActivityForm";
import { buildHref } from "@/lib/href";
import { parseDate } from "@/lib/period";
import { getUnits } from "@/lib/preferences";
import { distanceUnit } from "@/lib/units";

export const metadata: Metadata = { title: "Plan workout · Maneuver" };

async function NewPlannedForm({ searchParams }: PageProps<"/activity/plan">) {
  const sp = await searchParams;
  await connection(); // "today" is request-time data
  const today = new Date();
  const todayIso = format(today, "yyyy-MM-dd");
  // Prefill from ?date=, but never with a past date.
  const requested = format(parseDate(sp.date, today), "yyyy-MM-dd");
  const date = requested < todayIso ? todayIso : requested;

  return (
    <ActivityForm
      action={createPlannedActivityAction}
      initial={{ date }}
      minDate={todayIso}
      cancelHref={buildHref("/activity", { scale: "day", date })}
      submitLabel="Plan workout"
      unit={distanceUnit(await getUnits())}
    />
  );
}

export default function PlanWorkoutPage(props: PageProps<"/activity/plan">) {
  return (
    <>
      <h1>Plan workout</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <NewPlannedForm {...props} />
      </Suspense>
    </>
  );
}
