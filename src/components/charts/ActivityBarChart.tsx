"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartSeries } from "@/lib/chart-colors";

/** One bar: its x-axis label plus a value per series key. */
export type BarRow = { label: string } & Record<string, number | string>;

export default function ActivityBarChart({
  data,
  series,
  unit,
}: {
  data: BarRow[];
  series: ChartSeries[];
  unit: string;
}) {
  // Only render series that actually have data in this period.
  const active = series.filter((s) => data.some((r) => Number(r[s.key]) > 0));
  return (
    <div style={{ width: "100%", height: 360 }}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" interval="preserveStartEnd" />
          <YAxis unit={unit ? ` ${unit}` : undefined} width={70} />
          <Tooltip />
          <Legend />
          {active.map((s) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              stackId="a"
              fill={s.color}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
