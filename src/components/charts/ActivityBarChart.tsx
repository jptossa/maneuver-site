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
import {
  AXIS_LINE,
  AXIS_TICK,
  GRID_STROKE,
  LEGEND_STYLE,
  TOOLTIP_CONTENT,
  TOOLTIP_ITEM,
  TOOLTIP_LABEL,
} from "./chart-theme";

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
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis
            dataKey="label"
            interval="preserveStartEnd"
            tick={AXIS_TICK}
            axisLine={AXIS_LINE}
            tickLine={AXIS_LINE}
          />
          <YAxis
            unit={unit ? ` ${unit}` : undefined}
            width={70}
            tick={AXIS_TICK}
            axisLine={AXIS_LINE}
            tickLine={AXIS_LINE}
          />
          <Tooltip
            contentStyle={TOOLTIP_CONTENT}
            labelStyle={TOOLTIP_LABEL}
            itemStyle={TOOLTIP_ITEM}
            cursor={{ fill: "var(--chart-cursor)" }}
          />
          <Legend wrapperStyle={LEGEND_STYLE} />
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
