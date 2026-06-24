import { Reveal } from "./Reveal";

/** Reassurance band: non-custodial + built on Solana. */
export function TrustStrip() {
  return (
    <section className="mx-auto my-[clamp(1.25rem,3vw,2.5rem)] max-w-[1200px] px-[clamp(1.125rem,5vw,3rem)]">
      <Reveal>
        <div className="flex flex-wrap items-center justify-center gap-[clamp(1rem,3vw,2.5rem)] rounded-3xl border border-white/7 bg-cw-surface px-[clamp(1.5rem,4vw,2.75rem)] py-[clamp(1.375rem,3vw,1.875rem)]">
          <div className="flex items-center gap-3.5">
            <span className="grid size-11 place-items-center rounded-xl border border-cw-green/35 bg-cw-green/12">
              {/* Padlock */}
              <svg
                viewBox="0 0 24 24"
                className="size-5"
                fill="none"
                stroke="var(--color-cw-green)"
                strokeWidth="2"
                aria-hidden="true"
              >
                <rect x="4" y="10" width="16" height="11" rx="2.5" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
            </span>
            <span className="text-[clamp(1.0625rem,1.8vw,1.375rem)] font-extrabold tracking-[-0.02em]">
              Non-custodial —{" "}
              <span className="text-cw-green">you own your crypto.</span>{" "}
              <span className="font-bold text-cw-text-muted">No seed phrase.</span>
            </span>
          </div>

          <span className="hidden h-8 w-px bg-white/12 sm:block" />

          <div className="flex items-center gap-2.5">
            <span
              className="flex flex-col gap-[3px] [transform:skewX(-18deg)]"
              aria-hidden="true"
            >
              <span className="h-[5px] w-6 rounded-[2px] bg-cw-green" />
              <span className="h-[5px] w-6 rounded-[2px] bg-cw-green/70" />
              <span className="h-[5px] w-6 rounded-[2px] bg-cw-green/45" />
            </span>
            <span className="text-[15px] font-bold text-cw-text-muted">
              Built on Solana
            </span>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
