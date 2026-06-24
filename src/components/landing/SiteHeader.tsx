import { Logo } from "./Logo";
import { SmartDownloadLink } from "./SmartDownloadLink";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-2.5 border-b border-white/6 bg-cw-bg/80 px-[clamp(0.875rem,4vw,3rem)] py-3.5 backdrop-blur-md">
      <a
        href="#top"
        className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cw-green focus-visible:ring-offset-2 focus-visible:ring-offset-cw-bg"
        aria-label="MemePilot home"
      >
        <Logo />
        <span className="text-lg font-black tracking-[-0.03em]">MemePilot</span>
      </a>

      <div className="flex shrink-0 items-center gap-2.5">
        {/* Placeholder only — auth lands in Stage 3. */}
        <button
          type="button"
          className="min-h-[44px] whitespace-nowrap rounded-full border border-white/16 px-4 text-sm font-bold text-cw-text transition-colors hover:border-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cw-green focus-visible:ring-offset-2 focus-visible:ring-offset-cw-bg"
        >
          Sign in
        </button>
        <SmartDownloadLink className="px-4 text-sm">Get the app</SmartDownloadLink>
      </div>
    </header>
  );
}
