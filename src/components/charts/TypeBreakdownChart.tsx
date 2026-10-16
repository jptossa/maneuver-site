"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { ChartSeries } from "@/lib/chart-colors";
import {
  LEGEND_STYLE,
  TOOLTIP_CONTENT,
  TOOLTIP_ITEM,
  TOOLTIP_LABEL,
} from "./chart-theme";

export default function TypeBreakdownChart({
  data,
}: {
  data: (ChartSeries & { value: number })[];
}) {
  return (
    <div style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius="55%"
            outerRadius="80%"
            stroke="var(--surface)"
          >
            {data.map((d) => (
              <Cell key={d.key} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={TOOLTIP_CONTENT}
            labelStyle={TOOLTIP_LABEL}
            itemStyle={TOOLTIP_ITEM}
          />
          <Legend wrapperStyle={LEGEND_STYLE} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
