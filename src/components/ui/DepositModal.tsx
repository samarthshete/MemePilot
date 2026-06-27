"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

/**
 * Receive / Deposit modal (FREE — no on-ramp). Shows the user's Solana embedded
 * wallet address as text + a scannable QR + Copy. Read-only: the address comes
 * from Privy; nothing here moves funds. The card on-ramp (MoonPay) is the
 * production path and is shown as a disabled, honest "coming soon" line.
 *
 * Accessibility: role=dialog + aria-modal, focus trapped inside, Esc closes,
 * focus restored to the trigger on close, copy button + QR are labelled.
 */
export function DepositModal({
  address,
  onClose,
}: {
  address: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const focusable = () =>
      dialog
        ? Array.from(
            dialog.querySelectorAll<HTMLElement>(
              'button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])',
            ),
          )
        : [];

    focusable()[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const els = focusable();
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

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
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Receive — deposit to your wallet"
      className="fixed inset-0 z-[60] grid place-items-center p-4"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/60"
      />
      <div
        ref={dialogRef}
        className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-cw-surface p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-black tracking-[-0.02em]">Receive</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 place-items-center rounded-full text-cw-text-muted transition-colors hover:bg-white/5 hover:text-cw-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cw-green"
          >
            ✕
          </button>
        </div>
        <p className="mt-1 text-sm text-cw-text-muted">
          Deposit SOL or SPL tokens to your wallet.
        </p>

        <div className="mt-4 flex justify-center">
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
      </div>
    </div>
  );
}
