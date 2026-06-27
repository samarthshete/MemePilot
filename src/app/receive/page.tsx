import type { Metadata } from "next";
import { ReceiveClient } from "@/components/account/ReceiveClient";
import { SiteHeader } from "@/components/landing/SiteHeader";

export const metadata: Metadata = {
  title: "Receive — ChadWallet",
  description: "Deposit SOL or SPL tokens to your ChadWallet address.",
  robots: { index: false, follow: false },
};

export default function ReceivePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <ReceiveClient />
      </main>
    </>
  );
}
