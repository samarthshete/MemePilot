import { NextResponse } from "next/server";
import { z } from "zod";
import { getTickerPrices, getTokenDecimals } from "@/lib/birdeye";
import { getOrSet } from "@/lib/cache";
import { buildSwapTransaction, getQuote } from "@/lib/jupiter";
import { getTokenBalance } from "@/lib/solana";
import {
  MAX_BUY_USD,
  MAX_SELL_USD,
  SOL_DECIMALS,
  SOL_MINT,
} from "@/lib/trading-config";

/**
 * Build (NOT send) a swap tx for the user's wallet. Server gets a FRESH quote +
 * builds via Jupiter, returns base64 `swapTransaction` for the CLIENT to sign in
 * Privy. The server never signs/sends. Caps enforced server-side; for SELL the
 * requested token amount is validated against the on-chain balance (never trust
 * the client, never oversell).
 */
const slippage = z.number().int().min(1).max(5000).default(50);
const bodySchema = z.discriminatedUnion("side", [
  z.object({
    side: z.literal("buy"),
    address: z.string().min(32),
    amountUsd: z.number().positive().max(MAX_BUY_USD),
    slippageBps: slippage,
    userPublicKey: z.string().min(32),
  }),
  z.object({
    side: z.literal("sell"),
    address: z.string().min(32),
    sellRawAmount: z.string().regex(/^[1-9]\d*$/),
    slippageBps: slippage,
    userPublicKey: z.string().min(32),
  }),
]);

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

function routeLabelsOf(routePlan: { swapInfo?: { label?: string } }[] | undefined) {
  return (routePlan ?? [])
    .map((r) => r.swapInfo?.label)
    .filter((l): l is string => Boolean(l));
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
  const body = parsed.data;

  try {
    if (body.side === "buy") {
      const { address, amountUsd, slippageBps, userPublicKey } = body;
      const solPrice = await getSolPrice();
      if (!solPrice) throw new Error("sol price unavailable");
      const decimals = await getTokenDecimals(address);
      if (decimals == null) throw new Error("token decimals unavailable");

      const lamports = Math.round((amountUsd / solPrice) * 10 ** SOL_DECIMALS);
      console.info(`[swap/build] buy ${address} $${amountUsd} ${slippageBps}bps for ${userPublicKey}`);
      const quote = await getQuote({ inputMint: SOL_MINT, outputMint: address, amount: lamports, slippageBps });
      const swapTransactionBase64 = await buildSwapTransaction({
        quoteResponse: quote,
        userPublicKey,
        wrapAndUnwrapSol: true,
      });
      return NextResponse.json({
        ok: true,
        swapTransactionBase64,
        summary: {
          side: "buy",
          payUsd: amountUsd,
          paySol: lamports / 10 ** SOL_DECIMALS,
          receive: Number(quote.outAmount) / 10 ** decimals,
          minReceived: Number(quote.otherAmountThreshold) / 10 ** decimals,
          priceImpactPct: Number(quote.priceImpactPct) * 100,
          slippageBps: quote.slippageBps,
          routeLabels: routeLabelsOf(quote.routePlan),
        },
      });
    }

    // SELL: token → SOL.
    const { address, sellRawAmount, slippageBps, userPublicKey } = body;

    // 1) Validate against the real on-chain balance — never oversell.
    const balance = await getTokenBalance(userPublicKey, address);
    if (BigInt(sellRawAmount) > BigInt(balance.rawAmount)) {
      return NextResponse.json({ ok: false, error: "exceeds_balance" });
    }

    // 2) Fresh quote token → SOL.
    console.info(`[swap/build] sell ${address} ${sellRawAmount} ${slippageBps}bps for ${userPublicKey}`);
    const quote = await getQuote({ inputMint: address, outputMint: SOL_MINT, amount: sellRawAmount, slippageBps });
    const receiveSol = Number(quote.outAmount) / 10 ** SOL_DECIMALS;

    // 3) Cap by USD-equivalent of proceeds.
    const solPrice = await getSolPrice();
    if (solPrice && receiveSol * solPrice > MAX_SELL_USD) {
      return NextResponse.json({ ok: false, error: "amount_capped" });
    }

    // 4) Build (output SOL is unwrapped to native via wrapAndUnwrapSol).
    const swapTransactionBase64 = await buildSwapTransaction({
      quoteResponse: quote,
      userPublicKey,
      wrapAndUnwrapSol: true,
    });
    return NextResponse.json({
      ok: true,
      swapTransactionBase64,
      summary: {
        side: "sell",
        sellTokens: Number(sellRawAmount) / 10 ** balance.decimals,
        receiveSol,
        receiveUsd: solPrice ? receiveSol * solPrice : null,
        minReceivedSol: Number(quote.otherAmountThreshold) / 10 ** SOL_DECIMALS,
        priceImpactPct: Number(quote.priceImpactPct) * 100,
        slippageBps: quote.slippageBps,
        routeLabels: routeLabelsOf(quote.routePlan),
      },
    });
  } catch (err) {
    const status = (err as HttpError).status;
    const error = status === 400 || status === 422 ? "no_route" : "unavailable";
    console.warn(`[swap/build] failed ${body.address}: ${(err as Error).message}`);
    return NextResponse.json({ ok: false, error });
  }
}
