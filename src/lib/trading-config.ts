// Client-safe trading constants (no server imports). Shared by the UI and the
// server build route so the cap is enforced in both places.

/** Hard cap for BUY execution this stage — TINY amounts only (Stage 6b). */
export const MAX_BUY_USD = 5;

/** Buy amount presets, all within MAX_BUY_USD. */
export const BUY_PRESETS = [1, 3, 5];

export const DEFAULT_SLIPPAGE_BPS = 50;

export const SOL_MINT = "So11111111111111111111111111111111111111112";
export const SOL_DECIMALS = 9;
