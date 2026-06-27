import { NextResponse } from "next/server";
import { z } from "zod";
import { edgeCache } from "@/lib/cache-headers";
import { getSafetyReport } from "@/lib/safety/signals";

/**
 * Pre-trade safety report. GET ?address=&amountUsd=&priceImpactPct=
 * `priceImpactPct` is the fraction from the caller's existing quote (amountUsd is
 * accepted for context). Always 200 — the report carries `degraded:true` when a
 * source was unavailable; the client never sees a crash or any key.
 */
const querySchema = z.object({
  address: z.string().min(32),
  amountUsd: z.coerce.number().positive().optional(),
  priceImpactPct: z.coerce.number().optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    address: searchParams.get("address"),
    amountUsd: searchParams.get("amountUsd") ?? undefined,
    priceImpactPct: searchParams.get("priceImpactPct") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const report = await getSafetyReport(parsed.data.address, parsed.data.priceImpactPct ?? null);
  return NextResponse.json(report, { headers: edgeCache(300) });
}
