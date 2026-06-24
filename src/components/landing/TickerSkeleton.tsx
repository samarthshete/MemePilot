/** Loading state for the live ticker (Suspense fallback during a cold fetch). */
export function TickerSkeleton({
  position = "top",
}: {
  position?: "top" | "bottom";
}) {
  const edge =
    position === "top"
      ? "border-b border-cw-green/20"
      : "border-y border-cw-green/20";

  return (
    <div
      className={`flex h-[46px] items-stretch bg-cw-surface-2 ${edge}`}
      aria-hidden="true"
    >
      <div className="flex shrink-0 items-center gap-2 border-r border-cw-green/25 bg-cw-bg px-4">
        <span className="cw-live-dot cw-glow-sm size-2 rounded-full bg-cw-green" />
        <span className="font-mono text-xs font-bold tracking-[0.18em] text-cw-green">
          LIVE
        </span>
      </div>
      <div className="flex flex-1 items-center gap-6 overflow-hidden px-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            className="h-3 w-28 shrink-0 animate-pulse rounded-full bg-white/8 motion-reduce:animate-none"
          />
        ))}
      </div>
    </div>
  );
}
