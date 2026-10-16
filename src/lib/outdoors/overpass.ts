// Named trails and parks near a point from OpenStreetMap, via the public Overpass API.
// Coverage is volunteer-mapped: names, route type and sometimes length or difficulty,
// but no ratings, elevation or current conditions. The public servers are shared and
// can be at capacity, so requests are cached, tried on two servers, and a failure
// becomes a plain "unavailable" for the assistant to relay.

import { coordinateText, type HomeLocation } from "@/lib/location";
import { KM_PER_MILE } from "@/lib/units";
import { cached } from "./cache";
import { fetchJson } from "./http";
import {
  OutdoorsUnavailableError,
  type RawTrail,
  type TrailKind,
} from "./types";

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const TTL_MS = 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 9000;
/** Elements requested per query; results are then ranked by distance and trimmed. */
const QUERY_LIMIT = 80;
const MAX_ROUTES = 12;
const MAX_PARKS = 8;

const ROUTE_TYPES: Record<TrailKind, string> = {
  hiking: "hiking|foot",
  cycling: "bicycle|mtb",
  running: "running|foot",
};
/** Parks and reserves are useful destinations for walking-type activity, not for cycling routes. */
const INCLUDE_PARKS: Record<TrailKind, boolean> = {
  hiking: true,
  cycling: false,
  running: true,
};
const NETWORKS: Record<string, string> = {
  iwn: "international",
  nwn: "national",
  rwn: "regional",
  lwn: "local",
  icn: "international",
  ncn: "national",
  rcn: "regional",
  lcn: "local",
};

function buildQuery(loc: HomeLocation, kind: TrailKind, radiusM: number): string {
  const around = `(around:${radiusM},${coordinateText(loc)})`;
  const parks = INCLUDE_PARKS[kind]
    ? `nwr["leisure"~"^(park|nature_reserve)$"]["name"]${around};`
    : "";
  return `[out:json][timeout:8];(relation["route"~"^(${ROUTE_TYPES[kind]})$"]["name"]${around};${parks});out tags center ${QUERY_LIMIT};`;
}

function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLon = (bLon - aLon) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** OSM `distance` is kilometres by convention; accept an explicit "km" or "mi" suffix too. */
function parseLengthKm(raw: unknown): number | null {
  if (typeof raw !== "string") return null;
  const m = raw.trim().match(/^(\d+(?:[.,]\d+)?)\s*(km|mi)?$/i);
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  if (!Number.isFinite(n) || n <= 0 || n > 5000) return null;
  return m[2]?.toLowerCase() === "mi" ? n * KM_PER_MILE : n;
}

/** OSM tags are volunteer-written free text: bound the length and drop control characters. */
function tag(tags: Record<string, unknown>, key: string, max = 80): string | null {
  const v = tags[key];
  if (typeof v !== "string") return null;
  const cleaned = v.replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, max);
  return cleaned === "" ? null : cleaned;
}

function parseElements(json: unknown, loc: HomeLocation): RawTrail[] {
  const elements = (json as { elements?: unknown })?.elements;
  if (!Array.isArray(elements)) {
    throw new OutdoorsUnavailableError("The trail data service returned an unexpected answer.");
  }
  const best = new Map<string, RawTrail>();
  for (const el of elements) {
    if (typeof el !== "object" || el === null) continue;
    const e = el as {
      type?: unknown;
      tags?: Record<string, unknown>;
      center?: { lat?: unknown; lon?: unknown };
      lat?: unknown;
      lon?: unknown;
    };
    const tags = e.tags;
    if (!tags) continue;
    const name = tag(tags, "name");
    const lat = typeof e.center?.lat === "number" ? e.center.lat : e.lat;
    const lon = typeof e.center?.lon === "number" ? e.center.lon : e.lon;
    if (!name || typeof lat !== "number" || typeof lon !== "number") continue;

    const isRoute = e.type === "relation" && tags.route !== undefined;
    const trail: RawTrail = {
      name,
      kind: isRoute ? "route" : "park",
      routeType: isRoute ? tag(tags, "route", 20) : null,
      network: NETWORKS[String(tags.network)] ?? null,
      operator: tag(tags, "operator"),
      lengthKm: isRoute ? parseLengthKm(tags.distance) : null,
      fromHomeKm: Math.round(haversineKm(loc.lat, loc.lon, lat, lon) * 10) / 10,
      sacScale: tag(tags, "sac_scale", 40),
    };
    // Many trails are several relations (one per direction or section): keep the nearest.
    const key = `${trail.kind}:${name.toLowerCase()}`;
    const prev = best.get(key);
    if (!prev || trail.fromHomeKm < prev.fromHomeKm) best.set(key, trail);
  }
  const all = [...best.values()].sort((a, b) => a.fromHomeKm - b.fromHomeKm);
  return [
    ...all.filter((t) => t.kind === "route").slice(0, MAX_ROUTES),
    ...all.filter((t) => t.kind === "park").slice(0, MAX_PARKS),
  ];
}

/** Named routes and parks within `radiusKm` of home, nearest first. Throws OutdoorsUnavailableError. */
export async function fetchTrails(
  loc: HomeLocation,
  kind: TrailKind,
  radiusKm: number,
  signal?: AbortSignal,
): Promise<RawTrail[]> {
  const radiusM = Math.round(radiusKm * 1000);
  const key = `overpass:${kind}:${coordinateText(loc)}:${radiusM}`;
  return cached(key, TTL_MS, async () => {
    const query = buildQuery(loc, kind, radiusM);
    for (const endpoint of ENDPOINTS) {
      try {
        const json = await fetchJson(endpoint, {
          timeoutMs: TIMEOUT_MS,
          signal,
          form: { data: query },
        });
        return parseElements(json, loc);
      } catch (e) {
        if (signal?.aborted) throw e;
        // Try the next server.
      }
    }
    throw new OutdoorsUnavailableError(
      "The trail data service is busy or down right now.",
    );
  });
}
