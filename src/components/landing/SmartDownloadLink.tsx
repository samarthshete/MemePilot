"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { trackDownloadClick } from "@/lib/analytics";
import { detectMobileOS } from "@/lib/device";
import { APP_STORE_URL, PLAY_STORE_URL } from "./store-links";

/**
 * Single green "Download" pill (header/footer). Routes to the platform store:
 * iOS → App Store, Android → Google Play, desktop → App Store. Server-renders
 * with the App Store URL, then refines the href after mount (an attribute swap,
 * so no visible hydration change). Fires the no-PII download_click event.
 */
export function SmartDownloadLink({
  children,
  className = "",
  location = "header",
}: {
  children: ReactNode;
  className?: string;
  location?: string;
}) {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.href =
        detectMobileOS() === "android" ? PLAY_STORE_URL : APP_STORE_URL;
    }
  }, []);

  return (
    <a
      ref={ref}
      href={APP_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() =>
        trackDownloadClick(
          detectMobileOS() === "android" ? "google_play" : "app_store",
          location,
        )
      }
      className={`cw-glow-cta inline-flex min-h-[44px] items-center justify-center rounded-full bg-cw-green px-5 font-extrabold text-cw-bg transition-[box-shadow,transform,background-color] hover:bg-cw-green-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cw-green focus-visible:ring-offset-2 focus-visible:ring-offset-cw-bg active:translate-y-px active:bg-cw-green-press ${className}`}
    >
      {children}
    </a>
  );
}
