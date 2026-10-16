// Forecast and alerts from the US National Weather Service (api.weather.gov): free,
// no key, no commercial restriction, US coverage only. A lookup is two steps: the
// point resolves to a forecast grid (stable, cached for a day), then the grid gives
// 12-hour forecast periods.

import { coordinateText, type HomeLocation } from "@/lib/location";
import { cached } from "./cache";
import { fetchJson, HttpStatusError } from "./http";
import {
  OutdoorsUnavailableError,
  type RawAlert,
  type RawForecast,
  type RawForecastPeriod,
} from "./types";

const API = "https://api.weather.gov";
const GRID_TTL_MS = 24 * 60 * 60 * 1000;
const FORECAST_TTL_MS = 30 * 60 * 1000;
const ALERTS_TTL_MS = 10 * 60 * 1000;
const TIMEOUT_MS = 6000;

const NO_COVERAGE =
  "Weather data is only available for US locations, and this location isn't covered.";

function obj(v: unknown): Record<string, unknown> | null {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : null;
}

/** Provider text goes to the model: bound its length and drop control characters. */
function clean(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, max);
}

async function forecastUrl(loc: HomeLocation, signal?: AbortSignal): Promise<string> {
  const point = coordinateText(loc);
  return cached(`nws:grid:${point}`, GRID_TTL_MS, async () => {
    try {
      const json = obj(
        await fetchJson(`${API}/points/${point}`, { timeoutMs: TIMEOUT_MS, signal, retries: 1 }),
      );
      const url = obj(json?.properties)?.forecast;
      if (typeof url !== "string" || !url.startsWith(`${API}/`)) {
        throw new OutdoorsUnavailableError("The weather service returned an unexpected answer.");
      }
      return url;
    } catch (e) {
      if (e instanceof HttpStatusError && e.status === 404) {
        throw new OutdoorsUnavailableError(NO_COVERAGE);
      }
      throw e;
    }
  });
}

function parsePeriod(raw: unknown): RawForecastPeriod | null {
  const p = obj(raw);
  if (!p) return null;
  const start = typeof p.startTime === "string" ? p.startTime.slice(0, 10) : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return null;
  if (typeof p.temperature !== "number" || !Number.isFinite(p.temperature)) return null;
  const celsius = p.temperatureUnit === "C";
  const precip = obj(p.probabilityOfPrecipitation)?.value;
  return {
    name: clean(p.name, 40),
    date: start,
    isDaytime: p.isDaytime === true,
    temperatureF: Math.round(celsius ? (p.temperature * 9) / 5 + 32 : p.temperature),
    precipChance: typeof precip === "number" ? Math.round(precip) : null,
    windText: clean(p.windSpeed, 30),
    summary: clean(p.shortForecast, 120),
  };
}

function parseAlerts(json: unknown): RawAlert[] {
  const features = obj(json)?.features;
  if (!Array.isArray(features)) return [];
  return features.flatMap((f) => {
    const props = obj(obj(f)?.properties);
    if (!props) return [];
    const ends = typeof props.ends === "string" ? props.ends : typeof props.expires === "string" ? props.expires : null;
    return [
      {
        event: clean(props.event, 80),
        severity: clean(props.severity, 20),
        headline: clean(props.headline, 200),
        ends,
      },
    ];
  });
}

/** Seven days of forecast periods plus active alerts for the point. Throws OutdoorsUnavailableError. */
export async function fetchForecast(
  loc: HomeLocation,
  signal?: AbortSignal,
): Promise<RawForecast> {
  const point = coordinateText(loc);
  const periods = await cached(`nws:forecast:${point}`, FORECAST_TTL_MS, async () => {
    const url = await forecastUrl(loc, signal);
    const json = obj(await fetchJson(url, { timeoutMs: TIMEOUT_MS, signal, retries: 1 }));
    const raw = obj(json?.properties)?.periods;
    const parsed = Array.isArray(raw)
      ? raw.map(parsePeriod).filter((p): p is RawForecastPeriod => p !== null)
      : [];
    if (parsed.length === 0) {
      throw new OutdoorsUnavailableError("The weather service returned no forecast.");
    }
    return parsed;
  });

  // Alerts are a bonus: if only they fail, still return the forecast and say so (null).
  let alerts: RawAlert[] | null = null;
  try {
    alerts = await cached(`nws:alerts:${point}`, ALERTS_TTL_MS, async () =>
      parseAlerts(
        await fetchJson(`${API}/alerts/active?point=${point}`, {
          timeoutMs: TIMEOUT_MS,
          signal,
          headers: { Accept: "application/geo+json" },
        }),
      ),
    );
  } catch (e) {
    if (signal?.aborted) throw e;
  }
  return { periods, alerts };
}
