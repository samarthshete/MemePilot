import { NextResponse } from "next/server";
import { getOhlcv, type OhlcvRange } from "@/lib/birdeye";
import { getOrSet } from "@/lib/cache";

const RANGES: readonly OhlcvRange[] = ["1D", "1W", "1M"];

function parseRange(value: string | null): OhlcvRange {
  return RANGES.includes(value as OhlcvRange) ? (value as OhlcvRange) : "1D";
}

/**
 * Server proxy for chart data (CLAUDE.md hard rule 2). Cached per (address,range)
 * for 180s → one upstream BirdEye call per window. Always 200 with `points`;
 * on failure returns `{ points: [], unavailable: true }` so the chart shows a
 * clean empty state and the page never crashes.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  const range = parseRange(searchParams.get("range"));

  if (!address) {
    return NextResponse.json({ points: [], unavailable: true }, { status: 400 });
  }

  try {
    const points = await getOrSet(`ohlcv:${address}:${range}`, 180_000, () => {
      console.info(`[ohlcv] cache miss → BirdEye ${address} ${range}`);
      return getOhlcv(address, range);
    });
    return NextResponse.json(
      { points, range },
      { headers: { "Cache-Control": "public, max-age=0, s-maxage=180" } },
    );
  } catch (err) {
    console.warn(`[ohlcv] failed for ${address} ${range}: ${(err as Error).message}`);
    return NextResponse.json({ points: [], unavailable: true });
  }
}
