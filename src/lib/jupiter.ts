import { z } from "zod";
import { getServerEnv } from "@/lib/env";

/**
 * SERVER-ONLY Jupiter client — QUOTE ONLY (Stage 6a). Never imports/calls /swap
 * and never builds a transaction (CLAUDE.md hard rule 5; execution is Stage 6b).
 *
 * Host (verified live): keyless **lite** host works for low-volume dev:
 *   GET https://lite-api.jup.ag/swap/v1/quote?inputMint=&outputMint=&amount=&slippageBps=
 * If JUPITER_API_KEY (server-only) is set we use the pro host with the key.
 * Response shape (verified): { inputMint, inAmount, outputMint, outAmount,
 *   otherAmountThreshold, slippageBps:number, priceImpactPct:string (FRACTION,
 *   ×100 = %), routePlan[].swapInfo.label, swapUsdValue }.
 */
const LITE_QUOTE = "https://lite-api.jup.ag/swap/v1/quote";
const PRO_QUOTE = "https://api.jup.ag/swap/v1/quote";
const TIMEOUT_MS = 6000;

export type QuoteParams = {
  inputMint: string;
  outputMint: string;
  // smallest unit of inputMint. String-accepted so large token raw amounts
  // (memecoins exceed Number.MAX_SAFE_INTEGER) keep full precision.
  amount: number | string;
  slippageBps: number;
};

// looseObject: KEEP all original fields. Jupiter's /swap requires the COMPLETE,
// unmodified quoteResponse — stripping unknown keys (contextSlot, platformFee,
// etc.) makes /swap reject it. We only TYPE the fields we read.
const quoteSchema = z.looseObject({
  inputMint: z.string(),
  inAmount: z.string(),
  outputMint: z.string(),
  outAmount: z.string(),
  otherAmountThreshold: z.string(),
  slippageBps: z.number(),
  priceImpactPct: z.string(),
  // loose at EVERY level — /swap needs the complete routePlan untouched; we only
  // type `label` for display.
  routePlan: z
    .array(
      z.looseObject({
        swapInfo: z.looseObject({ label: z.string().optional() }).optional(),
      }),
    )
    .optional(),
  swapUsdValue: z.string().optional(),
});

export type JupiterQuote = z.infer<typeof quoteSchema>;

type HttpError = Error & { status?: number };
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = (err as HttpError).status;
      const retryable = status === undefined || status === 429 || status >= 500;
      if (!retryable || i === attempts - 1) throw err;
      await delay(400 * (i + 1));
    }
  }
  throw lastErr;
}

/** ExactIn quote. Throws HttpError (with .status) on failure — caller maps to a typed UI error. */
export async function getQuote(params: QuoteParams): Promise<JupiterQuote> {
  const apiKey = getServerEnv().JUPITER_API_KEY;
  const base = apiKey ? PRO_QUOTE : LITE_QUOTE;
  const url =
    `${base}?inputMint=${params.inputMint}&outputMint=${params.outputMint}` +
    `&amount=${params.amount}&slippageBps=${params.slippageBps}&swapMode=ExactIn`;

  const json = await withRetry(async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        headers: apiKey ? { "x-api-key": apiKey } : {},
        cache: "no-store",
        signal: controller.signal,
      });
      if (!res.ok) {
        const err: HttpError = new Error(`Jupiter quote → HTTP ${res.status}`);
        err.status = res.status;
        throw err;
      }
      return (await res.json()) as unknown;
    } finally {
      clearTimeout(timer);
    }
  });

  return quoteSchema.parse(json);
}

const LITE_SWAP = "https://lite-api.jup.ag/swap/v1/swap";
const PRO_SWAP = "https://api.jup.ag/swap/v1/swap";

const swapBuildSchema = z.object({ swapTransaction: z.string() });

export type BuildSwapParams = {
  quoteResponse: JupiterQuote;
  userPublicKey: string;
  wrapAndUnwrapSol?: boolean;
  /**
   * FEE-READY but OFF by default. To enable a platform fee later: (1) fetch the
   * quote with `platformFeeBps`, and (2) pass `feeAccount` = your referral token
   * account here. Leaving it undefined charges $0 (ADR-022). DRAFT: not enabled.
   */
  feeAccount?: string;
};

/**
 * Build (NOT send) the swap VersionedTransaction for the user's wallet. Returns
 * base64 `swapTransaction` for the CLIENT to sign in Privy. The server never
 * signs and never sends here (hard rule 5 + Stage 6b invariants).
 */
export async function buildSwapTransaction(
  params: BuildSwapParams,
): Promise<string> {
  const apiKey = getServerEnv().JUPITER_API_KEY;
  const base = apiKey ? PRO_SWAP : LITE_SWAP;
  const body = {
    quoteResponse: params.quoteResponse,
    userPublicKey: params.userPublicKey,
    wrapAndUnwrapSol: params.wrapAndUnwrapSol ?? true,
    dynamicComputeUnitLimit: true,
    ...(params.feeAccount ? { feeAccount: params.feeAccount } : {}),
  };

  const json = await withRetry(async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(base, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(apiKey ? { "x-api-key": apiKey } : {}),
        },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: controller.signal,
      });
      if (!res.ok) {
        const err: HttpError = new Error(`Jupiter swap-build → HTTP ${res.status}`);
        err.status = res.status;
        throw err;
      }
      return (await res.json()) as unknown;
    } finally {
      clearTimeout(timer);
    }
  });

  return swapBuildSchema.parse(json).swapTransaction;
}
