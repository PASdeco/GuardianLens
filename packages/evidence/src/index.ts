import { POLICY_VERSION, evidenceManifestSchema, type EvidenceAsset, type EvidenceManifest } from "@guardian/shared";

const PRIVATE_HOSTS = /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?)/i;

export function assertPublicHttpUrl(input: string) {
  const url = new URL(input.trim());
  if (!/^https?:$/.test(url.protocol) || PRIVATE_HOSTS.test(url.hostname)) {
    throw new Error("Only public HTTP or HTTPS product URLs are supported.");
  }
  url.username = "";
  url.password = "";
  url.hash = "";
  return url.toString();
}

export async function sha256Text(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256File(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function extractImageText(file: File) {
  const { recognize } = await import("tesseract.js");
  const result = await recognize(file, "eng", { logger: () => undefined });
  return result.data.text.replace(/\s+/g, " ").trim();
}

export async function prepareEvidenceAsset(file: File, extractedText = ""): Promise<EvidenceAsset> {
  return {
    id: crypto.randomUUID(),
    name: file.name.slice(0, 160),
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    sha256: await sha256File(file),
    extractedText: extractedText.slice(0, 8000)
  };
}

export async function buildEvidenceManifest(input: {
  productName: string;
  manufacturer: string;
  seller: string;
  productUrl: string;
  barcode: string;
  lotNumber: string;
  claims: string[];
  authorityClaims?: string[];
  sponsorshipSignals?: string[];
  evidence: EvidenceAsset[];
}): Promise<EvidenceManifest> {
  const sourceUrls = input.productUrl ? [assertPublicHttpUrl(input.productUrl)] : [];
  const evidenceRoot = await sha256Text(JSON.stringify(input.evidence.map(({ sha256, extractedText }) => ({ sha256, extractedText }))));
  const sourceRoot = await sha256Text(JSON.stringify(sourceUrls));
  return evidenceManifestSchema.parse({
    evidence_root_hash: evidenceRoot,
    source_manifest_hash: sourceRoot,
    policy_version: POLICY_VERSION,
    product_name: input.productName.trim(),
    manufacturer: input.manufacturer.trim(),
    seller: input.seller.trim(),
    barcode: input.barcode.trim(),
    lot_number: input.lotNumber.trim(),
    extracted_claims: input.claims.map((claim) => claim.trim()).filter(Boolean),
    authority_claims: (input.authorityClaims ?? []).map((claim) => claim.trim()).filter(Boolean),
    sponsorship_signals: (input.sponsorshipSignals ?? []).map((signal) => signal.trim()).filter(Boolean),
    submitted_source_urls: sourceUrls,
    regulatory_query_terms: [input.productName, input.manufacturer, input.barcode, input.lotNumber].map((term) => term.trim()).filter(Boolean),
    submitted_at: new Date().toISOString()
  });
}

export function detectCommercialSignals(url: string, text: string) {
  const haystack = `${url} ${text}`.toLowerCase();
  const signals = [
    ["Affiliate link parameters", /[?&](aff|affiliate|ref|referral|utm_source)=/],
    ["Coupon or promotion language", /\b(coupon|discount code|use code|promo code)\b/],
    ["Paid sponsorship disclosure", /\b(sponsored|paid partnership|affiliate disclosure)\b/]
  ] as const;
  return signals.filter(([, expression]) => expression.test(haystack)).map(([label]) => label);
}
