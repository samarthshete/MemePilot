import { publicEnv } from "@/lib/public-env";

/**
 * Store download links, sourced from public env (CLAUDE.md: client only ever
 * sees NEXT_PUBLIC_*). Fall back to the canonical store URLs so the links are
 * always live (and never 404) even before/without the env override.
 * NOTE the Play package id is `xyz.chadwallet.www` — the bare `xyz.chadwallet`
 * 404s; keep them in sync if either store listing moves.
 */
const APP_STORE_FALLBACK = "https://apps.apple.com/us/app/chadwallet/id6757367474";
const PLAY_STORE_FALLBACK =
  "https://play.google.com/store/apps/details?id=xyz.chadwallet.www";

export const APP_STORE_URL =
  publicEnv.NEXT_PUBLIC_APP_STORE_URL ?? APP_STORE_FALLBACK;
export const PLAY_STORE_URL =
  publicEnv.NEXT_PUBLIC_PLAY_STORE_URL ?? PLAY_STORE_FALLBACK;
