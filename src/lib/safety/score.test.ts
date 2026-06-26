import { describe, expect, it } from "vitest";
import { score, type ScoreInput } from "./score";

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
});
