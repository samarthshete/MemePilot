import { NextResponse } from "next/server";
import { getTopHolders } from "@/lib/birdeye";
import { getOrSet } from "@/lib/cache";
import { edgeCache } from "@/lib/cache-headers";

/**
 * Top holders proxy. Cached 300s per address (slow-changing) → one upstream
 * call per window. Always 200; on failure/gating returns
 * `{ holders: [], unavailable: true }` so the tab shows a clean empty state.
 */
export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get("address");
  if (!address) {
    return NextResponse.json({ holders: [], unavailable: true }, { status: 400 });
  }
  try {
    const holders = await getOrSet(`holders:${address}`, 300_000, () => {
      console.info(`[holders] cache miss → BirdEye ${address}`);
      return getTopHolders(address);
    });
    return NextResponse.json({ holders }, { headers: edgeCache(300) });
  } catch (err) {
    console.warn(`[holders] failed for ${address}: ${(err as Error).message}`);
    return NextResponse.json({ holders: [], unavailable: true });
  }
}
