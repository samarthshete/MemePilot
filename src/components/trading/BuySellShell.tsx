"use client";

import { useCallback, useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";
import { formatCompact, formatUsdPrice } from "@/lib/format";
import { publicEnv } from "@/lib/public-env";
import {
  BUY_PRESETS,
  MAX_BUY_USD,
  MIN_SOL_TO_TRADE,
  SELL_PCT_PRESETS,
  SOL_MINT,
} from "@/lib/trading-config";
import { type Order, ReviewModal } from "./ReviewModal";

const SLIPPAGE_OPTIONS = [
  { bps: 50, label: "0.5%" },
  { bps: 100, label: "1%" },
  { bps: 300, label: "3%" },
];

type BuyQuote = {
  payUsd: number;
  paySol: number;
  receive: number;
  minReceived: number;
  priceImpactPct: number;
  slippageBps: number;
  routeLabels: string[];
};
type SellQuote = {
  receiveSol: number;
  receiveUsd: number | null;
  minReceivedSol: number;
  priceImpactPct: number;
  slippageBps: number;
  routeLabels: string[];
};
type Quote<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; error: string };

export function BuySellShell({
  address,
  symbol,
}: {
  address: string;
  symbol: string;
}) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [slippageBps, setSlippageBps] = useState(50);

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

      <SlippageControl value={slippageBps} onChange={setSlippageBps} />

      <TradePanel
        address={address}
        symbol={symbol}
        side={side}
        slippageBps={slippageBps}
      />

      <p className="mt-3 text-center text-xs text-cw-text-muted">
        Memecoins are risky — trade at your own risk.
      </p>
    </aside>
  );
}

