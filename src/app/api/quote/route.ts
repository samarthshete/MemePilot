import { NextResponse } from "next/server";
import { z } from "zod";
import { getTickerPrices, getTokenDecimals } from "@/lib/birdeye";
import { getOrSet } from "@/lib/cache";
import { getQuote } from "@/lib/jupiter";
import { SOL_DECIMALS, SOL_MINT } from "@/lib/trading-config";

/**
 * QUOTE ONLY — proves route/fees/slippage with zero money risk. NEVER calls
 * /swap, builds a tx, or signs. BUY sizes from USD (→ SOL in); SELL sizes from a
 * raw token amount (token → SOL out). Cached ~12s per inputs → one Jupiter call
 * per window. Always returns a typed shape; never crashes.
 */
const DEFAULT_SLIPPAGE_BPS = 50;

const slippage = z.number().int().min(1).max(5000).optional();
const bodySchema = z.discriminatedUnion("side", [
  z.object({
    side: z.literal("buy"),
    address: z.string().min(32),
    amountUsd: z.number().positive().max(1_000_000),
    slippageBps: slippage,
  }),
  z.object({
    side: z.literal("sell"),
    address: z.string().min(32),
    sellRawAmount: z.string().regex(/^[1-9]\d*$/), // positive integer string
    slippageBps: slippage,
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
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const body = parsed.data;
  const slippageBps = body.slippageBps ?? DEFAULT_SLIPPAGE_BPS;
  const { address } = body;

  try {
    if (body.side === "buy") {
      const result = await getOrSet(
        `quote:buy:${address}:${body.amountUsd}:${slippageBps}`,
        12_000,
        async () => {
          const solPrice = await getSolPrice();
          if (!solPrice) throw new Error("sol price unavailable");
          const decimals = await getTokenDecimals(address);
          if (decimals == null) throw new Error("token decimals unavailable");
          const lamports = Math.round((body.amountUsd / solPrice) * 10 ** SOL_DECIMALS);
          console.info(`[quote] cache miss → Jupiter buy ${address} $${body.amountUsd} ${slippageBps}bps`);
          const q = await getQuote({ inputMint: SOL_MINT, outputMint: address, amount: lamports, slippageBps });
          return {
            ok: true as const,
            side: "buy" as const,
            payUsd: body.amountUsd,
            paySol: lamports / 10 ** SOL_DECIMALS,
            receive: Number(q.outAmount) / 10 ** decimals,
            minReceived: Number(q.otherAmountThreshold) / 10 ** decimals,
            priceImpactPct: Number(q.priceImpactPct) * 100,
            slippageBps: q.slippageBps,
            routeLabels: routeLabelsOf(q.routePlan),
          };
        },
      );
      return NextResponse.json(result);
    }

    // SELL: token → SOL, sized by raw token amount.
    const result = await getOrSet(
      `quote:sell:${address}:${body.sellRawAmount}:${slippageBps}`,
      12_000,
      async () => {
        const solPrice = await getSolPrice();
        console.info(`[quote] cache miss → Jupiter sell ${address} ${body.sellRawAmount} ${slippageBps}bps`);
        const q = await getQuote({ inputMint: address, outputMint: SOL_MINT, amount: body.sellRawAmount, slippageBps });
        const receiveSol = Number(q.outAmount) / 10 ** SOL_DECIMALS;
        const minSol = Number(q.otherAmountThreshold) / 10 ** SOL_DECIMALS;
        return {
          ok: true as const,
          side: "sell" as const,
          receiveSol,
          receiveUsd: solPrice ? receiveSol * solPrice : null,
          minReceivedSol: minSol,
          priceImpactPct: Number(q.priceImpactPct) * 100,
          slippageBps: q.slippageBps,
          routeLabels: routeLabelsOf(q.routePlan),
        };
      },
    );
    return NextResponse.json(result);
  } catch (err) {
    const status = (err as HttpError).status;
    const error = status === 400 || status === 422 ? "no_route" : "unavailable";
    console.warn(`[quote] failed ${address}: ${(err as Error).message}`);
    return NextResponse.json({ ok: false, error });
  }
}
