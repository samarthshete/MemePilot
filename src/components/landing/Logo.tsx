/**
 * ChadWallet brand mark (public/brand/logo-mark.svg, the "chad" line-art).
 * Rendered via a CSS mask (see `.cw-logo-mark` in globals.css) so the fill
 * follows `currentColor` — `text-cw-text` / `hover:text-cw-green` recolor it.
 * Decorative: the "ChadWallet" wordmark beside it carries the accessible name.
 */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`cw-logo-mark inline-block size-8 shrink-0 bg-current text-cw-text transition-colors hover:text-cw-green ${className}`}
    />
  );
}
