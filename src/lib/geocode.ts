import { fetchJson } from "@/lib/outdoors/http";
import { parseHomeLocation, type HomeLocation } from "@/lib/location";

const MAX_QUERY_CHARS = 100;

export type GeocodeResult =
  | { ok: true; location: HomeLocation }
  | { ok: false; error: string };

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

/** "Boulder, CO" from a Nominatim result; falls back to the first parts of its display name. */
function labelOf(result: Record<string, unknown>): string | null {
  const address = (result.address ?? {}) as Record<string, unknown>;
  const place =
    str(address.city) ??
    str(address.town) ??
    str(address.village) ??
    str(address.hamlet) ??
    str(address.municipality) ??
    str(address.county);
  const stateCode = str(address["ISO3166-2-lvl4"])?.replace(/^US-/, "");
  if (place && stateCode) return `${place}, ${stateCode}`;
  if (place) return place;
  const display = str(result.display_name);
  return display ? display.split(",").slice(0, 2).join(",").trim() : null;
}

/**
 * Turns a typed US city or ZIP code into a coarse home location using OpenStreetMap's
 * Nominatim (free; its policy allows this kind of occasional lookup with an identifying
 * User-Agent). Used once per save, never per chat message. Weather coverage is US-only,
 * so the search is limited to the US.
 */
export async function geocodeUs(query: string): Promise<GeocodeResult> {
  const q = query.trim();
  if (q === "" || q.length > MAX_QUERY_CHARS) {
    return { ok: false, error: "Enter a US city or ZIP code." };
  }
  const url =
    "https://nominatim.openstreetmap.org/search?" +
    new URLSearchParams({
      q,
      format: "jsonv2",
      countrycodes: "us",
      limit: "1",
      addressdetails: "1",
    });
  try {
    const json = await fetchJson(url, { timeoutMs: 8000 });
    const first = Array.isArray(json) ? (json[0] as Record<string, unknown> | undefined) : undefined;
    if (!first) return { ok: false, error: "Couldn't find that place. Try a city and state, or a ZIP code." };
    const label = labelOf(first);
    const location = parseHomeLocation({
      lat: Number(first.lat),
      lon: Number(first.lon),
      label,
    });
    if (!location) return { ok: false, error: "Couldn't use that place. Try a city and state, or a ZIP code." };
    return { ok: true, location };
  } catch {
    return { ok: false, error: "The place lookup isn't responding. Try again in a moment." };
  }
}
