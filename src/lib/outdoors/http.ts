import { OutdoorsUnavailableError } from "./types";

/**
 * Identifies this app to the free public APIs (NWS requires it, Nominatim blocks
 * anonymous clients). Set OUTDOORS_CONTACT to an email or URL so they can reach you.
 */
const CONTACT = process.env.OUTDOORS_CONTACT?.trim();
export const USER_AGENT = CONTACT
  ? `Maneuver/1.0 (activity tracker; ${CONTACT})`
  : "Maneuver/1.0 (activity tracker)";

/** Merges a per-request timeout with the caller's abort signal (e.g. the browser disconnecting). */
function withTimeout(timeoutMs: number, signal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

export interface FetchOptions {
  timeoutMs: number;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  /** POST a form body (Overpass takes `data=<query>`). */
  form?: Record<string, string>;
  /** Extra attempts after a 5xx or network error. */
  retries?: number;
}

/**
 * GET/POST JSON with a timeout and optional retry. Throws OutdoorsUnavailableError
 * (never the raw fetch error) so callers can pass the message on to the model.
 * `HttpStatusError` marks non-retryable client errors such as a 404 for a point
 * outside the provider's coverage.
 */
export class HttpStatusError extends OutdoorsUnavailableError {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function fetchJson(url: string, opts: FetchOptions): Promise<unknown> {
  const attempts = 1 + (opts.retries ?? 0);
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    if (opts.signal?.aborted) throw opts.signal.reason ?? new Error("aborted");
    try {
      const res = await fetch(url, {
        method: opts.form ? "POST" : "GET",
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
          ...(opts.form && { "Content-Type": "application/x-www-form-urlencoded" }),
          ...opts.headers,
        },
        body: opts.form ? new URLSearchParams(opts.form).toString() : undefined,
        signal: withTimeout(opts.timeoutMs, opts.signal),
        cache: "no-store",
      });
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        throw new HttpStatusError(res.status, `The data provider answered ${res.status}.`);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (e instanceof HttpStatusError) throw e;
      // A caller abort is not a provider failure: let it propagate and stop the turn.
      if (opts.signal?.aborted) throw e;
      lastError = e;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 400));
    }
  }
  console.error("outdoors: request failed", url.split("?")[0], lastError);
  throw new OutdoorsUnavailableError("The data provider didn't respond in time.");
}
