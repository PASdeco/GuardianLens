"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Barcode,
  Camera,
  CheckCircle2,
  ExternalLink,
  FileImage,
  FileVideo,
  Globe2,
  LoaderCircle,
  ScanLine,
  ShieldCheck,
  Sparkles,
  X
} from "lucide-react";
import { buildEvidenceManifest, detectCommercialSignals, extractImageText, prepareEvidenceAsset } from "@guardian/evidence";
import { assessmentSchema, type EvidenceAsset, type GuardianScan } from "@guardian/shared";
import { readAccessClient } from "@/lib/genlayer-client";
import { useGuardianStore } from "@/lib/store";
import { useGuardianAuth } from "@/lib/auth";
import { RiskBadge } from "./risk-badge";

type InputMode = "url" | "photo" | "video" | "barcode";
type RecallPreview = { sourceId: string; classification: string; recallingFirm: string; productDescription: string; reason: string; status: string };

const modes = [
  { value: "url", label: "Link", icon: Globe2 },
  { value: "photo", label: "Photo", icon: Camera },
  { value: "video", label: "Video", icon: FileVideo },
  { value: "barcode", label: "Barcode", icon: Barcode }
] as const;

export function ScannerWorkspace() {
  const router = useRouter();
  const { scans, saveScan } = useGuardianStore();
  const auth = useGuardianAuth();
  const fileInput = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<InputMode>("url");
  const [productUrl, setProductUrl] = useState("");
  const [productName, setProductName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [seller, setSeller] = useState("");
  const [barcode, setBarcode] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [claimsText, setClaimsText] = useState("");
  const [evidence, setEvidence] = useState<EvidenceAsset[]>([]);
  const [busy, setBusy] = useState<"" | "file" | "ocr" | "submit">("");
  const [message, setMessage] = useState("");
  const [recalls, setRecalls] = useState<RecallPreview[]>([]);

  const recent = scans.slice(0, 3);
  const commercialSignals = useMemo(() => detectCommercialSignals(productUrl, claimsText), [productUrl, claimsText]);

  async function addFile(file: File) {
    setBusy("file");
    setMessage("");
    try {
      if (file.size > 25 * 1024 * 1024) throw new Error("Free-tier uploads are limited to 25 MB.");
      const asset = await prepareEvidenceAsset(file);
      setEvidence((current) => [...current, asset]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not prepare that file.");
    } finally {
      setBusy("");
    }
  }

  async function runOcr(asset: EvidenceAsset, file: File) {
    setBusy("ocr");
    setMessage("Extracting packaging text on this device...");
    try {
      const text = await extractImageText(file);
      setEvidence((current) => current.map((item) => item.id === asset.id ? { ...item, extractedText: text } : item));
      setClaimsText((current) => current || text.slice(0, 600));
      setMessage("Packaging text extracted locally. Review it before submission.");
    } catch {
      setMessage("Local OCR was unavailable. You can type the visible claims manually.");
    } finally {
      setBusy("");
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy("submit");
    setMessage("");
    try {
      if (!auth.authenticated || !auth.walletAddress) {
        throw new Error("Connect your wallet before requesting a validator assessment.");
      }
      const accessPassAddress = process.env.NEXT_PUBLIC_ACCESS_PASS_ADDRESS || "";
      if (!accessPassAddress || !(await readAccessClient(auth.walletAddress, accessPassAddress))) {
        throw new Error("Your 20 GEN access payment is still finalizing. Wait until Profile shows ‘Access active’, then submit the scan again.");
      }
      const claims = claimsText.split(/\n|;/).map((value) => value.trim()).filter(Boolean);
      const manifest = await buildEvidenceManifest({ productName, manufacturer, seller, productUrl, barcode, lotNumber, claims, sponsorshipSignals: commercialSignals, evidence });

      const recallResponse = await fetch(`/api/recalls/search?product=${encodeURIComponent(productName)}&manufacturer=${encodeURIComponent(manufacturer)}`);
      const recallData = recallResponse.ok ? await recallResponse.json() as { results: RecallPreview[] } : { results: [] };
      setRecalls(recallData.results || []);

      const id = crypto.randomUUID();
      const year = new Date().getUTCFullYear();
      const reportRef = `GL-${year}-${String(Math.floor(Math.random() * 90000) + 10000)}`;
      const scan: GuardianScan = {
        id,
        reportRef,
        productName,
        manufacturer,
        seller,
        productUrl,
        barcode,
        lotNumber,
        claims,
        evidence,
        status: "AWAITING_SUBMISSION",
        assessment: null,
        manifest,
        transactionHash: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        publicReport: false,
        challenged: false
      };

      const authorizationMessage = `Guardian Lens assessment\nCase: ${id}\nWallet: ${auth.walletAddress.toLowerCase()}\nEvidence: ${manifest.evidence_root_hash}`;
      const provider = await auth.getEthereumProvider();
      const authorizationSignature = String(await provider.request({
        method: "personal_sign",
        params: [authorizationMessage, auth.walletAddress]
      }));
      const accessToken = await auth.getAccessToken();
      const relayResponse = await fetch("/api/relay/assessment", {
        method: "POST",
        headers: { "content-type": "application/json", ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify({ caseId: id, ownerWallet: auth.walletAddress, authorizationSignature, manifest })
      });
      const relayBody = await relayResponse.text();
      let relayData: { configured?: boolean; hash?: string; message?: string; status?: string; verdict?: unknown } = {};
      try {
        relayData = JSON.parse(relayBody) as { configured?: boolean; hash?: string; message?: string; status?: string; verdict?: unknown };
      } catch {
        relayData = { message: "The relay service returned an unreadable response." };
      }
      const existingVerdict = relayData.verdict ? assessmentSchema.safeParse(relayData.verdict).data : null;
      if (relayResponse.ok && existingVerdict) {
        scan.assessment = existingVerdict;
        scan.status = existingVerdict.risk_level === "UNDETERMINED" ? "UNDETERMINED" : "FINALIZED";
      } else if (relayResponse.ok && relayData.hash) {
        scan.status = "PENDING";
        scan.transactionHash = relayData.hash;
      } else if (relayResponse.ok && relayData.status === "PENDING") {
        scan.status = "PENDING";
      } else {
        const statusHint = relayResponse.status ? ` (HTTP ${relayResponse.status})` : "";
        setMessage(relayData.message || `Evidence is ready, but the validator request was not submitted${statusHint}. Refresh and try again.`);
        return;
      }
      saveScan(scan);
      router.push(`/scan/${id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The evidence package could not be prepared.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="scan-page">
      <section className="scanner-band">
        <div className="scanner-copy">
          <span className="eyebrow"><ShieldCheck /> GenLayer validator consensus</span>
          <h1>Check a health product before you trust it.</h1>
          <p>Prepare product evidence privately, verify public regulatory sources, and request an independently reasoned assessment.</p>
        </div>

        <form className="scanner-tool" onSubmit={submit}>
          <div className="mode-control" aria-label="Evidence type">
            {modes.map(({ value, label, icon: Icon }) => (
              <button key={value} type="button" className={mode === value ? "active" : ""} onClick={() => setMode(value)}>
                <Icon /> <span>{label}</span>
              </button>
            ))}
          </div>

          {mode === "url" && (
            <label className="primary-input">
              <Globe2 />
              <input type="url" value={productUrl} onChange={(event) => setProductUrl(event.target.value)} placeholder="Paste a product or seller URL" />
            </label>
          )}
          {(mode === "photo" || mode === "video") && (
            <button className="upload-zone" type="button" onClick={() => fileInput.current?.click()}>
              {busy === "file" ? <LoaderCircle className="spin" /> : mode === "photo" ? <FileImage /> : <FileVideo />}
              <strong>{mode === "photo" ? "Choose product photo or screenshot" : "Choose product video"}</strong>
              <span>Processed on this device · 25 MB maximum</span>
            </button>
          )}
          {mode === "barcode" && (
            <label className="primary-input">
              <Barcode />
              <input value={barcode} onChange={(event) => setBarcode(event.target.value.replace(/\D/g, "").slice(0, 18))} placeholder="Enter UPC or EAN barcode" />
            </label>
          )}
          <input ref={fileInput} hidden type="file" accept={mode === "video" ? "video/*" : "image/*"} onChange={(event) => event.target.files?.[0] && void addFile(event.target.files[0])} />

          <div className="form-grid">
            <label><span>Product name</span><input required value={productName} onChange={(event) => setProductName(event.target.value)} placeholder="e.g. Daily immune gummies" /></label>
            <label><span>Manufacturer</span><input value={manufacturer} onChange={(event) => setManufacturer(event.target.value)} placeholder="Company on the label" /></label>
            <label><span>Seller</span><input value={seller} onChange={(event) => setSeller(event.target.value)} placeholder="Store or marketplace seller" /></label>
            <label><span>Lot number</span><input value={lotNumber} onChange={(event) => setLotNumber(event.target.value)} placeholder="Printed lot or batch" /></label>
          </div>

          <label className="claims-field">
            <span>Claims shown on the product <small>one per line</small></span>
            <textarea value={claimsText} onChange={(event) => setClaimsText(event.target.value)} placeholder="Supports rapid weight loss&#10;Doctor recommended" rows={3} />
          </label>

          {evidence.length > 0 && (
            <div className="evidence-list">
              {evidence.map((asset) => (
                <div className="evidence-item" key={asset.id}>
                  <span className="file-icon"><FileImage /></span>
                  <div><strong>{asset.name}</strong><small>{Math.ceil(asset.size / 1024)} KB · hash {asset.sha256.slice(0, 8)}...</small></div>
                  <button type="button" className="text-button" disabled={busy === "ocr"} onClick={() => {
                    const file = fileInput.current?.files?.[0];
                    if (file) void runOcr(asset, file);
                  }}>Extract text</button>
                  <button type="button" className="icon-button small" aria-label={`Remove ${asset.name}`} onClick={() => setEvidence((current) => current.filter((item) => item.id !== asset.id))}><X /></button>
                </div>
              ))}
            </div>
          )}

          {commercialSignals.length > 0 && (
            <div className="signal-row"><Sparkles /> Commercial signals prepared: {commercialSignals.join(", ")}</div>
          )}
          {message && <div className="form-message" role="status">{message}</div>}
          {recalls.length > 0 && <div className="form-message critical">FDA preview found {recalls.length} possible match{recalls.length === 1 ? "" : "es"}. GenLayer validators must confirm the identity.</div>}

          <button className="primary-button" type="submit" disabled={busy === "submit" || !productName.trim()}>
            {busy === "submit" ? <LoaderCircle className="spin" /> : <ScanLine />}
            Prepare and request assessment
            <ArrowRight />
          </button>
          <p className="privacy-note"><ShieldCheck /> Raw uploads stay off-chain. Only a privacy-safe evidence manifest and hashes are submitted.</p>
        </form>
      </section>

      <section className="scanner-support">
        <div className="support-visual">
          <Image fill priority sizes="(max-width: 820px) 100vw, 34vw" src="/images/supplement-check.jpg" alt="Sealed medicine and supplement blister packaging" />
          <div className="visual-caption">
            <span><CheckCircle2 /> Public-source checks</span>
            <strong>Evidence first. Consensus second.</strong>
          </div>
        </div>
        <div className="recent-panel">
          <div className="section-heading"><div><span className="eyebrow">Recent activity</span><h2>Your latest checks</h2></div><Link href="/history">View all <ArrowRight /></Link></div>
          <div className="recent-list">
            {recent.map((scan) => (
              <Link href={`/scan/${scan.id}`} key={scan.id} className="recent-item">
                <span className="product-thumb"><ShieldCheck /></span>
                <div><strong>{scan.productName}</strong><small>{scan.manufacturer || "Manufacturer not provided"}</small></div>
                {scan.assessment ? <RiskBadge level={scan.assessment.risk_level} /> : <span className="status-chip">Evidence ready</span>}
                <ArrowRight />
              </Link>
            ))}
          </div>
          <a className="source-link" href="https://open.fda.gov/apis/" target="_blank" rel="noreferrer"><ExternalLink /> Regulatory preview powered by public openFDA data</a>
        </div>
      </section>
    </div>
  );
}
