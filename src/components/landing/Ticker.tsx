import type { CSSProperties } from "react";
import { formatPercent, formatUsdPrice } from "@/lib/format";
import type { Token } from "./ticker-data";

/**
 * Auto-scrolling neon price ticker. Server Component — the scroll, LIVE pulse,
 * and pause-on-hover are pure CSS (see globals.css `cw-ticker-*`). The track
 * renders the list twice and shifts -50% for a seamless loop; the duplicate is
 * aria-hidden so assistive tech reads the prices only once.
 */
export function Ticker({
  tokens,
  durationSeconds = 42,
  position = "top",
}: {
  tokens: Token[];
  durationSeconds?: number;
  position?: "top" | "bottom";
}) {
  const edge =
    position === "top"
      ? "border-b border-cw-green/20"
      : "border-y border-cw-green/20";

  return (
    <aside
      className={`flex h-[46px] items-stretch bg-cw-surface-2 ${edge}`}
      aria-label="Live token prices (sample data)"
    >
      <div className="flex shrink-0 items-center gap-2 border-r border-cw-green/25 bg-cw-bg px-4">
        <span className="cw-live-dot cw-glow-sm size-2 rounded-full bg-cw-green" />
        <span className="font-mono text-xs font-bold tracking-[0.18em] text-cw-green">
          LIVE
        </span>
      </div>

      <div className="cw-ticker-viewport relative flex-1 overflow-hidden">
        <div
          className="cw-ticker-track flex w-max items-center"
          style={
            { "--cw-ticker-duration": `${durationSeconds}s` } as CSSProperties
          }
        >
          <TickerRow tokens={tokens} />
          <TickerRow tokens={tokens} ariaHidden />
        </div>
      </div>
    </aside>
  );
}

function TickerRow({
  tokens,
  ariaHidden = false,
}: {
  tokens: Token[];
  ariaHidden?: boolean;
}) {
  return (
    <div className="flex" aria-hidden={ariaHidden || undefined}>
      {tokens.map((t, i) => (
        <div
          key={`${t.symbol}-${i}`}
          className="flex h-[46px] shrink-0 items-center gap-2.5 whitespace-nowrap border-r border-white/5 px-5"
        >
          <span className="grid size-[22px] place-items-center rounded-full border border-cw-green/35 bg-cw-surface font-mono text-[9px] font-bold tracking-tight text-cw-green">
            {t.tag}
          </span>
          <span className="font-mono text-[13px] font-bold text-cw-text">
            {t.symbol}
          </span>
          <span className="font-mono text-[13px] text-cw-text-muted">
            {formatUsdPrice(t.priceUsd)}
          </span>
          <span
            className={`font-mono text-[13px] font-bold ${
              t.direction === "up" ? "text-cw-green" : "text-cw-red"
            }`}
          >
            {t.direction === "up" ? "▲" : "▼"} {formatPercent(t.change24h)}
          </span>
        </div>
      ))}
    </div>
  );
}
