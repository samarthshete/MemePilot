import {
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { getLatestBlockhash } from "@/lib/solana";

/**
 * SERVER-ONLY: build (NOT sign/send) a native SOL transfer as an unsigned v0
 * transaction for the user to sign in Privy. Same non-custodial pattern as the
 * swap pipeline — the server only assembles bytes; the user signs; the existing
 * /api/swap/send relays the SIGNED bytes. The server never holds a key.
 *
 * SPL-token sends are intentionally out of scope here (no spl-token dep); SOL is
 * the deposit/withdraw asset. Returns base64 of the unsigned VersionedTransaction.
 */
export async function buildSolTransfer(params: {
  fromPubkey: string;
  toPubkey: string;
  lamports: number;
}): Promise<string> {
  const fromPk = new PublicKey(params.fromPubkey); // throws on invalid base58
  const toPk = new PublicKey(params.toPubkey);
  const blockhash = await getLatestBlockhash();
  const ix = SystemProgram.transfer({
    fromPubkey: fromPk,
    toPubkey: toPk,
    lamports: params.lamports,
  });
  const message = new TransactionMessage({
    payerKey: fromPk,
    recentBlockhash: blockhash,
    instructions: [ix],
  }).compileToV0Message();
  const tx = new VersionedTransaction(message);
  return Buffer.from(tx.serialize()).toString("base64");
}
