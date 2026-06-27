"use client";

import { useEffect, useRef } from "react";
import { ReceivePanel } from "./ReceivePanel";

/**
 * Receive / Deposit modal (FREE — no on-ramp). Wraps the shared <ReceivePanel>
 * (QR + address + copy + warning + honest card "coming soon") in dialog chrome.
 * The dedicated /receive page renders the same panel full-page.
 *
 * Accessibility: role=dialog + aria-modal, focus trapped inside, Esc closes,
 * focus restored to the trigger on close.
 */
export function DepositModal({
  address,
  onClose,
}: {
  address: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

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
        <div className="mt-4">
          <ReceivePanel address={address} />
        </div>
      </div>
    </div>
  );
}
