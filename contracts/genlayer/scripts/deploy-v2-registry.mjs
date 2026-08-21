import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const rootEnvPath = path.resolve(import.meta.dirname, "../../../.env.local");
if (existsSync(rootEnvPath)) process.loadEnvFile(rootEnvPath);

const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
const relayer = process.env.RELAYER_ADDRESS;
if (!privateKey || !relayer) throw new Error("DEPLOYER_PRIVATE_KEY and RELAYER_ADDRESS are required.");

const client = createClient({
  chain: studionet,
  endpoint: process.env.GENLAYER_RPC_URL || studionet.rpcUrls.default.http[0],
  account: createAccount(privateKey)
});

function collectExecutionResults(value, results = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectExecutionResults(item, results);
    return results;
  }
  if (!value || typeof value !== "object") return results;
  if (typeof value.execution_result === "string") results.push({ result: value.execution_result, stderr: value.genvm_result?.stderr || "" });
  for (const [key, item] of Object.entries(value)) if (key !== "node_config" && key !== "genvm_result") collectExecutionResults(item, results);
  return results;
}

const code = await readFile(path.resolve(process.cwd(), "guardian_verdict_registry.py"), "utf8");
await client.getContractSchemaForCode(code);
const hash = await client.deployContract({ code, args: [relayer] });
console.log(`Submitted GuardianVerdictRegistry V2: ${hash}`);
const receipt = await client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED, interval: 5000, retries: 120 });
const failure = collectExecutionResults(receipt.consensus_data?.leader_receipt).find(({ result, stderr }) => result !== "SUCCESS" && !stderr.includes("Validator execution cancelled after quorum"));
if (failure) throw new Error(`V2 deployment failed in GenVM (${failure.result}). ${String(failure.stderr).slice(-500)}`);
const address = receipt.contractAddress || receipt.recipient || receipt.data?.contract_address || "";
if (!address) throw new Error("V2 deployment finalized without a contract address.");
await client.getContractSchema(address);

const deploymentPath = path.resolve(process.cwd(), "deployment.studionet.v2.json");
const deployment = { network: "studionet", chainId: 61999, policyVersion: "GL-POLICY-2", verdictRegistry: { hash, address }, deployedAt: new Date().toISOString() };
await writeFile(deploymentPath, JSON.stringify(deployment, null, 2));

let env = await readFile(rootEnvPath, "utf8");
const key = "NEXT_PUBLIC_VERDICT_REGISTRY_ADDRESS";
const line = `${key}=${address}`;
const pattern = new RegExp(`^${key}=.*$`, "m");
env = pattern.test(env) ? env.replace(pattern, line) : `${env.trimEnd()}\n${line}\n`;
await writeFile(rootEnvPath, env);
console.log(JSON.stringify(deployment, null, 2));
