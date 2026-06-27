import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPrivyDid } from "@/lib/privy-auth";
import { relayAndConfirm, type SwapSendError } from "@/lib/solana";
import { insertTrade } from "@/lib/supabase";

/**
 * Relay an ALREADY-SIGNED transaction (signed client-side in Privy) to Solana
 * via the server-only keyed RPC, then confirm. The server NEVER signs and never
 * holds a key — it only forwards the bytes it received (Stage 6b invariant).
 *
 * Phase C-2: if the request carries a verified Privy token + `trade` metadata,
 * we record the CONFIRMED trade in Supabase. This is best-effort and wrapped so
 * a DB failure can NEVER break or block the swap (the swap already succeeded).
 */
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
        const did = await verifyPrivyDid(request);
        if (did) {
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
        }
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
