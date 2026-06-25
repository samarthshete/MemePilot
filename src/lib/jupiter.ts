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
  amount: number; // smallest unit of inputMint
  slippageBps: number;
};

const quoteSchema = z.object({
  inputMint: z.string(),
  inAmount: z.string(),
  outputMint: z.string(),
  outAmount: z.string(),
  otherAmountThreshold: z.string(),
  slippageBps: z.number(),
  priceImpactPct: z.string(),
  routePlan: z
    .array(
      z.object({
        swapInfo: z.object({ label: z.string().optional() }).partial().optional(),
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
