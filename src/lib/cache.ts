/**
 * Tiny in-memory TTL cache.
 *
 * Process-local only: state lives in this module's `Map`, so it's shared within
 * one server/serverless instance and lost on cold start. That's enough for the
 * BirdEye proxy in dev and on a single Vercel instance (CLAUDE.md hard rule 3:
 * one upstream call should serve many visitors within a cache window).
 *
 * SWAPPABLE: when we need a cache shared across instances, replace the internals
 * with a KV store (e.g. Vercel KV / Upstash Redis). Keep these signatures stable
 * so callers don't change — `getOrSet` may need to become fully async-backed.
 */

type Entry<T> = { value: T; expiresAt: number };

const store = new Map<string, Entry<unknown>>();

/** Return the cached value, or `undefined` if missing/expired. */
export function get<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

/** Store a value under `key` for `ttlMs` milliseconds. */
export function set<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/**
 * Return the cached value if fresh; otherwise run `fetcher`, cache its result
 * for `ttlMs`, and return it. Concurrent callers may each run `fetcher` once on
 * a cold key — acceptable for our low-concurrency proxy.
 */
export async function getOrSet<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = get<T>(key);
  if (cached !== undefined) return cached;

  const value = await fetcher();
  set(key, value, ttlMs);
  return value;
}
