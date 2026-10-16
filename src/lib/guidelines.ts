// Weekly physical-activity targets (CDC adult guidelines, scraped into
// src/data/guidelines.json) checked against a user's logged activity.
// Counting is done here, in code, because models are unreliable at arithmetic.

import guidelines from "@/data/guidelines.json";
import type { CatalogType } from "./activity-catalog";
import { intensityOf, metEntry } from "./met";
import type { Activity } from "./types";

/** From the CDC page: 150 moderate (or 75 vigorous) minutes a week, plus 2 muscle-strengthening days. */
export const WEEKLY_TARGET = { moderateEquivalentMinutes: 150, muscleStrengtheningDays: 2 } as const;

/** Counted toward the muscle-strengthening target; they are not counted as aerobic minutes. */
const MUSCLE_STRENGTHENING: readonly CatalogType[] = ["strength", "calisthenics", "climbing"];

export interface GuidelineProgress {
  moderateMinutes: number;
  vigorousMinutes: number;
  /** moderate + 2 x vigorous: the CDC treats one vigorous minute as two moderate ones. */
  moderateEquivalentMinutes: number;
  muscleStrengtheningDays: number;
  target: typeof WEEKLY_TARGET;
}

/** Progress from completed activities. The caller passes exactly the days to count (e.g. the last 7). */
export function guidelineProgress(
  activities: Pick<Activity, "date" | "type" | "durationMin" | "distanceKm">[],
): GuidelineProgress {
  let moderate = 0;
  let vigorous = 0;
  const muscleDays = new Set<string>();
  for (const a of activities) {
    if (MUSCLE_STRENGTHENING.includes(a.type)) {
      muscleDays.add(a.date);
      continue;
    }
    const e = metEntry(a.type, a.durationMin, a.distanceKm);
    if (!e) continue;
    const intensity = intensityOf(e.met);
    if (intensity === "moderate") moderate += a.durationMin;
    else if (intensity === "vigorous") vigorous += a.durationMin;
  }
  return {
    moderateMinutes: moderate,
    vigorousMinutes: vigorous,
    moderateEquivalentMinutes: moderate + 2 * vigorous,
    muscleStrengtheningDays: muscleDays.size,
    target: WEEKLY_TARGET,
  };
}

/** The scraped guideline text, for the assistant's prompt. */
export function guidelinesText(): string {
  return [
    ...guidelines.keyPoints,
    ...guidelines.recommendedLevels,
    `Source: ${guidelines.source}, ${guidelines.sourceUrl} (retrieved ${guidelines.retrievedAt}).`,
  ].join("\n");
}
