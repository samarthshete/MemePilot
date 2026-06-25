"use client";

import { useEffect, useState } from "react";
import type { ConnectedStandardSolanaWallet } from "@privy-io/react-auth/solana";
import { useSignTransaction } from "@privy-io/react-auth/solana";
import { formatCompact, formatUsdPrice } from "@/lib/format";
import { RISK_CHECKBOX_A2, RISK_DISCLAIMER_A1 } from "@/lib/legal-copy";

const RISK_KEY = "memepilot:risk-accepted-v1";

type Summary = {
  payUsd: number;
  paySol: number;
  receive: number;
  minReceived: number;
  priceImpactPct: number;
  slippageBps: number;
  routeLabels: string[];
};
type Phase =
  | "building"
  | "review"
  | "signing"
  | "sending"
  | "success"
  | "error";

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
  amount_capped: "Amount exceeds the current per-trade cap.",
  no_route: "No route for this amount — try a different size.",
  blockhash_expired: "Quote expired — re-quote and try again.",
  insufficient_funds: "Insufficient SOL for this swap plus fees.",
  slippage_exceeded: "Price moved past your slippage — re-quote and retry.",
  tx_failed: "The transaction failed on-chain.",
};
const errorText = (code: string) =>
  ERROR_COPY[code] ?? "Something went wrong — please try again.";

/**
 * BUY review + execution. Builds a fresh tx, shows the review + first-trade risk
 * checkbox, then: user signs in Privy (client-side) → we POST the SIGNED bytes
 * to /api/swap/send (server relays + confirms). The server never signs.
 */
