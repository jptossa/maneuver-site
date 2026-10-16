// Raw outdoor data as the providers report it (Fahrenheit and mph from the National
// Weather Service, kilometres from OpenStreetMap). Conversion to the user's units
// happens once, in the chatbot tools, so live data and eval fixtures take the same path.

export interface RawForecastPeriod {
  /** The provider's label: "Today", "Tonight", "Saturday", "Saturday Night". */
  name: string;
  /** Local calendar date the period starts on, yyyy-MM-dd. */
  date: string;
  /** Daytime periods carry the high, night periods the low. */
  isDaytime: boolean;
  temperatureF: number;
  /** Chance of precipitation in percent; null when the provider gives none. */
  precipChance: number | null;
  /** Wind as written by the provider, always in mph: "5 mph" or "5 to 10 mph". */
  windText: string;
  summary: string;
}

export interface RawAlert {
  event: string;
  severity: string;
  headline: string;
  /** ISO timestamp, or null when open-ended. */
  ends: string | null;
}

export interface RawForecast {
  periods: RawForecastPeriod[];
  /** Active weather alerts for the point; null when the alert lookup failed. */
  alerts: RawAlert[] | null;
}

export const TRAIL_KINDS = ["hiking", "cycling", "running"] as const;
export type TrailKind = (typeof TRAIL_KINDS)[number];

export interface RawTrail {
  name: string;
  /** A named route (trail, path) or a park / nature reserve to head to. */
  kind: "route" | "park";
  /** OSM route type for routes: hiking, foot, bicycle, mtb, running. */
  routeType: string | null;
  /** "international" | "national" | "regional" | "local" when tagged. */
  network: string | null;
  operator: string | null;
  /** Length from the `distance` tag when it is present and parseable. */
  lengthKm: number | null;
  /** Straight-line distance from the home location to the feature's centre. */
  fromHomeKm: number;
  /** Raw OSM `sac_scale` hiking difficulty tag, when present. */
  sacScale: string | null;
}

/**
 * A lookup failed in a way the assistant should explain plainly (outage, timeout,
 * place outside coverage). `message` is written for the model to relay.
 */
export class OutdoorsUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OutdoorsUnavailableError";
  }
}
