import { Suspense } from "react";
import kolScreen from "../../public/brand/app-store/kol.png";
import launchScreen from "../../public/brand/app-store/launch.png";
import portfolioScreen from "../../public/brand/app-store/portfolio.png";
import tokenScreen from "../../public/brand/app-store/token.png";
import { FeatureRow } from "@/components/landing/FeatureRow";
import { FinalCta } from "@/components/landing/FinalCta";
import { Hero } from "@/components/landing/Hero";
import { LiveTicker } from "@/components/landing/LiveTicker";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { TickerSkeleton } from "@/components/landing/TickerSkeleton";
import { TrustStrip } from "@/components/landing/TrustStrip";
import { getTrendingTokens } from "@/lib/ticker-tokens";
import { DEFAULT_TRADE_MINT } from "@/lib/trading-config";

// Server-renders the live ticker tokens (real BirdEye prices, cached 60s) and
// hands them to the client <LiveTicker> for its 60s refresh.
async function LiveTickerData({
  position,
  durationSeconds,
}: {
  position: "top" | "bottom";
  durationSeconds: number;
}) {
  const tokens = await getTrendingTokens();
  return (
    <LiveTicker
      initialTokens={tokens}
      position={position}
      durationSeconds={durationSeconds}
    />
  );
}

export default function Home() {
  return (
    <>
      <Suspense fallback={<TickerSkeleton position="top" />}>
        <LiveTickerData position="top" durationSeconds={42} />
      </Suspense>
      <SiteHeader />

      <main id="top">
        <Hero />

        <section className="mx-auto max-w-[1200px] px-[clamp(1.125rem,5vw,3rem)] pb-[clamp(1.25rem,3vw,2.5rem)] pt-[clamp(3rem,7vw,5.5rem)]">
          <div className="mb-[clamp(2.5rem,5vw,4rem)] text-center">
            <span className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-cw-green">
              Everything degens need
            </span>
            <h2 className="mt-3.5 text-[clamp(1.875rem,4.4vw,3.25rem)] font-black leading-none tracking-[-0.035em]">
              One app. Every edge.
            </h2>
          </div>

          <FeatureRow
            index="01"
            titleLead="Fast trading"
            titleAccent="in seconds"
            label="Trading"
            screenshot={tokenScreen}
            screenshotAlt="MemePilot token screen with a live price chart and buy/sell controls"
            body="Buy and sell trending tokens before they trend. One tap, live charts, instant fills — no extensions, no seed phrase, no friction."
            cta={{ href: `/t/${DEFAULT_TRADE_MINT}`, label: "Start trading" }}
          />
          <FeatureRow
            index="02"
            titleLead="Follow"
            titleAccent="KOL traders"
            label="KOL feed"
            screenshot={kolScreen}
            screenshotAlt="MemePilot KOL feed showing top traders' live buys and sells"
            reversed
            body="See exactly what the smartest traders ape into — the second they do it. Track wins, win-rates and live PnL. Copy the winners, dodge the rugs."
          />
          <FeatureRow
            index="03"
            titleLead="Launch memecoins"
            titleAccent="in one tap"
            label="Launch"
            screenshot={launchScreen}
            screenshotAlt="MemePilot one-tap memecoin launch form"
            body="Turn any meme, viral tweet, or shower thought into a coin. Name it, ticker it, launch it — live on Solana in seconds."
          />
          <FeatureRow
            index="04"
            titleLead="Track your assets"
            titleAccent="in one place"
            label="Portfolio"
            screenshot={portfolioScreen}
            screenshotAlt="MemePilot portfolio screen with holdings and live PnL"
            reversed
            body="Your whole bag, live PnL, rewards, deposits and instant withdrawals — all on one screen. Non-custodial, always yours."
          />
        </section>

        <TrustStrip />
        <FinalCta />
      </main>

      {/* Bottom token banner — above the footer (mirrors the top ticker). Same
          cached /api/trending source + hidden-tab pause; no extra BirdEye cost. */}
      <Suspense fallback={<TickerSkeleton position="bottom" />}>
        <LiveTickerData position="bottom" durationSeconds={38} />
      </Suspense>
      <SiteFooter />
    </>
  );
}
