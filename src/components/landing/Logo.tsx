/**
 * ChadWallet brand mark — a neon-green rounded tile with the "chad" sunglasses
 * line. PLACEHOLDER until the real logo lands: to swap, drop logo-mark.svg into
 * public/brand/ and replace the inner block with
 * `<Image src="/brand/logo-mark.svg" alt="" fill />`. One-file change.
 */
export function Logo({ className = "size-9" }: { className?: string }) {
  return (
    <span
      className={`cw-glow-mark relative grid shrink-0 place-items-center rounded-xl bg-cw-green ${className}`}
      aria-hidden="true"
    >
      <span className="absolute top-[28%] flex gap-[14%]">
        <span className="h-[7px] w-[9px] rounded-[3px] bg-cw-bg" />
        <span className="h-[7px] w-[9px] rounded-[3px] bg-cw-bg" />
      </span>
    </span>
  );
}