export function ReviewModal({
  address,
  symbol,
  amountUsd,
  slippageBps,
  wallet,
  onClose,
  onSuccess,
}: {
  address: string;
  symbol: string;
  amountUsd: number;
  slippageBps: number;
  wallet: ConnectedStandardSolanaWallet;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { signTransaction } = useSignTransaction();
  const [phase, setPhase] = useState<Phase>("building");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [swapTx, setSwapTx] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string>("unavailable");

  // Pre-accepted (not the first trade) → skip the checkbox requirement.
  // Deferred (setTimeout) so it isn't a synchronous setState in the effect body,
  // and so SSR/first render matches (accepted starts false, no hydration jump).
  useEffect(() => {
    let preAccepted = false;
    try {
      preAccepted = localStorage.getItem(RISK_KEY) === "1";
    } catch {
      /* storage blocked */
    }
    if (!preAccepted) return;
    const id = setTimeout(() => setAccepted(true), 0);
    return () => clearTimeout(id);
  }, []);

  // Build a fresh tx on open.
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetch("/api/swap/build", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            address,
            amountUsd,
            slippageBps,
            userPublicKey: wallet.address,
          }),
        });
        const data = (await res.json()) as
          | { ok: true; swapTransactionBase64: string; summary: Summary }
          | { ok: false; error: string };
        if (!active) return;
        if (data.ok) {
          setSummary(data.summary);
          setSwapTx(data.swapTransactionBase64);
          setPhase("review");
        } else {
          setErrorCode(data.error);
          setPhase("error");
        }
      } catch {
        if (active) {
          setErrorCode("unavailable");
          setPhase("error");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [address, amountUsd, slippageBps, wallet.address]);

  const confirmAndSign = async () => {
    if (!swapTx) return;
    try {
      localStorage.setItem(RISK_KEY, "1");
    } catch {
      /* storage blocked */
    }
    setPhase("signing");
    try {
      const { signedTransaction } = await signTransaction({
        transaction: base64ToBytes(swapTx),
        wallet,
        chain: "solana:mainnet",
      });
      setPhase("sending");
      const res = await fetch("/api/swap/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ signedTxBase64: bytesToBase64(signedTransaction) }),
      });
      const data = (await res.json()) as
        | { ok: true; signature: string; status: string }
        | { ok: false; error: string; signature?: string };
      if (data.ok) {
        setSignature(data.signature);
        setPhase("success");
        onSuccess();
      } else {
        if (data.signature) setSignature(data.signature);
        setErrorCode(data.error);
        setPhase("error");
      }
    } catch (err) {
      // User rejected the Privy signature prompt, or signing failed.
      const msg = (err as Error)?.message?.toLowerCase() ?? "";
      setErrorCode(msg.includes("reject") || msg.includes("cancel") ? "rejected" : "sign_failed");
      setPhase("error");
    }
  };

  const inFlight = phase === "signing" || phase === "sending";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Review buy ${symbol}`}
      className="fixed inset-0 z-50 grid place-items-center p-4"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={() => !inFlight && onClose()}
        className="absolute inset-0 cursor-default bg-black/60"
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-cw-surface p-5 shadow-2xl">
        <h2 className="text-lg font-black tracking-[-0.02em]">Review buy {symbol}</h2>

        {phase === "building" && (
          <p className="mt-4 font-mono text-sm text-cw-text-muted">
            Preparing transaction…
          </p>
        )}

        {phase === "error" && (
          <>
            <p className="mt-4 text-sm text-cw-red">
              {errorCode === "rejected"
                ? "Signature cancelled."
                : errorText(errorCode)}
            </p>
            {signature && <ExplorerLink signature={signature} />}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-full border border-white/16 py-2.5 text-sm font-bold text-cw-text hover:border-white/40"
              >
                Close
              </button>
            </div>
          </>
        )}

        {phase === "success" && signature && (
          <>
            <p className="mt-4 text-sm font-bold text-cw-green">
              Swap confirmed ✓
            </p>
            <p className="mt-1 text-sm text-cw-text-muted">
              You bought ≈ {summary ? formatCompact(summary.receive) : ""} {symbol}.
            </p>
            <ExplorerLink signature={signature} />
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-full bg-cw-green py-2.5 text-sm font-extrabold text-cw-bg hover:bg-cw-green-press"
            >
              Done
            </button>
          </>
        )}

        {(phase === "review" || phase === "signing" || phase === "sending") &&
          summary && (
            <>
              <dl className="mt-4 space-y-1 text-sm">
                <Line label="You pay" value={`${formatUsdPrice(summary.payUsd)} · ${summary.paySol.toFixed(4)} SOL`} />
                <Line label={`You receive ≈`} value={`${formatCompact(summary.receive)} ${symbol}`} strong />
                <Line label="Min received" value={`${formatCompact(summary.minReceived)} ${symbol}`} />
                <Line label="Price impact" value={`${summary.priceImpactPct.toFixed(2)}%`} />
                <Line label="Slippage" value={`${(summary.slippageBps / 100).toFixed(2)}%`} />
                <Line label="Network fee" value="≈ 0.00005 SOL (est.)" />
                <Line label="Platform fee" value="$0.00" />
              </dl>
              {summary.routeLabels.length > 0 && (
                <p className="mt-2 font-mono text-[11px] text-cw-text-muted">
                  Route via {summary.routeLabels.join(" → ")}
                </p>
              )}

              <p className="mt-4 text-xs leading-relaxed text-cw-text-muted">
                {RISK_DISCLAIMER_A1}
              </p>

              <label className="mt-3 flex items-start gap-2 text-xs text-cw-text">
                <input
                  type="checkbox"
                  checked={accepted}
                  disabled={inFlight}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="mt-0.5 accent-cw-green"
                />
                <span>{RISK_CHECKBOX_A2}</span>
              </label>

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={inFlight}
                  className="flex-1 rounded-full border border-white/16 py-2.5 text-sm font-bold text-cw-text hover:border-white/40 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmAndSign}
                  disabled={!accepted || inFlight}
                  className="flex-1 rounded-full bg-cw-green py-2.5 text-sm font-extrabold text-cw-bg hover:bg-cw-green-press disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {phase === "signing"
                    ? "Approve in wallet…"
                    : phase === "sending"
                      ? "Submitting…"
                      : "Confirm & Sign"}
                </button>
              </div>
            </>
          )}
      </div>
    </div>
  );
}

function Line({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-cw-text-muted">{label}</dt>
      <dd className={`font-mono ${strong ? "font-bold text-cw-text" : "text-cw-text"}`}>
        {value}
      </dd>
    </div>
  );
}

function ExplorerLink({ signature }: { signature: string }) {
  return (
    <a
      href={`https://solscan.io/tx/${signature}`}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 block truncate font-mono text-xs text-cw-green hover:underline"
    >
      View on Solscan: {signature.slice(0, 8)}…{signature.slice(-8)}
    </a>
  );
}
