"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Logo } from "@/components/landing/Logo";

/** Branded 500 boundary. Client Component per the App Router contract. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to the console (and any wired error monitoring) for debugging.
    console.error(error);
  }, [error]);

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-6 overflow-hidden px-6 py-24 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 size-[min(600px,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,var(--color-cw-red)_0%,transparent_60%)] opacity-[0.12] blur-3xl"
      />
      <div className="relative flex items-center gap-2.5">
        <Logo />
        <span className="text-lg font-black tracking-[-0.03em]">MemePilot</span>
      </div>
      <p className="relative font-mono text-sm font-bold uppercase tracking-[0.2em] text-cw-red">
        Something broke
      </p>
      <h1 className="relative text-[clamp(2rem,6vw,3.5rem)] font-black leading-[0.95] tracking-[-0.03em]">
        Rugged by an error
      </h1>
      <p className="relative max-w-md text-cw-text-muted">
        Something went wrong on our end. Try again — if it keeps happening,
        check back shortly.
      </p>
      <div className="relative flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="cw-glow-cta inline-flex min-h-[44px] items-center justify-center rounded-full bg-cw-green px-6 font-extrabold text-cw-bg transition-[box-shadow,transform,background-color] hover:bg-cw-green-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cw-green focus-visible:ring-offset-2 focus-visible:ring-offset-cw-bg active:translate-y-px active:bg-cw-green-press"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/16 px-6 font-bold text-cw-text transition-colors hover:border-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cw-green focus-visible:ring-offset-2 focus-visible:ring-offset-cw-bg"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
