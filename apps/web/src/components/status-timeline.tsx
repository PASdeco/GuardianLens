import { Check, Circle, LoaderCircle } from "lucide-react";
import type { AssessmentStatus } from "@guardian/shared";

const steps: Array<{ key: AssessmentStatus; label: string }> = [
  { key: "PROCESSING_EVIDENCE", label: "Evidence prepared" },
  { key: "PENDING", label: "Submitted" },
  { key: "PROPOSING", label: "Validators reasoning" },
  { key: "ACCEPTED", label: "Accepted" },
  { key: "FINALIZED", label: "Finalized" }
];

const order: Record<AssessmentStatus, number> = {
  DRAFT: 0,
  PROCESSING_EVIDENCE: 1,
  AWAITING_SUBMISSION: 1,
  PENDING: 2,
  PROPOSING: 3,
  COMMITTING: 3,
  ACCEPTED: 4,
  UNDER_APPEAL: 4,
  FINALIZED: 5,
  UNDETERMINED: 5,
  FAILED: 1
};

export function StatusTimeline({ status }: { status: AssessmentStatus }) {
  const current = order[status];
  return (
    <ol className="status-timeline">
      {steps.map((step, index) => {
        const position = index + 1;
        const done = current > position || (status === step.key);
        const active = current === position && !done;
        return (
          <li key={step.key} className={done ? "done" : active ? "active" : ""}>
            <span>{done ? <Check /> : active ? <LoaderCircle className="spin" /> : <Circle />}</span>
            <small>{step.label}</small>
          </li>
        );
      })}
    </ol>
  );
}
