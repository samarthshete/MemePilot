// Pre-trade safety scoring — shared types.
// A report is a list of independent signals plus an aggregate level.
// Keeping signals granular lets the UI explain *why*, not just show a number.

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type SignalSeverity = "info" | "warn" | "danger" | "block";

export interface RiskSignal {
  id: string;            // stable id, e.g. "mint_authority_active"
  label: string;         // human label for the UI
  severity: SignalSeverity;
  detail: string;        // one-line explanation shown to the user
  triggered: boolean;    // true = this risk is present
}

export interface SafetyReport {
  address: string;
  level: RiskLevel;
  score: number;         // 0 (safe) … 100 (critical), for sorting/telemetry only
  signals: RiskSignal[]; // only triggered signals are shown in UI; all kept for audit
  verified: boolean;     // on the curated allowlist → floored to LOW
  generatedAt: number;
  degraded: boolean;     // true if a data source was unavailable (score is best-effort)
}
