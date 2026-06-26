import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";

// DRAFT — not final. Placeholder "Part C" copy; legal/legal-copy-DRAFT.md was not
// provided. Replace with lawyer-reviewed wording before launch ([BRACKETS] = TBD).

export const metadata: Metadata = {
  title: "Terms of Service — ChadWallet",
  description:
    "The terms for using ChadWallet. Placeholder pending review. Memecoins are risky.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" lastUpdated="June 24, 2026">
      <LegalSection heading="Acceptance of terms">
        <p>
          By using the ChadWallet website and app you agree to these terms. This
          is placeholder copy and will be replaced with our final, reviewed
          terms before launch.
        </p>
      </LegalSection>

      <LegalSection heading="Risk disclaimer">
        <p>
          Memecoins are highly volatile and speculative. You can lose some or all
          of the funds you trade. ChadWallet does not provide financial, legal,
          or tax advice. Nothing on this site is a recommendation to buy or sell
          any asset. Trade at your own risk.
        </p>
      </LegalSection>

      <LegalSection heading="Non-custodial service">
        <p>
          ChadWallet is non-custodial. You are solely responsible for your wallet
          and the transactions you authorize. We cannot reverse on-chain
          transactions or recover lost keys.
        </p>
      </LegalSection>

      <LegalSection heading="No warranty">
        <p>
          The service is provided “as is,” without warranties of any kind, to the
          maximum extent permitted by law. The final terms will detail
          limitations of liability.
        </p>
      </LegalSection>

      <LegalSection heading="Changes">
        <p>
          We may update these terms. Material changes will be reflected in the
          “Last updated” date above when the final terms are published.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
