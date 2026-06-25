import { getTickerPrices } from "@/lib/birdeye";
import { getOrSet } from "@/lib/cache";
import { PLACEHOLDER_TOKENS, type Token } from "@/components/landing/ticker-data";

/**
 * SERVER-ONLY (imports the BirdEye client). Curated set of well-known Solana
 * mints shown in the ticker. Every mint was verified to return a live price via
 * /defi/price before shipping (a wrong mint = a wrong price). Trending discovery
 * is deferred — BirdEye's /defi/token_trending is gated on the free plan (ADR-017).
 */
type CuratedToken = { address: string; symbol: string; tag: string };

export const CURATED_TOKENS: CuratedToken[] = [
  { symbol: "SOL", tag: "SOL", address: "So11111111111111111111111111111111111111112" },
  { symbol: "BONK", tag: "BNK", address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" },
  { symbol: "WIF", tag: "WIF", address: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm" },
  { symbol: "JUP", tag: "JUP", address: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN" },
  { symbol: "POPCAT", tag: "POP", address: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr" },
  { symbol: "PYTH", tag: "PYT", address: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3" },
  { symbol: "JTO", tag: "JTO", address: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL" },
  { symbol: "RAY", tag: "RAY", address: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R" },
];

const CACHE_KEY = "ticker:trending";
const TTL_MS = 300_000; // 5 min — one upstream fetch per window; free-tier quota hedge (ADR-017)

// Last successful result, kept across cache windows so a transient BirdEye
// outage degrades to the previous real prices instead of the static placeholder.
let lastGood: Token[] | null = null;

/**
 * The ticker token list. Cached 60s (one upstream call per window). On failure,
 * returns the last good prices, else the static placeholder — never throws, so
 * the ticker never crashes or shows a dead bar.
 */
export function getTrendingTokens(): Promise<Token[]> {
  return getOrSet(CACHE_KEY, TTL_MS, fetchLiveTrending);
}

async function fetchLiveTrending(): Promise<Token[]> {
  console.info("[trending] cache miss → fetching prices from BirdEye");
  try {
    const prices = await getTickerPrices(CURATED_TOKENS.map((t) => t.address));
    const tokens: Token[] = [];
    for (const t of CURATED_TOKENS) {
      const point = prices.get(t.address);
      if (!point) continue; // drop any token without a price this cycle
      tokens.push({
        tag: t.tag,
        symbol: t.symbol,
        address: t.address,
        priceUsd: point.priceUsd,
        change24h: point.change24h,
        direction: point.change24h >= 0 ? "up" : "down",
      });
    }
    if (tokens.length === 0) throw new Error("no prices returned");
    lastGood = tokens;
    return tokens;
  } catch (err) {
    console.warn(
      `[trending] BirdEye fetch failed (${(err as Error).message}); serving ${
        lastGood ? "last-good" : "placeholder"
      } data`,
    );
    return lastGood ?? PLACEHOLDER_TOKENS;
  }
}

/** Truncated mint for display, e.g. So11…1112. */
function truncateMint(address: string): string {
  return address.length > 10
    ? `${address.slice(0, 4)}…${address.slice(-4)}`
    : address;
}

export type TokenSummary = {
  address: string;
  symbol: string;
  tag: string;
  /** True if the mint is in our curated config (real symbol vs truncated address). */
  known: boolean;
  priceUsd: number | null;
  change24h: number | null;
};

/**
 * Header summary for the trading page: symbol/tag from the curated config (or a
 * truncated address for unknown mints) + live price/24h change from /defi/price.
 * Cached 60s per address; never throws (price is null if BirdEye fails).
 */
export function getTokenSummary(address: string): Promise<TokenSummary> {
  return getOrSet(`token:summary:${address}`, 60_000, () =>
    fetchTokenSummary(address),
  );
}

async function fetchTokenSummary(address: string): Promise<TokenSummary> {
  const curated = CURATED_TOKENS.find((t) => t.address === address);
  const summary: TokenSummary = {
    address,
    symbol: curated?.symbol ?? truncateMint(address),
    tag: curated?.tag ?? address.slice(0, 3).toUpperCase(),
    known: Boolean(curated),
    priceUsd: null,
    change24h: null,
  };
  try {
    const point = (await getTickerPrices([address])).get(address);
    if (point) {
      summary.priceUsd = point.priceUsd;
      summary.change24h = point.change24h;
    }
  } catch (err) {
    console.warn(`[token] price fetch failed for ${address}: ${(err as Error).message}`);
  }
  return summary;
}
