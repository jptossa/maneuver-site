import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import ActivityBarChart, {
  type BarRow,
} from "@/components/charts/ActivityBarChart";
import GroupingToggle from "@/components/charts/GroupingToggle";
import MetricToggle from "@/components/charts/MetricToggle";
import TypeBreakdownChart from "@/components/charts/TypeBreakdownChart";
import PeriodNav from "@/components/PeriodNav";
import SummaryCards from "@/components/SummaryCards";
import TimescaleTabs from "@/components/TimescaleTabs";
import {
  bucketActivities,
  rollUpByGroup,
  summarize,
  totalsByGroup,
  totalsByType,
} from "@/lib/aggregate";
import { GROUP_SERIES, TYPE_SERIES } from "@/lib/chart-colors";
import { getActivities } from "@/lib/data";
import {
  parseDate,
  parseGrouping,
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
  const by = parseGrouping(sp.by);
  const period = resolvePeriod(scale, parseDate(sp.date, today), today);
  const activities = await getActivities({
    from: period.start,
    to: period.end,
  });
  const series = by === "group" ? GROUP_SERIES : TYPE_SERIES;
  const rows: BarRow[] = bucketActivities(activities, period, metric).map(
    (b) => ({
      label: b.label,
      ...(by === "group" ? rollUpByGroup(b.byType) : b.byType),
    }),
  );
  const seriesByKey = new Map(series.map((s) => [s.key, s]));
  const totals = (
    by === "group"
      ? totalsByGroup(activities, metric).map((t) => ({
          key: t.group as string,
          value: t.value,
        }))
      : totalsByType(activities, metric).map((t) => ({
          key: t.type as string,
          value: t.value,
        }))
  ).map((t) => ({ ...seriesByKey.get(t.key)!, value: t.value }));

  return (
    <>
      <TimescaleTabs
        path="/charts"
        scale={scale}
        date={period.date}
        metric={metric}
        by={by}
      />
      <PeriodNav path="/charts" period={period} metric={metric} by={by} />
      <MetricToggle
        path="/charts"
        scale={scale}
        date={period.date}
        metric={metric}
        by={by}
      />
      <GroupingToggle
        path="/charts"
        scale={scale}
        date={period.date}
        metric={metric}
        by={by}
      />
      <SummaryCards summary={summarize(activities)} />
      {activities.length === 0 ? (
        <p>No activity recorded for this period.</p>
      ) : (
        <>
          <h2>Over time</h2>
          <ActivityBarChart data={rows} series={series} unit={UNITS[metric]} />
          <h2>{by === "group" ? "By activity group" : "By activity type"}</h2>
          <TypeBreakdownChart data={totals} />
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
