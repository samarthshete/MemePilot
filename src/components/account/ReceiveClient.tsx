"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";
import { ReceivePanel } from "@/components/ui/ReceivePanel";
import { publicEnv } from "@/lib/public-env";

/**
 * Dedicated /receive page body. Same content as DepositModal (shared ReceivePanel)
 * but full-page. Signed-out → prompt to sign in. Address comes from Privy.
 */
export function ReceiveClient() {
  const { ready, authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const address = wallets[0]?.address;

  let body: React.ReactNode;
  if (!publicEnv.NEXT_PUBLIC_PRIVY_APP_ID) {
    body = <Muted>Sign-in isn’t configured in this environment.</Muted>;
  } else if (!ready) {
    body = <Muted>Loading…</Muted>;
  } else if (!authenticated) {
    body = (
      <>
        <Muted>Sign in to see your wallet address and deposit.</Muted>
        <button
          type="button"
          onClick={() => login()}
          className="mt-4 rounded-full bg-cw-green px-6 py-2.5 text-sm font-extrabold text-cw-bg hover:bg-cw-green-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cw-green focus-visible:ring-offset-2 focus-visible:ring-offset-cw-bg"
        >
          Sign in
        </button>
      </>
    );
  } else if (!address) {
    body = <Muted>Setting up your wallet…</Muted>;
  } else {
    body = <ReceivePanel address={address} />;
  }

  return (
    <div className="mx-auto w-full max-w-md px-[clamp(0.875rem,3vw,2rem)] py-8">
      <h1 className="text-2xl font-black tracking-[-0.02em]">Receive</h1>
      <p className="mt-1 text-sm text-cw-text-muted">
        Deposit SOL or SPL tokens to your wallet.
      </p>
      <div className="mt-5 rounded-2xl border border-white/10 bg-cw-surface p-5 shadow-2xl">
        {body}
      </div>
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p className="text-center text-sm text-cw-text-muted">{children}</p>;
}
