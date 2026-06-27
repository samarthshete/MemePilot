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
import { getRugcheckSummary, type RugcheckSummary } from "./rugcheck";
import { score, type RugReport, type ScoreInput } from "./score";
import type { RiskSignal, SafetyReport, SignalSeverity } from "./types";
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

/* ----------------------- RugCheck → our signal mapping -------------------- */
// Names that mean "you can't get out" → CRITICAL regardless of RugCheck's level.
const RUG_BLOCK_NAME = /honeypot|can.?t sell|cannot sell|not sellable|unsellable|non.?transferable|trading disabled|blacklist/i;

function rugSeverity(level: string, name: string): SignalSeverity {
  if (RUG_BLOCK_NAME.test(name)) return "block";
  if (level === "danger") return "danger";
  if (level === "warn") return "warn";
  return "info";
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Canonical ids so a risk we ALSO compute (honeypot probe) isn't shown twice.
function rugId(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("mint authority")) return "mint_authority_active";
  if (n.includes("freeze authority")) return "freeze_authority_active";
  if (n.includes("mutable metadata")) return "mutable_metadata";
  if (n.includes("transfer fee") || n.includes("transfer tax")) return "transfer_fee";
  if (n.includes("liquidity")) return "thin_liquidity";
  if (n.includes("single") && n.includes("holder")) return "single_holder_dominance";
  if (n.includes("concentrat") || n.includes("holder ownership") || (n.includes("holders") && n.includes("high")))
    return "top10_concentration";
  if (RUG_BLOCK_NAME.test(name)) return "honeypot_no_sell_route";
  return `rugcheck:${slug(name)}`;
}

function mapRugRisks(summary: RugcheckSummary): RiskSignal[] {
  return summary.risks.map((r) => ({
    id: rugId(r.name),
    label: r.name,
    severity: rugSeverity(r.level, r.name),
    detail: r.description || `Flagged by RugCheck (${r.level}).`,
    triggered: true,
  }));
}

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

/** Cached token-level gather: RugCheck (primary) + honeypot probe, else full heuristic. */
type Gathered = { input: TokenSignals; rug: RugReport | null };

function gatherTokenSignals(address: string): Promise<Gathered> {
  return getOrSet(`safety:${address}`, TOKEN_TTL_MS, async () => {
    console.info(`[safety] cache miss → gathering signals for ${address}`);
    // Always: RugCheck (primary model) + our Jupiter honeypot probe (corroboration).
    const [rugSummary, routes] = await Promise.all([
      getRugcheckSummary(address),
      safe(checkRoutes(address)),
    ]);
    const rt = routes ?? { buy: false, sell: null };

    // PRIMARY path: RugCheck answered. Carry ONLY the honeypot corroboration into
    // the scorer (rest null) and SKIP the BirdEye/RPC calls — RugCheck already
    // covers mint/freeze/liquidity/holders, so we save the free-tier budget.
    if (rugSummary) {
      return {
        input: { ...EMPTY, buyRouteExists: rt.buy, sellRouteExists: rt.sell },
        rug: { scoreNormalised: rugSummary.scoreNormalised, signals: mapRugRisks(rugSummary) },
      };
    }

    // FALLBACK path: RugCheck unavailable → run the full v1 heuristic. BirdEye
    // calls sequenced (1 rps); RPC alongside; routes already fetched above.
    const [auth, birdeye] = await Promise.all([
      safe(getMintAuthorities(address)), // Alchemy RPC
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
    const hasPct = !!hs && hs.length > 0 && hs[0].pctOfSupply !== null;
    const topHolderPct = hasPct ? hs![0].pctOfSupply : null;
    const top10Pct = hasPct
      ? hs!.slice(0, 10).reduce((s, h) => s + (h.pctOfSupply ?? 0), 0)
      : null;

    return {
      input: {
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
      },
      rug: null,
    };
  });
}

/**
 * Full pre-trade safety report. Verified (curated) mints short-circuit to LOW
 * with no IO. Otherwise RugCheck is the primary model; if it's unavailable we
 * fall back to the heuristic and mark the report degraded (never a dead gate).
 * `priceImpactPct` is the fraction (0.03 = 3%) from the caller's quote.
 */
export async function getSafetyReport(
  address: string,
  priceImpactPct?: number | null,
): Promise<SafetyReport> {
  if (VERIFIED_MINTS.has(address)) {
    return score({ address, verified: true, priceImpactPct: null, ...EMPTY });
  }
  let gathered: Gathered = { input: EMPTY, rug: null };
  try {
    gathered = await gatherTokenSignals(address);
  } catch {
    // Never throw — a total failure is just a fully-degraded heuristic report.
  }
  const report = score(
    { address, verified: false, priceImpactPct: priceImpactPct ?? null, ...gathered.input },
    gathered.rug,
  );
  // RugCheck (primary model) unavailable → flag the fallback as degraded.
  if (!gathered.rug) report.degraded = true;
  return report;
}
