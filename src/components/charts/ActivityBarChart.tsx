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
import { activityLabel } from "@/lib/activity-catalog";
import { TYPE_COLORS } from "@/lib/chart-colors";
import { ACTIVITY_TYPES, type ActivityType } from "@/lib/types";

export type BarRow = { label: string } & Record<ActivityType, number>;

export default function ActivityBarChart({
  data,
  unit,
}: {
  data: BarRow[];
  unit: string;
}) {
  // Only render series that actually have data in this period.
  const types = ACTIVITY_TYPES.filter((t) => data.some((r) => r[t] > 0));
  return (
    <div style={{ width: "100%", height: 360 }}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" interval="preserveStartEnd" />
          <YAxis unit={unit ? ` ${unit}` : undefined} width={70} />
          <Tooltip />
          <Legend />
          {types.map((t) => (
            <Bar
              key={t}
              dataKey={t}
              name={activityLabel(t)}
              stackId="a"
              fill={TYPE_COLORS[t]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
