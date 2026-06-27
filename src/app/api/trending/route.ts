import { NextResponse } from "next/server";
import { edgeCache } from "@/lib/cache-headers";
import { getTrendingTokens } from "@/lib/ticker-tokens";

// Server proxy for the live ticker (CLAUDE.md hard rule 2): the browser polls
// this, never BirdEye. getTrendingTokens() is cached, so many requests in a
// window cost one upstream call; the edge cache (60s + SWR) absorbs the rest.
// Always returns 200 with tokens (graceful fallback), so the ticker never errors.
export async function GET() {
  const tokens = await getTrendingTokens();
  return NextResponse.json({ tokens }, { headers: edgeCache(60) });
}
