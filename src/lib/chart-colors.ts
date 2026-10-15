import {
  ACTIVITY_CATALOG,
  ACTIVITY_GROUPS,
  activityLabel,
  type ActivityGroup,
} from "./activity-catalog";
import { ACTIVITY_TYPES, type ActivityType } from "./types";

// Placeholder palette; revisit with the styling pass.
// One hue per group, lightness stepped within the group, so ~30 types stay
// legible in stacked bars and the pie legend (types in a group read as related).
const GROUP_HUES: Record<ActivityGroup, number> = {
  Cardio: 210,
  Water: 175,
  Strength: 20,
  "Mind & body": 45,
  Sports: 130,
  Winter: 270,
  Everyday: 330,
};

function buildColors(): Record<ActivityType, string> {
  const colors = {} as Record<ActivityType, string>;
  for (const group of ACTIVITY_GROUPS) {
    const members = ACTIVITY_TYPES.filter(
      (t) => ACTIVITY_CATALOG[t].group === group,
    );
    members.forEach((t, i) => {
      // Spread lightness 35%..70% across the group's members.
      const l = members.length === 1 ? 52 : 35 + (35 * i) / (members.length - 1);
      colors[t] = `hsl(${GROUP_HUES[group]} 65% ${Math.round(l)}%)`;
    });
  }
  return colors;
}

export const TYPE_COLORS: Record<ActivityType, string> = buildColors();

/** Mid-lightness group hue, used when the charts are rolled up by group. */
export const GROUP_COLORS: Record<ActivityGroup, string> = Object.fromEntries(
  ACTIVITY_GROUPS.map((g) => [g, `hsl(${GROUP_HUES[g]} 65% 52%)`]),
) as Record<ActivityGroup, string>;

/** One chart series: `key` is the data key in chart rows. */
export interface ChartSeries {
  key: string;
  label: string;
  color: string;
}

export const TYPE_SERIES: ChartSeries[] = ACTIVITY_TYPES.map((t) => ({
  key: t,
  label: activityLabel(t),
  color: TYPE_COLORS[t],
}));

export const GROUP_SERIES: ChartSeries[] = ACTIVITY_GROUPS.map((g) => ({
  key: g,
  label: g,
  color: GROUP_COLORS[g],
}));
