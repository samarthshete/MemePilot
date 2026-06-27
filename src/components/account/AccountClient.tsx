"use client";

import { useCallback, useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";
import { DepositModal } from "@/components/ui/DepositModal";
import { formatCompact, formatUsdPrice } from "@/lib/format";
import { publicEnv } from "@/lib/public-env";
import { SOL_MINT } from "@/lib/trading-config";
import { SendModal } from "./SendModal";

type Holding = { mint: string; symbol: string; qty: number; priceUsd: number | null; valueUsd: number | null };
type Position = {
  tokenAddress: string;
  symbol: string;
  qty: number;
  avgEntryUsd: number | null;
  currentPriceUsd: number | null;
  valueUsd: number | null;
  unrealizedUsd: number | null;
  unrealizedPct: number | null;
  isDemo: boolean;
};
type HistoryItem = {
  id: string;
  side: "buy" | "sell";
  symbol: string;
  amountUsd: number | null;
  tokenQty: number | null;
  priceAtTrade: number | null;
  txSignature: string | null;
  isDemo: boolean;
  createdAt: string;
};
type Portfolio = {
  totalValueUsd: number;
  holdings: Holding[];
  positions: Position[];
  history: HistoryItem[];
  hasDemo: boolean;
};

const CARD = "rounded-2xl border border-white/8 bg-cw-surface/40 p-4";

export function AccountClient() {
  const { ready, authenticated, login, user, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const wallet = wallets[0];
  const address = wallet?.address;

  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deposit, setDeposit] = useState(false);
  const [send, setSend] = useState<null | "send" | "withdraw">(null);

  const display =
    user?.google?.name || user?.google?.email || user?.email?.address || null;

  const load = useCallback(async () => {
    if (!address) return;
    try {
      const token = await getAccessToken();
      if (!token) {
        setError(true);
        setLoading(false);
        return;
      }
      const params = new URLSearchParams({ owner: address });
      if (user?.google?.name) params.set("name", user.google.name);
      const email = user?.google?.email || user?.email?.address;
      if (email) params.set("email", email);
      const res = await fetch(`/api/portfolio?${params.toString()}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setError(true);
        setLoading(false);
        return;
      }
      const data = (await res.json()) as Portfolio;
      setPortfolio(data);
      setLoading(false);
    } catch {
      setError(true);
      setLoading(false);
    }
  }, [address, getAccessToken, user]);

  useEffect(() => {
    if (!authenticated || !address) return;
    // Async IIFE: load()'s setState runs after an await, never synchronously in
    // the effect body (react-hooks/set-state-in-effect).
    void (async () => {
      await load();
    })();
  }, [authenticated, address, load]);

  const toggleDemo = async (method: "POST" | "DELETE") => {
    if (!address) return;
    setDemoBusy(true);
    try {
      const token = await getAccessToken();
      if (token) {
        await fetch("/api/portfolio/seed-demo", {
          method,
          headers: { authorization: `Bearer ${token}` },
        });
        await load();
      }
    } catch {
      /* ignore — UI stays as-is */
    } finally {
      setDemoBusy(false);
    }
  };

  const copyAddress = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  if (!publicEnv.NEXT_PUBLIC_PRIVY_APP_ID) {
    return <Centered>Sign-in isn’t configured in this environment.</Centered>;
  }
  if (!ready) return <Centered>Loading…</Centered>;
  if (!authenticated) {
    return (
      <Centered>
        <p className="text-cw-text-muted">Sign in to view your account and portfolio.</p>
        <button
          type="button"
          onClick={() => login()}
          className="mt-4 rounded-full bg-cw-green px-6 py-2.5 text-sm font-extrabold text-cw-bg hover:bg-cw-green-press"
        >
          Sign in
        </button>
      </Centered>
    );
  }
  if (!address) return <Centered>Setting up your wallet…</Centered>;

  const solBalance = portfolio?.holdings.find((h) => h.mint === SOL_MINT)?.qty ?? 0;

  return (
    <div className="mx-auto w-full max-w-[900px] px-[clamp(0.875rem,3vw,2rem)] py-6">
      {/* Header */}
      <div className={CARD}>
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-cw-text-muted">
          Total portfolio value
        </p>
        <p className="mt-1 font-mono text-4xl font-black tracking-[-0.02em] text-cw-text">
          {loading ? "—" : formatUsdPrice(portfolio?.totalValueUsd ?? 0)}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {display && <span className="font-semibold text-cw-text">{display}</span>}
          <button
            type="button"
            onClick={copyAddress}
            aria-label="Copy wallet address"
            className="inline-flex items-center gap-1.5 font-mono text-xs text-cw-text-muted hover:text-cw-text"
          >
            {address.slice(0, 4)}…{address.slice(-4)}
            <span className={copied ? "text-cw-green" : ""}>{copied ? "copied ✓" : "copy"}</span>
          </button>
        </div>

        {/* Action row */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ActionButton label="Send" onClick={() => setSend("send")} />
          <ActionButton label="Receive" onClick={() => setDeposit(true)} />
          <ActionButton label="Deposit" onClick={() => setDeposit(true)} />
          <ActionButton label="Withdraw" onClick={() => setSend("withdraw")} />
        </div>
      </div>

      {/* Demo banner */}
      {portfolio?.hasDemo && (
        <div className="mt-4 rounded-xl border border-cw-amber/30 bg-cw-amber/5 p-3 text-sm">
          <p className="font-semibold text-cw-amber">Showing sample portfolio data for the demo</p>
          <p className="mt-1 text-xs text-cw-text-muted">
            Your real trades appear here automatically once you trade. Sample rows are tagged
            “sample”.
          </p>
        </div>
      )}

      {/* Demo controls */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => toggleDemo("POST")}
          disabled={demoBusy}
          className="rounded-full border border-white/16 px-4 py-2 text-sm font-bold text-cw-text hover:border-white/40 disabled:opacity-50"
        >
          Load sample data
        </button>
        <button
          type="button"
          onClick={() => toggleDemo("DELETE")}
          disabled={demoBusy}
          className="rounded-full border border-white/16 px-4 py-2 text-sm font-bold text-cw-text-muted hover:border-white/40 disabled:opacity-50"
        >
          Clear sample data
        </button>
      </div>

      {/* Holdings */}
      <Section title="Holdings">
        {loading ? (
          <Muted>Loading…</Muted>
        ) : error ? (
          <Muted>Couldn’t load your portfolio.</Muted>
        ) : (portfolio?.holdings.length ?? 0) === 0 ? (
          <Muted>No on-chain holdings yet — deposit SOL to get started.</Muted>
        ) : (
          <ul className="flex flex-col gap-1">
            {portfolio!.holdings.map((h) => (
              <Row
                key={h.mint}
                left={h.symbol}
                sub={`${formatCompact(h.qty)} ${h.symbol}`}
                right={h.valueUsd != null ? formatUsdPrice(h.valueUsd) : "—"}
              />
            ))}
          </ul>
        )}
      </Section>

      {/* Positions */}
      <Section title="Positions & PnL">
        {loading ? (
          <Muted>Loading…</Muted>
        ) : (portfolio?.positions.length ?? 0) === 0 ? (
          <Muted>No positions yet.</Muted>
        ) : (
          <ul className="flex flex-col gap-1">
            {portfolio!.positions.map((p) => {
              const up = (p.unrealizedPct ?? 0) >= 0;
              return (
                <li
                  key={p.tokenAddress}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm hover:bg-white/5"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="font-bold text-cw-text">
                      {p.symbol}
                      {p.isDemo && <Tag>sample</Tag>}
                    </span>
                    <span className="font-mono text-[11px] text-cw-text-muted">
                      {formatCompact(p.qty)} · avg{" "}
                      {p.avgEntryUsd != null ? formatUsdPrice(p.avgEntryUsd) : "—"}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end">
                    <span className="font-mono font-bold text-cw-text">
                      {p.valueUsd != null ? formatUsdPrice(p.valueUsd) : "—"}
                    </span>
                    {p.unrealizedUsd != null && p.unrealizedPct != null ? (
                      <span className={`font-mono text-[11px] font-bold ${up ? "text-cw-green" : "text-cw-red"}`}>
                        {up ? "▲" : "▼"} {formatUsdPrice(Math.abs(p.unrealizedUsd))} (
                        {p.unrealizedPct.toFixed(1)}%)
                      </span>
                    ) : (
                      <span className="font-mono text-[11px] text-cw-text-muted">—</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {/* History */}
      <Section title="Trade history">
        {loading ? (
          <Muted>Loading…</Muted>
        ) : (portfolio?.history.length ?? 0) === 0 ? (
          <Muted>No trades yet.</Muted>
        ) : (
          <ul className="flex flex-col gap-1">
            {portfolio!.history.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm hover:bg-white/5"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className={`w-9 shrink-0 font-mono text-xs font-bold uppercase ${t.side === "buy" ? "text-cw-green" : "text-cw-red"}`}>
                    {t.side}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-bold text-cw-text">
                      {t.symbol}
                      {t.isDemo && <Tag>sample</Tag>}
                    </span>
                    <span className="font-mono text-[11px] text-cw-text-muted">
                      {new Date(t.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      {t.priceAtTrade != null ? ` · ${formatUsdPrice(t.priceAtTrade)}` : ""}
                    </span>
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end">
                  <span className="font-mono font-bold text-cw-text">
                    {t.amountUsd != null ? formatUsdPrice(t.amountUsd) : "—"}
                  </span>
                  {t.txSignature ? (
                    <a
                      href={`https://solscan.io/tx/${t.txSignature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[11px] text-cw-green hover:underline"
                    >
                      tx ↗
                    </a>
                  ) : (
                    <span className="font-mono text-[11px] text-cw-text-muted">no tx</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {deposit && <DepositModal address={address} onClose={() => setDeposit(false)} />}
      {send && wallet && (
        <SendModal
          wallet={wallet}
          solBalance={solBalance}
          mode={send}
          onClose={() => setSend(null)}
          onSuccess={() => void load()}
        />
      )}
    </div>
  );
}

function ActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-white/12 py-2.5 text-sm font-bold text-cw-text transition-colors hover:border-cw-green hover:text-cw-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cw-green"
    >
      {label}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={`mt-4 ${CARD}`}>
      <h2 className="font-mono text-xs uppercase tracking-[0.14em] text-cw-text-muted">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Row({ left, sub, right }: { left: string; sub: string; right: string }) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm hover:bg-white/5">
      <span className="flex min-w-0 flex-col">
        <span className="font-bold text-cw-text">{left}</span>
        <span className="font-mono text-[11px] text-cw-text-muted">{sub}</span>
      </span>
      <span className="font-mono font-bold text-cw-text">{right}</span>
    </li>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-1.5 rounded-full bg-cw-amber/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-cw-amber">
      {children}
    </span>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p className="py-3 text-center text-sm text-cw-text-muted">{children}</p>;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[40vh] w-full max-w-[900px] flex-col items-center justify-center px-4 text-center">
      {children}
    </div>
  );
}
