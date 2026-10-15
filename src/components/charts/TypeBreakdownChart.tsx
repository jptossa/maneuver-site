"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { activityLabel } from "@/lib/activity-catalog";
import { TYPE_COLORS } from "@/lib/chart-colors";
import type { ActivityType } from "@/lib/types";

export default function TypeBreakdownChart({
  data,
}: {
  data: { type: ActivityType; value: number }[];
}) {
  return (
    <div style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data.map((d) => ({ ...d, name: activityLabel(d.type) }))}
            dataKey="value"
            nameKey="name"
            innerRadius="55%"
            outerRadius="80%"
          >
            {data.map((d) => (
              <Cell key={d.type} fill={TYPE_COLORS[d.type]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
