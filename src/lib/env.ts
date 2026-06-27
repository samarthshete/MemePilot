import { z } from "zod";

/**
 * SERVER-ONLY environment access — secrets, validated with zod at the boundary
 * (CLAUDE.md hard rule 6). `getServerEnv()` / `requireServer()` throw if read in
 * the browser. Never import this into a Client Component — that would bundle the
 * secret-key NAMES into the client. Public (`NEXT_PUBLIC_*`) values live in the
 * separate `public-env.ts` so client code can read them safely.
 *
 * All vars are optional for now. As features land, either flip a field to
 * required in the schema, or call `requireServer` at the use site to get a clear
 * "missing var" error instead of a silent `undefined`.
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
  // Supabase (server-only): portfolio/trades persistence. Service-role key — must
  // NEVER reach the client; only the server API routes touch the DB.
  SUPABASE_URL: z.url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
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
