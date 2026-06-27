import { describe, expect, it } from "vitest";
import { score, type RugReport, type ScoreInput } from "./score";
import type { RiskSignal } from "./types";

function rugSignal(over: Partial<RiskSignal> = {}): RiskSignal {
  return { id: "r", label: "Risk", severity: "warn", detail: "", triggered: true, ...over };
}

/** A fully-known, benign token: every field present, nothing risky. */
function clean(overrides: Partial<ScoreInput> = {}): ScoreInput {
  return {
    address: "So11111111111111111111111111111111111111112",
    verified: false,
    mintAuthorityActive: false,
    freezeAuthorityActive: false,
    topHolderPct: 5,
    top10Pct: 20,
    holderCount: 100_000,
    liquidityUsd: 2_000_000,
    sellRouteExists: true,
    buyRouteExists: true,
    priceImpactPct: 0.001,
    mutableMetadata: false,
    transferFeeBps: 0,
    ...overrides,
  };
}

describe("score()", () => {
  it("rates a clean, fully-known token LOW with no signals", () => {
    const r = score(clean());
    expect(r.level).toBe("LOW");
    expect(r.signals).toHaveLength(0);
    expect(r.score).toBe(0);
    expect(r.degraded).toBe(false);
  });

  it("flags a missing sell route as CRITICAL (honeypot)", () => {
    const r = score(clean({ buyRouteExists: true, sellRouteExists: false }));
    expect(r.level).toBe("CRITICAL");
    expect(r.signals.some((s) => s.id === "honeypot_no_sell_route")).toBe(true);
    expect(r.signals.find((s) => s.id === "honeypot_no_sell_route")?.severity).toBe("block");
  });

  it("rates an active freeze authority HIGH", () => {
    const r = score(clean({ freezeAuthorityActive: true }));
    expect(r.level).toBe("HIGH");
    expect(r.signals.some((s) => s.id === "freeze_authority_active")).toBe(true);
  });

  it("floors a verified mint to LOW even with risky inputs", () => {
    const r = score(clean({ verified: true, freezeAuthorityActive: true, sellRouteExists: false }));
    expect(r.level).toBe("LOW");
    expect(r.verified).toBe(true);
    expect(r.signals).toHaveLength(0);
  });

  it("marks the report degraded when a signal input is unknown (null)", () => {
    const r = score(clean({ sellRouteExists: null }));
    expect(r.degraded).toBe(true);
  });

  it("uses the heuristic source when no RugCheck report is provided", () => {
    expect(score(clean()).source).toBe("heuristic");
  });
});

describe("score() with RugCheck (primary model)", () => {
  function rug(scoreNormalised: number, signals: RiskSignal[] = []): RugReport {
    return { scoreNormalised, signals };
  }

  it("rates a clean RugCheck report LOW and reports its normalised score", () => {
    const r = score(clean(), rug(5));
    expect(r.level).toBe("LOW");
    expect(r.score).toBe(5);
    expect(r.source).toBe("rugcheck");
    expect(r.degraded).toBe(false);
  });

  it("raises a low-score token to MEDIUM on a warn-level risk (worst-wins)", () => {
    const r = score(clean(), rug(21, [rugSignal({ id: "thin_liquidity", label: "Low Liquidity", severity: "warn" })]));
    expect(r.level).toBe("MEDIUM");
    expect(r.signals.some((s) => s.id === "thin_liquidity")).toBe(true);
  });

  it("rates a danger-level RugCheck risk HIGH", () => {
    const r = score(clean(), rug(25, [rugSignal({ severity: "danger" })]));
    expect(r.level).toBe("HIGH");
  });

  it("rates a high normalised score CRITICAL via the band floor", () => {
    expect(score(clean(), rug(85)).level).toBe("CRITICAL");
  });

  it("escalates to CRITICAL when our honeypot probe finds no sell route", () => {
    // RugCheck score is low, but our corroborating probe (buy ok, sell missing)
    // contributes a block signal → worst-wins ⇒ CRITICAL.
    const r = score(clean({ buyRouteExists: true, sellRouteExists: false }), rug(10));
    expect(r.level).toBe("CRITICAL");
    expect(r.signals.some((s) => s.id === "honeypot_no_sell_route")).toBe(true);
  });

  it("dedupes a RugCheck risk against the same heuristic id", () => {
    const r = score(
      clean({ buyRouteExists: true, sellRouteExists: false }),
      rug(40, [rugSignal({ id: "honeypot_no_sell_route", label: "Honeypot", severity: "block" })]),
    );
    expect(r.signals.filter((s) => s.id === "honeypot_no_sell_route")).toHaveLength(1);
  });
});
