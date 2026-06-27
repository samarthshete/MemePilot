import { z } from "zod";
import { getTickerPrices } from "@/lib/birdeye";
import { getOrSet } from "@/lib/cache";

/**
 * SERVER-ONLY multi-source price (all FREE, keyless fallbacks — no paid service).
 * Tries BirdEye first, then Jupiter Price API v3, then DexScreener. First success
 * wins; NEVER throws. Cached 30s per mint (in-flight de-dup via lib/cache) so a
 * page that re-renders or a burst of visitors costs one upstream call per window.
 *
 * Verified live (HTTP 200, keyless):
 *   Jupiter  GET https://lite-api.jup.ag/price/v3?ids=<mint>
 *            → { "<mint>": { usdPrice:number, priceChange24h:number (%), liquidity } }
 *   DexScr.  GET https://api.dexscreener.com/latest/dex/tokens/<mint>
 *            → { pairs: [{ priceUsd:"<str>", priceChange:{h24:number %}, liquidity:{usd} }] }
 */

export type PriceSource = "birdeye" | "jupiter" | "dexscreener" | "none";

export type PriceResult = {
  priceUsd: number | null;
  change24h: number | null;
  liquidityUsd: number | null;
  source: PriceSource;
  /** true when the price came from a fallback (not BirdEye) or no source succeeded. */
  degraded: boolean;
};

const TTL_MS = 30_000;
const TIMEOUT_MS = 5000;

const JUP_PRICE = "https://lite-api.jup.ag/price/v3";
const DEXSCREENER = "https://api.dexscreener.com/latest/dex/tokens";

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { cache: "no-store", signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as unknown;
  } finally {
    clearTimeout(timer);
  }
}

async function fromBirdeye(
  address: string,
): Promise<{ priceUsd: number; change24h: number | null } | null> {
  try {
    const p = (await getTickerPrices([address])).get(address);
    return p ? { priceUsd: p.priceUsd, change24h: p.change24h } : null;
  } catch {
    return null;
  }
}

const jupSchema = z.record(
  z.string(),
  z
    .object({
      usdPrice: z.number(),
      priceChange24h: z.number().nullish(),
      liquidity: z.number().nullish(),
    })
    .nullable(),
);

async function fromJupiter(
  address: string,
): Promise<{ priceUsd: number; change24h: number | null; liquidityUsd: number | null } | null> {
  try {
    const json = jupSchema.parse(
      await fetchJson(`${JUP_PRICE}?ids=${encodeURIComponent(address)}`),
    );
    const d = json[address];
    if (!d || !Number.isFinite(d.usdPrice) || d.usdPrice <= 0) return null;
    return {
      priceUsd: d.usdPrice,
      change24h: d.priceChange24h ?? null,
      liquidityUsd: d.liquidity ?? null,
    };
  } catch {
    return null;
  }
}

const dexSchema = z.object({
  pairs: z
    .array(
      z.object({
        priceUsd: z.string().nullish(),
        priceChange: z.object({ h24: z.number().nullish() }).nullish(),
        liquidity: z.object({ usd: z.number().nullish() }).nullish(),
      }),
    )
    .nullish(),
});

async function fromDexscreener(
  address: string,
): Promise<{ priceUsd: number; change24h: number | null; liquidityUsd: number | null } | null> {
  try {
    const json = dexSchema.parse(
      await fetchJson(`${DEXSCREENER}/${encodeURIComponent(address)}`),
    );
    const pairs = (json.pairs ?? []).filter((p) => p.priceUsd);
    if (pairs.length === 0) return null;
    // Use the deepest-liquidity pair — it's the most representative price.
    pairs.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));
    const top = pairs[0];
    const price = Number(top.priceUsd);
    if (!Number.isFinite(price) || price <= 0) return null;
    return {
      priceUsd: price,
      change24h: top.priceChange?.h24 ?? null,
      liquidityUsd: top.liquidity?.usd ?? null,
    };
  } catch {
    return null;
  }
}

/** Multi-source USD price for `address`. First success wins; never throws. */
export function getPrice(address: string): Promise<PriceResult> {
  return getOrSet(`price:multi:${address}`, TTL_MS, async () => {
    const be = await fromBirdeye(address);
    if (be) {
      return { priceUsd: be.priceUsd, change24h: be.change24h, liquidityUsd: null, source: "birdeye", degraded: false };
    }
    const jup = await fromJupiter(address);
    if (jup) {
      console.info(`[price] BirdEye miss → Jupiter for ${address}`);
      return { ...jup, source: "jupiter", degraded: true };
    }
    const dex = await fromDexscreener(address);
    if (dex) {
      console.info(`[price] BirdEye+Jupiter miss → DexScreener for ${address}`);
      return { ...dex, source: "dexscreener", degraded: true };
    }
    console.warn(`[price] all sources failed for ${address}`);
    return { priceUsd: null, change24h: null, liquidityUsd: null, source: "none", degraded: true };
  });
}
