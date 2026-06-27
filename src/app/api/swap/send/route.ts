import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPrivyDid } from "@/lib/privy-auth";
import { relayAndConfirm, type SwapSendError } from "@/lib/solana";
import { insertTrade } from "@/lib/supabase";

/**
 * Relay an ALREADY-SIGNED transaction (signed client-side in Privy) to Solana via
 * the server-only keyed RPC, then confirm. The server NEVER signs and never holds
 * a key — it only forwards the bytes it received (Stage 6b invariant; the relay
 * core is untouched).
 *
 * Hardened: this endpoint requires a valid Privy token (a tx can only be signed
 * by an authenticated user anyway) and is rate-limited per verified identity, so
 * it can't be used as an open relay to burn our RPC quota. The verified DID is
 * the principal (1:1 with the embedded wallet); we key off it rather than a
 * client-supplied address, which the token doesn't attest.
 *
 * On a CONFIRMED swap with `trade` metadata we record the trade (best-effort,
 * wrapped — a DB failure can NEVER affect the swap).
 */
const RATE_LIMIT = 5; // relays per identity per window
const WINDOW_MS = 60_000;
const relayHits = new Map<string, number[]>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (relayHits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    relayHits.set(key, recent);
    return true;
  }
  recent.push(now);
  relayHits.set(key, recent);
  return false;
}

const tradeSchema = z
  .object({
    token_address: z.string().min(32),
    symbol: z.string().nullish(),
    side: z.enum(["buy", "sell"]),
    amount_usd: z.number().nullish(),
    token_qty: z.number().nullish(),
    price_at_trade: z.number().nullish(),
  })
  .optional();

const bodySchema = z.object({
  signedTxBase64: z.string().min(1),
  trade: tradeSchema,
});

export async function POST(request: Request) {
  // 1) Mandatory auth — no anonymous relays.
  const did = await verifyPrivyDid(request);
  if (!did) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  // 2) Rate limit per verified identity (RPC-quota abuse guard).
  if (isRateLimited(did)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  try {
    const result = await relayAndConfirm(parsed.data.signedTxBase64);

    // Record the confirmed trade — never let this affect the swap response.
    const trade = parsed.data.trade;
    if (trade && (result.status === "confirmed" || result.status === "finalized")) {
      try {
        await insertTrade({
          privy_did: did,
          token_address: trade.token_address,
          symbol: trade.symbol ?? null,
          side: trade.side,
          amount_usd: trade.amount_usd ?? null,
          token_qty: trade.token_qty ?? null,
          price_at_trade: trade.price_at_trade ?? null,
          tx_signature: result.signature,
          status: "confirmed",
          is_demo: false,
        });
      } catch (err) {
        console.warn(`[swap/send] trade record skipped: ${(err as Error).message}`);
      }
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const e = err as SwapSendError;
    console.warn(`[swap/send] ${e.type ?? "send_failed"}: ${e.message}`);
    return NextResponse.json({
      ok: false,
      error: e.type ?? "send_failed",
      signature: e.signature,
    });
  }
}
