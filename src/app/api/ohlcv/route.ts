import { NextResponse } from "next/server";
import { getOhlcv, type OhlcvPoint, type OhlcvRange } from "@/lib/birdeye";
import { get, set } from "@/lib/cache";
import { edgeCache } from "@/lib/cache-headers";

const RANGES: readonly OhlcvRange[] = ["1D", "1W", "1M"];
const SUCCESS_TTL_MS = 300_000; // a token that loaded once stays loaded (5 min)
const NEG_TTL_MS = 15_000; // throttle re-tries on an unavailable token to ~1 / 15s

function parseRange(value: string | null): OhlcvRange {
  return RANGES.includes(value as OhlcvRange) ? (value as OhlcvRange) : "1D";
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** getOhlcv but never throws → [] on failure. */
async function safeOhlcv(address: string, range: OhlcvRange): Promise<OhlcvPoint[]> {
  try {
    return await getOhlcv(address, range);
  } catch (err) {
    console.warn(`[ohlcv] fetch failed ${address} ${range}: ${(err as Error).message}`);
    return [];
  }
}

/**
 * Server proxy for chart data (CLAUDE.md hard rule 2), resilient on the free tier.
 * Successful candles are cached 300s (in-memory + edge) so a token that loaded
 * once stays loaded. On a 429/empty BirdEye response we do ONE short retry; if
 * still empty we return a typed `{ unavailable: true }` (NOT an error) that the
 * client distinguishes and AUTO-RETRIES — never a permanent dead "Chart
 * unavailable". The unavailable response is negative-cached 15s (short edge TTL)
 * so the auto-retry can recover quickly without stampeding BirdEye.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  const range = parseRange(searchParams.get("range"));

  if (!address) {
    return NextResponse.json({ points: [], unavailable: true }, { status: 400 });
  }

  const key = `ohlcv:${address}:${range}`;
  const negKey = `ohlcv:neg:${address}:${range}`;

  // Fresh success cache → serve it.
  const cached = get<OhlcvPoint[]>(key);
  if (cached) {
    return NextResponse.json({ points: cached, range }, { headers: edgeCache(300) });
  }
  // Recent unavailable → don't re-hit BirdEye for 15s; let the client keep retrying.
  if (get<boolean>(negKey)) {
    return NextResponse.json({ points: [], unavailable: true }, { headers: edgeCache(15) });
  }

  // Cold: fetch, with ONE short retry on an empty/rate-limited result.
  let points = await safeOhlcv(address, range);
  if (points.length === 0) {
    await delay(400);
    points = await safeOhlcv(address, range);
  }

  if (points.length > 0) {
    set(key, points, SUCCESS_TTL_MS);
    return NextResponse.json({ points, range }, { headers: edgeCache(300) });
  }

  set(negKey, true, NEG_TTL_MS);
  return NextResponse.json({ points: [], unavailable: true }, { headers: edgeCache(15) });
}
