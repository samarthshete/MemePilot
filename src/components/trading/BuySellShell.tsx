"use client";

import { useCallback, useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";
import { formatCompact, formatUsdPrice } from "@/lib/format";
import { publicEnv } from "@/lib/public-env";
import { BUY_PRESETS, MAX_BUY_USD } from "@/lib/trading-config";
import { ReviewModal } from "./ReviewModal";

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

const SLIPPAGE_OPTIONS = [
  { bps: 50, label: "0.5%" },
  { bps: 100, label: "1%" },
  { bps: 300, label: "3%" },
];

/**
 * Buy/Sell panel. Quote preview (Stage 6a) + BUY execution (Stage 6b): the user
 * always signs in Privy (client-side); the server only relays. Hard cap
 * MAX_BUY_USD; sell still deferred. NEVER auto-signs/sends.
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

  const amountUsd = Number.parseFloat(amount);
  const validAmount = Number.isFinite(amountUsd) && amountUsd > 0;

  useEffect(() => {
    const timer = setTimeout(() => {
      if (side === "sell") {
        setQuote({ status: "sell" });
        return;
      }
      if (!validAmount) {
        setQuote({ status: "idle" });
        return;
      }
      setQuote({ status: "loading" });
      void (async () => {
        try {
          const res = await fetch("/api/quote", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ address, amountUsd, side: "buy", slippageBps }),
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
  }, [address, amount, amountUsd, validAmount, slippageBps, side]);

  return (
    <aside className="rounded-2xl border border-white/8 bg-cw-surface/40 p-4">
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

      <label className="mt-4 block">
        <span className="flex items-center justify-between font-mono text-xs uppercase tracking-[0.14em] text-cw-text-muted">
          <span>Amount (USD)</span>
          <span className="normal-case tracking-normal">max ${MAX_BUY_USD}</span>
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
        {BUY_PRESETS.map((p) => (
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

      <QuotePreview state={quote} symbol={symbol} />

      <div className="mt-4">
        <TradePanel
          address={address}
          symbol={symbol}
          side={side}
          amountUsd={validAmount ? amountUsd : 0}
          slippageBps={slippageBps}
          quoteReady={quote.status === "ready"}
        />
      </div>

      <p className="mt-3 text-center text-xs text-cw-text-muted">
        Memecoins are risky — trade at your own risk.
      </p>
    </aside>
  );
}

/* --------------------------------- Trade ---------------------------------- */

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

function PositionBox({
  qty,
  valueUsd,
  symbol,
}: {
  qty: number | null;
  valueUsd: number | null;
  symbol: string;
}) {
  return (
    <div className="mt-4 rounded-xl border border-white/8 bg-cw-bg/60 p-3">
      <span className="font-mono text-xs uppercase tracking-[0.14em] text-cw-text-muted">
        Your position
      </span>
      {qty && qty > 0 ? (
        <p className="mt-1 text-sm font-bold text-cw-text">
          {formatCompact(qty)} {symbol}
          {valueUsd != null && (
            <span className="ml-1 font-normal text-cw-text-muted">
              ≈ {formatUsdPrice(valueUsd)}
            </span>
          )}
        </p>
      ) : (
        <p className="mt-1 text-sm font-semibold text-cw-text-muted">
          No position yet
        </p>
      )}
    </div>
  );
}

function TradePanel(props: {
  address: string;
  symbol: string;
  side: "buy" | "sell";
  amountUsd: number;
  slippageBps: number;
  quoteReady: boolean;
}) {
  // Privy not configured → no signing possible; static disabled state.
  if (!publicEnv.NEXT_PUBLIC_PRIVY_APP_ID) {
    return (
      <>
        {disabledButton("Buy (sign-in unavailable)")}
        <PositionBox qty={null} valueUsd={null} symbol={props.symbol} />
      </>
    );
  }
  return <TradePanelInner {...props} />;
}

function TradePanelInner({
  address,
  symbol,
  side,
  amountUsd,
  slippageBps,
  quoteReady,
}: {
  address: string;
  symbol: string;
  side: "buy" | "sell";
  amountUsd: number;
  slippageBps: number;
  quoteReady: boolean;
}) {
  const { ready, authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const wallet = wallets[0];
  const [modalOpen, setModalOpen] = useState(false);
  const [qty, setQty] = useState<number | null>(null);
  const [valueUsd, setValueUsd] = useState<number | null>(null);

  const refreshPosition = useCallback(async () => {
    if (!wallet) return;
    try {
      const res = await fetch(
        `/api/position?address=${encodeURIComponent(address)}&owner=${encodeURIComponent(wallet.address)}`,
      );
      const data = (await res.json()) as
        | { ok: true; qty: number; valueUsd: number | null }
        | { ok: false };
      if (data.ok) {
        setQty(data.qty);
        setValueUsd(data.valueUsd);
      }
    } catch {
      /* leave as-is */
    }
  }, [address, wallet]);

  useEffect(() => {
    if (!authenticated || !wallet) return;
    let active = true;
    void (async () => {
      try {
        const res = await fetch(
          `/api/position?address=${encodeURIComponent(address)}&owner=${encodeURIComponent(wallet.address)}`,
        );
        const data = (await res.json()) as
          | { ok: true; qty: number; valueUsd: number | null }
          | { ok: false };
        if (active && data.ok) {
          setQty(data.qty);
          setValueUsd(data.valueUsd);
        }
      } catch {
        /* leave as-is */
      }
    })();
    return () => {
      active = false;
    };
  }, [authenticated, wallet, address]);

  const overCap = amountUsd > MAX_BUY_USD;
  const canReview =
    ready && authenticated && Boolean(wallet) && side === "buy" && quoteReady && amountUsd > 0 && !overCap;

  let button: React.ReactNode;
  if (side === "sell") {
    button = disabledButton("Sell coming soon");
  } else if (!ready) {
    button = disabledButton("…");
  } else if (!authenticated) {
    button = (
      <button
        type="button"
        onClick={() => login()}
        className={`${ACTION_BASE} bg-cw-green text-cw-bg hover:bg-cw-green-press`}
      >
        Sign in to buy {symbol}
      </button>
    );
  } else if (overCap) {
    button = disabledButton(`Max $${MAX_BUY_USD} this stage`);
  } else {
    button = (
      <button
        type="button"
        disabled={!canReview}
        onClick={() => setModalOpen(true)}
        className={`${ACTION_BASE} bg-cw-green text-cw-bg hover:bg-cw-green-press disabled:cursor-not-allowed disabled:opacity-50`}
      >
        Review buy {symbol}
      </button>
    );
  }

  return (
    <>
      {button}
      <PositionBox qty={qty} valueUsd={valueUsd} symbol={symbol} />
      {modalOpen && wallet && (
        <ReviewModal
          address={address}
          symbol={symbol}
          amountUsd={amountUsd}
          slippageBps={slippageBps}
          wallet={wallet}
          onClose={() => setModalOpen(false)}
          onSuccess={() => void refreshPosition()}
        />
      )}
    </>
  );
}

/* ----------------------------- Quote preview ------------------------------ */

function QuotePreview({ state, symbol }: { state: QuoteState; symbol: string }) {
  if (state.status === "idle") return null;
  const box = "mt-4 rounded-xl border border-white/8 bg-cw-bg/60 p-3 text-sm";

  if (state.status === "sell")
    return (
      <p className={`${box} text-cw-text-muted`}>
        Sell quoting needs a position — coming in a later stage.
      </p>
    );
  if (state.status === "loading")
    return <p className={`${box} text-cw-text-muted`}>Fetching best route…</p>;
  if (state.status === "error")
    return (
      <p className={`${box} text-cw-text-muted`}>
        {state.error === "no_route"
          ? "No route for this amount."
          : "Quote unavailable right now."}
      </p>
    );

  const q = state.data;
  return (
    <div className={box}>
      <Row label="You pay" value={`${formatUsdPrice(q.payUsd)} · ${q.paySol.toFixed(4)} SOL`} />
      <Row label="You receive ≈" value={`${formatCompact(q.receive)} ${symbol}`} strong />
      <Row label="Price impact" value={`${q.priceImpactPct.toFixed(2)}%`} />
      <Row label="Slippage" value={`${(q.slippageBps / 100).toFixed(2)}%`} />
      <Row label="Min received" value={`${formatCompact(q.minReceived)} ${symbol}`} />
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
      <span className={`font-mono ${strong ? "font-bold text-cw-text" : "text-cw-text"}`}>
        {value}
      </span>
    </div>
  );
}
