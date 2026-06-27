import { Suspense } from "react";
import depositScreen from "../../public/brand/app-store/deposit.png";
import discoverScreen from "../../public/brand/app-store/discover.png";
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
            screenshotAlt="ChadWallet token screen with a live price chart and buy/sell controls"
            body="Buy and sell trending tokens before they trend. One tap, live charts, instant fills — no extensions, no seed phrase, no friction."
            cta={{ href: `/t/${DEFAULT_TRADE_MINT}`, label: "Start trading" }}
          />
          <FeatureRow
            index="02"
            titleLead="Discover what's"
            titleAccent="trending now"
            label="Discover"
            screenshot={discoverScreen}
            screenshotAlt="ChadWallet discover screen with trending Solana tokens"
            reversed
            body="Live trending tokens scroll across the top and bottom of every page, with real holders and live trades on each token. Spot momentum early — then trade it in seconds."
          />
          <FeatureRow
            index="03"
            titleLead="Non-custodial"
            titleAccent="by design"
            label="Security"
            screenshot={depositScreen}
            screenshotAlt="ChadWallet wallet screen — your keys, your coins"
            body="Sign in with Apple, Google or email and a Solana wallet is created just for you — but only you hold the keys. You approve every transaction; we never take custody of your funds."
          />
          <FeatureRow
            index="04"
            titleLead="Track your assets"
            titleAccent="in one place"
            label="Portfolio"
            screenshot={portfolioScreen}
            screenshotAlt="ChadWallet portfolio screen with holdings and live PnL"
            reversed
            body="Your whole bag and live PnL on one screen — holdings, positions, deposits and withdrawals, all in one place. Non-custodial, always yours."
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
