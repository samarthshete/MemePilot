import { FeatureRow } from "@/components/landing/FeatureRow";
import { FinalCta } from "@/components/landing/FinalCta";
import { Hero } from "@/components/landing/Hero";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { PLACEHOLDER_TOKENS } from "@/components/landing/ticker-data";
import { Ticker } from "@/components/landing/Ticker";
import { TrustStrip } from "@/components/landing/TrustStrip";

export default function Home() {
  return (
    <>
      <Ticker tokens={PLACEHOLDER_TOKENS} position="top" durationSeconds={42} />
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
            body="Buy and sell trending tokens before they trend. One tap, live charts, instant fills — no extensions, no seed phrase, no friction."
          />
          <FeatureRow
            index="02"
            titleLead="Follow"
            titleAccent="KOL traders"
            label="KOL feed"
            reversed
            body="See exactly what the smartest traders ape into — the second they do it. Track wins, win-rates and live PnL. Copy the winners, dodge the rugs."
          />
          <FeatureRow
            index="03"
            titleLead="Launch memecoins"
            titleAccent="in one tap"
            label="Launch"
            body="Turn any meme, viral tweet, or shower thought into a coin. Name it, ticker it, launch it — live on Solana in seconds."
          />
          <FeatureRow
            index="04"
            titleLead="Track your assets"
            titleAccent="in one place"
            label="Portfolio"
            reversed
            body="Your whole bag, live PnL, rewards, deposits and instant withdrawals — all on one screen. Non-custodial, always yours."
          />
        </section>

        <TrustStrip />
        <FinalCta />
      </main>

      <SiteFooter />
      <Ticker tokens={PLACEHOLDER_TOKENS} position="bottom" durationSeconds={38} />
    </>
  );
}
