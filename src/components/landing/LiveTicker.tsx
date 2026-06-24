"use client";

import { useEffect, useState } from "react";
import { Ticker } from "./Ticker";
import type { Token } from "./ticker-data";

/**
 * Client wrapper around the presentational <Ticker>. Seeds with the
 * server-rendered tokens (real prices in the initial HTML), then refreshes from
 * /api/trending every 60s. Never calls BirdEye directly — only our cached proxy.
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
    const id = setInterval(refresh, 60_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return (
    <Ticker tokens={tokens} position={position} durationSeconds={durationSeconds} />
  );
}