function SlippageControl({
  value,
  onChange,
}: {
  value: number;
  onChange: (bps: number) => void;
}) {
  return (
    <div className="mt-3 flex items-center justify-between gap-2">
      <span className="font-mono text-xs uppercase tracking-[0.14em] text-cw-text-muted">
        Slippage
      </span>
      <div className="flex gap-1">
        {SLIPPAGE_OPTIONS.map((o) => (
          <button
            key={o.bps}
            type="button"
            onClick={() => onChange(o.bps)}
            aria-pressed={value === o.bps}
            className={`rounded-md px-2 py-1 font-mono text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cw-green ${
              value === o.bps ? "bg-cw-green/15 text-cw-green" : "text-cw-text-muted hover:text-cw-text"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
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

function TradePanel(props: {
  address: string;
  symbol: string;
  side: "buy" | "sell";
  slippageBps: number;
}) {
  // Privy not configured → signing impossible; static disabled + quote preview only.
  if (!publicEnv.NEXT_PUBLIC_PRIVY_APP_ID) {
    return (
      <>
        {props.side === "buy" ? <BuyControls {...props} canReview={false} /> : null}
        {disabledButton(
          props.side === "buy" ? "Buy (sign-in unavailable)" : "Sell (sign-in unavailable)",
        )}
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
  slippageBps,
}: {
  address: string;
  symbol: string;
  side: "buy" | "sell";
  slippageBps: number;
}) {
  const { ready, authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const wallet = wallets[0];

  const [qty, setQty] = useState<number | null>(null);
  const [rawBalance, setRawBalance] = useState<string>("0");
  const [decimals, setDecimals] = useState<number>(0);
  const [valueUsd, setValueUsd] = useState<number | null>(null);

  const [buyAmount, setBuyAmount] = useState("");
  const [buyQuote, setBuyQuote] = useState<Quote<BuyQuote>>({ status: "idle" });

  const [sellPct, setSellPct] = useState<number | null>(50);
  const [sellExact, setSellExact] = useState("");
  const [sellQuote, setSellQuote] = useState<Quote<SellQuote>>({ status: "idle" });

  const [order, setOrder] = useState<Order | null>(null);
  // Native SOL balance (null = unknown/not yet read) — gates BUY when ~empty.
  const [solBalance, setSolBalance] = useState<number | null>(null);

  const refreshPosition = useCallback(async () => {
    if (!wallet) return;
    try {
      const res = await fetch(
        `/api/position?address=${encodeURIComponent(address)}&owner=${encodeURIComponent(wallet.address)}`,
      );
      const data = (await res.json()) as
        | { ok: true; qty: number; rawAmount: string; decimals: number; valueUsd: number | null }
        | { ok: false };
      if (data.ok) {
        setQty(data.qty);
        setRawBalance(data.rawAmount);
        setDecimals(data.decimals);
        setValueUsd(data.valueUsd);
      }
    } catch {
      /* leave as-is */
    }
  }, [address, wallet]);

  // Load position when signed in.
  useEffect(() => {
    if (!authenticated || !wallet) return;
    let active = true;
    void (async () => {
      try {
        const res = await fetch(
          `/api/position?address=${encodeURIComponent(address)}&owner=${encodeURIComponent(wallet.address)}`,
        );
        const data = (await res.json()) as
          | { ok: true; qty: number; rawAmount: string; decimals: number; valueUsd: number | null }
          | { ok: false };
        if (active && data.ok) {
          setQty(data.qty);
          setRawBalance(data.rawAmount);
          setDecimals(data.decimals);
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

  // Native SOL balance (reuses /api/position; SOL_MINT → getBalance) for the buy gate.
  useEffect(() => {
    if (!authenticated || !wallet) return;
    let active = true;
    void (async () => {
      try {
        const res = await fetch(
          `/api/position?address=${encodeURIComponent(SOL_MINT)}&owner=${encodeURIComponent(wallet.address)}`,
        );
        const data = (await res.json()) as { ok: true; qty: number } | { ok: false };
        if (active && data.ok) setSolBalance(data.qty);
      } catch {
        /* leave unknown */
      }
    })();
    return () => {
      active = false;
    };
  }, [authenticated, wallet]);

  const sellRawAmount = computeSellRaw(rawBalance, decimals, sellPct, sellExact);

  // Buy quote (debounced) — public preview, no auth needed.
  useEffect(() => {
    if (side !== "buy") return;
    const timer = setTimeout(() => {
      const usd = Number.parseFloat(buyAmount);
      if (!Number.isFinite(usd) || usd <= 0) {
        setBuyQuote({ status: "idle" });
        return;
      }
      setBuyQuote({ status: "loading" });
      void (async () => {
        try {
          const res = await fetch("/api/quote", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ side: "buy", address, amountUsd: usd, slippageBps }),
          });
          const data = (await res.json()) as ({ ok: true } & BuyQuote) | { ok: false; error: string };
          if (data.ok) setBuyQuote({ status: "ready", data });
          else setBuyQuote({ status: "error", error: data.error });
        } catch {
          setBuyQuote({ status: "error", error: "unavailable" });
        }
      })();
    }, 400);
    return () => clearTimeout(timer);
  }, [side, address, buyAmount, slippageBps]);

  // Sell quote (debounced) — needs a sized raw amount.
  useEffect(() => {
    if (side !== "sell") return;
    const timer = setTimeout(() => {
      if (sellRawAmount === "0") {
        setSellQuote({ status: "idle" });
        return;
      }
      setSellQuote({ status: "loading" });
      void (async () => {
        try {
          const res = await fetch("/api/quote", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ side: "sell", address, sellRawAmount, slippageBps }),
          });
          const data = (await res.json()) as ({ ok: true } & SellQuote) | { ok: false; error: string };
          if (data.ok) setSellQuote({ status: "ready", data });
          else setSellQuote({ status: "error", error: data.error });
        } catch {
          setSellQuote({ status: "error", error: "unavailable" });
        }
      })();
    }, 400);
    return () => clearTimeout(timer);
  }, [side, address, sellRawAmount, slippageBps]);

  const buyUsd = Number.parseFloat(buyAmount);
  const buyValid = Number.isFinite(buyUsd) && buyUsd > 0;
  const overCap = buyValid && buyUsd > MAX_BUY_USD;
  const hasPosition = (qty ?? 0) > 0;
  const sellTokens = decimals ? Number(sellRawAmount) / 10 ** decimals : 0;

  // Known-empty wallet states (only when the balance was actually read). Gate the
  // execute step so we never open the Privy modal into a "will likely fail" error.
  const buyEmpty = solBalance != null && solBalance < MIN_SOL_TO_TRADE;
  const sellEmpty = authenticated && qty === 0;

  let action: React.ReactNode;
  if (!ready) {
    action = disabledButton("…");
  } else if (!authenticated) {
    action = (
      <button
        type="button"
        onClick={() => login()}
        className={`${ACTION_BASE} ${side === "buy" ? "bg-cw-green text-cw-bg" : "bg-cw-red text-cw-text"} hover:opacity-90`}
      >
        Sign in to {side} {symbol}
      </button>
    );
  } else if (side === "buy") {
    if (overCap) {
      action = disabledButton(`Max $${MAX_BUY_USD} this stage`);
    } else if (buyEmpty) {
      action = disabledButton("Add SOL to trade");
    } else {
      action = (
        <button
          type="button"
          disabled={!(buyValid && wallet && buyQuote.status === "ready")}
          onClick={() => setOrder({ side: "buy", amountUsd: buyUsd })}
          className={`${ACTION_BASE} bg-cw-green text-cw-bg hover:bg-cw-green-press disabled:cursor-not-allowed disabled:opacity-50`}
        >
          Review buy {symbol}
        </button>
      );
    }
  } else if (!hasPosition) {
    action = disabledButton(`No ${symbol} to sell`);
  } else {
    action = (
      <button
        type="button"
        disabled={!(wallet && sellRawAmount !== "0" && sellQuote.status === "ready")}
        onClick={() => setOrder({ side: "sell", sellRawAmount })}
        className={`${ACTION_BASE} bg-cw-red text-cw-text hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50`}
      >
        Review sell {symbol}
      </button>
    );
  }

  return (
    <>
      {side === "buy" ? (
        <BuyControls
          address={address}
          symbol={symbol}
          slippageBps={slippageBps}
          amount={buyAmount}
          onAmount={setBuyAmount}
          quote={buyQuote}
          canReview
        />
      ) : (
        <SellControls
          symbol={symbol}
          disabled={!hasPosition}
          sellPct={sellPct}
          onPct={(p) => {
            setSellPct(p);
            setSellExact("");
          }}
          sellExact={sellExact}
          onExact={(v) => {
            setSellExact(v);
            setSellPct(null);
          }}
          sellTokens={sellTokens}
          quote={sellQuote}
        />
      )}

      {wallet && side === "buy" && buyEmpty && (
        <WalletHint address={wallet.address} message="Add SOL to your wallet to trade" />
      )}
      {wallet && side === "sell" && sellEmpty && (
        <WalletHint address={wallet.address} message={`No ${symbol} to sell yet`} />
      )}

      <div className="mt-4">{action}</div>
      <PositionBox qty={qty} valueUsd={valueUsd} symbol={symbol} />

      {order && wallet && (
        <ReviewModal
          order={order}
          address={address}
          symbol={symbol}
          slippageBps={slippageBps}
          wallet={wallet}
          onClose={() => setOrder(null)}
          onSuccess={() => void refreshPosition()}
        />
      )}
    </>
  );
}

/** BigInt-exact sell sizing, capped at the real balance. */
function computeSellRaw(
  rawBalance: string,
  decimals: number,
  pct: number | null,
  exact: string,
): string {
  let bal: bigint;
  try {
    bal = BigInt(rawBalance);
  } catch {
    return "0";
  }
  if (bal <= BigInt(0)) return "0";
  if (exact) {
    const n = Number.parseFloat(exact);
    if (!Number.isFinite(n) || n <= 0) return "0";
    let raw = BigInt(Math.round(n * 10 ** decimals));
    if (raw > bal) raw = bal;
    return raw > BigInt(0) ? raw.toString() : "0";
  }
  if (pct) return (pct >= 100 ? bal : (bal * BigInt(pct)) / BigInt(100)).toString();
  return "0";
}

/* --------------------------------- views ---------------------------------- */

function BuyControls({
  amount,
  onAmount,
  quote,
  symbol,
}: {
  address: string;
  symbol: string;
  slippageBps: number;
  amount?: string;
  onAmount?: (v: string) => void;
  quote?: Quote<BuyQuote>;
  canReview: boolean;
}) {
  return (
    <>
      <label className="mt-4 block">
        <span className="flex items-center justify-between font-mono text-xs uppercase tracking-[0.14em] text-cw-text-muted">
          <span>Amount (USD)</span>
          <span className="normal-case tracking-normal">max ${MAX_BUY_USD}</span>
        </span>
        <input
          inputMode="decimal"
          value={amount ?? ""}
          onChange={(e) => onAmount?.(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder="0.00"
          className="mt-1.5 w-full rounded-xl border border-white/12 bg-cw-bg px-3 py-2.5 font-mono text-lg text-cw-text outline-none focus-visible:border-cw-green"
        />
      </label>
      <div className="mt-2 flex gap-2">
        {BUY_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onAmount?.(String(p))}
            className="flex-1 rounded-lg border border-white/12 py-1.5 font-mono text-sm font-bold text-cw-text-muted transition-colors hover:border-cw-green hover:text-cw-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cw-green"
          >
            ${p}
          </button>
        ))}
      </div>
      {quote && <BuyPreview state={quote} symbol={symbol} />}
    </>
  );
}

function SellControls({
  symbol,
  disabled,
  sellPct,
  onPct,
  sellExact,
  onExact,
  sellTokens,
  quote,
}: {
  symbol: string;
  disabled: boolean;
  sellPct: number | null;
  onPct: (p: number) => void;
  sellExact: string;
  onExact: (v: string) => void;
  sellTokens: number;
  quote: Quote<SellQuote>;
}) {
  return (
    <>
      <div className="mt-4">
        <span className="font-mono text-xs uppercase tracking-[0.14em] text-cw-text-muted">
          Sell amount
        </span>
        <div className="mt-1.5 flex gap-2">
          {SELL_PCT_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              disabled={disabled}
              onClick={() => onPct(p)}
              aria-pressed={sellPct === p}
              className={`flex-1 rounded-lg border py-1.5 font-mono text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cw-green disabled:cursor-not-allowed disabled:opacity-40 ${
                sellPct === p
                  ? "border-cw-red/60 bg-cw-red/15 text-cw-text"
                  : "border-white/12 text-cw-text-muted hover:text-cw-text"
              }`}
            >
              {p === 100 ? "Max" : `${p}%`}
            </button>
          ))}
        </div>
        <input
          inputMode="decimal"
          disabled={disabled}
          value={sellExact}
          onChange={(e) => onExact(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder={`Exact ${symbol} amount (optional)`}
          className="mt-2 w-full rounded-xl border border-white/12 bg-cw-bg px-3 py-2 font-mono text-sm text-cw-text outline-none focus-visible:border-cw-green disabled:opacity-40"
        />
        {sellTokens > 0 && (
          <p className="mt-1 font-mono text-[11px] text-cw-text-muted">
            Selling ≈ {formatCompact(sellTokens)} {symbol}
          </p>
        )}
      </div>
      <SellPreview state={quote} />
    </>
  );
}

function WalletHint({
  address,
  message,
}: {
  address: string;
  message: string;
}) {
  const [copied, setCopied] = useState(false);
  const short = `${address.slice(0, 4)}…${address.slice(-4)}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };
  return (
    <div className="mt-4 rounded-xl border border-cw-green/25 bg-cw-green/5 p-3 text-sm">
      <p className="font-semibold text-cw-text">{message}</p>
      <p className="mt-1 text-xs text-cw-text-muted">Send funds to your wallet:</p>
      <button
        type="button"
        onClick={copy}
        title={`Copy ${address}`}
        aria-label={`Copy wallet address ${address}`}
        className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-cw-bg px-2.5 py-1.5 font-mono text-xs text-cw-text-muted transition-colors hover:border-cw-green hover:text-cw-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cw-green"
      >
        {short}
        <span className={copied ? "text-cw-green" : ""}>
          {copied ? "copied ✓" : "copy"}
        </span>
      </button>
    </div>
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
        <p className="mt-1 text-sm font-semibold text-cw-text-muted">No position yet</p>
      )}
    </div>
  );
}

const PREVIEW_BOX = "mt-4 rounded-xl border border-white/8 bg-cw-bg/60 p-3 text-sm";

function BuyPreview({ state, symbol }: { state: Quote<BuyQuote>; symbol: string }) {
  if (state.status === "idle") return null;
  if (state.status === "loading")
    return <p className={`${PREVIEW_BOX} text-cw-text-muted`}>Fetching best route…</p>;
  if (state.status === "error")
    return (
      <p className={`${PREVIEW_BOX} text-cw-text-muted`}>
        {state.error === "no_route" ? "No route for this amount." : "Quote unavailable right now."}
      </p>
    );
  const q = state.data;
  return (
    <div className={PREVIEW_BOX}>
      <Row label="You pay" value={`${formatUsdPrice(q.payUsd)} · ${q.paySol.toFixed(4)} SOL`} />
      <Row label="You receive ≈" value={`${formatCompact(q.receive)} ${symbol}`} strong />
      <Row label="Price impact" value={`${q.priceImpactPct.toFixed(2)}%`} />
      <Row label="Min received" value={`${formatCompact(q.minReceived)} ${symbol}`} />
      {q.routeLabels.length > 0 && <RouteLine labels={q.routeLabels} />}
    </div>
  );
}

function SellPreview({ state }: { state: Quote<SellQuote> }) {
  if (state.status === "idle") return null;
  if (state.status === "loading")
    return <p className={`${PREVIEW_BOX} text-cw-text-muted`}>Fetching best route…</p>;
  if (state.status === "error")
    return (
      <p className={`${PREVIEW_BOX} text-cw-text-muted`}>
        {state.error === "no_route" ? "No SOL route for this token/amount." : "Quote unavailable right now."}
      </p>
    );
  const q = state.data;
  return (
    <div className={PREVIEW_BOX}>
      <Row
        label="You receive ≈"
        value={`${q.receiveSol.toFixed(4)} SOL${q.receiveUsd != null ? ` (≈ ${formatUsdPrice(q.receiveUsd)})` : ""}`}
        strong
      />
      <Row label="Price impact" value={`${q.priceImpactPct.toFixed(2)}%`} />
      <Row label="Min received" value={`${q.minReceivedSol.toFixed(4)} SOL`} />
      {q.routeLabels.length > 0 && <RouteLine labels={q.routeLabels} />}
    </div>
  );
}

function RouteLine({ labels }: { labels: string[] }) {
  return (
    <p className="mt-2 font-mono text-[11px] text-cw-text-muted">
      Best route via {labels.join(" → ")}
    </p>
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
