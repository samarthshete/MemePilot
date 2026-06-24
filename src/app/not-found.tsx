import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/landing/Logo";

export const metadata: Metadata = {
  title: "Page not found — MemePilot",
};

export default function NotFound() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-6 overflow-hidden px-6 py-24 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 size-[min(600px,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,var(--color-cw-green)_0%,transparent_60%)] opacity-[0.12] blur-3xl"
      />
      <div className="relative flex items-center gap-2.5">
        <Logo />
        <span className="text-lg font-black tracking-[-0.03em]">MemePilot</span>
      </div>
      <p className="relative font-mono text-sm font-bold uppercase tracking-[0.2em] text-cw-green">
        Error 404
      </p>
      <h1 className="relative text-[clamp(2rem,6vw,3.5rem)] font-black leading-[0.95] tracking-[-0.03em]">
        This page aped into the void
      </h1>
      <p className="relative max-w-md text-cw-text-muted">
        The page you&rsquo;re looking for doesn&rsquo;t exist or has moved.
      </p>
      <Link
        href="/"
        className="cw-glow-cta relative inline-flex min-h-[44px] items-center justify-center rounded-full bg-cw-green px-6 font-extrabold text-cw-bg transition-[box-shadow,transform,background-color] hover:bg-cw-green-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cw-green focus-visible:ring-offset-2 focus-visible:ring-offset-cw-bg active:translate-y-px active:bg-cw-green-press"
      >
        Back to home
      </Link>
    </main>
  );
}
