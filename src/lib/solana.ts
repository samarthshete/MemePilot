import { requireServer } from "@/lib/env";

/**
 * SERVER-ONLY Solana RPC relay (Stage 6b). Uses the KEYED `SOLANA_RPC_URL`
 * (Alchemy, server-only — never the public NEXT_PUBLIC one). The server:
 *  - NEVER signs and NEVER holds keys — it only RELAYS bytes the client already
 *    signed (sendRawTransaction) and polls confirmation.
 *  - reads token balances for the "Your position" panel.
 */
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

type RpcError = Error & { code?: number };

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const url = requireServer("SOLANA_RPC_URL");
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  });
  const json = (await res.json()) as {
    result?: T;
    error?: { code?: number; message?: string };
  };
  if (json.error) {
    const err: RpcError = new Error(json.error.message ?? `RPC ${method} failed`);
    err.code = json.error.code;
    throw err;
  }
  return json.result as T;
}

export type SendResult = {
  signature: string;
  status: "confirmed" | "finalized" | "pending";
};

export type SwapSendError = Error & { type: string; signature?: string };

function fail(type: string, message: string, signature?: string): SwapSendError {
  return Object.assign(new Error(message), { type, signature });
}

/** Map a raw RPC/send error message to a typed, user-facing error. */
function classifySendError(err: unknown): SwapSendError {
  const msg = (err as Error).message?.toLowerCase() ?? "";
  if (msg.includes("blockhash") || msg.includes("block height"))
    return fail("blockhash_expired", "Quote expired — please re-quote and try again.");
  if (msg.includes("insufficient") || msg.includes("0x1") /* lamports */)
    return fail("insufficient_funds", "Insufficient funds for this swap + fees.");
  if (msg.includes("slippage") || msg.includes("6001") || msg.includes("0x1771"))
    return fail("slippage_exceeded", "Price moved past slippage — re-quote and retry.");
  return fail("send_failed", "Couldn’t submit the transaction — please retry.");
}

/**
 * Relay an already-signed base64 transaction and confirm it. The signature comes
 * back to the user even on confirmation timeout (status "pending") so the UI can
 * link to the explorer.
 */
export async function relayAndConfirm(
  signedTxBase64: string,
): Promise<SendResult> {
  let signature: string;
  try {
    signature = await rpc<string>("sendTransaction", [
      signedTxBase64,
      {
        encoding: "base64",
        skipPreflight: false,
        preflightCommitment: "confirmed",
        maxRetries: 5,
      },
    ]);
  } catch (err) {
    throw classifySendError(err);
  }

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const res = await rpc<{
      value: ({ confirmationStatus?: string; err: unknown } | null)[];
    }>("getSignatureStatuses", [[signature], { searchTransactionHistory: false }]);
    const st = res.value[0];
    if (st) {
      if (st.err) throw fail("tx_failed", "Transaction failed on-chain.", signature);
      if (st.confirmationStatus === "confirmed" || st.confirmationStatus === "finalized") {
        return { signature, status: st.confirmationStatus };
      }
    }
    await delay(1500);
  }
  // Submitted but not confirmed within the window — still surface the signature.
  return { signature, status: "pending" };
}

export type TokenBalance = {
  /** UI (decimal-adjusted) amount — for display + USD valuation. */
  uiAmount: number;
  /** Raw integer amount (smallest units) as a string — for exact sell sizing. */
  rawAmount: string;
  decimals: number;
};

const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEbn";

/**
 * Mint/freeze authority of an SPL mint (for the safety scorer). `*Active` = the
 * authority is NOT renounced (still set). Returns null on RPC failure (e.g. the
 * Alchemy origin allowlist blocks server reads — pre-live item) → degraded.
 */
export async function getMintAuthorities(mint: string): Promise<{
  mintAuthorityActive: boolean;
  freezeAuthorityActive: boolean;
  isToken2022: boolean;
} | null> {
  try {
    const res = await rpc<{
      value: {
        owner: string;
        data: { parsed: { info: { mintAuthority: string | null; freezeAuthority: string | null } } };
      } | null;
    }>("getAccountInfo", [mint, { encoding: "jsonParsed" }]);
    const info = res.value?.data?.parsed?.info;
    if (!info) return null;
    return {
      mintAuthorityActive: info.mintAuthority != null,
      freezeAuthorityActive: info.freezeAuthority != null,
      isToken2022: res.value?.owner === TOKEN_2022_PROGRAM,
    };
  } catch (err) {
    console.warn(`[mint] authority read failed for ${mint}: ${(err as Error).message}`);
    return null;
  }
}

/** Latest blockhash for building a transaction (server RPC). */
export async function getLatestBlockhash(): Promise<string> {
  const res = await rpc<{ value: { blockhash: string } }>("getLatestBlockhash", [
    { commitment: "confirmed" },
  ]);
  return res.value.blockhash;
}

/** Native SOL balance (NOT an SPL token account — uses getBalance). */
export async function getSolBalance(owner: string): Promise<TokenBalance> {
  const res = await rpc<{ value: number }>("getBalance", [
    owner,
    { commitment: "confirmed" },
  ]);
  const lamports = res.value ?? 0;
  return { uiAmount: lamports / 1e9, rawAmount: String(lamports), decimals: 9 };
}

const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

export type TokenHolding = {
  mint: string;
  uiAmount: number;
  rawAmount: string;
  decimals: number;
};

type ParsedTokenAccount = {
  account: {
    data: {
      parsed: { info: { mint: string; tokenAmount: { amount: string; decimals: number; uiAmount: number | null } } };
    };
  };
};

/**
 * ALL non-zero SPL holdings for `owner` (classic Token + Token-2022 programs),
 * for the portfolio holdings list. Read-only; returns [] on RPC failure.
 */
export async function getAllTokenBalances(owner: string): Promise<TokenHolding[]> {
  const programs = [TOKEN_PROGRAM, TOKEN_2022_PROGRAM];
  const out: TokenHolding[] = [];
  for (const programId of programs) {
    try {
      const res = await rpc<{ value: ParsedTokenAccount[] }>("getTokenAccountsByOwner", [
        owner,
        { programId },
        { encoding: "jsonParsed" },
      ]);
      for (const acc of res.value ?? []) {
        const info = acc.account.data.parsed.info;
        const ta = info.tokenAmount;
        const ui = ta.uiAmount ?? 0;
        if (ui > 0) {
          out.push({ mint: info.mint, uiAmount: ui, rawAmount: ta.amount, decimals: ta.decimals });
        }
      }
    } catch (err) {
      console.warn(`[holdings] ${programId} read failed for ${owner}: ${(err as Error).message}`);
    }
  }
  return out;
}

/** Summed token balance for `mint` owned by `owner` (position panel + sell sizing). */
export async function getTokenBalance(
  owner: string,
  mint: string,
): Promise<TokenBalance> {
  const res = await rpc<{
    value: {
      account: {
        data: {
          parsed: {
            info: {
              tokenAmount: {
                amount: string;
                decimals: number;
                uiAmount: number | null;
              };
            };
          };
        };
      };
    }[];
  }>("getTokenAccountsByOwner", [owner, { mint }, { encoding: "jsonParsed" }]);

  let raw = BigInt(0);
  let ui = 0;
  let decimals = 0;
  for (const acc of res.value) {
    const ta = acc.account.data.parsed.info.tokenAmount;
    raw += BigInt(ta.amount);
    if (typeof ta.uiAmount === "number") ui += ta.uiAmount;
    decimals = ta.decimals;
  }
  return { uiAmount: ui, rawAmount: raw.toString(), decimals };
}
