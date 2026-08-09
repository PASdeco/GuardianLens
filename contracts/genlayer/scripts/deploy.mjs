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
if (!privateKey || !relayer) {
  throw new Error("DEPLOYER_PRIVATE_KEY and RELAYER_ADDRESS are required.");
}

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
  if (typeof value.execution_result === "string") {
    results.push({
      executionResult: value.execution_result,
      stderr: typeof value.genvm_result?.stderr === "string" ? value.genvm_result.stderr : ""
    });
  }
  for (const [key, item] of Object.entries(value)) {
    if (key !== "node_config" && key !== "genvm_result") collectExecutionResults(item, results);
  }
  return results;
}

function assertSuccessfulExecution(hash, receipt) {
  const executions = collectExecutionResults(receipt.consensus_data?.leader_receipt);
  const failures = executions.filter(({ executionResult, stderr }) => executionResult !== "SUCCESS" && !stderr.includes("Validator execution cancelled after quorum"));
  if (failures.length > 0) {
    const detail = failures[0].stderr.trim().split("\n").slice(-2).join(" ").slice(0, 500);
    throw new Error(`Deployment ${hash} failed in GenVM (${failures[0].executionResult}). ${detail}`.trim());
  }
}

async function deploy(file, args = []) {
  const code = await readFile(path.resolve(process.cwd(), file), "utf8");
  await client.getContractSchemaForCode(code);
  const hash = await client.deployContract({ code, args });
  console.log(`Submitted ${file}: ${hash}`);
  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
    interval: 5000,
    retries: 120
  });
  assertSuccessfulExecution(hash, receipt);
  const address = receipt.contractAddress || receipt.recipient || receipt.data?.contract_address || "";
  if (!address) throw new Error(`Deployment ${hash} finalized without a contract address.`);
  const schema = await client.getContractSchema(address);
  if (!schema || typeof schema !== "object") {
    throw new Error(`Deployment ${hash} has no readable contract schema at ${address}.`);
  }
  console.log(`Verified ${file}: ${address}`);
  return { hash, address };
}

async function updateRootEnv(addresses) {
  let env = await readFile(rootEnvPath, "utf8");
  for (const [key, value] of Object.entries(addresses)) {
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^${key}=.*$`, "m");
    env = pattern.test(env) ? env.replace(pattern, line) : `${env.trimEnd()}\n${line}\n`;
  }
  await writeFile(rootEnvPath, env);
}

const accessPass = await deploy("guardian_access_pass.py");
const relayRouter = await deploy("guardian_relay_router.py", [relayer, accessPass.address]);
const verdictRegistry = await deploy("guardian_verdict_registry.py", [relayer]);
const deployment = { network: "studionet", chainId: 61999, accessPass, relayRouter, verdictRegistry };
await writeFile(path.resolve(process.cwd(), "deployment.studionet.json"), JSON.stringify(deployment, null, 2));
await updateRootEnv({
  NEXT_PUBLIC_ACCESS_PASS_ADDRESS: accessPass.address,
  NEXT_PUBLIC_RELAY_ROUTER_ADDRESS: relayRouter.address,
  NEXT_PUBLIC_VERDICT_REGISTRY_ADDRESS: verdictRegistry.address
});
console.log(JSON.stringify(deployment, null, 2));
