// Client-safe trading constants (no server imports). Shared by the UI and the
// server build route so the cap is enforced in both places.

/** Hard cap for BUY execution this stage — TINY amounts only (Stage 6b). */
export const MAX_BUY_USD = 5;

/** Hard cap for SELL proceeds (USD-equivalent) this stage — TINY only (Stage 6c). */
export const MAX_SELL_USD = 5;

/** Buy amount presets, all within MAX_BUY_USD. */
export const BUY_PRESETS = [1, 3, 5];

/** Sell sizing presets — percentages of the user's position (100 = Max). */
export const SELL_PCT_PRESETS = [25, 50, 100];

/** Below this native-SOL balance a BUY can't cover the swap + fees → gated with a hint. */
export const MIN_SOL_TO_TRADE = 0.001;

export const DEFAULT_SLIPPAGE_BPS = 50;

export const SOL_MINT = "So11111111111111111111111111111111111111112";
export const SOL_DECIMALS = 9;

/** Where landing-page "Trade"/"Start trading" entry points point (change here). */
export const DEFAULT_TRADE_MINT = SOL_MINT;
