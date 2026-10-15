import { ACTIVITY_CATALOG, ACTIVITY_GROUPS } from "./activity-catalog";
import { ACTIVITY_TYPES, type ActivityType } from "./types";

// Placeholder palette; revisit with the styling pass.
// One hue per group, lightness stepped within the group, so ~30 types stay
// legible in stacked bars and the pie legend (types in a group read as related).
const GROUP_HUES: Record<(typeof ACTIVITY_GROUPS)[number], number> = {
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
