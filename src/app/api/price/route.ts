import { NextResponse } from "next/server";
import { z } from "zod";
import { edgeCache } from "@/lib/cache-headers";
import { getPrice } from "@/lib/price";

/**
 * Multi-source price proxy (CLAUDE.md hard rule 2): BirdEye → Jupiter → DexScreener,
 * first success wins. Always 200 with `{ priceUsd, change24h, liquidityUsd, source,
 * degraded }`; `priceUsd` is null only when ALL free sources fail. Cached 30s in
 * memory + at the edge (30s + SWR).
 */
const querySchema = z.object({ address: z.string().min(32) });

export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get("address");
  const parsed = querySchema.safeParse({ address });
  if (!parsed.success) {
    return NextResponse.json(
      { priceUsd: null, change24h: null, liquidityUsd: null, source: "none", degraded: true },
      { status: 400 },
    );
  }
  const result = await getPrice(parsed.data.address);
  return NextResponse.json(result, { headers: edgeCache(30) });
}
