"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";
import { publicEnv } from "@/lib/public-env";

const PILL =
  "min-h-[44px] whitespace-nowrap rounded-full border px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cw-green focus-visible:ring-offset-2 focus-visible:ring-offset-cw-bg";

function truncate(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function AuthButton() {
  // No Privy configured → disabled placeholder (public site still works).
  if (!publicEnv.NEXT_PUBLIC_PRIVY_APP_ID) {
    return (
      <button
        type="button"
        disabled
        title="Sign-in is not configured"
        className={`${PILL} cursor-not-allowed border-white/10 text-cw-text-muted`}
      >
        Sign in
      </button>
    );
  }
  return <AuthButtonInner />;
}

function AuthButtonInner() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Pre-hydration / Privy still initializing → neutral placeholder (no flicker).
  if (!ready) {
    return (
      <span
        aria-hidden="true"
        className={`${PILL} inline-flex items-center border-white/10 text-cw-text-muted`}
      >
        Sign in
      </span>
    );
  }

  if (!authenticated) {
    return (
      <button
        type="button"
        onClick={() => login()}
        className={`${PILL} border-white/16 text-cw-text hover:border-white/40`}
      >
        Sign in
      </button>
    );
  }

  // The embedded wallet is created AFTER login resolves — brief setup state.
  const address = wallets[0]?.address;
  if (!address) {
    return (
      <span className={`${PILL} inline-flex items-center border-white/10 text-cw-text-muted`}>
        Setting up wallet…
      </span>
    );
  }

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — ignore
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className={`${PILL} inline-flex items-center gap-1.5 border-cw-green/40 font-mono text-cw-text hover:border-cw-green`}
      >
        <span className="size-1.5 rounded-full bg-cw-green" aria-hidden="true" />
        {truncate(address)}
      </button>

      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setMenuOpen(false)}
          />
          <div
            role="menu"
            className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-xl border border-white/10 bg-cw-surface p-1 shadow-2xl"
          >
            <button
              type="button"
              role="menuitem"
              onClick={copyAddress}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-cw-text transition-colors hover:bg-white/5"
            >
              {copied ? "Copied!" : "Copy address"}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                void logout();
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-cw-red transition-colors hover:bg-white/5"
            >
              Log out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
