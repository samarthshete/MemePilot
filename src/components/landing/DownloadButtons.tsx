"use client";

import { useEffect, useRef } from "react";
import { detectMobileOS } from "@/lib/device";
import { APP_STORE_URL, PLAY_STORE_URL } from "./store-links";

/**
 * App Store + Google Play download badges. Real <a> links to the public store
 * URLs. Both badges always render (good for SSR/SEO and no CLS); after mount we
 * tag the device on the wrapper and CSS surfaces the platform-relevant badge
 * first — Android → Google Play first, otherwise App Store first.
 *
 * Badges are on-brand placeholders; drop the official SVGs into public/brand/
 * and swap <StoreBadge> internals when they're available.
 */
export function DownloadButtons({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.dataset.os = detectMobileOS();
  }, []);

  return (
    <div
      ref={ref}
      className={`group/dl flex flex-col gap-3 sm:flex-row ${className}`}
    >
      <StoreBadge
        store="app-store"
        href={APP_STORE_URL}
        className="group-data-[os=android]/dl:order-last"
      />
      <StoreBadge
        store="google-play"
        href={PLAY_STORE_URL}
        className="group-data-[os=android]/dl:order-first"
      />
    </div>
  );
}

function StoreBadge({
  store,
  href,
  className = "",
}: {
  store: "app-store" | "google-play";
  href: string;
  className?: string;
}) {
  const isAppStore = store === "app-store";
  const base =
    "group flex min-h-[52px] flex-1 items-center justify-center gap-3 rounded-2xl px-5 py-3 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cw-green focus-visible:ring-offset-2 focus-visible:ring-offset-cw-bg active:translate-y-px hover:-translate-y-0.5 sm:justify-start";
  const skin = isAppStore
    ? "cw-glow-badge bg-cw-green text-cw-bg hover:bg-cw-green-press active:bg-cw-green-press"
    : "border border-white/12 bg-cw-surface text-cw-text hover:border-cw-green";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${base} ${skin} ${className}`}
      aria-label={isAppStore ? "Download on the App Store" : "Get it on Google Play"}
    >
      {isAppStore ? (
        <span className="grid size-8 grid-cols-2 gap-[3px] rounded-lg bg-cw-bg p-[7px]">
          <span className="rounded-[2px] bg-cw-green" />
          <span className="rounded-[2px] bg-cw-green" />
          <span className="rounded-[2px] bg-cw-green" />
          <span className="rounded-[2px] bg-cw-green" />
        </span>
      ) : (
        <span className="grid size-8 place-items-center rounded-lg bg-cw-green">
          <span className="ml-1 size-0 border-y-[7px] border-l-[12px] border-y-transparent border-l-cw-bg" />
        </span>
      )}
      <span className="flex flex-col leading-tight">
        <span
          className={`text-[11px] font-semibold ${isAppStore ? "text-cw-bg/70" : "text-cw-text-muted"}`}
        >
          {isAppStore ? "Download on the" : "Get it on"}
        </span>
        <span className="text-lg font-black tracking-tight">
          {isAppStore ? "App Store" : "Google Play"}
        </span>
      </span>
    </a>
  );
}
