import { publicEnv } from "@/lib/public-env";

/** Canonical site URL (falls back to localhost for local dev). */
export const SITE_URL = publicEnv.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Index the site only on the real production host. Preview/dev/local stay
 * noindex (robots disallow + meta robots) so they never get crawled. Vercel
 * also sets VERCEL_ENV="preview" on preview deploys.
 */
export const IS_INDEXABLE =
  process.env.VERCEL_ENV === "production" && !SITE_URL.includes("localhost");
