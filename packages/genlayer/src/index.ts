import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import { ACCESS_PRICE_WEI, assessmentSchema, type Assessment, type EvidenceManifest } from "@guardian/shared";

export type GuardianEthereumProvider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

export type GuardianContracts = {
  accessPass: string;
  relayRouter: string;
  verdictRegistry: string;
};

export function createGuardianReadClient(endpoint = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || studionet.rpcUrls.default.http[0]) {
  return createClient({ chain: studionet, endpoint });
}

export function createGuardianRelayer(privateKey: string, endpoint?: string) {
  if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
    throw new Error("A valid RELAYER_PRIVATE_KEY is required.");
  }
  return createClient({
    chain: studionet,
    endpoint: endpoint || process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || studionet.rpcUrls.default.http[0],
    account: createAccount(privateKey as `0x${string}`)
  });
}

export function createGuardianWalletClient(walletAddress: string, provider: GuardianEthereumProvider, endpoint?: string) {
  return createClient({
    chain: studionet,
    endpoint: endpoint || process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || studionet.rpcUrls.default.http[0],
    account: walletAddress as `0x${string}`,
    provider
  });
}

function parseRpcJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value as T;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return fallback;
  }
}

export async function waitForSuccessfulReceipt(client: ReturnType<typeof createClient>, hash: string) {
  const receipt = await client.waitForTransactionReceipt({
    hash: hash as Parameters<typeof client.waitForTransactionReceipt>[0]["hash"],
    status: TransactionStatus.ACCEPTED,
    interval: 15000,
    retries: 80
  });
  const results: Array<{ result: string; stderr: string; detail: string }> = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    if (typeof record.execution_result === "string") {
      const genvm = record.genvm_result && typeof record.genvm_result === "object"
        ? record.genvm_result as Record<string, unknown>
        : {};
      const contractResult = record.result && typeof record.result === "object"
        ? record.result as Record<string, unknown>
        : {};
      results.push({
        result: record.execution_result,
        stderr: typeof genvm.stderr === "string" ? genvm.stderr : "",
        detail: typeof contractResult.payload === "string" ? contractResult.payload : ""
      });
    }
    Object.entries(record).forEach(([key, child]) => {
      if (key !== "node_config" && key !== "genvm_result") visit(child);
    });
  };
  visit((receipt as unknown as Record<string, unknown>).consensus_data);
  const failed = results.find(({ result, stderr }) => result !== "SUCCESS" && !stderr.includes("Validator execution cancelled after quorum"));
  if (failed) throw new Error(failed.detail || `GenLayer transaction ${hash} finished with ${failed.result}.`);
  return receipt;
}

export async function readAccess(walletAddress: string, address: string) {
  if (!address) return false;
  const result = await createGuardianReadClient().readContract({
    address: address as `0x${string}`,
    functionName: "has_access",
    args: [walletAddress]
  });
  return String(result).toLowerCase() === "true";
}

export async function submitAccessPayment(client: ReturnType<typeof createClient>, address: string) {
  return client.writeContract({
    address: address as `0x${string}`,
    functionName: "pay_for_access",
    args: [],
    value: ACCESS_PRICE_WEI
  });
}

export async function readRelaySession(sessionId: string, address: string) {
  if (!address) return null;
  const value = await createGuardianReadClient().readContract({
    address: address as `0x${string}`,
    functionName: "get_session",
    args: [sessionId]
  });
  const session = parseRpcJson<Record<string, unknown>>(value, {});
  return Object.keys(session).length ? session : null;
}

export async function readCase(caseId: string, address: string) {
  if (!address) return null;
  const value = await createGuardianReadClient().readContract({
    address: address as `0x${string}`,
    functionName: "get_case",
    args: [caseId]
  });
  const record = parseRpcJson<Record<string, unknown>>(value, {});
  return Object.keys(record).length ? record : null;
}

export async function authorizeRelaySession(input: {
  relayerPrivateKey: string;
  routerAddress: string;
  sessionId: string;
  logicalUser: string;
  allowedContracts: string[];
  expiresAt: number;
  authorizationHash: string;
}) {
  const client = createGuardianRelayer(input.relayerPrivateKey);
  const hash = await client.writeContract({
    address: input.routerAddress as `0x${string}`,
    functionName: "authorize_session",
    args: [input.sessionId, input.logicalUser, JSON.stringify(input.allowedContracts), input.expiresAt, input.authorizationHash],
    value: 0n
  });
  await waitForSuccessfulReceipt(client, hash);
  return hash;
}

export async function consumeRelayIntent(input: {
  relayerPrivateKey: string;
  routerAddress: string;
  sessionId: string;
  logicalUser: string;
  targetContract: string;
  methodName: string;
  nonce: number;
  expiresAt: number;
  payloadHash: string;
}) {
  const client = createGuardianRelayer(input.relayerPrivateKey);
  const hash = await client.writeContract({
    address: input.routerAddress as `0x${string}`,
    functionName: "consume_intent",
    args: [input.sessionId, input.logicalUser, input.targetContract, input.methodName, input.nonce, input.expiresAt, input.payloadHash],
    value: 0n
  });
  await waitForSuccessfulReceipt(client, hash);
  return hash;
}

export async function relayCreateCase(input: {
  relayerPrivateKey: string;
  registryAddress: string;
  caseId: string;
  ownerWallet: string;
  manifest: EvidenceManifest;
}) {
  const client = createGuardianRelayer(input.relayerPrivateKey);
  const hash = await client.writeContract({
    address: input.registryAddress as `0x${string}`,
    functionName: "create_case",
    args: [input.caseId, input.ownerWallet, JSON.stringify(input.manifest)],
    value: 0n
  });
  await waitForSuccessfulReceipt(client, hash);
  return hash;
}

export async function relayRequestAssessment(input: {
  relayerPrivateKey: string;
  registryAddress: string;
  caseId: string;
}) {
  const client = createGuardianRelayer(input.relayerPrivateKey);
  const hash = await client.writeContract({
    address: input.registryAddress as `0x${string}`,
    functionName: "request_assessment",
    args: [input.caseId],
    value: 0n
  });
  await waitForSuccessfulReceipt(client, hash);
  return hash;
}

export async function readVerdict(caseId: string, registryAddress: string): Promise<Assessment | null> {
  if (!registryAddress) return null;
  const value = await createGuardianReadClient().readContract({
    address: registryAddress as `0x${string}`,
    functionName: "get_verdict",
    args: [caseId]
  });
  const parsed = parseRpcJson<Record<string, unknown>>(value, {});
  return Object.keys(parsed).length ? assessmentSchema.parse(parsed) : null;
}

export async function readAssessmentTransaction(hash: string) {
  const transaction = await createGuardianReadClient().getTransaction({
    hash: hash as Parameters<ReturnType<typeof createClient>["getTransaction"]>[0]["hash"]
  });
  if (!transaction) return null;
  const record = transaction as unknown as Record<string, unknown>;
  return {
    statusName: String(record.statusName || record.status || "PENDING"),
    resultName: String(record.resultName || record.result || "IDLE"),
    executionResultName: String(record.txExecutionResultName || "")
  };
}
