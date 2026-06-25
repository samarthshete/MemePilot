"use client";

import { useEffect, useRef, useState } from "react";
import { formatCompact, formatUsdPrice, timeAgo } from "@/lib/format";

type Holder = { owner: string; uiAmount: number; pctOfSupply: number | null };
type Trade = {
  side: "buy" | "sell";
  volumeUsd: number;
  owner: string;
  unixTime: number;
  txHash: string;
};
type Status = "idle" | "ready" | "empty" | "error";
type Load<T> = { status: Status; items: T[] };

const TRADES_POLL_MS = 45_000;

function short(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

async function load<T>(
  url: string,
  key: "holders" | "trades",
): Promise<Load<T>> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    const data = (await res.json()) as Record<string, unknown>;
    const items = (data[key] as T[] | undefined) ?? [];
    if (data.unavailable || items.length === 0) return { status: "empty", items: [] };
    return { status: "ready", items };
  } catch {
    return { status: "error", items: [] };
  }
}

export function TokenTabs({ address }: { address: string }) {
  const [tab, setTab] = useState<"holders" | "trades">("holders");
  const [holders, setHolders] = useState<Load<Holder>>({ status: "idle", items: [] });
  const [trades, setTrades] = useState<Load<Trade>>({ status: "idle", items: [] });
  const holdersLoaded = useRef(false);

  // Holders: fetch once when first viewed. Never polled.
  useEffect(() => {
    if (tab !== "holders" || holdersLoaded.current) return;
    holdersLoaded.current = true;
    let active = true;
    void (async () => {
      const next = await load<Holder>(
        `/api/holders?address=${encodeURIComponent(address)}`,
        "holders",
      );
      if (active) setHolders(next);
    })();
    return () => {
      active = false;
    };
  }, [tab, address]);

  // Live Trades: fetch on activation, then poll — but only while this tab is
  // active AND the page is visible (Stage 2 hidden-tab pattern).
  useEffect(() => {
    if (tab !== "trades") return;
    let active = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const refresh = async () => {
      const next = await load<Trade>(
        `/api/trades?address=${encodeURIComponent(address)}`,
        "trades",
      );
      if (active) setTrades(next);
    };
    const start = () => {
      if (intervalId === null) intervalId = setInterval(refresh, TRADES_POLL_MS);
    };
    const stop = () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else {
        void refresh();
        start();
      }
    };

    void refresh();
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      active = false;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [tab, address]);

  const current = tab === "holders" ? holders : trades;

  return (
    <div className="mt-6 rounded-2xl border border-white/8 bg-cw-surface/40 p-4">
      <div className="flex gap-2" role="tablist" aria-label="Token research">
        {(["holders", "trades"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cw-green ${
              tab === t
                ? "bg-cw-green/15 text-cw-green"
                : "text-cw-text-muted hover:text-cw-text"
            }`}
          >
            {t === "holders" ? "Holders" : "Live Trades"}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {current.status === "idle" ? (
          <Skeleton />
        ) : current.status === "empty" ? (
          <Message>
            {tab === "holders" ? "Holders" : "Live Trades"} unavailable for this
            token.
          </Message>
        ) : current.status === "error" ? (
          <Message>Couldn’t load {tab === "holders" ? "holders" : "trades"}.</Message>
        ) : tab === "holders" ? (
          <HolderList holders={holders.items} />
        ) : (
          <TradeList trades={trades.items} />
        )}
      </div>
    </div>
  );
}

function HolderList({ holders }: { holders: Holder[] }) {
  return (
    <ol className="flex flex-col gap-1">
      {holders.map((h, i) => (
        <li
          key={h.owner}
          className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="w-5 shrink-0 font-mono text-xs text-cw-text-muted">
              {i + 1}
            </span>
            <Copyable text={h.owner} />
          </span>
          <span className="flex shrink-0 flex-col items-end">
            <span className="font-mono text-xs font-bold text-cw-text">
              {h.pctOfSupply !== null ? `${h.pctOfSupply.toFixed(2)}%` : "—"}
            </span>
            <span className="font-mono text-[11px] text-cw-text-muted">
              {formatCompact(h.uiAmount)}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function TradeList({ trades }: { trades: Trade[] }) {
  return (
    <ol className="flex flex-col gap-1">
      {trades.map((t) => (
        <li
          key={t.txHash}
          className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span
              className={`w-9 shrink-0 font-mono text-xs font-bold uppercase ${
                t.side === "buy" ? "text-cw-green" : "text-cw-red"
              }`}
            >
              {t.side}
            </span>
            <Copyable text={t.owner} />
          </span>
          <span className="flex shrink-0 flex-col items-end">
            <span className="font-mono text-xs font-bold text-cw-text">
              {formatUsdPrice(t.volumeUsd)}
            </span>
            <span className="font-mono text-[11px] text-cw-text-muted">
              {timeAgo(t.unixTime)}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function Copyable({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title={`Copy ${text}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {
          /* clipboard blocked */
        }
      }}
      className="truncate font-mono text-xs text-cw-text-muted transition-colors hover:text-cw-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cw-green"
    >
      {copied ? "copied ✓" : short(text)}
    </button>
  );
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-7 animate-pulse rounded-lg bg-white/5 motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <p className="py-6 text-center font-mono text-sm text-cw-text-muted">
      {children}
    </p>
  );
}
