import { DownloadButtons } from "./DownloadButtons";

/** Closing call-to-action with a glowing headline and the download badges. */
export function FinalCta() {
  return (
    <section className="relative mt-[clamp(2.5rem,6vw,5rem)] overflow-hidden">
      <div
        aria-hidden="true"
        className="cw-glow pointer-events-none absolute left-1/2 top-1/2 size-[min(720px,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,var(--color-cw-green)_0%,transparent_60%)] opacity-[0.18] blur-3xl"
      />
      <div className="relative mx-auto max-w-[900px] px-[clamp(1.125rem,5vw,3rem)] py-[clamp(3.5rem,8vw,6.875rem)] text-center">
        <h2 className="mx-auto max-w-[14ch] text-[clamp(2.125rem,6vw,4.5rem)] font-black uppercase leading-[0.92] tracking-[-0.04em]">
          Ready to find the next{" "}
          <span className="text-cw-green [text-shadow:0_0_50px_var(--color-cw-green)]">
            100x?
          </span>
        </h2>
        <p className="mx-auto mt-5 max-w-[460px] text-[clamp(1rem,1.6vw,1.25rem)] font-medium text-cw-text-muted">
          Download ChadWallet and start trading in seconds.
        </p>
        <DownloadButtons
          location="final_cta"
          className="mx-auto mt-8 max-w-[520px] justify-center"
        />
      </div>
    </section>
  );
}
