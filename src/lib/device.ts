/**
 * Lightweight client-side device detection for download routing.
 * Browser-only (reads `navigator`) — call from a Client Component after mount.
 */
export type MobileOS = "ios" | "android" | "other";

export function detectMobileOS(): MobileOS {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";

  // iPadOS 13+ reports as desktop Safari; disambiguate via touch support.
  const isIOS =
    /iPhone|iPad|iPod/i.test(ua) ||
    (/Macintosh/i.test(ua) &&
      typeof document !== "undefined" &&
      "ontouchend" in document);
  if (isIOS) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}
