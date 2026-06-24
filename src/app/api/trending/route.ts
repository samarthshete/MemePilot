import { NextResponse } from "next/server";
import { getTrendingTokens } from "@/lib/ticker-tokens";

// Server proxy for the live ticker (CLAUDE.md hard rule 2): the browser polls
// this, never BirdEye. getTrendingTokens() is cached 60s, so many requests in a
// window cost one upstream call. Always returns 200 with tokens (graceful
// fallback), so the ticker never sees an error.
export async function GET() {
  const tokens = await getTrendingTokens();
  return NextResponse.json(
    { tokens },
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=60" } },
  );
}
