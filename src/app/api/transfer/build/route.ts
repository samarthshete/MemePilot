import { NextResponse } from "next/server";
import { z } from "zod";
import { getSolBalance } from "@/lib/solana";
import { buildSolTransfer } from "@/lib/transfer";

/**
 * Build (NOT send) a native SOL transfer for Send/Withdraw. Server assembles an
 * unsigned tx; the CLIENT signs it in Privy; the existing /api/swap/send relays
 * the signed bytes. Non-custodial — the server never signs. Balance-gated server
 * side (never trust the client): rejects amounts above balance minus a fee buffer.
 */
const FEE_BUFFER_LAMPORTS = 5000; // leave headroom for the network fee
const LAMPORTS_PER_SOL = 1_000_000_000;

const bodySchema = z.object({
  fromPubkey: z.string().min(32),
  toPubkey: z.string().min(32),
  amountSol: z.number().positive().max(1_000_000),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const { fromPubkey, toPubkey, amountSol } = parsed.data;
  const lamports = Math.round(amountSol * LAMPORTS_PER_SOL);
  if (lamports <= 0) {
    return NextResponse.json({ ok: false, error: "bad_amount" });
  }

  try {
    // Balance gate (server-side source of truth).
    const balance = await getSolBalance(fromPubkey);
    const balanceLamports = Number(balance.rawAmount);
    if (lamports + FEE_BUFFER_LAMPORTS > balanceLamports) {
      return NextResponse.json({ ok: false, error: "insufficient_balance" });
    }

    const txBase64 = await buildSolTransfer({ fromPubkey, toPubkey, lamports });
    return NextResponse.json({ ok: true, txBase64 });
  } catch (err) {
    // new PublicKey() throws on an invalid recipient address.
    const msg = (err as Error).message?.toLowerCase() ?? "";
    const error = msg.includes("base58") || msg.includes("public key") ? "bad_recipient" : "unavailable";
    console.warn(`[transfer/build] ${error}: ${(err as Error).message}`);
    return NextResponse.json({ ok: false, error });
  }
}
