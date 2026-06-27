import { NextResponse } from "next/server";
import { getPrice } from "@/lib/price";
import { verifyPrivyDid } from "@/lib/privy-auth";
import {
  deleteDemoTrades,
  hasDemoTrades,
  insertTrades,
  isSupabaseConfigured,
  type TradeInsert,
} from "@/lib/supabase";

/**
 * Demo portfolio data — clearly flagged `is_demo=true` so the UI can label it.
 * POST  → seed 2–3 realistic, varied sample trades (idempotent: skips if present).
 * DELETE→ clear ONLY the demo rows (real trades are never touched).
 * Auth: Bearer Privy token → privy_did. Honest: these are sample rows, not real.
 */

// Curated mints + the target performance for each sample buy.
const SAMPLES: { mint: string; symbol: string; perf: number }[] = [
  { mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", symbol: "BONK", perf: 0.2 }, // up ~20%
  { mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", symbol: "WIF", perf: -0.1 }, // down ~10%
  { mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", symbol: "JUP", perf: 0.01 }, // ~flat
];
const SAMPLE_USD = 5;

export async function POST(request: Request) {
  const did = await verifyPrivyDid(request);
  if (!did) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "not_configured" });
  }
  if (await hasDemoTrades(did)) {
    return NextResponse.json({ ok: true, seeded: false, reason: "already_present" });
  }

  // Entry price is back-solved from the live price so the displayed PnL matches
  // the target performance (entry = current / (1 + perf)). amount_usd is fixed;
  // token_qty follows from the entry price.
  const rows: TradeInsert[] = [];
  for (const s of SAMPLES) {
    let current: number | null = null;
    try {
      current = (await getPrice(s.mint)).priceUsd;
    } catch {
      /* fall back below */
    }
    const price = current ?? 1; // nominal fallback so the sample still seeds
    const entry = price / (1 + s.perf);
    const qty = entry > 0 ? SAMPLE_USD / entry : 0;
    rows.push({
      privy_did: did,
      token_address: s.mint,
      symbol: s.symbol,
      side: "buy",
      amount_usd: SAMPLE_USD,
      token_qty: qty,
      price_at_trade: entry,
      tx_signature: null, // demo — no real on-chain tx
      status: "demo",
      is_demo: true,
    });
  }

  const ok = await insertTrades(rows);
  return NextResponse.json({ ok, seeded: ok, count: ok ? rows.length : 0 });
}

export async function DELETE(request: Request) {
  const did = await verifyPrivyDid(request);
  if (!did) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "not_configured" });
  }
  const ok = await deleteDemoTrades(did);
  return NextResponse.json({ ok });
}
