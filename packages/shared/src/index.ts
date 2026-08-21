import { z } from "zod";

export const STUDIONET = {
  id: 61999,
  name: "GenLayer Studionet",
  currency: "GEN",
  rpcUrl: "https://studio.genlayer.com/api",
  explorerUrl: "https://explorer-studio.genlayer.com"
} as const;

export const ACCESS_PRICE_GEN = 20;
export const ACCESS_PRICE_WEI = 20n * 10n ** 18n;
export const POLICY_VERSION = "GL-POLICY-2";

export const riskLevelSchema = z.enum([
  "LOW_CONCERN",
  "USE_CAUTION",
  "HIGH_RISK",
  "CRITICAL_ALERT",
  "UNDETERMINED"
]);
export type RiskLevel = z.infer<typeof riskLevelSchema>;

export const recallStatusSchema = z.enum(["NONE_FOUND", "POSSIBLE_MATCH", "CONFIRMED", "UNKNOWN"]);
export const authorityStatusSchema = z.enum(["VERIFIED", "UNVERIFIED", "MISLEADING", "NOT_APPLICABLE", "UNKNOWN"]);
export const claimsStatusSchema = z.enum(["SUPPORTED", "PARTIALLY_SUPPORTED", "UNSUPPORTED", "PROHIBITED", "UNKNOWN"]);
export const sponsorshipStatusSchema = z.enum(["DISCLOSED", "UNDISCLOSED_SIGNALS", "NONE_FOUND", "UNKNOWN"]);
export const sellerStatusSchema = z.enum(["VERIFIED", "LIMITED_INFORMATION", "HIGH_RISK", "UNKNOWN"]);
export const actionCodeSchema = z.enum(["PROCEED", "VERIFY_FIRST", "AVOID", "STOP_USE", "SEEK_PROFESSIONAL_HELP"]);
export const identityMatchSchema = z.enum(["CONFIRMED", "PARTIAL", "UNVERIFIED", "CONFLICTING"]);

export const provenanceSchema = z.object({
  source_id: z.string().min(1).max(96),
  authority: z.string().min(1).max(96),
  url: z.string().url().max(512),
  query: z.string().max(240),
  content_hash: z.string().regex(/^[a-f0-9]{64}$/),
  retrieved_at: z.number().int().positive(),
  supported_findings: z.array(z.enum(["identity", "recall", "authority", "claims", "sponsorship", "seller"])).max(6)
});
export type Provenance = z.infer<typeof provenanceSchema>;

export const assessmentStatusSchema = z.enum([
  "DRAFT",
  "PROCESSING_EVIDENCE",
  "AWAITING_SUBMISSION",
  "PENDING",
  "PROPOSING",
  "COMMITTING",
  "ACCEPTED",
  "UNDER_APPEAL",
  "FINALIZED",
  "UNDETERMINED",
  "FAILED"
]);
export type AssessmentStatus = z.infer<typeof assessmentStatusSchema>;

export const paymentStatusSchema = z.enum([
  "PAYMENT_REQUIRED",
  "WRONG_NETWORK",
  "INSUFFICIENT_BALANCE",
  "PAYMENT_PENDING",
  "PAYMENT_ACCEPTED",
  "PAYMENT_FINALIZING",
  "ACCESS_ACTIVE",
  "PAYMENT_FAILED"
]);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const assessmentSchema = z.object({
  risk_level: riskLevelSchema,
  recall_status: recallStatusSchema,
  authority_status: authorityStatusSchema,
  claims_status: claimsStatusSchema,
  sponsorship_status: sponsorshipStatusSchema,
  seller_status: sellerStatusSchema,
  recommended_action_code: actionCodeSchema,
  identity_match: identityMatchSchema,
  canonical_product_name: z.string().max(160),
  canonical_manufacturer: z.string().max(160),
  canonical_product_category: z.string().max(64),
  source_ids: z.array(z.string().min(1).max(96)).max(16),
  provenance: z.array(provenanceSchema).max(16),
  evidence_version: z.number().int().positive(),
  evidence_snapshot_hash: z.string().regex(/^[a-f0-9]{64}$/),
  policy_version: z.literal(POLICY_VERSION),
  summary: z.string().min(1).max(500),
  reasoning: z.string().min(1).max(1200),
  uncertainties: z.array(z.string().min(1).max(240)).max(8)
});
export type Assessment = z.infer<typeof assessmentSchema>;

export const evidenceManifestSchema = z.object({
  evidence_root_hash: z.string().regex(/^[a-f0-9]{64}$/),
  source_manifest_hash: z.string().regex(/^[a-f0-9]{64}$/),
  manifest_hash: z.string().regex(/^[a-f0-9]{64}$/),
  policy_version: z.literal(POLICY_VERSION),
  product_name: z.string().min(1).max(160),
  manufacturer: z.string().max(160),
  product_category: z.string().min(1).max(64),
  seller: z.string().max(160),
  barcode: z.string().max(64),
  lot_number: z.string().max(80),
  extracted_claims: z.array(z.string().min(1).max(280)).max(20),
  authority_claims: z.array(z.string().min(1).max(280)).max(12),
  sponsorship_signals: z.array(z.string().min(1).max(200)).max(12),
  submitted_source_urls: z.array(z.string().url().max(512)).max(8),
  regulatory_query_terms: z.array(z.string().min(1).max(120)).max(12),
  submitted_at: z.string().datetime()
});
export type EvidenceManifest = z.infer<typeof evidenceManifestSchema>;

export type EvidenceAsset = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  sha256: string;
  extractedText: string;
};

export type GuardianScan = {
  id: string;
  reportRef: string;
  productName: string;
  manufacturer: string;
  seller: string;
  productUrl: string;
  barcode: string;
  lotNumber: string;
  claims: string[];
  evidence: EvidenceAsset[];
  status: AssessmentStatus;
  assessment: Assessment | null;
  manifest: EvidenceManifest | null;
  transactionHash: string;
  createdAt: string;
  updatedAt: string;
  publicReport: boolean;
  challenged: boolean;
};

export type RelayIntent = {
  accountId: string;
  walletAddress: string;
  sessionId: string;
  contract: "VERDICT_REGISTRY" | "RELAY_ROUTER";
  method: "create_case" | "request_assessment" | "open_challenge" | "request_appeal_assessment" | "publish_report_reference";
  args: Array<string | number | boolean>;
  payloadHash: string;
  nonce: number;
  expiresAt: number;
  signature: string;
};

export function riskLabel(level: RiskLevel) {
  return {
    LOW_CONCERN: "Low concern",
    USE_CAUTION: "Use caution",
    HIGH_RISK: "High risk",
    CRITICAL_ALERT: "Critical alert",
    UNDETERMINED: "Undetermined"
  }[level];
}

export function actionLabel(code: z.infer<typeof actionCodeSchema>) {
  return {
    PROCEED: "Proceed with normal care",
    VERIFY_FIRST: "Verify before purchase or use",
    AVOID: "Avoid this product",
    STOP_USE: "Stop using this product",
    SEEK_PROFESSIONAL_HELP: "Contact a qualified health professional"
  }[code];
}
