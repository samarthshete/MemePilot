import { NextResponse } from "next/server";
import { getTickerPrices } from "@/lib/birdeye";
import { getTokenBalance } from "@/lib/solana";

/**
 * "Your position" — token balance (server RPC) valued at the BirdEye price.
 * `owner` is the public wallet address (safe to pass). Read-only; always 200.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  const owner = searchParams.get("owner");
  if (!address || !owner) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  try {
    const balance = await getTokenBalance(owner, address);
    let valueUsd: number | null = null;
    try {
      const price = (await getTickerPrices([address])).get(address);
      if (price) valueUsd = balance.uiAmount * price.priceUsd;
    } catch {
      // price optional — qty alone is still useful
    }
    return NextResponse.json({
      ok: true,
      qty: balance.uiAmount,
      rawAmount: balance.rawAmount,
      decimals: balance.decimals,
      valueUsd,
    });
  } catch (err) {
    console.warn(`[position] failed ${address}/${owner}: ${(err as Error).message}`);
    return NextResponse.json({ ok: false, error: "unavailable" });
  }
}
