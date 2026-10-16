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

/** Form prefill: 2 decimals, no trailing zeros, "" when there is no distance. */
export function distanceInputValue(
  km: number | null,
  units: UnitSystem,
): string {
  return km === null ? "" : String(round(kmToDisplay(km, units), 2));
}
