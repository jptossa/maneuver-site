// The user's home location, stored in Supabase `user_metadata.homeLocation` and used
// only for weather and trail lookups. Coordinates are kept coarse (2 decimals, about
// 1 km) and the assistant is only ever shown the label.

export interface HomeLocation {
  lat: number;
  lon: number;
  /** Human-readable place name, e.g. "Boulder, CO". */
  label: string;
}

const MAX_LABEL_CHARS = 80;
/** Letters, digits, spaces and a little punctuation: enough for "St. John's, NL" and nothing that reads like an instruction. */
const LABEL_PATTERN = /^[\p{L}\p{N} .,'’-]+$/u;

export function roundCoordinate(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Allow-list for stored values. Users can edit their own metadata and these numbers
 * end up in outbound URLs, so anything that isn't a plausible, well-formed location
 * is null. Coordinates come back rounded.
 */
export function parseHomeLocation(value: unknown): HomeLocation | null {
  if (typeof value !== "object" || value === null) return null;
  const { lat, lon, label } = value as Record<string, unknown>;
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  if (typeof label !== "string") return null;
  const cleaned = label.trim();
  if (cleaned.length === 0 || cleaned.length > MAX_LABEL_CHARS) return null;
  if (!LABEL_PATTERN.test(cleaned)) return null;
  return { lat: roundCoordinate(lat), lon: roundCoordinate(lon), label: cleaned };
}

/** Cache key / URL fragment: always a plain "lat,lon" with 2 decimals. */
export function coordinateText(loc: Pick<HomeLocation, "lat" | "lon">): string {
  return `${roundCoordinate(loc.lat).toFixed(2)},${roundCoordinate(loc.lon).toFixed(2)}`;
}
