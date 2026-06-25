import { z } from "zod";

/**
 * Public env — `NEXT_PUBLIC_*` values that are safe to ship to the browser
 * (Privy App ID, site URL, store links, public RPC). Kept in its OWN module so
 * client components can read it WITHOUT pulling the server-secret schema
 * (`env.ts`) — that's how the BirdEye/Privy secret key names stay out of the
 * client bundle (CLAUDE.md hard rule 1).
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_PRIVY_APP_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_SITE_URL: z.url().optional(),
  NEXT_PUBLIC_SOLANA_RPC_URL: z.url().optional(),
  NEXT_PUBLIC_APP_STORE_URL: z.url().optional(),
  NEXT_PUBLIC_PLAY_STORE_URL: z.url().optional(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

// NEXT_PUBLIC_* are statically inlined by Next at build time, so each must be
// referenced explicitly (not via a dynamic key) to make it into the bundle.
export const publicEnv: PublicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_PRIVY_APP_ID: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
  NEXT_PUBLIC_APP_STORE_URL: process.env.NEXT_PUBLIC_APP_STORE_URL,
  NEXT_PUBLIC_PLAY_STORE_URL: process.env.NEXT_PUBLIC_PLAY_STORE_URL,
});

// Guard (ADR-006): the public RPC ships to the browser, so it must be KEYLESS.
// A keyed URL (Alchemy /v2/<key>, ?api-key=…) belongs in server-only SOLANA_RPC_URL.
// Throws at startup/build to prevent re-introducing the leak.
{
  const rpc = publicEnv.NEXT_PUBLIC_SOLANA_RPC_URL;
  if (
    rpc &&
    (/alchemy/i.test(rpc) ||
      /\/v2\/[A-Za-z0-9_-]+/.test(rpc) ||
      /[?&]api[-_]?key=/i.test(rpc))
  ) {
    throw new Error(
      "NEXT_PUBLIC_SOLANA_RPC_URL looks like a KEYED RPC URL (e.g. Alchemy /v2/<key> or ?api-key=). " +
        "A keyed RPC URL must NOT be in a NEXT_PUBLIC_ var — it would ship to the browser. " +
        "Use a keyless/public RPC here (e.g. https://api.mainnet-beta.solana.com) and put the keyed URL in the server-only SOLANA_RPC_URL.",
    );
  }
}

/** Read a public var, throwing a clear error if it's missing. */
export function requirePublic<K extends keyof PublicEnv>(
  key: K,
): NonNullable<PublicEnv[K]> {
  const value = publicEnv[key];
  if (value === undefined || value === "") {
    throw new Error(
      `Missing required public env var ${key}. Add it to .env.local (see .env.example).`,
    );
  }
  return value as NonNullable<PublicEnv[K]>;
}
