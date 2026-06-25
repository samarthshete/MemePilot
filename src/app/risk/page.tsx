import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";

// DRAFT — not final. Placeholder "Part B" risk disclosure; legal/legal-copy-DRAFT.md
// was not provided. Replace with lawyer-reviewed wording before launch ([BRACKETS] = TBD).

export const metadata: Metadata = {
  title: "Risk Disclosure — MemePilot",
  description:
    "The risks of trading memecoins with MemePilot. Placeholder pending review.",
};

export default function RiskPage() {
  return (
    <LegalPage title="Risk Disclosure" lastUpdated="June 24, 2026">
      <LegalSection heading="You can lose everything">
        <p>
          Memecoins are extremely volatile and speculative. Prices can move to
          zero in minutes. You may lose 100% of the funds you spend. Only trade
          what you can afford to lose entirely.
        </p>
      </LegalSection>

      <LegalSection heading="Non-custodial — you are in control">
        <p>
          MemePilot is non-custodial: you hold your keys and you personally
          approve and sign every transaction. We never take custody of your
          funds and cannot move, freeze, or reverse them. On-chain transactions
          are final.
        </p>
      </LegalSection>

      <LegalSection heading="Quotes & execution are not guaranteed">
        <p>
          Prices, routes, and the amount you receive are estimates from
          third-party providers (e.g. Jupiter / [DEX AGGREGATORS]) and can change
          between quote and execution. Slippage, price impact, and network
          conditions affect the final result. A swap can fail or fill at a worse
          price than shown.
        </p>
      </LegalSection>

      <LegalSection heading="Not financial advice">
        <p>
          Nothing in MemePilot is financial, legal, or tax advice or a
          recommendation to buy or sell any asset. You are solely responsible for
          your trades. [JURISDICTION / ELIGIBILITY PLACEHOLDER].
        </p>
      </LegalSection>

      <LegalSection heading="Questions">
        <p>
          See our{" "}
          <Link className="text-cw-green hover:underline" href="/terms">
            Terms
          </Link>{" "}
          for the full agreement. Final risk wording will accompany launch.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
