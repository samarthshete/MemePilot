"use client";

import type { RiskLevel, SignalSeverity, SafetyReport } from "@/lib/safety/types";

const LEVEL_STYLE: Record<
  RiskLevel,
  { dot: string; text: string; box: string; label: string }
> = {
  LOW: { dot: "bg-cw-green", text: "text-cw-green", box: "border-cw-green/30 bg-cw-green/5", label: "Low risk" },
  MEDIUM: { dot: "bg-cw-amber", text: "text-cw-amber", box: "border-cw-amber/30 bg-cw-amber/5", label: "Medium risk" },
  HIGH: { dot: "bg-cw-orange", text: "text-cw-orange", box: "border-cw-orange/40 bg-cw-orange/5", label: "High risk" },
  CRITICAL: { dot: "bg-cw-red", text: "text-cw-red", box: "border-cw-red/40 bg-cw-red/5", label: "Critical risk" },
};

const SEV_TEXT: Record<SignalSeverity, string> = {
  info: "text-cw-text-muted",
  warn: "text-cw-amber",
  danger: "text-cw-orange",
  block: "text-cw-red",
};

/** A degraded report never displays below MEDIUM (incomplete data = caution). */
export function effectiveLevel(report: SafetyReport): RiskLevel {
  if (report.degraded && report.level === "LOW") return "MEDIUM";
  return report.level;
}

export function SafetyBadge({
  report,
  loading,
}: {
  report: SafetyReport | null;
  loading?: boolean;
}) {
  if (!report) {
    if (!loading) return null;
    return (
      <div className="mt-4 rounded-xl border border-white/8 bg-cw-bg/60 p-3 text-sm text-cw-text-muted">
        Checking token safety…
      </div>
    );
  }

  const level = effectiveLevel(report);
  const s = LEVEL_STYLE[level];
  const triggered = report.signals;

  return (
    <div className={`mt-4 rounded-xl border ${s.box} p-3`}>
      <div className="flex items-center justify-between">
        <span className={`flex items-center gap-2 text-sm font-bold ${s.text}`}>
          <span className={`h-2 w-2 rounded-full ${s.dot}`} aria-hidden />
          {s.label}
        </span>
        {report.verified ? (
          <span className="rounded-full bg-cw-green/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cw-green">
            verified
          </span>
        ) : (
          <span className="font-mono text-[11px] text-cw-text-muted">
            score {report.score}
          </span>
        )}
      </div>

      {report.degraded && (
        <p className="mt-1.5 text-xs text-cw-text-muted">
          Safety data incomplete — proceed with extra caution.
        </p>
      )}

      {triggered.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {triggered.map((sig) => (
            <li key={sig.id} className="text-xs leading-snug">
              <span className={`font-semibold ${SEV_TEXT[sig.severity]}`}>{sig.label}</span>
              {sig.detail && <span className="text-cw-text-muted"> — {sig.detail}</span>}
            </li>
          ))}
        </ul>
      ) : (
        !report.degraded && (
          <p className="mt-1.5 text-xs text-cw-text-muted">
            No risk signals tripped on the checks we ran.
          </p>
        )
      )}
    </div>
  );
}
