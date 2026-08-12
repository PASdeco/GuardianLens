"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertOctagon, ArrowLeft, BellPlus, Check, Copy, ExternalLink, FileCheck2, Flag, Globe2, LockKeyhole, RefreshCcw, Share2, ShieldCheck } from "lucide-react";
import { actionLabel, assessmentSchema, assessmentStatusSchema } from "@guardian/shared";
import { readAccessClient } from "@/lib/genlayer-client";
import { useGuardianStore } from "@/lib/store";
import { useGuardianAuth } from "@/lib/auth";
import { RiskBadge } from "./risk-badge";
import { StatusTimeline } from "./status-timeline";

export function ScanDetail({ scanId }: { scanId: string }) {
  const { getScan, watchlist, toggleWatchlist, updateScan } = useGuardianStore();
  const auth = useGuardianAuth();
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [challengeReason, setChallengeReason] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const scan = getScan(scanId);
  const transactionHash = scan?.transactionHash || "";

  useEffect(() => {
    if (!scan || !transactionHash || scan.id.startsWith("demo-") || ["FINALIZED", "UNDETERMINED", "FAILED"].includes(scan.status)) return;
    let cancelled = false;
    let timeoutId: number | undefined;
    let retryDelay = 15_000;
    let lastStatus = scan.status;
    let hasStoredAssessment = Boolean(scan.assessment);

    const schedule = (delay: number) => {
      if (cancelled || document.visibilityState !== "visible") return;
      timeoutId = window.setTimeout(() => void poll(), delay);
    };

    const poll = async () => {
      if (cancelled || document.visibilityState !== "visible") return;
      try {
        const response = await fetch(`/api/genlayer/status?caseId=${encodeURIComponent(scan.id)}&hash=${encodeURIComponent(transactionHash)}`, { cache: "no-store" });
        const body = await response.json() as { status?: unknown; verdict?: unknown; retryAfterMs?: number; rateLimited?: boolean; message?: string };
        if (cancelled) return;
        if (response.status === 429) {
          retryDelay = Math.min(Math.max(body.retryAfterMs || retryDelay * 2, 30_000), 120_000);
          setMessage("Studionet is temporarily busy. Status checks have been slowed automatically; your transaction remains safe on-chain.");
          schedule(retryDelay);
          return;
        }
        if (!response.ok) throw new Error(body.message || "GenLayer status is temporarily unavailable.");
        const parsedStatus = assessmentStatusSchema.safeParse(body.status);
        const parsedAssessment = body.verdict ? assessmentSchema.safeParse(body.verdict) : null;
        if (parsedStatus.success && (parsedStatus.data !== lastStatus || (parsedAssessment?.success && !hasStoredAssessment))) {
          updateScan(scan.id, {
            status: parsedStatus.data,
            ...(parsedAssessment?.success ? { assessment: parsedAssessment.data } : {})
          });
          lastStatus = parsedStatus.data;
          if (parsedAssessment?.success) hasStoredAssessment = true;
        }
        if (parsedStatus.success && ["FINALIZED", "UNDETERMINED", "FAILED"].includes(parsedStatus.data)) return;
        retryDelay = Math.max(body.retryAfterMs || 15_000, 15_000);
        if (!body.rateLimited && message.startsWith("Studionet is temporarily busy")) setMessage("");
        schedule(retryDelay);
      } catch {
        retryDelay = Math.min(Math.max(retryDelay * 2, 30_000), 120_000);
        schedule(retryDelay);
      }
    };

    const handleVisibility = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      if (document.visibilityState === "visible") {
        retryDelay = 15_000;
        void poll();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    void poll();
    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [scan?.id, transactionHash, updateScan]);

  if (!scan) return <div className="empty-state"><ShieldCheck /><h1>Assessment not found</h1><Link href="/">Return to scanner</Link></div>;
  const assessment = scan.assessment;
  const watched = watchlist.includes(scan.id);

  async function submitPendingScan() {
    if (!scan?.manifest || !auth.authenticated || !auth.walletAddress) {
      setMessage("Connect your wallet before submitting this evidence package.");
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      const accessPassAddress = process.env.NEXT_PUBLIC_ACCESS_PASS_ADDRESS || "";
      if (!accessPassAddress || !(await readAccessClient(auth.walletAddress, accessPassAddress))) {
        throw new Error("Your 20 GEN access payment is still finalizing. Wait until Profile shows ‘Access active’, then retry.");
      }
      const authorizationMessage = `Guardian Lens assessment\nCase: ${scan.id}\nWallet: ${auth.walletAddress.toLowerCase()}\nEvidence: ${scan.manifest.evidence_root_hash}`;
      const provider = await auth.getEthereumProvider();
      const authorizationSignature = String(await provider.request({
        method: "personal_sign",
        params: [authorizationMessage, auth.walletAddress]
      }));
      const accessToken = await auth.getAccessToken();
      const response = await fetch("/api/relay/assessment", {
        method: "POST",
        headers: { "content-type": "application/json", ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify({ caseId: scan.id, ownerWallet: auth.walletAddress, authorizationSignature, manifest: scan.manifest })
      });
      const bodyText = await response.text();
      let body: { hash?: string; message?: string; status?: string; verdict?: unknown } = {};
      try {
        body = JSON.parse(bodyText) as { hash?: string; message?: string; status?: string; verdict?: unknown };
      } catch {
        body = { message: "The relay service returned an unreadable response." };
      }
      const existingVerdict = body.verdict ? assessmentSchema.safeParse(body.verdict).data : null;
      if (!response.ok) throw new Error(body.message || `The validator request failed (HTTP ${response.status}).`);
      if (existingVerdict) {
        updateScan(scan.id, { assessment: existingVerdict, status: existingVerdict.risk_level === "UNDETERMINED" ? "UNDETERMINED" : "FINALIZED" });
        setMessage("This case was already assessed on-chain. The stored validator verdict has been restored.");
      } else if (body.hash) {
        updateScan(scan.id, { transactionHash: body.hash, status: "PENDING" });
        setMessage("Submitted to GenLayer. This page will update when validators store the verdict.");
      } else if (body.status === "PENDING") {
        updateScan(scan.id, { status: "PENDING" });
        setMessage("This case is already being assessed by GenLayer. The page will update when the verdict is stored.");
      } else {
        throw new Error(body.message || `The validator request failed (HTTP ${response.status}).`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "This evidence package could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="detail-page">
      <div className="detail-toolbar"><Link href="/history"><ArrowLeft /> Back to history</Link><div><button className="secondary-button compact" type="button" onClick={() => toggleWatchlist(scan.id)}><BellPlus /> {watched ? "Watching" : "Add to watchlist"}</button><button className="icon-button" type="button" title="Copy report reference" onClick={() => void navigator.clipboard.writeText(scan.reportRef)}><Copy /></button></div></div>

      <section className="product-header">
        <span className="product-thumb hero"><ShieldCheck /></span>
        <div className="product-identity"><span className="eyebrow">{scan.reportRef}{scan.id.startsWith("demo-") ? " · Demonstration record" : ""}</span><h1>{scan.productName}</h1><p>{[scan.manufacturer, scan.seller].filter(Boolean).join(" · ") || "Product identity requires more evidence"}</p></div>
        {assessment ? <RiskBadge level={assessment.risk_level} large /> : <span className="status-chip">Evidence ready</span>}
      </section>

      <StatusTimeline status={scan.status} />

      {!assessment ? (
        <section className="awaiting-panel"><RefreshCcw className={scan.transactionHash ? "spin" : ""} /><div><h2>{scan.transactionHash ? "GenLayer is assessing this evidence" : "Evidence is awaiting submission"}</h2><p>{scan.transactionHash ? "Independent validators are retrieving public sources and reasoning over the submitted evidence. This page will update when the consensus verdict is stored." : "This evidence package was not submitted. If your access payment was still finalizing, wait until Profile shows Access active and then retry it here."}</p></div>{scan.transactionHash ? <span className="status-chip">{scan.status.replaceAll("_", " ")}</span> : auth.authenticated && scan.manifest ? <button className="secondary-button compact" type="button" disabled={submitting} onClick={() => void submitPendingScan()}>{submitting ? "Submitting…" : "Submit to GenLayer"}</button> : <Link className="secondary-button compact" href="/profile">Activate access</Link>}</section>
      ) : (
        <>
          {assessment.risk_level === "CRITICAL_ALERT" && (
            <section className="critical-actions"><AlertOctagon /><div><span className="eyebrow">Consumer action</span><h2>Stop using this product</h2><p>Follow the official recall instructions and contact a health professional if exposure may have caused harm.</p></div><div><button className="light-button" type="button"><ExternalLink /> Official instructions</button><button className="light-button" type="button"><Share2 /> Share alert</button></div></section>
          )}

          <div className="assessment-grid">
            <section className="finding-panel">
              <span className="eyebrow">What was found</span><h2>{assessment.summary}</h2><p>{assessment.reasoning}</p>
              <div className="recommended-action"><ShieldCheck /><div><span>Recommended next step</span><strong>{actionLabel(assessment.recommended_action_code)}</strong></div></div>
            </section>
            <section className="breakdown-panel">
              <span className="eyebrow">Risk breakdown</span>
              {[
                ["Recall", assessment.recall_status],
                ["Health claims", assessment.claims_status],
                ["Authority", assessment.authority_status],
                ["Sponsorship", assessment.sponsorship_status],
                ["Seller", assessment.seller_status]
              ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value.replaceAll("_", " ").toLowerCase()}</strong></div>)}
            </section>
          </div>

          <div className="evidence-grid">
            <section><div className="section-heading"><div><span className="eyebrow">Traceable evidence</span><h2>Supporting sources</h2></div><FileCheck2 /></div>{assessment.source_ids.map((source) => <div className="source-row" key={source}><span><Globe2 /></span><div><strong>{source}</strong><small>Source retrieved independently by validators</small></div><ExternalLink /></div>)}</section>
            <section><div className="section-heading"><div><span className="eyebrow">Uncertainty</span><h2>What remains unknown</h2></div><LockKeyhole /></div><ul className="uncertainty-list">{assessment.uncertainties.map((item) => <li key={item}><span><Check /></span>{item}</li>)}</ul><p className="policy-line">Checked under {assessment.policy_version}</p></section>
          </div>
        </>
      )}

      {message && <div className="form-message" role="status">{message}</div>}

      <section className="challenge-panel">
        <div><Flag /><span><strong>Something missing or incorrect?</strong><small>Add public evidence and request a fresh validator assessment. The original verdict remains preserved.</small></span></div>
        <button className="secondary-button compact" type="button" onClick={() => setChallengeOpen((open) => !open)}>Challenge assessment</button>
        {challengeOpen && <form onSubmit={(event) => { event.preventDefault(); updateScan(scan.id, { challenged: true, status: "UNDER_APPEAL" }); setMessage("Challenge recorded locally. Configure the relayer to submit it on Studionet."); setChallengeOpen(false); }}><label><span>Reason for challenge</span><textarea required value={challengeReason} onChange={(event) => setChallengeReason(event.target.value)} rows={3} placeholder="Explain which evidence should be reconsidered" /></label><button className="primary-button compact" type="submit">Submit challenge</button></form>}
      </section>
    </section>
  );
}
