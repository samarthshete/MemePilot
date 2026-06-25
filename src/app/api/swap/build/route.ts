import { NextResponse } from "next/server";
import { z } from "zod";
import { getTickerPrices, getTokenDecimals } from "@/lib/birdeye";
import { getOrSet } from "@/lib/cache";
import { buildSwapTransaction, getQuote } from "@/lib/jupiter";
import { MAX_BUY_USD, SOL_DECIMALS, SOL_MINT } from "@/lib/trading-config";

/**
 * Build (NOT send) a BUY swap tx for the user's wallet. Server gets a FRESH
 * quote + builds via Jupiter, returns base64 `swapTransaction` for the CLIENT to
 * sign in Privy. The server never signs/sends here. MAX_BUY_USD is enforced
 * server-side (zod) — not just in the UI (Stage 6b invariant).
 */
const bodySchema = z.object({
  address: z.string().min(32),
  amountUsd: z.number().positive().max(MAX_BUY_USD),
  slippageBps: z.number().int().min(1).max(5000).default(50),
  userPublicKey: z.string().min(32),
});

type HttpError = { status?: number };

function getSolPrice(): Promise<number | null> {
  return getOrSet("price:SOL", 30_000, async () => {
    try {
      return (await getTickerPrices([SOL_MINT])).get(SOL_MINT)?.priceUsd ?? null;
    } catch {
      return null;
    }
  });
}

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const capped = parsed.error.issues.some(
      (i) => i.path[0] === "amountUsd" && i.code === "too_big",
    );
    return NextResponse.json(
      { ok: false, error: capped ? "amount_capped" : "bad_request" },
      { status: 400 },
    );
  }
  const { address, amountUsd, slippageBps, userPublicKey } = parsed.data;

  try {
    const solPrice = await getSolPrice();
    if (!solPrice) throw new Error("sol price unavailable");
    const decimals = await getTokenDecimals(address);
    if (decimals == null) throw new Error("token decimals unavailable");

    const lamports = Math.round((amountUsd / solPrice) * 10 ** SOL_DECIMALS);
    const quote = await getQuote({
      inputMint: SOL_MINT,
      outputMint: address,
      amount: lamports,
      slippageBps,
    });
    console.info(`[swap/build] ${address} $${amountUsd} ${slippageBps}bps for ${userPublicKey}`);
    const swapTransactionBase64 = await buildSwapTransaction({
      quoteResponse: quote,
      userPublicKey,
      wrapAndUnwrapSol: true,
      // feeAccount intentionally omitted → $0 platform fee (fee-ready, ADR-022).
    });

    const summary = {
      payUsd: amountUsd,
      paySol: lamports / 10 ** SOL_DECIMALS,
      receive: Number(quote.outAmount) / 10 ** decimals,
      minReceived: Number(quote.otherAmountThreshold) / 10 ** decimals,
      priceImpactPct: Number(quote.priceImpactPct) * 100,
      slippageBps: quote.slippageBps,
      routeLabels: (quote.routePlan ?? [])
        .map((r) => r.swapInfo?.label)
        .filter((l): l is string => Boolean(l)),
    };
    return NextResponse.json({ ok: true, swapTransactionBase64, summary });
  } catch (err) {
    const status = (err as HttpError).status;
    const error = status === 400 || status === 422 ? "no_route" : "unavailable";
    console.warn(`[swap/build] failed ${address} $${amountUsd}: ${(err as Error).message}`);
    return NextResponse.json({ ok: false, error });
  }
}
