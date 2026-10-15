// Single source of truth for which activity types exist and how they're shown.
// Adding a type: add an entry here, then add its slug to the CHECK constraint in
// a new supabase/migrations/*.sql (see 0004_activity_types_expand.sql).
// Must not import from ./types (types.ts derives ActivityType from this file).

export const ACTIVITY_GROUPS = [
  "Cardio",
  "Water",
  "Strength",
  "Mind & body",
  "Sports",
  "Winter",
  "Everyday",
] as const;
export type ActivityGroup = (typeof ACTIVITY_GROUPS)[number];

interface ActivityMeta {
  /** Display name shown in lists, charts, and the form. */
  label: string;
  group: ActivityGroup;
}

// Order within a group is the order shown in the form and used for chart shades.
export const ACTIVITY_CATALOG = {
  walking: { label: "Walking", group: "Cardio" },
  running: { label: "Running", group: "Cardio" },
  cycling: { label: "Cycling", group: "Cardio" },
  hiking: { label: "Hiking", group: "Cardio" },
  rowing: { label: "Rowing", group: "Cardio" },
  elliptical: { label: "Elliptical", group: "Cardio" },
  stair_climbing: { label: "Stair climbing", group: "Cardio" },
  jump_rope: { label: "Jump rope", group: "Cardio" },
  dancing: { label: "Dancing", group: "Cardio" },

  swimming: { label: "Swimming", group: "Water" },
  kayaking: { label: "Kayaking", group: "Water" },
  paddleboarding: { label: "Paddleboarding", group: "Water" },
  surfing: { label: "Surfing", group: "Water" },

  strength: { label: "Strength", group: "Strength" },
  hiit: { label: "HIIT", group: "Strength" },
  calisthenics: { label: "Calisthenics", group: "Strength" },
  climbing: { label: "Climbing", group: "Strength" },

  yoga: { label: "Yoga", group: "Mind & body" },
  pilates: { label: "Pilates", group: "Mind & body" },
  stretching: { label: "Stretching", group: "Mind & body" },
  tai_chi: { label: "Tai chi", group: "Mind & body" },

  soccer: { label: "Soccer", group: "Sports" },
  basketball: { label: "Basketball", group: "Sports" },
  tennis: { label: "Tennis", group: "Sports" },
  pickleball: { label: "Pickleball", group: "Sports" },
  martial_arts: { label: "Martial arts", group: "Sports" },
  golf: { label: "Golf", group: "Sports" },

  skiing: { label: "Skiing", group: "Winter" },
  snowboarding: { label: "Snowboarding", group: "Winter" },
  ice_skating: { label: "Ice skating", group: "Winter" },

  commuting: { label: "Commuting", group: "Everyday" },
  gardening: { label: "Gardening", group: "Everyday" },
  other: { label: "Other", group: "Everyday" },
} as const satisfies Record<string, ActivityMeta>;

export type CatalogType = keyof typeof ACTIVITY_CATALOG;

/** Display name for an activity type slug. */
export function activityLabel(type: CatalogType): string {
  return ACTIVITY_CATALOG[type].label;
}

/** Types bucketed by group, in catalog order, for grouped pickers. */
export function typesByGroup(): { group: ActivityGroup; types: CatalogType[] }[] {
  const types = Object.keys(ACTIVITY_CATALOG) as CatalogType[];
  return ACTIVITY_GROUPS.map((group) => ({
    group,
    types: types.filter((t) => ACTIVITY_CATALOG[t].group === group),
  }));
}
