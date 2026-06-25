"use client";

import { useEffect, useState } from "react";
import { Ticker } from "./Ticker";
import type { Token } from "./ticker-data";

// Matches the server cache TTL (ticker-tokens.ts TTL_MS = 300s). Polling faster
// than the TTL only re-reads the cache and keeps it warm — see ADR-017.
const POLL_INTERVAL_MS = 300_000;

/**
 * Client wrapper around the presentational <Ticker>. Seeds with the
 * server-rendered tokens (real prices in the initial HTML), then refreshes from
 * /api/trending every 5 min. Polling pauses while the tab is hidden (zero polls
 * in a background tab) and refetches once on return. Never calls BirdEye
 * directly — only our cached proxy.
 */
export function LiveTicker({
  initialTokens,
  position,
  durationSeconds,
}: {
  initialTokens: Token[];
  position: "top" | "bottom";
  durationSeconds: number;
}) {
  const [tokens, setTokens] = useState<Token[]>(initialTokens);

  useEffect(() => {
    let active = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const refresh = async () => {
      try {
        const res = await fetch("/api/trending", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { tokens?: Token[] };
        if (active && Array.isArray(data.tokens) && data.tokens.length > 0) {
          setTokens(data.tokens);
        }
      } catch {
        // Network hiccup — keep showing the current tokens.
      }
    };

    const startPolling = () => {
      if (intervalId === null) intervalId = setInterval(refresh, POLL_INTERVAL_MS);
    };
    const stopPolling = () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling(); // background tab → zero polls
      } else {
        void refresh(); // catch up once on return…
        startPolling(); // …then resume
      }
    };

    if (!document.hidden) startPolling();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      active = false;
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return (
    <Ticker tokens={tokens} position={position} durationSeconds={durationSeconds} />
  );
}
