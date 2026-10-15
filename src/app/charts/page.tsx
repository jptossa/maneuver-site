import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import ActivityBarChart, {
  type BarRow,
} from "@/components/charts/ActivityBarChart";
import MetricToggle from "@/components/charts/MetricToggle";
import TypeBreakdownChart from "@/components/charts/TypeBreakdownChart";
import PeriodNav from "@/components/PeriodNav";
import SummaryCards from "@/components/SummaryCards";
import TimescaleTabs from "@/components/TimescaleTabs";
import { bucketActivities, summarize, totalsByType } from "@/lib/aggregate";
import { getActivities } from "@/lib/data";
import {
  parseDate,
  parseMetric,
  parseScale,
  resolvePeriod,
} from "@/lib/period";

export const metadata: Metadata = { title: "Charts · Maneuver" };

const UNITS = { minutes: "min", distance: "km", sessions: "" } as const;

async function ChartsView({ searchParams }: PageProps<"/charts">) {
  const sp = await searchParams;
  await connection(); // "today" is request-time data
  const today = new Date();
  const scale = parseScale(sp.scale);
  const metric = parseMetric(sp.metric);
  const period = resolvePeriod(scale, parseDate(sp.date, today), today);
  const activities = await getActivities({
    from: period.start,
    to: period.end,
  });
  const rows: BarRow[] = bucketActivities(activities, period, metric).map(
    (b) => ({ label: b.label, ...b.byType }),
  );

  return (
    <>
      <TimescaleTabs
        path="/charts"
        scale={scale}
        date={period.date}
        metric={metric}
      />
      <PeriodNav path="/charts" period={period} metric={metric} />
      <MetricToggle
        path="/charts"
        scale={scale}
        date={period.date}
        metric={metric}
      />
      <SummaryCards summary={summarize(activities)} />
      {activities.length === 0 ? (
        <p>No activity recorded for this period.</p>
      ) : (
        <>
          <h2>Over time</h2>
          <ActivityBarChart data={rows} unit={UNITS[metric]} />
          <h2>By activity type</h2>
          <TypeBreakdownChart data={totalsByType(activities, metric)} />
        </>
      )}
    </>
  );
}

export default function ChartsPage(props: PageProps<"/charts">) {
  return (
    <>
      <h1>Charts</h1>
      <Suspense fallback={<p>Loading charts…</p>}>
        <ChartsView {...props} />
      </Suspense>
    </>
  );
}
