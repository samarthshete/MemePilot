/**
 * Vercel edge / shared-CDN cache headers (FREE — no KV, no paid service).
 *
 * `s-maxage` lets Vercel's edge serve a cached response to many visitors for
 * `ttlSeconds` from ONE origin render, and `stale-while-revalidate` (2× the ttl)
 * keeps serving the slightly-stale copy instantly while it revalidates in the
 * background — so a burst of visitors never stampedes our rate-limited upstreams
 * (BirdEye ~1 rps, Jupiter keyless ~0.5 rps). `max-age=0` keeps the *browser*
 * from caching (only the shared edge does), so a hard refresh still re-checks.
 *
 * This is the cross-instance layer; the in-memory TTL+dedup in lib/cache.ts is
 * the per-instance layer underneath it.
 */
export function edgeCache(ttlSeconds: number): Record<string, string> {
  const swr = ttlSeconds * 2;
  return {
    "Cache-Control": `public, max-age=0, s-maxage=${ttlSeconds}, stale-while-revalidate=${swr}`,
  };
}
