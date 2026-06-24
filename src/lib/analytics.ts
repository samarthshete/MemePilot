import { track } from "@vercel/analytics";

export type DownloadPlatform = "app_store" | "google_play";

/**
 * Phase-1 success metric: download click-through. No PII — we only record which
 * store and which on-page location the click came from. Client-only (`track`
 * from @vercel/analytics); safe to call before Analytics mounts (it queues).
 */
export function trackDownloadClick(
  platform: DownloadPlatform,
  location: string,
): void {
  track("download_click", { platform, location });
}
