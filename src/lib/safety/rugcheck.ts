import { z } from "zod";
import { getOrSet } from "@/lib/cache";

/**
 * SERVER-ONLY RugCheck client (FREE, no API key). RugCheck is a public Solana
 * token-risk service; we use it as the PRIMARY risk model (see ADR-025), falling
 * back to our own heuristic when it's unavailable.
 *
 * Verified live (HTTP 200, keyless):
 *   GET https://api.rugcheck.xyz/v1/tokens/<mint>/report/summary
 *     → { score:int, score_normalised:0-100 (HIGHER = riskier),
 *         risks:[{ name, value, description, score, level }], lpLockedPct, ... }
 * We use /report/summary (the full /report is ~440 KB and returns trailing data).
 * Their shape can drift, so everything is parsed defensively and any
 * error/non-200/parse-failure returns null — this NEVER throws.
 */

const BASE = "https://api.rugcheck.xyz/v1/tokens";
const TIMEOUT_MS = 5000;
const TTL_MS = 300_000;

export type RugcheckRisk = {
  name: string;
  level: string; // RugCheck's own severity, e.g. "warn" | "danger" | "info"
  description: string;
  score: number | null;
};

export type RugcheckSummary = {
  /** 0–100, HIGHER = riskier. */
  scoreNormalised: number;
  risks: RugcheckRisk[];
};

const summarySchema = z.object({
  score: z.number().nullish(),
  score_normalised: z.number().nullish(),
  risks: z
    .array(
      z.looseObject({
        name: z.string().nullish(),
        level: z.string().nullish(),
        description: z.string().nullish(),
        score: z.number().nullish(),
      }),
    )
    .nullish(),
});

async function fetchSummary(mint: string): Promise<RugcheckSummary | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(
      `${BASE}/${encodeURIComponent(mint)}/report/summary`,
      { cache: "no-store", signal: controller.signal, headers: { accept: "application/json" } },
    );
    if (!res.ok) {
      console.warn(`[rugcheck] ${mint} → HTTP ${res.status}`);
      return null;
    }
    const parsed = summarySchema.parse(await res.json());
    if (parsed.score_normalised == null) return null; // no usable score → treat as unavailable
    const risks: RugcheckRisk[] = (parsed.risks ?? [])
      .filter((r) => r.name)
      .map((r) => ({
        name: r.name as string,
        level: (r.level ?? "warn").toLowerCase(),
        description: r.description ?? "",
        score: r.score ?? null,
      }));
    return { scoreNormalised: parsed.score_normalised, risks };
  } catch (err) {
    console.warn(`[rugcheck] ${mint} unavailable (${(err as Error).message})`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Cached (300s/mint, in-flight de-duped) RugCheck summary, or null if unavailable. */
export function getRugcheckSummary(mint: string): Promise<RugcheckSummary | null> {
  return getOrSet(`rugcheck:${mint}`, TTL_MS, () => fetchSummary(mint));
}
