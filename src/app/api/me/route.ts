import { NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import { requireServer } from "@/lib/env";
import { publicEnv } from "@/lib/public-env";

/**
 * Server-side verification of the Privy ACCESS token (the seam Stage 6 builds
 * on). The client sends it as `Authorization: Bearer <getAccessToken()>`. The
 * app secret never reaches the browser. Returns { userId } on success, 401
 * otherwise.
 */
export async function GET(request: Request) {
  const appId = publicEnv.NEXT_PUBLIC_PRIVY_APP_ID;
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!appId || !token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const privy = new PrivyClient(appId, requireServer("PRIVY_APP_SECRET"));
    const claims = await privy.verifyAuthToken(token);
    return NextResponse.json({ userId: claims.userId });
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}
