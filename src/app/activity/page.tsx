import { format } from "date-fns";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import ActivityList from "@/components/ActivityList";
import PeriodNav from "@/components/PeriodNav";
import PlannedList from "@/components/PlannedList";
import SummaryCards from "@/components/SummaryCards";
import TimescaleTabs from "@/components/TimescaleTabs";
import { bucketActivities, summarize } from "@/lib/aggregate";
import { loadSampleData } from "@/app/activity/actions";
import { getActivities, hasAnyActivity } from "@/lib/data";
import { buildHref } from "@/lib/href";
import { parseDate, parseScale, resolvePeriod } from "@/lib/period";
import { totalCalories } from "@/lib/calories";
import { getUnits, getWeightKg } from "@/lib/preferences";

export const metadata: Metadata = { title: "Activity · Maneuver" };

async function ActivityView({ searchParams }: PageProps<"/activity">) {
  const sp = await searchParams;
  await connection(); // "today" is request-time data
  const today = new Date();
  const scale = parseScale(sp.scale);
  const period = resolvePeriod(scale, parseDate(sp.date, today), today, {
    allowFuture: true,
  });
  const all = await getActivities({
    from: period.start,
    to: period.end,
    status: "all",
  });
  // Planned workouts are listed separately and never counted in stats.
  const activities = all.filter((a) => a.status === "completed");
  const planned = all.filter((a) => a.status === "planned");
  const units = await getUnits();
  const weightKg = await getWeightKg();
  const buckets = bucketActivities(activities, period, "minutes", units);
  // Only offer sample data to accounts with no history at all, not for every empty period.
  const showSampleData = all.length === 0 && !(await hasAnyActivity());

  // Prefill "Log activity" with the viewed day (never a future date) and
  // "Plan workout" with it (never a past date).
  const todayIso = format(today, "yyyy-MM-dd");
  const logDate = period.date > todayIso ? todayIso : period.date;
  const planDate = period.date < todayIso ? todayIso : period.date;

  return (
    <>
      <p>
        <Link href={buildHref("/activity/new", { date: logDate })}>
          Log activity
        </Link>{" "}
        <Link href={buildHref("/activity/plan", { date: planDate })}>
          Plan workout
        </Link>
      </p>
      <TimescaleTabs path="/activity" scale={scale} date={period.date} />
      <PeriodNav path="/activity" period={period} />
      <SummaryCards
        summary={summarize(activities)}
        units={units}
        calories={totalCalories(activities, weightKg)}
      />
      {weightKg === null && (
        <p>
          <small>
            Enter your weight in the header to see estimated calories.
          </small>
        </p>
      )}
      <ActivityList
        period={period}
        activities={activities}
        buckets={buckets}
        units={units}
        weightKg={weightKg}
      />
      <PlannedList planned={planned} todayIso={todayIso} units={units} />
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
