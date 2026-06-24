/**
 * Token shape for the live ticker. This MATCHES what `/api/trending` will
 * return in Stage 2, so the <Ticker> component is the only thing that needs the
 * data — swapping static → live is a data change, not a component change.
 */
export type Token = {
  /** Short avatar label, shown until real token logos are wired in. */
  tag: string;
  symbol: string;
  priceUsd: number;
  /** 24h change as a percentage (e.g. 22.9 = +22.90%). Sign mirrors `direction`. */
  change24h: number;
  direction: "up" | "down";
};

// TODO Stage 2: replace with a server fetch of /api/trending (cached + zod-validated).
// Keep the shape identical so <Ticker tokens={...} /> stays unchanged.
export const PLACEHOLDER_TOKENS: Token[] = [
  { tag: "UNC", symbol: "unc", priceUsd: 0.007801, change24h: 22.9, direction: "up" },
  { tag: "PEE", symbol: "PEEPA", priceUsd: 0.000005151, change24h: 48.46, direction: "down" },
  { tag: "AST", symbol: "ASAT", priceUsd: 0.00006086, change24h: 434.2, direction: "up" },
  { tag: "HI", symbol: "HIGHER", priceUsd: 0.00281, change24h: 112.4, direction: "up" },
  { tag: "DMB", symbol: "DUMB", priceUsd: 0.002894, change24h: 26.68, direction: "down" },
  { tag: "JRD", symbol: "JARED", priceUsd: 0.0000002283, change24h: 754.7, direction: "up" },
  { tag: "TRL", symbol: "TROLL", priceUsd: 0.0204, change24h: 4.09, direction: "up" },
  { tag: "BLF", symbol: "BELIEF", priceUsd: 0.0214, change24h: 14.53, direction: "up" },
  { tag: "MKY", symbol: "MONKEY", priceUsd: 0.0000008674, change24h: 227.4, direction: "up" },
  { tag: "BUL", symbol: "BULL", priceUsd: 0.005698, change24h: 0.71, direction: "up" },
  { tag: "LOL", symbol: "LOL", priceUsd: 0.00226, change24h: 24.34, direction: "up" },
  { tag: "SHB", symbol: "SHIBA", priceUsd: 0.000005275, change24h: 44.01, direction: "down" },
];
