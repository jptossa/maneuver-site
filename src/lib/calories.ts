import type { Activity } from "./types";
import { metEntry } from "./met";

/**
 * Estimated kilocalories: MET x body weight (kg) x hours. A rough figure (the
 * Compendium's METs are population averages), so show it as an estimate.
 * Computed on read, never stored: it depends on the user's current weight.
 * Returns null when the type has no MET entry or the weight is unknown.
 */
export function estimateCalories(
  activity: Pick<Activity, "type" | "durationMin" | "distanceKm">,
  weightKg: number | null,
): number | null {
  if (weightKg === null) return null;
  const e = metEntry(activity.type, activity.durationMin, activity.distanceKm);
  if (!e) return null;
  return Math.round(e.met * weightKg * (activity.durationMin / 60));
}

/** Sum of the per-activity estimates (types with no MET entry add nothing); null when weight is unknown. */
export function totalCalories(
  activities: Pick<Activity, "type" | "durationMin" | "distanceKm">[],
  weightKg: number | null,
): number | null {
  if (weightKg === null) return null;
  return activities.reduce((sum, a) => sum + (estimateCalories(a, weightKg) ?? 0), 0);
}

export function formatCalories(kcal: number): string {
  return `~${kcal.toLocaleString("en-US")} kcal`;
}
