/**
 * Display formatting for prices and percentages. Pure + framework-agnostic so
 * both the (static) Stage 1 ticker and the real Stage 2 `/api/trending` data
 * can share it.
 */

/** Format a USD price. Small memecoin prices keep significant digits. */
export function formatUsdPrice(value: number): string {
  if (!Number.isFinite(value)) return "$—";
  if (value >= 1) {
    return `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  }
  if (value === 0) return "$0";
  // Sub-dollar: show ~4 significant figures, trimming trailing zeros.
  const sig = value.toPrecision(4);
  const trimmed = sig.includes(".") ? sig.replace(/0+$/, "").replace(/\.$/, "") : sig;
  return `$${trimmed}`;
}

/** Format a percentage change, e.g. 22.9 → "22.90%". Sign is conveyed separately. */
export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `${Math.abs(value).toFixed(2)}%`;
}

/** Compact number, e.g. 6996666051223 → "7T". For token amounts. */
export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

/** Relative time from a unix-seconds timestamp, e.g. "12s ago". */
export function timeAgo(unixSeconds: number): string {
  const s = Math.max(0, Math.floor(Date.now() / 1000 - unixSeconds));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
