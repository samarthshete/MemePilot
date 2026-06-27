import { NextResponse } from "next/server";
import { z } from "zod";
import { buildPortfolio } from "@/lib/portfolio";
import { verifyPrivyDid } from "@/lib/privy-auth";
import { isSupabaseConfigured, upsertUser } from "@/lib/supabase";

/**
 * GET /api/portfolio?owner=<wallet>&name=&email=
 * Auth: `Authorization: Bearer <Privy access token>` → privy_did (security key
 * for the trades read). `owner` is the public wallet address (on-chain holdings
 * are public data). Returns holdings + positions/PnL + history + hasDemo. 401 if
 * the token is missing/invalid. Never exposes any key.
 */
const querySchema = z.object({
  owner: z.string().min(32),
  name: z.string().optional(),
  email: z.string().optional(),
});

export async function GET(request: Request) {
  const did = await verifyPrivyDid(request);
  if (!did) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    owner: searchParams.get("owner"),
    name: searchParams.get("name") ?? undefined,
    email: searchParams.get("email") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { owner, name, email } = parsed.data;

  // Best-effort profile cache (never blocks the read).
  await upsertUser({ privy_did: did, wallet_address: owner, display_name: name, email });

  const portfolio = await buildPortfolio(did, owner);
  return NextResponse.json(
    { ...portfolio, dbConfigured: isSupabaseConfigured() },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
