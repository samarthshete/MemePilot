import type { RiskSignal, RiskLevel, SafetyReport } from "./types";

/**
 * Raw, already-fetched inputs. Kept dumb on purpose: all IO lives in signals.ts,
 * so this function is deterministic and unit-testable with plain objects.
 */
export interface ScoreInput {
  address: string;
  verified: boolean;            // curated/verified mint → floor to LOW
  mintAuthorityActive: boolean | null;   // null = unknown (RPC failed)
  freezeAuthorityActive: boolean | null;
  topHolderPct: number | null;  // largest single holder, 0..100
  top10Pct: number | null;      // top-10 combined, 0..100
  holderCount: number | null;
  liquidityUsd: number | null;
  sellRouteExists: boolean | null;  // Jupiter token->SOL route found?
  buyRouteExists: boolean | null;   // sanity: a buy route exists?
  priceImpactPct: number | null;    // THIS trade's impact (fraction, e.g. 0.03 = 3%)
  mutableMetadata: boolean | null;
  transferFeeBps: number | null;    // Token-2022 transfer tax
}

// Each signal contributes weight to the 0..100 score; the aggregate level is
// derived from the worst-severity triggered signal, not just the sum, so a single
// confirmed honeypot can't be "averaged away" by otherwise-clean metrics.
const WEIGHTS: Record<string, number> = {
  honeypot_no_sell_route: 60,
  freeze_authority_active: 30,
  transfer_fee: 25,
  mint_authority_active: 20,
  single_holder_dominance: 20,
  top10_concentration: 15,
  thin_liquidity: 15,
  high_price_impact: 15,
  few_holders: 10,
  mutable_metadata: 8,
};

export function score(input: ScoreInput): SafetyReport {
  const signals: RiskSignal[] = [];
  let degraded = false;
  const note = (v: unknown) => { if (v === null) degraded = true; };

  // --- Honeypot: can you actually sell it? Strongest signal we have. ---
  note(input.sellRouteExists);
  if (input.buyRouteExists && input.sellRouteExists === false) {
    signals.push({
      id: "honeypot_no_sell_route",
      label: "No sell route",
      severity: "block",
      detail: "A buy route exists but no sell route was found — you may not be able to exit. Classic honeypot pattern.",
      triggered: true,
    });
  }

  // --- Freeze authority: issuer can freeze your account (can't sell). ---
  note(input.freezeAuthorityActive);
  if (input.freezeAuthorityActive) {
    signals.push({
      id: "freeze_authority_active",
      label: "Freeze authority not renounced",
      severity: "danger",
      detail: "The token issuer can freeze accounts, which can prevent you from selling.",
      triggered: true,
    });
  }

  // --- Token-2022 transfer fee (sell tax). ---
  note(input.transferFeeBps);
  if ((input.transferFeeBps ?? 0) > 0) {
    signals.push({
      id: "transfer_fee",
      label: `Transfer fee ${(input.transferFeeBps! / 100).toFixed(2)}%`,
      severity: "danger",
      detail: "Every transfer is taxed by the contract; high or mutable fees are a common rug vector.",
      triggered: true,
    });
  }

  // --- Mint authority: supply can be inflated. ---
  note(input.mintAuthorityActive);
  if (input.mintAuthorityActive) {
    signals.push({
      id: "mint_authority_active",
      label: "Mint authority not renounced",
      severity: "warn",
      detail: "The issuer can mint more supply and dilute holders at any time.",
      triggered: true,
    });
  }

  // --- Holder concentration. ---
  note(input.topHolderPct);
  if ((input.topHolderPct ?? 0) >= 25) {
    signals.push({
      id: "single_holder_dominance",
      label: `Top holder owns ${input.topHolderPct!.toFixed(1)}%`,
      severity: "warn",
      detail: "One wallet holds a large share; a single sell could crater the price.",
      triggered: true,
    });
  }
  note(input.top10Pct);
  if ((input.top10Pct ?? 0) >= 50) {
    signals.push({
      id: "top10_concentration",
      label: `Top 10 own ${input.top10Pct!.toFixed(0)}%`,
      severity: "warn",
      detail: "Supply is concentrated in few wallets — high dump risk.",
      triggered: true,
    });
  }

  // --- Liquidity & this trade's impact. ---
  note(input.liquidityUsd);
  if (input.liquidityUsd !== null && input.liquidityUsd < 10_000) {
    signals.push({
      id: "thin_liquidity",
      label: `Thin liquidity ($${Math.round(input.liquidityUsd).toLocaleString()})`,
      severity: "warn",
      detail: "Low liquidity means high slippage and makes the token easy to rug.",
      triggered: true,
    });
  }
  note(input.priceImpactPct);
  if ((input.priceImpactPct ?? 0) >= 0.05) {
    signals.push({
      id: "high_price_impact",
      label: `Price impact ${((input.priceImpactPct ?? 0) * 100).toFixed(1)}%`,
      severity: "warn",
      detail: "Your trade size moves the price significantly — you'll lose value to slippage.",
      triggered: true,
    });
  }

  // --- Softer signals. ---
  note(input.holderCount);
  if (input.holderCount !== null && input.holderCount < 50) {
    signals.push({
      id: "few_holders", label: `Only ${input.holderCount} holders`,
      severity: "info", detail: "Very new or very small — limited distribution.", triggered: true,
    });
  }
  note(input.mutableMetadata);
  if (input.mutableMetadata) {
    signals.push({
      id: "mutable_metadata", label: "Mutable metadata",
      severity: "info", detail: "Name/image can still be changed by the creator.", triggered: true,
    });
  }

  // --- Aggregate ---
  // Verified (curated) tokens floor to LOW regardless of heuristics that
  // false-positive on treasury/LP wallets. Documented v1 shortcut.
  if (input.verified) {
    return {
      address: input.address, level: "LOW", score: 0, signals: [],
      verified: true, generatedAt: Date.now(), degraded: false,
    };
  }

  const rawScore = signals.reduce((s, sig) => s + (WEIGHTS[sig.id] ?? 0), 0);
  const score = Math.min(100, rawScore);

  // Level is driven by the WORST severity present, then by cumulative score —
  // so one "block" signal => CRITICAL even if nothing else triggered.
  const worst = signals.reduce<RiskSignal["severity"] | null>((w, s) => {
    const rank = { info: 0, warn: 1, danger: 2, block: 3 };
    return w === null || rank[s.severity] > rank[w] ? s.severity : w;
  }, null);

  let level: RiskLevel = "LOW";
  if (worst === "block") level = "CRITICAL";
  else if (worst === "danger" || score >= 45) level = "HIGH";
  else if (worst === "warn" || score >= 20) level = "MEDIUM";

  return {
    address: input.address, level, score,
    signals: signals.filter((s) => s.triggered),
    verified: false, generatedAt: Date.now(), degraded,
  };
}
