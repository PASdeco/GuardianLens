import { ShieldCheck } from "lucide-react";

export function GuardianBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand" aria-label="Guardian Lens">
      <span className="brand-mark"><ShieldCheck aria-hidden="true" /></span>
      {!compact && <span className="brand-name">Guardian <strong>Lens</strong></span>}
    </div>
  );
}
