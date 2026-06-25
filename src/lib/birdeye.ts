import { z } from "zod";
import { getOrSet } from "@/lib/cache";
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

// The batch endpoint /defi/multi_price 401s on the free plan, so by default we
// skip it and go straight to per-token /defi/price — saves a wasted call + its
// latency every window. Set BIRDEYE_MULTI_PRICE=true after upgrading to a plan
// that includes it and the one-call batch path auto-activates.
const MULTI_PRICE_ENABLED = process.env.BIRDEYE_MULTI_PRICE === "true";

async function getPricesIndividually(
  addresses: string[],
): Promise<Map<string, PricePoint>> {
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

/**
 * Prices for the given mints as a map address → { priceUsd, change24h }.
 * Free tier (default): loops /defi/price. With BIRDEYE_MULTI_PRICE=true: one
 * batch /defi/multi_price call, falling back to the loop if it's unavailable.
 * Missing tokens are simply absent from the map.
 */
export async function getTickerPrices(
  addresses: string[],
): Promise<Map<string, PricePoint>> {
  if (!MULTI_PRICE_ENABLED) {
    console.info(
      `[birdeye] /defi/price ×${addresses.length} (multi_price disabled on free tier)`,
    );
    return getPricesIndividually(addresses);
  }
  try {
    console.info(`[birdeye] multi_price (${addresses.length} mints)`);
    return await getMultiPrice(addresses);
  } catch (err) {
    const status = (err as HttpError).status;
    console.warn(
      `[birdeye] multi_price unavailable (status ${status ?? "n/a"}); falling back to /defi/price`,
    );
    return getPricesIndividually(addresses);
  }
}

/* --------------------------------- OHLCV ---------------------------------- */
/*
 * GET /defi/ohlcv?address=&type=&time_from=&time_to=  (verified WORKING on the
 * free tier: HTTP 200). Response: { success, data: { items: [{ o,h,l,c,v,unixTime }] } }.
 * We chart the close (`c`) as an area series. Ranges map to an interval + window
 * sized to keep candle counts (and call cost) low.
 */
export type OhlcvRange = "1D" | "1W" | "1M";
export type OhlcvPoint = { time: number; value: number };

const OHLCV_RANGES: Record<OhlcvRange, { type: string; windowSec: number }> = {
  "1D": { type: "15m", windowSec: 24 * 60 * 60 },
  "1W": { type: "1H", windowSec: 7 * 24 * 60 * 60 },
  "1M": { type: "4H", windowSec: 30 * 24 * 60 * 60 },
};

const ohlcvSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      items: z.array(z.object({ c: z.number(), unixTime: z.number() })),
    })
    .nullish(),
});

/** Close-price area-series points for `address` over `range`. Throws on failure. */
export async function getOhlcv(
  address: string,
  range: OhlcvRange,
): Promise<OhlcvPoint[]> {
  const { type, windowSec } = OHLCV_RANGES[range];
  const timeTo = Math.floor(Date.now() / 1000);
  const timeFrom = timeTo - windowSec;
  const json = ohlcvSchema.parse(
    await withRetry(() =>
      birdeyeGet(
        `/defi/ohlcv?address=${encodeURIComponent(address)}&type=${type}&time_from=${timeFrom}&time_to=${timeTo}`,
      ),
    ),
  );
  const items = json.data?.items ?? [];
  return items.map((item) => ({ time: item.unixTime, value: item.c }));
}

/* -------------------------- Holders & recent trades ----------------------- */
/*
 * Verified WORKING on the free tier (HTTP 200):
 *   GET /defi/v3/token/holder → { success, data: { items: [{ owner, ui_amount }] } }
 *   GET /defi/v3/token/txs     → { success, data: { items: [{ side, volume_usd, owner, block_unix_time, tx_hash }] } }
 *   GET /defi/token_overview   → { success, data: { totalSupply, circulatingSupply } }  (for % of supply)
 */

export type Holder = { owner: string; uiAmount: number; pctOfSupply: number | null };
export type Trade = {
  side: "buy" | "sell";
  volumeUsd: number;
  owner: string;
  unixTime: number;
  txHash: string;
};

const holderSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      items: z.array(z.object({ owner: z.string(), ui_amount: z.number() })),
    })
    .nullish(),
});

const overviewSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      totalSupply: z.number().nullish(),
      circulatingSupply: z.number().nullish(),
      decimals: z.number().nullish(),
    })
    .nullish(),
});

type TokenOverview = { supply: number | null; decimals: number | null };

/** token_overview (supply + decimals), cached 1h — both barely change. */
function getTokenOverview(address: string): Promise<TokenOverview> {
  return getOrSet(`token:overview:${address}`, 3_600_000, async () => {
    try {
      const ov = overviewSchema.parse(
        await withRetry(() =>
          birdeyeGet(`/defi/token_overview?address=${encodeURIComponent(address)}`),
        ),
      );
      return {
        supply: ov.data?.totalSupply ?? ov.data?.circulatingSupply ?? null,
        decimals: ov.data?.decimals ?? null,
      };
    } catch (err) {
      console.warn(`[token] overview fetch failed for ${address}: ${(err as Error).message}`);
      return { supply: null, decimals: null };
    }
  });
}

/** Token decimals (for converting raw amounts to UI amounts). Null if unknown. */
export async function getTokenDecimals(address: string): Promise<number | null> {
  return (await getTokenOverview(address)).decimals;
}

const txSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      items: z.array(
        z.object({
          side: z.string(),
          volume_usd: z.number().nullish(),
          owner: z.string(),
          block_unix_time: z.number(),
          tx_hash: z.string(),
        }),
      ),
    })
    .nullish(),
});

/** Total supply (for % of supply), cached 1h via the shared token_overview. */
async function getTokenSupply(address: string): Promise<number | null> {
  return (await getTokenOverview(address)).supply;
}

/** Top holders with % of supply (null if supply unavailable). Throws on holder-fetch failure. */
export async function getTopHolders(
  address: string,
  limit = 20,
): Promise<Holder[]> {
  const json = holderSchema.parse(
    await withRetry(() =>
      birdeyeGet(
        `/defi/v3/token/holder?address=${encodeURIComponent(address)}&offset=0&limit=${limit}`,
      ),
    ),
  );
  const items = json.data?.items ?? [];
  const supply = await getTokenSupply(address);
  return items.map((h) => ({
    owner: h.owner,
    uiAmount: h.ui_amount,
    pctOfSupply: supply && supply > 0 ? (h.ui_amount / supply) * 100 : null,
  }));
}

/** Recent swaps, newest first. Throws on failure. */
export async function getRecentTrades(
  address: string,
  limit = 20,
): Promise<Trade[]> {
  const json = txSchema.parse(
    await withRetry(() =>
      birdeyeGet(
        `/defi/v3/token/txs?address=${encodeURIComponent(address)}&offset=0&limit=${limit}&tx_type=swap&sort_type=desc`,
      ),
    ),
  );
  const items = json.data?.items ?? [];
  return items.map((t) => ({
    side: t.side === "buy" ? "buy" : "sell",
    volumeUsd: t.volume_usd ?? 0,
    owner: t.owner,
    unixTime: t.block_unix_time,
    txHash: t.tx_hash,
  }));
}
