"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { publicEnv } from "@/lib/public-env";

const PRESETS = [10, 50, 100];

/**
 * Buy/Sell SHELL only (Stage 6 wires real swaps). The action button prompts
 * Privy login when signed out and is disabled ("Trading coming soon") when
 * signed in. It NEVER calls Jupiter or any swap path (CLAUDE.md hard rule 5).
 */
export function BuySellShell({ symbol }: { symbol: string }) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");

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

      {/* Action */}
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
  // Privy not configured → no login possible; show the disabled future-state.
  if (!publicEnv.NEXT_PUBLIC_PRIVY_APP_ID) return disabledButton("Trading coming soon");
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

  // Authenticated: trading not built yet (Stage 6). Disabled — no swap path.
  return disabledButton("Trading coming soon");
}
