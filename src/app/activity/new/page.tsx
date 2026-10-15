import { format } from "date-fns";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { createActivityAction } from "@/app/activity/actions";
import ActivityForm from "@/components/ActivityForm";
import { buildHref } from "@/lib/href";
import { parseDate } from "@/lib/period";

export const metadata: Metadata = { title: "Log activity · Maneuver" };

async function NewActivityForm({ searchParams }: PageProps<"/activity/new">) {
  const sp = await searchParams;
  await connection(); // "today" is request-time data
  const today = new Date();
  const todayIso = format(today, "yyyy-MM-dd");
  // Prefill from ?date=, but never with a future date.
  const requested = format(parseDate(sp.date, today), "yyyy-MM-dd");
  const date = requested > todayIso ? todayIso : requested;

  return (
    <ActivityForm
      action={createActivityAction}
      initial={{ date }}
      maxDate={todayIso}
      cancelHref={buildHref("/activity", { scale: "day", date })}
      submitLabel="Log activity"
    />
  );
}

export default function NewActivityPage(props: PageProps<"/activity/new">) {
  return (
    <>
      <h1>Log activity</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <NewActivityForm {...props} />
      </Suspense>
    </>
  );
}
