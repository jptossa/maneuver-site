import type { HomeLocation } from "@/lib/location";
import {
  OutdoorsUnavailableError,
  type RawAlert,
  type RawForecast,
  type RawForecastPeriod,
  type RawTrail,
} from "@/lib/outdoors/types";
import { dayOffset } from "./store";

/** A saved home location for cases that need one. Coordinates never reach the model. */
export const HOME: HomeLocation = { lat: 40.01, lon: -105.27, label: "Boulder, CO" };

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Wednesday 2026-10-14 is "today" (see store.ts); offset 3 is Saturday 2026-10-17.
function period(
  offset: number,
  isDaytime: boolean,
  temperatureF: number,
  precipChance: number | null,
  windText: string,
  summary: string,
): RawForecastPeriod {
  const date = dayOffset(offset);
  const weekday = WEEKDAYS[(3 + offset) % 7];
  const name = offset === 0 ? (isDaytime ? "Today" : "Tonight") : isDaytime ? weekday : `${weekday} Night`;
  return { name, date, isDaytime, temperatureF, precipChance, windText, summary };
}

/** Sunny and mild through the weekend. */
export function clearWeekend(alerts: RawAlert[] | null = []): RawForecast {
  return {
    periods: [
      period(0, true, 66, 0, "5 mph", "Sunny"),
      period(0, false, 41, 0, "5 mph", "Clear"),
      period(1, true, 68, 0, "5 to 10 mph", "Sunny"),
      period(1, false, 42, 0, "5 mph", "Mostly Clear"),
      period(2, true, 70, 5, "5 to 10 mph", "Mostly Sunny"),
      period(2, false, 44, 5, "5 mph", "Partly Cloudy"),
      period(3, true, 72, 5, "0 to 6 mph", "Sunny"),
      period(3, false, 45, 5, "5 mph", "Clear"),
      period(4, true, 71, 10, "5 mph", "Mostly Sunny"),
      period(4, false, 43, 10, "5 mph", "Partly Cloudy"),
    ],
    alerts,
  };
}

/** Fine until Saturday, which is cold and rainy; Sunday clears. */
export function rainySaturday(alerts: RawAlert[] | null = []): RawForecast {
  const f = clearWeekend(alerts);
  const rain = (p: RawForecastPeriod): RawForecastPeriod => {
    if (p.date !== dayOffset(3)) return p;
    return p.isDaytime
      ? { ...p, temperatureF: 48, precipChance: 90, windText: "15 to 25 mph", summary: "Rain" }
      : { ...p, temperatureF: 36, precipChance: 80, windText: "10 mph", summary: "Rain Likely" };
  };
  return { ...f, periods: f.periods.map(rain) };
}

export function winterStormWarning(): RawAlert {
  return {
    event: "Winter Storm Warning",
    severity: "Severe",
    headline: "Winter Storm Warning issued Saturday until Sunday morning",
    ends: `${dayOffset(4)}T06:00:00-06:00`,
  };
}

/** Fictional places, so no answer can lean on real-world knowledge of a trail. */
export const NEARBY_TRAILS: RawTrail[] = [
  {
    name: "Cedar Ridge Trail",
    kind: "route",
    routeType: "hiking",
    network: "local",
    operator: "Cedar County Open Space",
    lengthKm: 8,
    fromHomeKm: 4.8,
    sacScale: "hiking",
  },
  {
    name: "Heron Marsh Loop",
    kind: "route",
    routeType: "hiking",
    network: null,
    operator: null,
    lengthKm: null,
    fromHomeKm: 9.7,
    sacScale: null,
  },
  {
    name: "Cedar Ridge Open Space",
    kind: "park",
    routeType: null,
    network: null,
    operator: "Cedar County Open Space",
    lengthKm: null,
    fromHomeKm: 5.5,
    sacScale: null,
  },
];

export interface FakeOutdoors {
  /** A canned forecast, or "fail" for an outage. */
  forecast: RawForecast | "fail";
  /** Canned trails, or "fail" for an outage. */
  trails: RawTrail[] | "fail";
}

// A function, not a constant: store.ts and this file import each other, so nothing
// here may call dayOffset while the modules are still loading.
export function defaultOutdoors(): FakeOutdoors {
  return { forecast: clearWeekend(), trails: NEARBY_TRAILS };
}

export function unavailable(): OutdoorsUnavailableError {
  return new OutdoorsUnavailableError("The data provider didn't respond in time.");
}
