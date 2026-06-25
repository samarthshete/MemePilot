"use client";

import { useState } from "react";

/** Contract address chip with copy-to-clipboard. */
export function ContractChip({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  const short = `${address.slice(0, 4)}…${address.slice(-4)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — ignore
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      title={address}
      aria-label={`Copy contract address ${address}`}
      className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-cw-surface px-3 py-1 font-mono text-xs text-cw-text-muted transition-colors hover:border-cw-green hover:text-cw-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cw-green"
    >
      {short}
      <span className={copied ? "text-cw-green" : ""}>
        {copied ? "✓ copied" : "copy"}
      </span>
    </button>
  );
}
