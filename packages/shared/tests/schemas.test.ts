import { describe, expect, it } from "vitest";
import { POLICY_VERSION, assessmentSchema, evidenceManifestSchema } from "../src/index";

describe("Guardian Lens schemas", () => {
  it("accepts a bounded non-numeric verdict", () => {
    expect(assessmentSchema.parse({
      risk_level: "USE_CAUTION",
      recall_status: "UNKNOWN",
      authority_status: "UNVERIFIED",
      claims_status: "PARTIALLY_SUPPORTED",
      sponsorship_status: "NONE_FOUND",
      seller_status: "LIMITED_INFORMATION",
      recommended_action_code: "VERIFY_FIRST",
      identity_match: "PARTIAL",
      canonical_product_name: "Example",
      canonical_manufacturer: "",
      canonical_product_category: "SUPPLEMENT",
      source_ids: ["FDA-1"],
      provenance: [{ source_id: "FDA-1", authority: "FDA", url: "https://api.fda.gov/food/enforcement.json", query: "example", content_hash: "a".repeat(64), retrieved_at: 1, supported_findings: ["identity", "recall"] }],
      evidence_version: 1,
      evidence_snapshot_hash: "b".repeat(64),
      policy_version: POLICY_VERSION,
      summary: "Evidence is incomplete.",
      reasoning: "Public sources did not establish the advertised claim.",
      uncertainties: ["Lot number was not provided."]
    }).risk_level).toBe("USE_CAUTION");
  });

  it("rejects malformed evidence hashes", () => {
    expect(() => evidenceManifestSchema.parse({
      evidence_root_hash: "bad",
      source_manifest_hash: "bad",
      manifest_hash: "bad",
      policy_version: POLICY_VERSION,
      product_name: "Example",
      manufacturer: "",
      product_category: "SUPPLEMENT",
      seller: "",
      barcode: "",
      lot_number: "",
      extracted_claims: [],
      authority_claims: [],
      sponsorship_signals: [],
      submitted_source_urls: [],
      regulatory_query_terms: [],
      submitted_at: new Date().toISOString()
    })).toThrow();
  });
});
