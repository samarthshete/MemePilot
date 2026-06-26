import type { Metadata } from "next";
import { Suspense } from "react";
import { LiveTicker } from "@/components/landing/LiveTicker";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { TickerSkeleton } from "@/components/landing/TickerSkeleton";
import { BuySellShell } from "@/components/trading/BuySellShell";
import { ContractChip } from "@/components/trading/ContractChip";
import { PriceChart } from "@/components/trading/PriceChart";
import { TokenTabs } from "@/components/trading/TokenTabs";
import { TrendingList } from "@/components/trading/TrendingList";
import { formatPercent, formatUsdPrice } from "@/lib/format";
import {
  CURATED_TOKENS,
  getTokenSummary,
  getTrendingTokens,
} from "@/lib/ticker-tokens";

type Params = { params: Promise<{ address: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { address } = await params;
  const symbol =
    CURATED_TOKENS.find((t) => t.address === address)?.symbol ?? "Token";
  return { title: `Trade ${symbol} — MemePilot` };
}

async function TickerData() {
  const tokens = await getTrendingTokens();
  return <LiveTicker initialTokens={tokens} position="top" durationSeconds={42} />;
}

export default async function TradingPage({ params }: Params) {
  const { address } = await params;
  const [tokens, summary] = await Promise.all([
    getTrendingTokens(),
    getTokenSummary(address),
  ]);

  const hasPrice = summary.priceUsd !== null && summary.change24h !== null;
  const up = (summary.change24h ?? 0) >= 0;

  return (
    <>
      <Suspense fallback={<TickerSkeleton position="top" />}>
        <TickerData />
      </Suspense>
      <SiteHeader />

      <main className="mx-auto grid w-full max-w-[1400px] gap-4 px-[clamp(0.875rem,3vw,2rem)] py-6 lg:grid-cols-[260px_minmax(0,1fr)_340px]">
        {/* LEFT — trending list */}
        <div className="order-3 lg:order-1">
          <TrendingList tokens={tokens} activeAddress={address} />
        </div>

        {/* MIDDLE — token header + chart + (placeholder) tabs */}
        <section className="order-1 min-w-0 lg:order-2">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-full border border-cw-green/35 bg-cw-surface font-mono text-[11px] font-bold text-cw-green">
                  {summary.tag}
                </span>
                <h1 className="text-2xl font-black tracking-[-0.02em]">
                  {summary.symbol}
                </h1>
                {!summary.known && (
                  <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cw-text-muted">
                    Unverified
                  </span>
                )}
              </div>
              <div className="mt-1.5">
                <ContractChip address={address} />
              </div>
            </div>

            <div className="text-right">
              <div className="font-mono text-3xl font-bold text-cw-text">
                {hasPrice ? formatUsdPrice(summary.priceUsd as number) : "—"}
              </div>
              {hasPrice ? (
                <div
                  className={`font-mono text-sm font-bold ${up ? "text-cw-green" : "text-cw-red"}`}
                >
                  {up ? "▲" : "▼"} {formatPercent(summary.change24h as number)} (24h)
                </div>
              ) : (
                <div className="font-mono text-sm text-cw-text-muted">
                  Price unavailable
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/8 bg-cw-surface/40 p-4">
            <PriceChart address={address} />
          </div>

          {/* key={address} → fresh state per token (clean load, no stale data) */}
          <TokenTabs key={address} address={address} />
        </section>

        {/* RIGHT — buy/sell shell. Sticky on desktop (self-start so the grid cell
            doesn't stretch and kill the sticky) → Buy/Sell stays in view while the
            middle column scrolls. top-20 clears the sticky SiteHeader. */}
        <div className="order-2 lg:order-3 lg:sticky lg:top-20 lg:self-start">
          <BuySellShell address={address} symbol={summary.symbol} />
        </div>
      </main>
    </>
  );
}
