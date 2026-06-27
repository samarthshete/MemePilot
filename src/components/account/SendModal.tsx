"use client";

import { useEffect, useRef, useState } from "react";
import type { ConnectedStandardSolanaWallet } from "@privy-io/react-auth/solana";
import { useSignTransaction } from "@privy-io/react-auth/solana";

/**
 * Send / Withdraw native SOL. Non-custodial, REUSING the swap sign/relay pattern:
 * server builds an unsigned tx (/api/transfer/build) → user signs in Privy →
 * server relays the SIGNED bytes (/api/swap/send). The server never signs. Honest:
 * balance-gated, no fake execution; "Withdraw" is the same flow to an external
 * address.
 */
type Phase = "form" | "signing" | "sending" | "success" | "error";

const FEE_HEADROOM_SOL = 0.00001;

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

const ERROR_COPY: Record<string, string> = {
  insufficient_balance: "That’s more than your available balance (plus network fee).",
  bad_recipient: "That doesn’t look like a valid Solana address.",
  bad_amount: "Enter a valid amount.",
  blockhash_expired: "Took too long — please try again.",
  insufficient_funds: "Insufficient funds for this transfer plus fees.",
  tx_failed: "The transfer failed on-chain.",
};
const errorText = (code: string) => ERROR_COPY[code] ?? "Something went wrong — please try again.";

