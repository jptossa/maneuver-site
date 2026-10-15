import { format } from "date-fns";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import ActivityList from "@/components/ActivityList";
import PeriodNav from "@/components/PeriodNav";
import SummaryCards from "@/components/SummaryCards";
import TimescaleTabs from "@/components/TimescaleTabs";
import { bucketActivities, summarize } from "@/lib/aggregate";
import { loadSampleData } from "@/app/activity/actions";
import { getActivities, hasAnyActivity } from "@/lib/data";
import { buildHref } from "@/lib/href";
import { parseDate, parseScale, resolvePeriod } from "@/lib/period";

export const metadata: Metadata = { title: "Activity · Maneuver" };

async function ActivityView({ searchParams }: PageProps<"/activity">) {
  const sp = await searchParams;
  await connection(); // "today" is request-time data
  const today = new Date();
  const scale = parseScale(sp.scale);
  const period = resolvePeriod(scale, parseDate(sp.date, today), today);
  const activities = await getActivities({
    from: period.start,
    to: period.end,
  });
  const buckets = bucketActivities(activities, period, "minutes");
  // Only offer sample data to accounts with no history at all, not for every empty period.
  const showSampleData = activities.length === 0 && !(await hasAnyActivity());

  // Prefill the "Log activity" form with the viewed day, but never a future date.
  const todayIso = format(today, "yyyy-MM-dd");
  const logDate = period.date > todayIso ? todayIso : period.date;

  return (
    <>
      <p>
        <Link href={buildHref("/activity/new", { date: logDate })}>
          Log activity
        </Link>
      </p>
      <TimescaleTabs path="/activity" scale={scale} date={period.date} />
      <PeriodNav path="/activity" period={period} />
      <SummaryCards summary={summarize(activities)} />
      <ActivityList
        period={period}
        activities={activities}
        buckets={buckets}
      />
      {showSampleData && (
        <form action={loadSampleData}>
          <p>
            You haven&apos;t logged any activity yet. Want to see how Maneuver
            looks with some sample data?
          </p>
          <button type="submit">Load sample data</button>
        </form>
      )}
    </>
  );
}

export default function ActivityPage(props: PageProps<"/activity">) {
  return (
    <>
      <h1>Activity</h1>
      <Suspense fallback={<p>Loading activity…</p>}>
        <ActivityView {...props} />
      </Suspense>
    </>
  );
}
