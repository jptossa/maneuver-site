// Best-effort in-memory cache for provider responses, per server instance (the same
// spirit as chatbot/rate-limit.ts). It keeps repeat questions from hitting the free
// public APIs, which ask for caching, and a recent failure is remembered briefly so a
// provider that is down isn't hammered by every chat message.

interface Entry {
  until: number;
  value?: unknown;
  error?: unknown;
}

const store = new Map<string, Entry>();
const MAX_ENTRIES = 500;
const FAILURE_TTL_MS = 60_000;

function prune(now: number) {
  if (store.size < MAX_ENTRIES) return;
  for (const [key, entry] of store) if (entry.until <= now) store.delete(key);
  // Still full of live entries: drop the oldest inserted.
  while (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
}

export async function cached<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.until > now) {
    if (hit.error !== undefined) throw hit.error;
    return hit.value as T;
  }
  try {
    const value = await load();
    prune(now);
    store.set(key, { until: now + ttlMs, value });
    return value;
  } catch (error) {
    // An aborted request says nothing about the provider; only remember real failures.
    if (!(error instanceof DOMException && error.name === "AbortError")) {
      prune(now);
      store.set(key, { until: now + FAILURE_TTL_MS, error });
    }
    throw error;
  }
}
