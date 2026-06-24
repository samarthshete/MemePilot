import Link from "next/link";
import { Logo } from "./Logo";
import { SmartDownloadLink } from "./SmartDownloadLink";

const FOOTER_YEAR = 2026;

const linkClass =
  "rounded text-sm font-semibold text-cw-text transition-colors hover:text-cw-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cw-green focus-visible:ring-offset-2 focus-visible:ring-offset-cw-surface-2";

const socialClass =
  "grid size-10 place-items-center rounded-xl border border-white/10 bg-cw-surface text-cw-text transition-colors hover:border-cw-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cw-green focus-visible:ring-offset-2 focus-visible:ring-offset-cw-surface-2";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/6 bg-cw-surface-2">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-start justify-between gap-8 px-[clamp(1.125rem,5vw,3rem)] pb-[clamp(1.5rem,3vw,2.25rem)] pt-[clamp(2.5rem,5vw,4rem)]">
        <div className="max-w-[340px]">
          <div className="flex items-center gap-2.5">
            <Logo />
            <span className="text-lg font-black tracking-[-0.03em]">
              MemePilot
            </span>
          </div>
          <p className="mt-4 text-sm font-medium leading-relaxed text-cw-text-muted">
            The social-first Solana memecoin wallet. Find the next 100x, follow
            the smartest traders, and own your crypto.
          </p>
          <div className="mt-4 flex gap-2.5">
            <a
              href="https://x.com"
              target="_blank"
              rel="noopener noreferrer"
              className={socialClass}
              aria-label="MemePilot on X"
            >
              <svg
                viewBox="0 0 24 24"
                className="size-4"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href="#"
              className={socialClass}
              aria-label="MemePilot on Discord"
            >
              <svg
                viewBox="0 0 24 24"
                className="size-5"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3.2a.07.07 0 0 0-.073.035c-.211.375-.444.864-.608 1.249a18.27 18.27 0 0 0-5.487 0 12.6 12.6 0 0 0-.617-1.249.07.07 0 0 0-.073-.035A19.74 19.74 0 0 0 3.677 4.369a.06.06 0 0 0-.03.025C1.533 7.046.943 9.65 1.232 12.221a.08.08 0 0 0 .031.054 19.9 19.9 0 0 0 5.993 3.03.07.07 0 0 0 .076-.027c.462-.63.874-1.295 1.226-1.994a.07.07 0 0 0-.038-.097 13.1 13.1 0 0 1-1.872-.892.07.07 0 0 1-.007-.117c.126-.094.252-.192.372-.291a.07.07 0 0 1 .071-.01c3.927 1.793 8.18 1.793 12.061 0a.07.07 0 0 1 .072.009c.12.099.246.198.373.292a.07.07 0 0 1-.006.117c-.598.349-1.22.645-1.873.891a.07.07 0 0 0-.038.098c.36.698.772 1.362 1.225 1.993a.07.07 0 0 0 .076.028 19.84 19.84 0 0 0 6.003-3.03.08.08 0 0 0 .03-.054c.5-3.177-.838-5.756-2.685-8.027a.06.06 0 0 0-.03-.026zM8.02 13.917c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.956-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.946 2.419-2.157 2.419z" />
              </svg>
            </a>
          </div>
        </div>

        <nav
          className="flex flex-wrap gap-[clamp(2.25rem,5vw,4.5rem)]"
          aria-label="Footer"
        >
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-cw-text-muted">
              Product
            </span>
            <a href="#" className={linkClass}>
              Trade
            </a>
            <a href="#" className={linkClass}>
              KOL traders
            </a>
            <a href="#" className={linkClass}>
              Launch
            </a>
          </div>
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-cw-text-muted">
              Legal
            </span>
            <Link href="/privacy" className={linkClass}>
              Privacy
            </Link>
            <Link href="/terms" className={linkClass}>
              Terms
            </Link>
          </div>
          <div className="flex flex-col items-start gap-3.5">
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-cw-text-muted">
              Get the app
            </span>
            <SmartDownloadLink location="footer" className="px-5">
              Get the app
            </SmartDownloadLink>
          </div>
        </nav>
      </div>

      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 border-t border-white/6 px-[clamp(1.125rem,5vw,3rem)] py-4">
        <span className="text-[13px] font-medium text-cw-text-muted">
          © {FOOTER_YEAR} MemePilot. All rights reserved.
        </span>
        <span className="text-xs font-medium text-cw-text-muted">
          Memecoins are risky. Trade at your own risk. Not financial advice.
        </span>
      </div>
    </footer>
  );
}
