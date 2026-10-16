// Maps each activity type to an entry of the 2024 Adult Compendium of Physical
// Activities (src/data/compendium.json, built by scripts/scrape/). We pick entries
// by code and read their MET value from the scraped data; the Compendium's terms
// forbid changing MET values or merging entries, so nothing here is averaged or edited.
// Cite: see `compendium.citation`.

import compendium from "@/data/compendium.json";
import type { CatalogType } from "./activity-catalog";

interface CompendiumEntry {
  code: string;
  met: number;
  description: string;
}

const ENTRIES = new Map<string, CompendiumEntry>(
  compendium.categories.flatMap((c) => c.activities.map((a) => [a.code, a] as const)),
);

export type Intensity = "light" | "moderate" | "vigorous";

/** Standard Compendium cut-offs: under 3 METs light, 3 to under 6 moderate, 6 and up vigorous. */
export function intensityOf(met: number): Intensity {
  return met < 3 ? "light" : met < 6 ? "moderate" : "vigorous";
}

/** Speed tiers: the entry whose stated speed (mph) is the highest one at or below the actual speed. */
type Tier = { minMph: number; code: string };

interface MetRule {
  /** Entry used when no speed is known (or no tiers apply). Null = no estimate for this type. */
  defaultCode: string | null;
  /** Ascending by minMph. Anything slower than the first tier uses the first tier. */
  tiers?: Tier[];
}

// Every catalog type must appear here (enforced by the Record type).
const RULES: Record<CatalogType, MetRule> = {
  walking: {
    defaultCode: "17255", // self-selected speed
    tiers: [
      { minMph: 0, code: "17151" }, // < 2.0 mph
      { minMph: 2.0, code: "17152" },
      { minMph: 2.5, code: "17170" },
      { minMph: 2.8, code: "17190" },
      { minMph: 3.5, code: "17200" },
      { minMph: 4.0, code: "17220" },
      { minMph: 4.5, code: "17230" },
      { minMph: 5.0, code: "17231" },
    ],
  },
  running: {
    defaultCode: "12020", // jogging, general, self-selected pace
    tiers: [
      { minMph: 0, code: "12026" }, // jogging 2.6 to 3.7 mph
      { minMph: 4.0, code: "12028" },
      { minMph: 5.0, code: "12030" },
      { minMph: 5.5, code: "12045" },
      { minMph: 6.0, code: "12050" },
      { minMph: 6.7, code: "12060" },
      { minMph: 7.0, code: "12070" },
      { minMph: 7.5, code: "12080" },
      { minMph: 8.0, code: "12090" },
      { minMph: 8.6, code: "12100" },
      { minMph: 9.0, code: "12110" },
      { minMph: 10.0, code: "12120" },
      { minMph: 11.0, code: "12130" },
      { minMph: 12.0, code: "12132" },
      { minMph: 13.0, code: "12134" },
      { minMph: 14.0, code: "12135" },
    ],
  },
  cycling: {
    defaultCode: "01014", // general
    tiers: [
      { minMph: 0, code: "01010" }, // < 10 mph, leisure
      { minMph: 10, code: "01020" },
      { minMph: 12, code: "01030" },
      { minMph: 14, code: "01040" },
      { minMph: 16, code: "01050" },
      { minMph: 20, code: "01060" },
    ],
  },
  hiking: { defaultCode: "17080" }, // hiking, cross country
  rowing: { defaultCode: "02071" }, // stationary, moderate effort
  elliptical: { defaultCode: "02048" }, // moderate effort
  stair_climbing: { defaultCode: "02065" },
  jump_rope: { defaultCode: "02068" },
  dancing: { defaultCode: "03070" }, // contemporary dancing, general
  swimming: { defaultCode: "18240" }, // laps, freestyle, slow, recreational
  kayaking: { defaultCode: "18100" }, // moderate effort
  paddleboarding: { defaultCode: "18224" },
  surfing: { defaultCode: "18220" },
  strength: { defaultCode: "02054" }, // multiple exercises, 8-15 reps
  hiit: { defaultCode: "02210" }, // moderate effort
  calisthenics: { defaultCode: "02022" }, // moderate effort
  climbing: { defaultCode: "15537" }, // low-to-moderate difficulty
  yoga: { defaultCode: "02150" }, // Hatha
  pilates: { defaultCode: "02105" },
  stretching: { defaultCode: "02101" },
  tai_chi: { defaultCode: "15670" },
  soccer: { defaultCode: "15610" }, // casual
  basketball: { defaultCode: "15055" },
  tennis: { defaultCode: "15675" }, // general, moderate effort
  pickleball: { defaultCode: "15685" }, // not in the Compendium: closest is tennis, doubles
  martial_arts: { defaultCode: "15425" }, // slower pace, novice
  golf: { defaultCode: "15255" }, // general
  skiing: { defaultCode: "19160" }, // downhill, moderate effort, active time only
  snowboarding: { defaultCode: "19201" },
  ice_skating: { defaultCode: "19030" }, // general
  commuting: { defaultCode: "17270" }, // walking to work (4.0, same as leisure cycling to work)
  gardening: { defaultCode: "08245" }, // general, moderate effort
  other: { defaultCode: null }, // unknown activity: no estimate
};

const KM_PER_MILE = 1.609344;

function entry(code: string): CompendiumEntry {
  const e = ENTRIES.get(code);
  // Fails at first use if the scraped data no longer has a code we rely on.
  if (!e) throw new Error(`Compendium entry ${code} not found in src/data/compendium.json`);
  return e;
}

/**
 * The Compendium entry for an activity, or null when the type has none.
 * Speed (from distance and duration) picks a tier for walking, running and cycling.
 */
export function metEntry(
  type: CatalogType,
  durationMin: number,
  distanceKm: number | null,
): CompendiumEntry | null {
  const rule = RULES[type];
  if (rule.tiers && distanceKm !== null && distanceKm > 0 && durationMin > 0) {
    const mph = distanceKm / KM_PER_MILE / (durationMin / 60);
    let chosen = rule.tiers[0];
    for (const t of rule.tiers) if (mph >= t.minMph) chosen = t;
    return entry(chosen.code);
  }
  return rule.defaultCode === null ? null : entry(rule.defaultCode);
}

export const COMPENDIUM_CITATION = compendium.citation;
