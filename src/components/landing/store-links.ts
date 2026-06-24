import { publicEnv } from "@/lib/public-env";

/**
 * Store download links, sourced from public env (CLAUDE.md: client only ever
 * sees NEXT_PUBLIC_*). Fall back to "#" so the landing page still renders
 * cleanly before the URLs are configured in .env.local.
 */
export const APP_STORE_URL = publicEnv.NEXT_PUBLIC_APP_STORE_URL ?? "#";
export const PLAY_STORE_URL = publicEnv.NEXT_PUBLIC_PLAY_STORE_URL ?? "#";
