import Link from "next/link";
import { DEFAULT_TRADE_MINT } from "@/lib/trading-config";
import { AuthButton } from "./AuthButton";
import { Logo } from "./Logo";
import { SmartDownloadLink } from "./SmartDownloadLink";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-white/6 bg-cw-bg/80 px-[clamp(0.875rem,4vw,3rem)] py-3.5 backdrop-blur-md">
      <div className="flex items-center gap-1">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cw-green focus-visible:ring-offset-2 focus-visible:ring-offset-cw-bg"
          aria-label="ChadWallet home"
        >
          <Logo />
          {/* Wordmark hides on the smallest screens so the new Trade link fits. */}
          <span className="hidden text-lg font-black tracking-[-0.03em] sm:inline">
            ChadWallet
          </span>
        </Link>
        <Link
          href={`/t/${DEFAULT_TRADE_MINT}`}
          className="ml-1 inline-flex min-h-[44px] items-center rounded-full px-3 text-sm font-bold text-cw-text transition-colors hover:text-cw-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cw-green focus-visible:ring-offset-2 focus-visible:ring-offset-cw-bg"
        >
          Trade
        </Link>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <AuthButton />
        <SmartDownloadLink className="px-4 text-sm">Get the app</SmartDownloadLink>
      </div>
    </header>
  );
}
