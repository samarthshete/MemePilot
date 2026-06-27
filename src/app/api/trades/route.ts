import { NextResponse } from "next/server";
import { getRecentTrades } from "@/lib/birdeye";
import { getOrSet } from "@/lib/cache";
import { edgeCache } from "@/lib/cache-headers";

/**
 * Recent trades proxy. Cached 30s per address (fast-changing) → one upstream
 * call per window even while the Live Trades tab polls; edge cache (30s + SWR)
 * absorbs concurrent visitors. Always 200; on failure/gating returns
 * `{ trades: [], unavailable: true }`.
 */
export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get("address");
  if (!address) {
    return NextResponse.json({ trades: [], unavailable: true }, { status: 400 });
  }
  try {
    const trades = await getOrSet(`trades:${address}`, 30_000, () => {
      console.info(`[trades] cache miss → BirdEye ${address}`);
      return getRecentTrades(address);
    });
    return NextResponse.json({ trades }, { headers: edgeCache(30) });
  } catch (err) {
    console.warn(`[trades] failed for ${address}: ${(err as Error).message}`);
    return NextResponse.json({ trades: [], unavailable: true });
  }
}
