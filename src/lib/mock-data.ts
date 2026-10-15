import { format, getDay, getMonth, subDays } from "date-fns";
import type { Activity, ActivityType } from "./types";

const DAYS_OF_HISTORY = 400;

// Deterministic PRNG so server/client and reloads agree.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface TypeSpec {
  minDur: number;
  maxDur: number;
  /** km per hour range; null = not distance-based */
  speed: [number, number] | null;
}

const SPECS: Record<ActivityType, TypeSpec> = {
  walking: { minDur: 20, maxDur: 75, speed: [4, 5.5] },
  running: { minDur: 20, maxDur: 70, speed: [8, 12] },
  cycling: { minDur: 30, maxDur: 120, speed: [15, 25] },
  hiking: { minDur: 90, maxDur: 300, speed: [3, 4.5] },
  swimming: { minDur: 25, maxDur: 60, speed: [1.5, 2.5] },
  commuting: { minDur: 15, maxDur: 45, speed: [5, 18] },
  strength: { minDur: 30, maxDur: 75, speed: null },
  yoga: { minDur: 20, maxDur: 60, speed: null },
};

const WEEKDAY_POOL: ActivityType[] = [
  "commuting",
  "commuting",
  "commuting",
  "running",
  "strength",
  "yoga",
  "walking",
  "cycling",
  "swimming",
];
const WEEKEND_POOL: ActivityType[] = [
  "hiking",
  "hiking",
  "cycling",
  "running",
  "walking",
  "swimming",
  "yoga",
];

function round(n: number, step: number) {
  return Math.round(n / step) * step;
}

function generate(today: Date): Activity[] {
  const out: Activity[] = [];
  for (let i = DAYS_OF_HISTORY; i >= 0; i--) {
    const day = subDays(today, i);
    const iso = format(day, "yyyy-MM-dd");
    // Seed per date so a given day always produces the same activities.
    const rand = mulberry32(Number(iso.replaceAll("-", "")));
    const weekend = [0, 6].includes(getDay(day));
    // Summer months are a bit more active.
    const month = getMonth(day);
    const season = month >= 4 && month <= 8 ? 1.2 : 0.9;

    if (rand() < 0.12) continue; // rest day

    const count = rand() < 0.35 * season ? 2 : rand() < 0.06 ? 3 : 1;
    const pool = weekend ? WEEKEND_POOL : WEEKDAY_POOL;
    const used = new Set<ActivityType>();
    for (let n = 0; n < count; n++) {
      const type = pool[Math.floor(rand() * pool.length)];
      if (used.has(type)) continue;
      used.add(type);
      const spec = SPECS[type];
      const durationMin = round(
        (spec.minDur + rand() * (spec.maxDur - spec.minDur)) * season,
        5,
      );
      const distanceKm = spec.speed
        ? Math.round(
            (durationMin / 60) *
              (spec.speed[0] + rand() * (spec.speed[1] - spec.speed[0])) *
              10,
          ) / 10
        : null;
      out.push({
        id: `mock-${iso}-${n}`,
        date: iso,
        type,
        durationMin: Math.max(10, durationMin),
        distanceKm,
      });
    }
  }
  return out;
}

export function getMockActivities(today: Date = new Date()): Activity[] {
  return generate(today);
}
