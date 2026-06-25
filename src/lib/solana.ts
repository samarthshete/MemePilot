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

/** Sum of UI token balance for `mint` owned by `owner` (for the position panel). */
export async function getTokenBalance(
  owner: string,
  mint: string,
): Promise<number> {
  const res = await rpc<{
    value: {
      account: { data: { parsed: { info: { tokenAmount: { uiAmount: number | null } } } } };
    }[];
  }>("getTokenAccountsByOwner", [owner, { mint }, { encoding: "jsonParsed" }]);
  let total = 0;
  for (const acc of res.value) {
    const ui = acc.account.data.parsed.info.tokenAmount.uiAmount;
    if (typeof ui === "number") total += ui;
  }
  return total;
}
