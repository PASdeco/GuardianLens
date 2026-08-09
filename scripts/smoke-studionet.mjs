import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const envPath = path.resolve(import.meta.dirname, "../.env.local");
if (existsSync(envPath)) process.loadEnvFile(envPath);

const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
const wallet = "0xD0b8aEEdf195499773415323cae517e5b8369F94";
const accessPass = process.env.NEXT_PUBLIC_ACCESS_PASS_ADDRESS;
const relayRouter = process.env.NEXT_PUBLIC_RELAY_ROUTER_ADDRESS;
const verdictRegistry = process.env.NEXT_PUBLIC_VERDICT_REGISTRY_ADDRESS;
if (!privateKey || !accessPass || !relayRouter || !verdictRegistry) {
  throw new Error("The deployer key and all three deployed contract addresses are required.");
}

const client = createClient({
  chain: studionet,
  endpoint: process.env.GENLAYER_RPC_URL || studionet.rpcUrls.default.http[0],
  account: createAccount(privateKey)
});

function collectExecutions(value, output = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectExecutions(item, output));
    return output;
  }
  if (!value || typeof value !== "object") return output;
  if (typeof value.execution_result === "string") {
    output.push({ result: value.execution_result, stderr: value.genvm_result?.stderr || "" });
  }
  for (const [key, child] of Object.entries(value)) {
    if (key !== "node_config" && key !== "genvm_result") collectExecutions(child, output);
  }
  return output;
}

async function wait(hash, label) {
  console.log(`${label} submitted: ${hash}`);
  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
    interval: 5000,
    retries: 180
  });
  const failure = collectExecutions(receipt.consensus_data).find(({ result, stderr }) => result !== "SUCCESS" && !stderr.includes("Validator execution cancelled after quorum"));
  if (failure) {
    const detail = failure.stderr.trim().split("\n").slice(-2).join(" ").slice(0, 500);
    throw new Error(`${label} failed in GenVM (${failure.result}). ${detail}`.trim());
  }
  console.log(`${label} accepted.`);
  return receipt;
}

async function read(address, functionName, args = []) {
  return client.readContract({ address, functionName, args });
}

let entitled = await read(accessPass, "has_access", [wallet]);
if (!entitled) {
  const paymentHash = await client.writeContract({
    address: accessPass,
    functionName: "pay_for_access",
    args: [],
    value: 20n * 10n ** 18n
  });
  await wait(paymentHash, "Access payment");
  entitled = await read(accessPass, "has_access", [wallet]);
}
if (!entitled) throw new Error("Access entitlement was not active after payment.");

const timestamp = Date.now();
const caseId = `guardian-live-smoke-${timestamp}`;
const sessionId = `guardian-smoke-${timestamp}`;
const expiresAt = Math.floor(Date.now() / 1000) + 3600;
const authorizationHash = createHash("sha256").update(`${wallet}:${sessionId}`).digest("hex");
const sessionHash = await client.writeContract({
  address: relayRouter,
  functionName: "authorize_session",
  args: [sessionId, wallet, JSON.stringify([verdictRegistry]), expiresAt, authorizationHash],
  value: 0n
});
await wait(sessionHash, "Relay session authorization");

const manifest = {
  evidence_root_hash: createHash("sha256").update(`${caseId}:evidence`).digest("hex"),
  source_manifest_hash: createHash("sha256").update(`${caseId}:sources`).digest("hex"),
  policy_version: "GL-POLICY-1",
  product_name: "Tylenol Extra Strength Caplets",
  manufacturer: "Kenvue",
  seller: "Official manufacturer product page",
  barcode: "",
  lot_number: "",
  extracted_claims: ["Temporarily reduces fever", "Relieves minor aches and pains"],
  authority_claims: [],
  sponsorship_signals: [],
  submitted_source_urls: ["https://www.tylenol.com/products/tylenol-extra-strength-caplets"],
  regulatory_query_terms: ["Tylenol Extra Strength", "Kenvue"],
  submitted_at: new Date().toISOString()
};

async function consume(methodName, nonce, payload) {
  const payloadHash = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  const hash = await client.writeContract({
    address: relayRouter,
    functionName: "consume_intent",
    args: [sessionId, wallet, verdictRegistry, methodName, nonce, expiresAt, payloadHash],
    value: 0n
  });
  await wait(hash, `Relay intent ${methodName}`);
}

await consume("create_case", 1, { caseId, wallet, manifest });
const createCaseHash = await client.writeContract({
  address: verdictRegistry,
  functionName: "create_case",
  args: [caseId, wallet, JSON.stringify(manifest)],
  value: 0n
});
await wait(createCaseHash, "Case creation");

await consume("request_assessment", 2, { caseId });
const assessmentHash = await client.writeContract({
  address: verdictRegistry,
  functionName: "request_assessment",
  args: [caseId],
  value: 0n
});
await wait(assessmentHash, "Non-deterministic assessment");

const verdict = await read(verdictRegistry, "get_verdict", [caseId]);
const caseRecord = await read(verdictRegistry, "get_case", [caseId]);
if (!verdict || typeof verdict !== "object" || !verdict.risk_level) {
  throw new Error("The live case completed without a readable structured verdict.");
}

console.log(JSON.stringify({
  caseId,
  sessionId,
  assessmentHash,
  caseStatus: caseRecord.status,
  verdict: {
    risk_level: verdict.risk_level,
    recall_status: verdict.recall_status,
    recommended_action_code: verdict.recommended_action_code,
    policy_version: verdict.policy_version,
    source_ids: verdict.source_ids
  }
}, null, 2));
