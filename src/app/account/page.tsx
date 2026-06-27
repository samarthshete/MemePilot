import type { Metadata } from "next";
import { AccountClient } from "@/components/account/AccountClient";
import { SiteHeader } from "@/components/landing/SiteHeader";

export const metadata: Metadata = {
  title: "Account — ChadWallet",
  description: "Your ChadWallet portfolio: holdings, positions, PnL and trade history.",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <AccountClient />
      </main>
    </>
  );
}
