"use client";

import type { ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";
import { publicEnv } from "@/lib/public-env";

// Client RPC for Privy's Solana wallet. NEXT_PUBLIC_SOLANA_RPC_URL is a PUBLIC
// RPC (never the Alchemy secret URL — ADR-006); fall back to the public mainnet
// endpoint. createSolanaRpc/Subscriptions just build transport objects (no
// connection until used), so this is safe at module load.
const SOLANA_RPC_URL =
  publicEnv.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
const SOLANA_WSS_URL = SOLANA_RPC_URL.replace(/^http/, "ws");

const solanaMainnet = {
  rpc: createSolanaRpc(SOLANA_RPC_URL),
  rpcSubscriptions: createSolanaRpcSubscriptions(SOLANA_WSS_URL),
  blockExplorerUrl: "https://explorer.solana.com",
};

/**
 * Privy auth provider (client boundary). Solana-only, non-custodial embedded
 * wallet created on login (ADR-018). If NEXT_PUBLIC_PRIVY_APP_ID is missing we
 * render children without Privy so the public landing page never crashes — the
 * Sign-in button degrades to disabled.
 */
export function Providers({ children }: { children: ReactNode }) {
  const appId = publicEnv.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!appId) return <>{children}</>;

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["email", "google"], // Apple deferred
        appearance: { theme: "dark", accentColor: "#11FE9C" },
        // Solana-only: configure ONLY the Solana embedded wallet (no ethereum),
        // created for users who don't already have one.
        embeddedWallets: {
          solana: { createOnLogin: "users-without-wallets" },
        },
        solana: { rpcs: { "solana:mainnet": solanaMainnet } },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