export function SendModal({
  wallet,
  solBalance,
  mode,
  onClose,
  onSuccess,
}: {
  wallet: ConnectedStandardSolanaWallet;
  solBalance: number;
  mode: "send" | "withdraw";
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { signTransaction } = useSignTransaction();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [phase, setPhase] = useState<Phase>("form");
  const [errorCode, setErrorCode] = useState("unavailable");
  const [signature, setSignature] = useState<string | null>(null);

  const maxSol = Math.max(0, solBalance - FEE_HEADROOM_SOL);
  const amountNum = Number.parseFloat(amount);
  const amountValid = Number.isFinite(amountNum) && amountNum > 0 && amountNum <= maxSol;
  const recipientValid = recipient.trim().length >= 32 && recipient.trim().length <= 64;
  const empty = solBalance <= 0;
  const inFlight = phase === "signing" || phase === "sending";
  const title = mode === "withdraw" ? "Withdraw SOL" : "Send SOL";

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const focusable = () =>
      dialogRef.current
        ? Array.from(
            dialogRef.current.querySelectorAll<HTMLElement>(
              'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ),
          )
        : [];
    focusable()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !inFlight) {
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
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [onClose, inFlight]);

  const submit = async () => {
    if (!amountValid || !recipientValid) return;
    setPhase("signing");
    try {
      const build = await fetch("/api/transfer/build", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fromPubkey: wallet.address,
          toPubkey: recipient.trim(),
          amountSol: amountNum,
        }),
      });
      const built = (await build.json()) as
        | { ok: true; txBase64: string }
        | { ok: false; error: string };
      if (!built.ok) {
        setErrorCode(built.error);
        setPhase("error");
        return;
      }
      const { signedTransaction } = await signTransaction({
        transaction: base64ToBytes(built.txBase64),
        wallet,
        chain: "solana:mainnet",
      });
      setPhase("sending");
      const sent = await fetch("/api/swap/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ signedTxBase64: bytesToBase64(signedTransaction) }),
      });
      const res = (await sent.json()) as
        | { ok: true; signature: string }
        | { ok: false; error: string; signature?: string };
      if (res.ok) {
        setSignature(res.signature);
        setPhase("success");
        onSuccess();
      } else {
        if (res.signature) setSignature(res.signature);
        setErrorCode(res.error);
        setPhase("error");
      }
    } catch (err) {
      const msg = (err as Error)?.message?.toLowerCase() ?? "";
      setErrorCode(msg.includes("reject") || msg.includes("cancel") ? "rejected" : "sign_failed");
      setPhase("error");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[60] grid place-items-center p-4"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={() => !inFlight && onClose()}
        className="absolute inset-0 cursor-default bg-black/60"
      />
      <div
        ref={dialogRef}
        className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-cw-surface p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-black tracking-[-0.02em]">{title}</h2>
          <button
            type="button"
            onClick={() => !inFlight && onClose()}
            aria-label="Close"
            className="grid size-8 place-items-center rounded-full text-cw-text-muted transition-colors hover:bg-white/5 hover:text-cw-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cw-green"
          >
            ✕
          </button>
        </div>

        {phase === "success" && signature ? (
          <>
            <p className="mt-4 text-sm font-bold text-cw-green">Sent ✓</p>
            <p className="mt-1 text-sm text-cw-text-muted">
              {amountNum} SOL is on its way.
            </p>
            <a
              href={`https://solscan.io/tx/${signature}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block truncate font-mono text-xs text-cw-green hover:underline"
            >
              View on Solscan: {signature.slice(0, 8)}…{signature.slice(-8)}
            </a>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-full bg-cw-green py-2.5 text-sm font-extrabold text-cw-bg hover:bg-cw-green-press"
            >
              Done
            </button>
          </>
        ) : phase === "error" ? (
          <>
            <p className="mt-4 text-sm text-cw-red">
              {errorCode === "rejected" ? "Signature cancelled." : errorText(errorCode)}
            </p>
            <button
              type="button"
              onClick={() => setPhase("form")}
              className="mt-5 w-full rounded-full border border-white/16 py-2.5 text-sm font-bold text-cw-text hover:border-white/40"
            >
              Back
            </button>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-cw-text-muted">
              {mode === "withdraw"
                ? "Withdraw SOL to any external Solana address."
                : "Send SOL to another Solana address."}
            </p>

            <label className="mt-4 block">
              <span className="font-mono text-xs uppercase tracking-[0.14em] text-cw-text-muted">
                Recipient address
              </span>
              <input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value.trim())}
                disabled={inFlight}
                placeholder="Solana address"
                className="mt-1.5 w-full rounded-xl border border-white/12 bg-cw-bg px-3 py-2.5 font-mono text-sm text-cw-text outline-none focus-visible:border-cw-green"
              />
            </label>

            <label className="mt-3 block">
              <span className="flex items-center justify-between font-mono text-xs uppercase tracking-[0.14em] text-cw-text-muted">
                <span>Amount (SOL)</span>
                <span className="normal-case tracking-normal">
                  balance {solBalance.toFixed(4)}
                </span>
              </span>
              <div className="mt-1.5 flex gap-2">
                <input
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  disabled={inFlight || empty}
                  placeholder="0.0"
                  className="w-full rounded-xl border border-white/12 bg-cw-bg px-3 py-2.5 font-mono text-lg text-cw-text outline-none focus-visible:border-cw-green disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setAmount(String(maxSol))}
                  disabled={inFlight || empty}
                  className="shrink-0 rounded-xl border border-white/12 px-3 font-mono text-sm font-bold text-cw-text-muted hover:border-cw-green hover:text-cw-text disabled:opacity-50"
                >
                  Max
                </button>
              </div>
            </label>

            <button
              type="button"
              onClick={submit}
              disabled={empty || !amountValid || !recipientValid || inFlight}
              className="mt-5 w-full rounded-full bg-cw-green py-2.5 text-sm font-extrabold text-cw-bg hover:bg-cw-green-press disabled:cursor-not-allowed disabled:opacity-50"
            >
              {empty
                ? "Insufficient balance"
                : phase === "signing"
                  ? "Approve in wallet…"
                  : phase === "sending"
                    ? "Sending…"
                    : mode === "withdraw"
                      ? "Withdraw"
                      : "Send"}
            </button>
            <p className="mt-2 text-center text-[10px] text-cw-text-muted">
              You approve every transfer in your wallet. Solana network only.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
