import { POLICY_VERSION, type GuardianScan } from "@guardian/shared";

const now = new Date();

export const demoScans: GuardianScan[] = [
  {
    id: "demo-critical",
    reportRef: "GL-DEMO-01842",
    productName: "Herbal Metabolism Capsules",
    manufacturer: "Northstar Naturals",
    seller: "Wellness Market",
    productUrl: "https://example.com/products/herbal-metabolism",
    barcode: "850000123456",
    lotNumber: "HN-24-08",
    claims: ["Supports rapid weight loss", "Doctor recommended"],
    evidence: [],
    status: "FINALIZED",
    assessment: {
      risk_level: "CRITICAL_ALERT",
      recall_status: "CONFIRMED",
      authority_status: "UNVERIFIED",
      claims_status: "UNSUPPORTED",
      sponsorship_status: "UNDISCLOSED_SIGNALS",
      seller_status: "LIMITED_INFORMATION",
      recommended_action_code: "STOP_USE",
      source_ids: ["FDA-DEMO-104", "PRODUCT-DEMO-1"],
      policy_version: POLICY_VERSION,
      summary: "A matching product and lot appear in an official recall notice.",
      reasoning: "This fixture demonstrates the interface for a consensus-approved critical recall. It is not a claim about a real product.",
      uncertainties: ["This is clearly labeled demonstration data and is not a live regulatory finding."]
    },
    manifest: null,
    transactionHash: "0xdemonstration01842",
    createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 3).toISOString(),
    updatedAt: new Date(now.getTime() - 1000 * 60 * 50).toISOString(),
    publicReport: true,
    challenged: false
  },
  {
    id: "demo-caution",
    reportRef: "GL-DEMO-01838",
    productName: "Daily Immune Gummies",
    manufacturer: "Sample Health Co.",
    seller: "Direct storefront",
    productUrl: "https://example.com/products/immune-gummies",
    barcode: "",
    lotNumber: "",
    claims: ["Supports immune health"],
    evidence: [],
    status: "ACCEPTED",
    assessment: {
      risk_level: "USE_CAUTION",
      recall_status: "NONE_FOUND",
      authority_status: "NOT_APPLICABLE",
      claims_status: "PARTIALLY_SUPPORTED",
      sponsorship_status: "NONE_FOUND",
      seller_status: "LIMITED_INFORMATION",
      recommended_action_code: "VERIFY_FIRST",
      source_ids: ["PRODUCT-DEMO-2"],
      policy_version: POLICY_VERSION,
      summary: "No recall match was found, but the available claim evidence is limited.",
      reasoning: "This demonstration result shows an accepted assessment that has not yet reached network finality.",
      uncertainties: ["A lot number was not provided."]
    },
    manifest: null,
    transactionHash: "0xdemonstration01838",
    createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 25).toISOString(),
    updatedAt: new Date(now.getTime() - 1000 * 60 * 60 * 22).toISOString(),
    publicReport: false,
    challenged: false
  }
];
