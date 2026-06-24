import type { ReactNode } from "react";
import Link from "next/link";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";

/** Shared shell for the on-brand legal stub pages (/privacy, /terms). */
export function LegalPage({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[760px] flex-1 px-[clamp(1.125rem,5vw,3rem)] py-[clamp(2.5rem,6vw,4.5rem)]">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded text-sm font-semibold text-cw-text-muted transition-colors hover:text-cw-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cw-green focus-visible:ring-offset-2 focus-visible:ring-offset-cw-bg"
        >
          ← Back to home
        </Link>

        <h1 className="mt-6 text-[clamp(2rem,5vw,3rem)] font-black tracking-[-0.03em]">
          {title}
        </h1>
        <p className="mt-3 font-mono text-sm text-cw-text-muted">
          Last updated: {lastUpdated}
        </p>

        <div className="mt-6 rounded-2xl border border-cw-green/30 bg-cw-green/10 px-5 py-4 text-sm text-cw-text-muted">
          This is placeholder copy. The final {title.toLowerCase()} is pending
          legal review and will be published before launch.
        </div>

        <div className="mt-8 space-y-8">{children}</div>
      </main>
      <SiteFooter />
    </>
  );
}

/** A titled section of legal copy. */
export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl font-bold tracking-[-0.01em] text-cw-text">
        {heading}
      </h2>
      <div className="mt-2 space-y-3 text-[15px] leading-relaxed text-cw-text-muted">
        {children}
      </div>
    </section>
  );
}
