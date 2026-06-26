import { CURATED_TOKENS } from "@/lib/ticker-tokens";

/**
 * v1 verified allowlist = our curated ticker mints. These are floored to LOW
 * (see score.ts) so heuristics that false-positive on big LP/treasury wallets
 * don't flag well-known tokens.
 *
 * TODO (production): replace this curated shortcut with a real on-chain verified
 * list (e.g. the Jupiter strict token list / a maintained allowlist), refreshed
 * server-side, rather than our small hand-picked set. — ADR-024.
 */
export const VERIFIED_MINTS: ReadonlySet<string> = new Set(
  CURATED_TOKENS.map((t) => t.address),
);
