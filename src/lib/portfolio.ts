import { getPrice } from "@/lib/price";
import { getAllTokenBalances, getSolBalance } from "@/lib/solana";
import { getTrades, type TradeRow } from "@/lib/supabase";
import { CURATED_TOKENS } from "@/lib/ticker-tokens";
import { SOL_MINT } from "@/lib/trading-config";

/**
 * SERVER-ONLY portfolio assembly: REAL on-chain holdings (valued live) +
 * positions/PnL and history derived from the trades table. `is_demo` rows are
 * included and flagged so the UI can show the "sample data" banner. Never throws.
 */

export type Holding = {
  mint: string;
  symbol: string;
  qty: number;
  priceUsd: number | null;
  valueUsd: number | null;
};

export type Position = {
  tokenAddress: string;
  symbol: string;
  qty: number;
  avgEntryUsd: number | null;
  currentPriceUsd: number | null;
  valueUsd: number | null;
  unrealizedUsd: number | null;
  unrealizedPct: number | null;
  isDemo: boolean;
};

export type HistoryItem = {
  id: string;
  side: "buy" | "sell";
  symbol: string;
  tokenAddress: string;
  amountUsd: number | null;
  tokenQty: number | null;
  priceAtTrade: number | null;
  txSignature: string | null;
  isDemo: boolean;
  createdAt: string;
};

export type Portfolio = {
  totalValueUsd: number;
  holdings: Holding[];
  positions: Position[];
  history: HistoryItem[];
  hasDemo: boolean;
};

function symbolFor(mint: string): string {
  const c = CURATED_TOKENS.find((t) => t.address === mint);
  if (c) return c.symbol;
  return mint === SOL_MINT ? "SOL" : `${mint.slice(0, 4)}…${mint.slice(-4)}`;
}

async function priceUsd(mint: string): Promise<number | null> {
  try {
    return (await getPrice(mint)).priceUsd;
  } catch {
    return null;
  }
}

/** REAL on-chain holdings (native SOL + SPL), each valued at the live price. */
async function getHoldings(owner: string): Promise<Holding[]> {
  const holdings: Holding[] = [];
  try {
    const sol = await getSolBalance(owner);
    if (sol.uiAmount > 0) {
      const p = await priceUsd(SOL_MINT);
      holdings.push({
        mint: SOL_MINT,
        symbol: "SOL",
        qty: sol.uiAmount,
        priceUsd: p,
        valueUsd: p != null ? sol.uiAmount * p : null,
      });
    }
  } catch {
    /* SOL read failed — skip */
  }
  const tokens = await getAllTokenBalances(owner);
  for (const t of tokens) {
    const p = await priceUsd(t.mint);
    holdings.push({
      mint: t.mint,
      symbol: symbolFor(t.mint),
      qty: t.uiAmount,
      priceUsd: p,
      valueUsd: p != null ? t.uiAmount * p : null,
    });
  }
  return holdings;
}

type Agg = {
  buyQty: number;
  buyUsd: number;
  sellQty: number;
  anyReal: boolean;
  anyDemo: boolean;
};

/** Positions + unrealized PnL from trades (cost-basis avg entry vs live price). */
async function getPositions(trades: TradeRow[]): Promise<Position[]> {
  const byToken = new Map<string, Agg>();
  for (const t of trades) {
    const a =
      byToken.get(t.token_address) ??
      { buyQty: 0, buyUsd: 0, sellQty: 0, anyReal: false, anyDemo: false };
    if (t.side === "buy") {
      a.buyQty += t.token_qty ?? 0;
      a.buyUsd += t.amount_usd ?? 0;
    } else {
      a.sellQty += t.token_qty ?? 0;
    }
    a.anyReal ||= !t.is_demo;
    a.anyDemo ||= t.is_demo;
    byToken.set(t.token_address, a);
  }

  const positions: Position[] = [];
  for (const [tokenAddress, a] of byToken) {
    const qty = a.buyQty - a.sellQty;
    if (qty <= 1e-9) continue; // closed/flat
    const avgEntryUsd = a.buyQty > 0 ? a.buyUsd / a.buyQty : null;
    const currentPriceUsd = await priceUsd(tokenAddress);
    const valueUsd = currentPriceUsd != null ? qty * currentPriceUsd : null;
    const costBasis = avgEntryUsd != null ? avgEntryUsd * qty : null;
    const unrealizedUsd =
      valueUsd != null && costBasis != null ? valueUsd - costBasis : null;
    const unrealizedPct =
      avgEntryUsd && currentPriceUsd != null
        ? (currentPriceUsd / avgEntryUsd - 1) * 100
        : null;
    positions.push({
      tokenAddress,
      symbol: symbolFor(tokenAddress),
      qty,
      avgEntryUsd,
      currentPriceUsd,
      valueUsd,
      unrealizedUsd,
      unrealizedPct,
      isDemo: a.anyDemo && !a.anyReal, // purely-demo position (not on-chain)
    });
  }
  return positions;
}

export async function buildPortfolio(privyDid: string, owner: string): Promise<Portfolio> {
  const [holdings, trades] = await Promise.all([getHoldings(owner), getTrades(privyDid)]);
  const positions = await getPositions(trades);

  const holdingsValue = holdings.reduce((s, h) => s + (h.valueUsd ?? 0), 0);
  // Demo positions aren't on-chain, so add their current value on top of holdings
  // (real positions are already reflected in the on-chain holdings — no double count).
  const demoValue = positions
    .filter((p) => p.isDemo)
    .reduce((s, p) => s + (p.valueUsd ?? 0), 0);

  const history: HistoryItem[] = trades.map((t) => ({
    id: t.id,
    side: t.side,
    symbol: t.symbol ?? symbolFor(t.token_address),
    tokenAddress: t.token_address,
    amountUsd: t.amount_usd,
    tokenQty: t.token_qty,
    priceAtTrade: t.price_at_trade,
    txSignature: t.tx_signature,
    isDemo: t.is_demo,
    createdAt: t.created_at,
  }));

  return {
    totalValueUsd: holdingsValue + demoValue,
    holdings,
    positions,
    history,
    hasDemo: trades.some((t) => t.is_demo),
  };
}
