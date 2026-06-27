"use client";

import { useEffect, useState } from "react";
import { formatPercent, formatUsdPrice } from "@/lib/format";
import type { PriceSource } from "@/lib/price";

type PriceState = {
  priceUsd: number | null;
  change24h: number | null;
  source: PriceSource;
};

const SOURCE_LABEL: Record<PriceSource, string> = {
  birdeye: "BirdEye",
  jupiter: "Jupiter",
  dexscreener: "DexScreener",
  none: "—",
};

/**
 * Token-header price. Server passes the initial value (already resolved via the
 * multi-source resolver), then this refreshes from /api/price (client → /api/*
 * only) so a stale SSR value updates without a full reload. "Price unavailable"
 * shows only when EVERY free source failed (source === "none").
 */
export function TokenPrice({
  address,
  initial,
}: {
  address: string;
  initial: PriceState;
}) {
  const [price, setPrice] = useState<PriceState>(initial);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetch(`/api/price?address=${encodeURIComponent(address)}`);
        const data = (await res.json()) as PriceState;
        // setState here is inside an async callback (post-await), not the effect
        // body — safe under react-hooks/set-state-in-effect.
        if (active && typeof data.priceUsd === "number") setPrice(data);
      } catch {
        /* keep the SSR initial value */
      }
    })();
    return () => {
      active = false;
    };
  }, [address]);

  const hasPrice = price.priceUsd !== null;
  const up = (price.change24h ?? 0) >= 0;

  return (
    <div className="text-right">
      <div className="font-mono text-3xl font-bold text-cw-text">
        {hasPrice ? formatUsdPrice(price.priceUsd as number) : "—"}
      </div>
      {hasPrice ? (
        <>
          {price.change24h !== null && (
            <div
              className={`font-mono text-sm font-bold ${up ? "text-cw-green" : "text-cw-red"}`}
            >
              {up ? "▲" : "▼"} {formatPercent(price.change24h)} (24h)
            </div>
          )}
          <div className="font-mono text-[10px] uppercase tracking-wide text-cw-text-muted">
            via {SOURCE_LABEL[price.source]}
          </div>
        </>
      ) : (
        <div className="font-mono text-sm text-cw-text-muted">Price unavailable</div>
      )}
    </div>
  );
}
