import { LIMITS } from "./config";

const hits = new Map<string, number[]>();

/**
 * Best-effort sliding-window limiter. State is per server instance, so on a
 * multi-instance or serverless deploy it only slows a single abuser down; set a
 * spend limit in the Anthropic console as the real backstop.
 * Returns true when the call is allowed (and counts it).
 */
export function allowRequest(key: string, max: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < LIMITS.windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);

  // Keep the map from growing without bound.
  if (hits.size > 5000) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= LIMITS.windowMs)) hits.delete(k);
    }
  }
  return true;
}
