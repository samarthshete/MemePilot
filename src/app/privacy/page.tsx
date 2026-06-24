import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — MemePilot",
  description: "How MemePilot handles your data. Placeholder pending review.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" lastUpdated="June 24, 2026">
      <LegalSection heading="Overview">
        <p>
          MemePilot is a non-custodial Solana wallet — you own your keys and
          your crypto. This page summarizes how the MemePilot website handles
          information. It is placeholder copy and will be replaced with our
          final, reviewed policy before launch.
        </p>
      </LegalSection>

      <LegalSection heading="Information we collect">
        <p>
          The marketing site collects minimal, privacy-friendly analytics
          (aggregate page views and download click-through) to measure interest.
          We do not collect names, email addresses, or wallet keys on this site.
        </p>
      </LegalSection>

      <LegalSection heading="Non-custodial by design">
        <p>
          MemePilot never holds or transmits your private keys or seed phrase.
          Wallet keys live with you (or your embedded-wallet provider) and never
          reach our servers.
        </p>
      </LegalSection>

      <LegalSection heading="Cookies & analytics">
        <p>
          We use lightweight, cookieless-friendly analytics. We do not sell your
          data. Third-party services we rely on are described in the final
          policy.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          Questions about privacy? Reach us through the channels listed in the
          footer. Final contact details will accompany the published policy.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
