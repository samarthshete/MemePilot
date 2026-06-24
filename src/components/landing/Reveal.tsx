"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Gentle fade/slide-up when the element scrolls into view.
 *
 * DOM-driven (no React state) so it's accessibility-safe by construction:
 *  - No-JS / pre-hydration: renders fully visible — the hidden class is only
 *    added after mount, once we know JS is running.
 *  - prefers-reduced-motion: never hides; shows immediately (also enforced in
 *    globals.css).
 */
export function Reveal({
  children,
  className = "",
  delayMs,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    el.classList.add("cw-reveal--hidden");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.remove("cw-reveal--hidden");
            observer.disconnect();
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`cw-reveal ${className}`}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
