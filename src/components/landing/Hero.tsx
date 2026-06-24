import tokenScreen from "../../../public/brand/app-store/token.png";
import { DownloadButtons } from "./DownloadButtons";
import { PhoneMockup } from "./PhoneMockup";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Ambient green glow (decorative, motion-gated). */}
      <div
        aria-hidden="true"
        className="cw-glow pointer-events-none absolute -right-16 -top-32 size-[620px] rounded-full bg-[radial-gradient(circle,var(--color-cw-green)_0%,transparent_65%)] opacity-20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-28 size-[520px] rounded-full bg-[radial-gradient(circle,var(--color-cw-green)_0%,transparent_65%)] opacity-10 blur-3xl"
      />

      <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-12 px-[clamp(1.125rem,5vw,3rem)] py-[clamp(2.5rem,7vw,5.5rem)] md:flex-row md:gap-16">
        {/* Copy */}
        <div className="w-full md:flex-1">
          <span className="inline-flex items-center gap-2 rounded-full border border-cw-green/30 bg-cw-green/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-cw-green">
            <span className="cw-live-dot size-[7px] rounded-full bg-cw-green" />
            Live on Solana
          </span>

          <h1 className="mt-5 text-[clamp(2.5rem,5.6vw,4.5rem)] font-black leading-[0.96] tracking-[-0.035em] text-balance">
            Find the next{" "}
            <span className="text-cw-green [text-shadow:0_0_40px_var(--color-cw-green)]">
              100x
            </span>{" "}
            memecoins here
          </h1>

          <p className="mt-5 max-w-[480px] text-[clamp(1rem,1.5vw,1.1875rem)] font-medium leading-relaxed text-cw-text-muted">
            Get ChadWallet today. Never miss the next breakout! Discover, follow
            the smartest traders, and ape in seconds — no seed phrase.
          </p>

          {/* Loud download block */}
          <div className="cw-glow-panel mt-7 rounded-[1.375rem] border border-cw-green/30 bg-gradient-to-b from-cw-green/10 to-cw-green/[0.03] p-5">
            <div className="mb-3.5 flex items-center justify-between gap-3">
              <span className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-cw-green">
                Download the app
              </span>
              <span className="text-xs font-semibold text-cw-text-muted">
                iOS · Android
              </span>
            </div>
            <DownloadButtons />
          </div>

          <p className="mt-4 text-[13px] font-medium text-cw-text-muted">
            No seed phrase · You own your crypto
          </p>
        </div>

        {/* Phone */}
        <div className="relative flex w-full max-w-[340px] justify-center md:flex-1">
          {/* Green halo hugging the device. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 scale-110 rounded-full bg-[radial-gradient(circle,var(--color-cw-green)_0%,transparent_60%)] opacity-15 blur-2xl"
          />
          <div
            aria-hidden="true"
            className="cw-floaty absolute left-[2%] top-[8%] z-10 flex items-center gap-2 rounded-2xl border border-cw-green/40 bg-cw-green/15 px-3.5 py-2.5 backdrop-blur-sm"
          >
            <span className="font-mono text-[15px] font-bold text-cw-green">
              ▲ +434%
            </span>
          </div>
          <div
            aria-hidden="true"
            className="cw-floaty-slow absolute bottom-[14%] right-[1%] z-10 flex flex-col rounded-2xl border border-white/12 bg-cw-surface/85 px-4 py-2.5 backdrop-blur-sm"
          >
            <span className="text-[10px] font-semibold tracking-[0.08em] text-cw-text-muted">
              MARKET CAP
            </span>
            <span className="font-mono text-lg font-bold text-cw-text">
              $7.63M
            </span>
          </div>

          <PhoneMockup
            label="Trading"
            screenshot={tokenScreen}
            alt="ChadWallet trading screen showing a live token price, chart and one-tap buy"
            priority
            className="relative z-[1]"
          />
        </div>
      </div>
    </section>
  );
}
