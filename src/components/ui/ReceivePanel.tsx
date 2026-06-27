"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

/**
 * Shared Receive/Deposit content (FREE — no on-ramp): full Solana address text +
 * a scannable QR + Copy + the "Solana network only" warning + an honest disabled
 * card-on-ramp note. Used by both the DepositModal (modal chrome) and the
 * dedicated /receive page (full-page chrome) so they never drift.
 *
 * Read-only: the address comes from Privy; nothing here moves funds.
 */
export function ReceivePanel({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  return (
    <>
      <div className="flex justify-center">
        <div className="rounded-xl bg-white p-3">
          <QRCodeSVG
            value={address}
            size={184}
            bgColor="#ffffff"
            fgColor="#020818"
            level="M"
            marginSize={0}
            title="QR code of your Solana wallet address"
          />
        </div>
      </div>

      <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-cw-text-muted">
        Your Solana address
      </p>
      <div className="mt-1 break-all rounded-lg border border-white/12 bg-cw-bg px-3 py-2 font-mono text-xs text-cw-text">
        {address}
      </div>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy wallet address"
        className="mt-2 w-full rounded-full bg-cw-green py-2.5 text-sm font-extrabold text-cw-bg transition-colors hover:bg-cw-green-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cw-green focus-visible:ring-offset-2 focus-visible:ring-offset-cw-surface"
      >
        {copied ? "Copied ✓" : "Copy address"}
      </button>

      <div className="mt-4 rounded-lg border border-cw-green/25 bg-cw-green/5 p-3 text-xs">
        <p className="font-semibold text-cw-text">Solana network only</p>
        <p className="mt-1 leading-relaxed text-cw-text-muted">
          Send only SOL or Solana (SPL) tokens to this address — assets from other
          networks will be lost. Funds usually arrive in seconds.
        </p>
      </div>

      <button
        type="button"
        disabled
        aria-disabled="true"
        title="Card deposits ship in production"
        className="mt-3 w-full cursor-not-allowed rounded-full border border-white/10 py-2.5 text-sm font-bold text-cw-text-muted opacity-60"
      >
        Buy with card (coming soon)
      </button>
      <p className="mt-1 text-center text-[10px] text-cw-text-muted">
        Card on-ramp (MoonPay) ships in production — for now, deposit via Receive above.
      </p>
    </>
  );
}
