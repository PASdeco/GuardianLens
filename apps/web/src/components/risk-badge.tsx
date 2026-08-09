import { AlertTriangle, CheckCircle2, CircleHelp, ShieldAlert, ShieldCheck } from "lucide-react";
import { riskLabel, type RiskLevel } from "@guardian/shared";
import { riskTone } from "@guardian/ui";

const icons = {
  LOW_CONCERN: CheckCircle2,
  USE_CAUTION: AlertTriangle,
  HIGH_RISK: ShieldAlert,
  CRITICAL_ALERT: ShieldAlert,
  UNDETERMINED: CircleHelp
} satisfies Record<RiskLevel, typeof ShieldCheck>;

export function RiskBadge({ level, large = false }: { level: RiskLevel; large?: boolean }) {
  const Icon = icons[level];
  return (
    <span className={`risk-badge ${riskTone[level]} ${large ? "large" : ""}`}>
      <Icon aria-hidden="true" />
      {riskLabel(level)}
    </span>
  );
}
