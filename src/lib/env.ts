import { z } from "zod";

/**
 * Environment access, validated with zod at the boundary (CLAUDE.md hard rule 6).
 *
 * Two surfaces:
 *  - `getServerEnv()` / `requireServer()` — secrets. SERVER-ONLY. Reads throw if
 *    they ever run in the browser. Never import these into a Client Component.
 *  - `publicEnv` / `requirePublic()` — `NEXT_PUBLIC_*` values that are safe to
 *    ship to the browser (Privy App ID, site URL, store links, public RPC).
 *
 * All vars are optional for now (Stage 0). As features land, either flip a field
 * to required in the schema, or call the `require*` helper at the use site to get
 * a clear "missing var" error instead of a silent `undefined`.
 */

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
}

/* ----------------------------- server (secret) ---------------------------- */

const serverEnvSchema = z.object({
  PRIVY_APP_SECRET: z.string().min(1).optional(),
  BIRDEYE_API_KEY: z.string().min(1).optional(),
  SOLANA_RPC_URL: z.url().optional(),
  JUPITER_API_KEY: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedServerEnv: ServerEnv | null = null;

/** Parse + cache the server env. Throws if called in the browser. */
export function getServerEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error(
      "getServerEnv() was called in the browser. Server env holds secrets and must only be read on the server.",
    );
  }
  if (cachedServerEnv) return cachedServerEnv;

  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid server environment variables:\n${formatIssues(parsed.error)}`,
    );
  }
  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

/** Read a server var, throwing a clear error if it's missing. */
export function requireServer<K extends keyof ServerEnv>(
  key: K,
): NonNullable<ServerEnv[K]> {
  const value = getServerEnv()[key];
  if (value === undefined || value === "") {
    throw new Error(
      `Missing required server env var ${key}. Set it in .env.local (see .env.example).`,
    );
  }
  return value as NonNullable<ServerEnv[K]>;
}

/* ------------------------------ public (safe) ----------------------------- */

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
