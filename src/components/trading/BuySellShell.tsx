"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { formatCompact, formatUsdPrice } from "@/lib/format";
import { publicEnv } from "@/lib/public-env";

const PRESETS = [10, 50, 100];
const SLIPPAGE_OPTIONS = [
  { bps: 50, label: "0.5%" },
  { bps: 100, label: "1%" },
  { bps: 300, label: "3%" },
];

type QuoteData = {
  payUsd: number;
  paySol: number;
  receive: number;
  minReceived: number;
  priceImpactPct: number;
  slippageBps: number;
  routeLabels: string[];
};
type QuoteState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "sell" }
  | { status: "ready"; data: QuoteData }
  | { status: "error"; error: string };

/**
 * Buy/Sell panel — QUOTE ONLY (Stage 6a). Fetches a Jupiter quote via our
 * /api/quote proxy and previews route/impact/slippage/min-received. NEVER signs
 * or sends (hard rule 5); the action button only prompts login or sits disabled.
 */
export function BuySellShell({
  address,
  symbol,
}: {
  address: string;
  symbol: string;
}) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [slippageBps, setSlippageBps] = useState(50);
  const [quote, setQuote] = useState<QuoteState>({ status: "idle" });

  // Debounced re-quote on amount/slippage/side change. All setState runs inside
  // the timer/async callbacks (never synchronously in the effect body).
  useEffect(() => {
    const timer = setTimeout(() => {
      if (side === "sell") {
        setQuote({ status: "sell" });
        return;
      }
      const usd = Number.parseFloat(amount);
      if (!Number.isFinite(usd) || usd <= 0) {
        setQuote({ status: "idle" });
        return;
      }
      setQuote({ status: "loading" });
      void (async () => {
        try {
          const res = await fetch("/api/quote", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ address, amountUsd: usd, side: "buy", slippageBps }),
          });
          const data = (await res.json()) as
            | ({ ok: true } & QuoteData)
            | { ok: false; error: string };
          if (data.ok) setQuote({ status: "ready", data });
          else setQuote({ status: "error", error: data.error });
        } catch {
          setQuote({ status: "error", error: "unavailable" });
        }
      })();
    }, 400);
    return () => clearTimeout(timer);
  }, [address, amount, slippageBps, side]);

  return (
    <aside className="rounded-2xl border border-white/8 bg-cw-surface/40 p-4">
      {/* Buy / Sell toggle */}
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-cw-bg p-1">
        {(["buy", "sell"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSide(s)}
            aria-pressed={side === s}
            className={`rounded-lg py-2 text-sm font-bold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cw-green ${
              side === s
                ? s === "buy"
                  ? "bg-cw-green text-cw-bg"
                  : "bg-cw-red text-cw-text"
                : "text-cw-text-muted hover:text-cw-text"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Amount */}
      <label className="mt-4 block">
        <span className="font-mono text-xs uppercase tracking-[0.14em] text-cw-text-muted">
          Amount (USD)
        </span>
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder="0.00"
          className="mt-1.5 w-full rounded-xl border border-white/12 bg-cw-bg px-3 py-2.5 font-mono text-lg text-cw-text outline-none focus-visible:border-cw-green"
        />
      </label>
      <div className="mt-2 flex gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setAmount(String(p))}
            className="flex-1 rounded-lg border border-white/12 py-1.5 font-mono text-sm font-bold text-cw-text-muted transition-colors hover:border-cw-green hover:text-cw-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cw-green"
          >
            ${p}
          </button>
        ))}
      </div>

      {/* Slippage */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="font-mono text-xs uppercase tracking-[0.14em] text-cw-text-muted">
          Slippage
        </span>
        <div className="flex gap-1">
          {SLIPPAGE_OPTIONS.map((o) => (
            <button
              key={o.bps}
              type="button"
              onClick={() => setSlippageBps(o.bps)}
              aria-pressed={slippageBps === o.bps}
              className={`rounded-md px-2 py-1 font-mono text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cw-green ${
                slippageBps === o.bps
                  ? "bg-cw-green/15 text-cw-green"
                  : "text-cw-text-muted hover:text-cw-text"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quote preview */}
      <QuotePreview state={quote} symbol={symbol} />

      {/* Action (non-executing) */}
      <div className="mt-4">
        <TradeButton side={side} symbol={symbol} />
      </div>

      {/* Your position (placeholder) */}
      <div className="mt-4 rounded-xl border border-white/8 bg-cw-bg/60 p-3">
        <span className="font-mono text-xs uppercase tracking-[0.14em] text-cw-text-muted">
          Your position
        </span>
        <p className="mt-1 text-sm font-semibold text-cw-text-muted">
          No position yet
        </p>
      </div>

      <p className="mt-3 text-center text-xs text-cw-text-muted">
        Memecoins are risky — trade at your own risk.
      </p>
    </aside>
  );
}

function QuotePreview({
  state,
  symbol,
}: {
  state: QuoteState;
  symbol: string;
}) {
  if (state.status === "idle") return null;

  const box =
    "mt-4 rounded-xl border border-white/8 bg-cw-bg/60 p-3 text-sm";

  if (state.status === "sell") {
    return (
      <p className={`${box} text-cw-text-muted`}>
        Sell quoting needs a position — coming in the next stage.
      </p>
    );
  }
  if (state.status === "loading") {
    return <p className={`${box} text-cw-text-muted`}>Fetching best route…</p>;
  }
  if (state.status === "error") {
    return (
      <p className={`${box} text-cw-text-muted`}>
        {state.error === "no_route"
          ? "No route for this amount."
          : "Quote unavailable right now."}
      </p>
    );
  }

  const q = state.data;
  return (
    <div className={box}>
      <Row label="You pay" value={`${formatUsdPrice(q.payUsd)} · ${q.paySol.toFixed(4)} SOL`} />
      <Row
        label="You receive ≈"
        value={`${formatCompact(q.receive)} ${symbol}`}
        strong
      />
      <Row label="Price impact" value={`${q.priceImpactPct.toFixed(2)}%`} />
      <Row label="Slippage" value={`${(q.slippageBps / 100).toFixed(2)}%`} />
      <Row
        label="Min received"
        value={`${formatCompact(q.minReceived)} ${symbol}`}
      />
      {q.routeLabels.length > 0 && (
        <p className="mt-2 font-mono text-[11px] text-cw-text-muted">
          Best route via {q.routeLabels.join(" → ")}
        </p>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="text-cw-text-muted">{label}</span>
      <span
        className={`font-mono ${strong ? "font-bold text-cw-text" : "text-cw-text"}`}
      >
        {value}
      </span>
    </div>
  );
}

const ACTION_BASE =
  "w-full rounded-full py-3 text-center text-sm font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cw-green focus-visible:ring-offset-2 focus-visible:ring-offset-cw-bg";

function disabledButton(label: string) {
  return (
    <button
      type="button"
      disabled
      className={`${ACTION_BASE} cursor-not-allowed border border-white/10 text-cw-text-muted`}
    >
      {label}
    </button>
  );
}

function TradeButton({ side, symbol }: { side: "buy" | "sell"; symbol: string }) {
  if (!publicEnv.NEXT_PUBLIC_PRIVY_APP_ID) return disabledButton("Review (coming soon)");
  return <TradeButtonInner side={side} symbol={symbol} />;
}

function TradeButtonInner({
  side,
  symbol,
}: {
  side: "buy" | "sell";
  symbol: string;
}) {
  const { ready, authenticated, login } = usePrivy();

  if (!ready) return disabledButton("…");

  if (!authenticated) {
    const tint = side === "buy" ? "bg-cw-green text-cw-bg" : "bg-cw-red text-cw-text";
    return (
      <button
        type="button"
        onClick={() => login()}
        className={`${ACTION_BASE} ${tint} hover:opacity-90`}
      >
        Sign in to {side} {symbol}
      </button>
    );
  }

  // Signed in: review/execute is Stage 6b — disabled, never signs or sends.
  return disabledButton("Review (coming soon)");
}
