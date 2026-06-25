import { NextResponse } from "next/server";
import { z } from "zod";
import { getTickerPrices, getTokenDecimals } from "@/lib/birdeye";
import { getOrSet } from "@/lib/cache";
import { getQuote } from "@/lib/jupiter";

/**
 * QUOTE ONLY (Stage 6a) — proves the route/fees/slippage pipeline with zero
 * money risk. NEVER calls /swap, builds a transaction, or signs. Cached ~12s per
 * (address, amountUsd, slippage) → one Jupiter call per window. Always returns a
 * clean shape; failures are typed ({ ok:false, error }) so the UI never crashes.
 */
const SOL_MINT = "So11111111111111111111111111111111111111112";
const SOL_DECIMALS = 9;
const DEFAULT_SLIPPAGE_BPS = 50;

const bodySchema = z.object({
  address: z.string().min(32),
  amountUsd: z.number().positive().max(1_000_000),
  side: z.enum(["buy", "sell"]),
  slippageBps: z.number().int().min(1).max(5000).optional(),
});

type HttpError = { status?: number };

/** SOL price cached 30s so different amounts don't each re-hit BirdEye. */
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
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const { address, amountUsd, side } = parsed.data;
  const slippageBps = parsed.data.slippageBps ?? DEFAULT_SLIPPAGE_BPS;

  // Sell needs a real position to size from — deferred to Stage 6b.
  if (side === "sell") {
    return NextResponse.json({ ok: false, error: "sell_unavailable" });
  }

  try {
    const result = await getOrSet(
      `quote:buy:${address}:${amountUsd}:${slippageBps}`,
      12_000,
      async () => {
        const solPrice = await getSolPrice();
        if (!solPrice) throw new Error("sol price unavailable");
        const decimals = await getTokenDecimals(address);
        if (decimals == null) throw new Error("token decimals unavailable");

        const lamports = Math.round((amountUsd / solPrice) * 10 ** SOL_DECIMALS);
        console.info(
          `[quote] cache miss → Jupiter buy ${address} $${amountUsd} ${slippageBps}bps`,
        );
        const q = await getQuote({
          inputMint: SOL_MINT,
          outputMint: address,
          amount: lamports,
          slippageBps,
        });

        const routeLabels = (q.routePlan ?? [])
          .map((r) => r.swapInfo?.label)
          .filter((l): l is string => Boolean(l));

        return {
          ok: true as const,
          side: "buy" as const,
          payUsd: amountUsd,
          paySol: lamports / 10 ** SOL_DECIMALS,
          receive: Number(q.outAmount) / 10 ** decimals,
          minReceived: Number(q.otherAmountThreshold) / 10 ** decimals,
          priceImpactPct: Number(q.priceImpactPct) * 100,
          slippageBps: q.slippageBps,
          routeLabels,
        };
      },
    );
    return NextResponse.json(result);
  } catch (err) {
    const status = (err as HttpError).status;
    const error = status === 400 || status === 422 ? "no_route" : "unavailable";
    console.warn(`[quote] failed ${address} $${amountUsd}: ${(err as Error).message}`);
    return NextResponse.json({ ok: false, error });
  }
}
