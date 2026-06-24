import { z } from "zod";
import { requireServer } from "@/lib/env";

/**
 * SERVER-ONLY BirdEye client (CLAUDE.md hard rule 1 + ADR-003). The key and this
 * base URL must never reach the browser — import this only from server code
 * (`/api/*` routes, server components). The client talks to our `/api/trending`,
 * never to BirdEye.
 *
 * Real response shapes verified against the live API (free Price plan):
 *  GET /defi/price?address=<mint>
 *    { "success": true, "data": { "value": <num>, "priceChange24h": <num %>, ... } }
 *  GET /defi/multi_price?list_address=<a,b,c>
 *    { "success": true, "data": { "<mint>": { "value", "priceChange24h", ... } } }
 *  `priceChange24h` is a PERCENT (confirmed: BONK value ~4.2e-6 with change ~-4.2
 *  can only be %, not an absolute dollar move). Headers: X-API-KEY, x-chain: solana.
 *  NOTE: /defi/multi_price is gated on the free plan (HTTP 401) — we fall back to
 *  looping /defi/price.
 */

const BIRDEYE_BASE = "https://public-api.birdeye.so";
const REQUEST_TIMEOUT_MS = 6000;

export type PricePoint = { priceUsd: number; change24h: number };

// `data` can be null for an unknown token; `priceChange24h` may be absent.
const priceDataSchema = z
  .object({
    value: z.number(),
    priceChange24h: z.number().nullish(),
  })
  .nullable();

const singlePriceSchema = z.object({
  success: z.boolean(),
  data: priceDataSchema,
});

const multiPriceSchema = z.object({
  success: z.boolean(),
  data: z.record(z.string(), priceDataSchema),
});

type HttpError = Error & { status?: number };

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function birdeyeGet(path: string): Promise<unknown> {
  const apiKey = requireServer("BIRDEYE_API_KEY");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${BIRDEYE_BASE}${path}`, {
      headers: {
        "X-API-KEY": apiKey,
        "x-chain": "solana",
        accept: "application/json",
      },
      cache: "no-store", // we own the caching layer (lib/cache)
      signal: controller.signal,
    });
    if (!res.ok) {
      const err: HttpError = new Error(`BirdEye ${path} → HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return (await res.json()) as unknown;
  } finally {
    clearTimeout(timer);
  }
}

/** Retry only transient failures (429 / 5xx / network); fail fast on 4xx like 401. */
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = (err as HttpError).status;
      const retryable = status === undefined || status === 429 || status >= 500;
      if (!retryable || i === attempts - 1) throw err;
      await delay(400 * (i + 1));
    }
  }
  throw lastErr;
}

function toPoint(
  data: z.infer<typeof priceDataSchema>,
): PricePoint | null {
  if (!data) return null;
  return { priceUsd: data.value, change24h: data.priceChange24h ?? 0 };
}

async function getMultiPrice(
  addresses: string[],
): Promise<Map<string, PricePoint>> {
  const list = addresses.join(",");
  const json = multiPriceSchema.parse(
    await birdeyeGet(`/defi/multi_price?list_address=${encodeURIComponent(list)}`),
  );
  const out = new Map<string, PricePoint>();
  for (const [addr, data] of Object.entries(json.data)) {
    const p = toPoint(data);
    if (p) out.set(addr, p);
  }
  return out;
}

async function getSinglePrice(address: string): Promise<PricePoint | null> {
  const json = singlePriceSchema.parse(
    await birdeyeGet(`/defi/price?address=${encodeURIComponent(address)}`),
  );
  return toPoint(json.data);
}

/**
 * Prices for the given mints as a map address → { priceUsd, change24h }.
 * Tries the batch endpoint first (one call); if it's gated/unavailable, falls
 * back to per-token /defi/price (sequential, retry-on-429). Missing tokens are
 * simply absent from the map.
 */
export async function getTickerPrices(
  addresses: string[],
): Promise<Map<string, PricePoint>> {
  try {
    console.info(`[birdeye] multi_price (${addresses.length} mints)`);
    return await getMultiPrice(addresses);
  } catch (err) {
    const status = (err as HttpError).status;
    console.warn(
      `[birdeye] multi_price unavailable (status ${status ?? "n/a"}); falling back to /defi/price`,
    );
    const out = new Map<string, PricePoint>();
    for (const address of addresses) {
      try {
        const point = await withRetry(() => getSinglePrice(address));
        if (point) out.set(address, point);
      } catch (e) {
        console.warn(`[birdeye] price failed for ${address}: ${(e as Error).message}`);
      }
    }
    return out;
  }
}
