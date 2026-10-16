// Distance is stored in kilometres (activities.distance_km). Everything user-facing
// converts through this module so the UI, forms, charts and chatbot can't drift.

export const UNIT_SYSTEMS = ["us", "metric"] as const;
export type UnitSystem = (typeof UNIT_SYSTEMS)[number];
export const DEFAULT_UNITS: UnitSystem = "us";

export type DistanceUnit = "mi" | "km";

export const KM_PER_MILE = 1.609344;

/** Allow-list: anything that isn't a known system (including missing) is the default. */
export function parseUnits(value: unknown): UnitSystem {
  return UNIT_SYSTEMS.find((u) => u === value) ?? DEFAULT_UNITS;
}

export function distanceUnit(units: UnitSystem): DistanceUnit {
  return units === "us" ? "mi" : "km";
}

/** `null` for anything that isn't exactly "mi" or "km". */
export function parseDistanceUnit(value: unknown): DistanceUnit | null {
  return value === "mi" || value === "km" ? value : null;
}

export function distanceUnitName(unit: DistanceUnit): string {
  return unit === "mi" ? "miles" : "kilometres";
}

function round(n: number, places: number) {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

/** Kilometres (storage) -> the user's display unit, unrounded. */
export function kmToDisplay(km: number, units: UnitSystem): number {
  return units === "us" ? km / KM_PER_MILE : km;
}

/** A distance in `unit` -> kilometres for storage, rounded to the column's 2 decimals. */
export function displayToKm(value: number, unit: DistanceUnit): number {
  return round(unit === "mi" ? value * KM_PER_MILE : value, 2);
}

/** Rounded to 1 decimal, for display: "3.1 mi". */
export function formatDistance(km: number, units: UnitSystem): string {
  return `${round(kmToDisplay(km, units), 1)} ${distanceUnit(units)}`;
}

/** Chart/summary value in the display unit, rounded to 1 decimal. */
export function displayDistance(km: number, units: UnitSystem): number {
  return round(kmToDisplay(km, units), 1);
}

// Body weight (for calorie estimates) is stored in kilograms in user_metadata.weightKg.

export type WeightUnit = "lb" | "kg";

export const KG_PER_LB = 0.45359237;
/** Plausible adult range, in kg; also the bounds enforced on input. */
export const MIN_WEIGHT_KG = 20;
export const MAX_WEIGHT_KG = 500;

export function weightUnit(units: UnitSystem): WeightUnit {
  return units === "us" ? "lb" : "kg";
}

/** Kilograms (storage) -> the user's display unit, rounded to 1 decimal. */
export function kgToDisplay(kg: number, units: UnitSystem): number {
  return round(units === "us" ? kg / KG_PER_LB : kg, 1);
}

/** A weight typed in `unit` -> kilograms, or null when it isn't a plausible weight. */
export function displayToKgWeight(value: number, unit: WeightUnit): number | null {
  return parseWeightKg(unit === "lb" ? value * KG_PER_LB : value);
}

/** Allow-list for stored values (users can edit their own metadata): null unless plausible. */
export function parseWeightKg(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < MIN_WEIGHT_KG || value > MAX_WEIGHT_KG) return null;
  return round(value, 1);
}

/** Form prefill: "" when no weight is set. */
export function weightInputValue(kg: number | null, units: UnitSystem): string {
  return kg === null ? "" : String(kgToDisplay(kg, units));
}

/** Form prefill: 2 decimals, no trailing zeros, "" when there is no distance. */
export function distanceInputValue(
  km: number | null,
  units: UnitSystem,
): string {
  return km === null ? "" : String(round(kmToDisplay(km, units), 2));
}
