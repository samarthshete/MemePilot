import {
  getTickerPrices,
  getTokenMarket,
  getTokenSecurity,
  getTopHolders,
} from "@/lib/birdeye";
import { getOrSet } from "@/lib/cache";
import { getQuote } from "@/lib/jupiter";
import { getMintAuthorities } from "@/lib/solana";
import { SOL_DECIMALS, SOL_MINT } from "@/lib/trading-config";
import { score, type ScoreInput } from "./score";
import type { SafetyReport } from "./types";
import { VERIFIED_MINTS } from "./verified-mints";

/**
 * SERVER-ONLY. Gathers safety signals from many sources in parallel — any source
 * may fail (returns null → degraded), NEVER throws. The token-level signals are
 * cached 300s per address (in-flight de-dup via lib/cache); this-trade price
 * impact is applied on top per request (amount-dependent, not cached).
 */
const TOKEN_TTL_MS = 300_000;

type TokenSignals = Omit<ScoreInput, "address" | "verified" | "priceImpactPct">;

const EMPTY: TokenSignals = {
  mintAuthorityActive: null,
  freezeAuthorityActive: null,
  topHolderPct: null,
  top10Pct: null,
  holderCount: null,
  liquidityUsd: null,
  sellRouteExists: null,
  buyRouteExists: null,
  mutableMetadata: null,
  transferFeeBps: null,
};

function getSolPriceUsd(): Promise<number | null> {
  return getOrSet("price:SOL", 30_000, async () => {
    try {
      return (await getTickerPrices([SOL_MINT])).get(SOL_MINT)?.priceUsd ?? null;
    } catch {
      return null;
    }
  });
}

/** Honeypot probe: quote a $1 buy, then quote selling exactly what it bought. */
async function checkRoutes(
  address: string,
): Promise<{ buy: boolean; sell: boolean | null }> {
  const solPrice = await getSolPriceUsd();
  if (!solPrice) return { buy: false, sell: null }; // can't size the probe
  const lamports = Math.max(1, Math.round((1 / solPrice) * 10 ** SOL_DECIMALS));
  let buyOut: string | null = null;
  try {
    const buy = await getQuote({
      inputMint: SOL_MINT,
      outputMint: address,
      amount: lamports,
      slippageBps: 100,
    });
    buyOut = buy.outAmount;
  } catch {
    return { buy: false, sell: null };
  }
  try {
    await getQuote({ inputMint: address, outputMint: SOL_MINT, amount: buyOut, slippageBps: 100 });
    return { buy: true, sell: true };
  } catch {
    return { buy: true, sell: false };
  }
}

async function safe<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch {
    return null;
  }
}

function gatherTokenSignals(address: string): Promise<TokenSignals> {
  return getOrSet(`safety:${address}`, TOKEN_TTL_MS, async () => {
    console.info(`[safety] cache miss → gathering signals for ${address}`);
    // Don't fire every source in the same tick. The three BirdEye-touching calls
    // are SEQUENCED (so we never hit BirdEye 3× simultaneously on the ~1 rps free
    // tier); the Alchemy RPC (authority) and Jupiter (route probe) run alongside
    // them. holders/overview reuse their shared caches, so a token already loaded
    // by the Holders tab costs nothing here.
    const [auth, routes, birdeye] = await Promise.all([
      safe(getMintAuthorities(address)), // Alchemy RPC
      safe(checkRoutes(address)), // Jupiter
      (async () => {
        const hs = await safe(getTopHolders(address, 20)); // BirdEye (shared cache)
        const mk = await safe(getTokenMarket(address)); // BirdEye overview (cached 1h)
        const sec = await safe(getTokenSecurity(address)); // BirdEye (401-gated → null)
        return { hs, mk, sec };
      })(),
    ]);

    const a = auth;
    const sec = birdeye.sec;
    const hs = birdeye.hs;
    const mk = birdeye.mk ?? EMPTY;
    const rt = routes ?? { buy: false, sell: null };

    // Only trust concentration when supply (→ pctOfSupply) was known.
    const hasPct = !!hs && hs.length > 0 && hs[0].pctOfSupply !== null;
    const topHolderPct = hasPct ? hs![0].pctOfSupply : null;
    const top10Pct = hasPct
      ? hs!.slice(0, 10).reduce((s, h) => s + (h.pctOfSupply ?? 0), 0)
      : null;

    return {
      mintAuthorityActive: a ? a.mintAuthorityActive : null,
      freezeAuthorityActive: a ? a.freezeAuthorityActive : null,
      topHolderPct,
      top10Pct,
      holderCount: mk.holderCount,
      liquidityUsd: mk.liquidityUsd,
      sellRouteExists: rt.sell,
      buyRouteExists: rt.buy,
      mutableMetadata: sec ? sec.mutableMetadata : null,
      transferFeeBps: sec ? sec.transferFeeBps : null,
    };
  });
}

/**
 * Full pre-trade safety report. Verified (curated) mints short-circuit to LOW
 * with no IO. `priceImpactPct` is the fraction (0.03 = 3%) from the caller's
 * existing quote, applied on top of the cached token-level signals.
 */
export async function getSafetyReport(
  address: string,
  priceImpactPct?: number | null,
): Promise<SafetyReport> {
  if (VERIFIED_MINTS.has(address)) {
    return score({
      address,
      verified: true,
      priceImpactPct: null,
      ...EMPTY,
    });
  }
  let token: TokenSignals = EMPTY;
  try {
    token = await gatherTokenSignals(address);
  } catch {
    // Never throw — a total failure is just a fully-degraded report.
  }
  return score({
    address,
    verified: false,
    priceImpactPct: priceImpactPct ?? null,
    ...token,
  });
}
