"use client";

import Link from "next/link";
import { AlertOctagon, ArrowRight, Check, ExternalLink, FileCheck2, ShieldCheck } from "lucide-react";
import { actionLabel } from "@guardian/shared";
import { demoScans } from "@/lib/demo-data";
import { useGuardianStore } from "@/lib/store";
import { GuardianBrand } from "./brand";
import { RiskBadge } from "./risk-badge";

export function PublicReport({ reportRef }: { reportRef: string }) {
  const store = useGuardianStore();
  const scan = store.scans.find((item) => item.reportRef === reportRef) || demoScans.find((item) => item.reportRef === reportRef);
  if (!scan || !scan.assessment) return <div className="public-empty"><GuardianBrand /><ShieldCheck /><h1>Public report not found</h1><p>This report may be private, unpublished, or unavailable.</p><Link href="/">Open Guardian Lens <ArrowRight /></Link></div>;
  const assessment = scan.assessment;
  return (
    <div className="public-report-page">
      <header className="public-header"><GuardianBrand /><span className="status-chip"><span className="status-dot" /> {scan.status.toLowerCase()}</span></header>
      <main className="public-report">
        <section className="report-hero"><div><span className="eyebrow">Public assessment · {scan.reportRef}</span><h1>{scan.productName}</h1><p>{scan.manufacturer} {scan.seller ? `· Sold by ${scan.seller}` : ""}</p></div><RiskBadge level={assessment.risk_level} large /></section>
        {assessment.risk_level === "CRITICAL_ALERT" && <section className="critical-actions"><AlertOctagon /><div><span className="eyebrow">Recommended consumer action</span><h2>{actionLabel(assessment.recommended_action_code)}</h2><p>Review the official source instructions before taking further action.</p></div><button className="light-button"><ExternalLink /> Official instructions</button></section>}
        <section className="report-summary"><span className="eyebrow">Guardian Lens finding</span><h2>{assessment.summary}</h2><p>{assessment.reasoning}</p></section>
        <div className="report-columns"><section><span className="eyebrow">Assessment fields</span>{[["Identity",assessment.identity_match],["Recall",assessment.recall_status],["Claims",assessment.claims_status],["Authority",assessment.authority_status],["Sponsorship",assessment.sponsorship_status],["Seller",assessment.seller_status]].map(([label,value]) => <div className="report-field" key={label}><span>{label}</span><strong>{value.replaceAll("_", " ").toLowerCase()}</strong></div>)}</section><section><span className="eyebrow">Supporting sources</span>{assessment.provenance.map((source) => <a className="source-row" key={source.source_id} href={source.url} target="_blank" rel="noreferrer"><span><FileCheck2 /></span><div><strong>{source.source_id} · {source.authority}</strong><small>Snapshot {source.content_hash.slice(0, 12)} · {source.supported_findings.join(", ")}</small></div><ExternalLink /></a>)}</section></div>
        <section className="report-integrity"><div><ShieldCheck /><span><strong>GenLayer assessment</strong><small>Validators reason independently and agree on bounded safety fields.</small></span></div><div><span>Policy version</span><strong>{assessment.policy_version}</strong></div><div><span>Transaction</span><strong>{scan.transactionHash.slice(0, 18)}...</strong></div></section>
        <section className="report-disclaimer"><Check /><p>Guardian Lens is an evidence-backed product safety aid. It does not diagnose conditions or replace a doctor, pharmacist, FDA, or FTC guidance.</p></section>
      </main>
      <footer className="public-footer"><span>Checked before trust.</span><Link href="/">Scan another product <ArrowRight /></Link></footer>
    </div>
  );
}
