/** Placeholder research tabs — Stage 5 fills Holders + Live Trades. */
export function TokenTabs() {
  return (
    <div className="mt-6 rounded-2xl border border-white/8 bg-cw-surface/40 p-4">
      <div className="flex gap-2" role="tablist" aria-label="Token research">
        {["Holders", "Live Trades"].map((label) => (
          <span
            key={label}
            className="rounded-lg px-3 py-1.5 text-sm font-bold text-cw-text-muted"
          >
            {label}
          </span>
        ))}
      </div>
      <p className="mt-3 font-mono text-xs uppercase tracking-[0.14em] text-cw-text-muted">
        Coming soon
      </p>
    </div>
  );
}
