import Link from "next/link";
import { formatPercent, formatUsdPrice } from "@/lib/format";
import type { Token } from "@/components/landing/ticker-data";

/** Left-column trending list. Reuses /api/trending data; links to each token. */
export function TrendingList({
  tokens,
  activeAddress,
}: {
  tokens: Token[];
  activeAddress: string;
}) {
  const linkable = tokens.filter((t) => t.address);

  return (
    <nav aria-label="Trending tokens" className="flex flex-col gap-1">
      <h2 className="px-2 pb-2 font-mono text-xs font-bold uppercase tracking-[0.16em] text-cw-text-muted">
        Trending
      </h2>
      {linkable.map((t) => {
        const active = t.address === activeAddress;
        return (
          <Link
            key={t.address}
            href={`/t/${t.address}`}
            aria-current={active ? "page" : undefined}
            className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cw-green ${
              active ? "bg-cw-green/10 ring-1 ring-cw-green/40" : "hover:bg-white/5"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-full border border-cw-green/35 bg-cw-surface font-mono text-[9px] font-bold text-cw-green">
                {t.tag}
              </span>
              <span className="font-mono text-sm font-bold text-cw-text">
                {t.symbol}
              </span>
            </span>
            <span className="flex flex-col items-end">
              <span className="font-mono text-xs text-cw-text-muted">
                {formatUsdPrice(t.priceUsd)}
              </span>
              <span
                className={`font-mono text-xs font-bold ${
                  t.direction === "up" ? "text-cw-green" : "text-cw-red"
                }`}
              >
                {t.direction === "up" ? "▲" : "▼"} {formatPercent(t.change24h)}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
