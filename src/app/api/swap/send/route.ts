import { NextResponse } from "next/server";
import { z } from "zod";
import { relayAndConfirm, type SwapSendError } from "@/lib/solana";

/**
 * Relay an ALREADY-SIGNED transaction (signed client-side in Privy) to Solana
 * via the server-only keyed RPC, then confirm. The server NEVER signs and never
 * holds a key — it only forwards the bytes it received (Stage 6b invariant).
 */
const bodySchema = z.object({ signedTxBase64: z.string().min(1) });

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  try {
    const result = await relayAndConfirm(parsed.data.signedTxBase64);
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
