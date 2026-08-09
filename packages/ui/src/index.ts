import type { RiskLevel } from "@guardian/shared";

export const riskTone: Record<RiskLevel, string> = {
  LOW_CONCERN: "low",
  USE_CAUTION: "caution",
  HIGH_RISK: "high",
  CRITICAL_ALERT: "critical",
  UNDETERMINED: "undetermined"
};

export function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}
