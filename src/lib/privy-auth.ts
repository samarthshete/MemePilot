import { PrivyClient } from "@privy-io/server-auth";
import { requireServer } from "@/lib/env";
import { publicEnv } from "@/lib/public-env";

/**
 * SERVER-ONLY: verify the Privy access token on an incoming request and return
 * the user's DID (`privy_did`), or null if missing/invalid. The client sends it
 * as `Authorization: Bearer <getAccessToken()>`. The app secret never reaches the
 * browser. This is the security boundary for all DB writes/reads keyed by user.
 */
export async function verifyPrivyDid(request: Request): Promise<string | null> {
  const appId = publicEnv.NEXT_PUBLIC_PRIVY_APP_ID;
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!appId || !token) return null;
  try {
    const privy = new PrivyClient(appId, requireServer("PRIVY_APP_SECRET"));
    const claims = await privy.verifyAuthToken(token);
    return claims.userId;
  } catch {
    return null;
  }
}
