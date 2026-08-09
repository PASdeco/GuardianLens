import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { recoverMessageAddress } from "viem";
import { evidenceManifestSchema } from "@guardian/shared";
import {
  authorizeRelaySession,
  consumeRelayIntent,
  readAccess,
  readCase,
  readRelaySession,
  readVerdict,
  relayCreateCase,
  relayRequestAssessment
} from "@guardian/genlayer";

const dailyRequests = new Map<string, { day: string; count: number }>();

function withinQuota(key: string) {
  const day = new Date().toISOString().slice(0, 10);
  const current = dailyRequests.get(key);
  if (!current || current.day !== day) {
    dailyRequests.set(key, { day, count: 1 });
    return true;
  }
  if (current.count >= 10) return false;
  current.count += 1;
  return true;
}

export async function POST(request: NextRequest) {
  const relayerPrivateKey = process.env.RELAYER_PRIVATE_KEY || "";
  const accessPassAddress = process.env.NEXT_PUBLIC_ACCESS_PASS_ADDRESS || "";
  const routerAddress = process.env.NEXT_PUBLIC_RELAY_ROUTER_ADDRESS || "";
  const registryAddress = process.env.NEXT_PUBLIC_VERDICT_REGISTRY_ADDRESS || "";
  if (!relayerPrivateKey || !accessPassAddress || !routerAddress || !registryAddress) {
    return NextResponse.json({ configured: false, message: "Evidence is ready, but the Studionet contracts or relayer are not configured." }, { status: 503 });
  }

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!withinQuota(forwarded)) {
    return NextResponse.json({ message: "The free testnet daily scan limit has been reached." }, { status: 429 });
  }

  try {
    const body = await request.json() as { caseId?: string; ownerWallet?: string; authorizationSignature?: string; manifest?: unknown };
    const caseId = String(body.caseId || "").trim().slice(0, 96);
    const ownerWallet = String(body.ownerWallet || "").trim().toLowerCase();
    const authorizationSignature = String(body.authorizationSignature || "").trim() as `0x${string}`;
    if (!caseId || !/^0x[a-f0-9]{40}$/.test(ownerWallet) || ownerWallet === "0x0000000000000000000000000000000000000000" || !/^0x[a-fA-F0-9]{130}$/.test(authorizationSignature)) {
      return NextResponse.json({ message: "A connected wallet, authorization signature, and valid case id are required for relayed assessment." }, { status: 401 });
    }
    const manifest = evidenceManifestSchema.parse(body.manifest);
    const authorizationMessage = `Guardian Lens assessment\nCase: ${caseId}\nWallet: ${ownerWallet}\nEvidence: ${manifest.evidence_root_hash}`;
    const recoveredWallet = (await recoverMessageAddress({ message: authorizationMessage, signature: authorizationSignature })).toLowerCase();
    if (recoveredWallet !== ownerWallet) {
      return NextResponse.json({ message: "The assessment authorization does not match the connected wallet." }, { status: 401 });
    }

    if (!(await readAccess(ownerWallet, accessPassAddress))) {
      return NextResponse.json({ message: "Activate Guardian Lens access with the one-time 20 GEN payment before scanning." }, { status: 402 });
    }

    // Retries must resume an on-chain case instead of attempting to create it again.
    const existingCase = await readCase(caseId, registryAddress);
    if (existingCase && String(existingCase.owner_wallet || "").toLowerCase() !== ownerWallet) {
      return NextResponse.json({ message: "This assessment case belongs to a different wallet." }, { status: 409 });
    }
    if (existingCase) {
      const existingVerdict = await readVerdict(caseId, registryAddress);
      if (existingVerdict) {
        return NextResponse.json({ configured: true, caseId, caseStatus: existingCase.status, status: "FINALIZED", verdict: existingVerdict });
      }
      if (existingCase.status === "ASSESSING") {
        return NextResponse.json({ configured: true, caseId, caseStatus: existingCase.status, status: "PENDING" });
      }
    }

    const now = Math.floor(Date.now() / 1000);
    const sessionSeed = `${ownerWallet}:${Math.floor(now / 86400)}`;
    const sessionId = `guardian-${createHash("sha256").update(sessionSeed).digest("hex").slice(0, 48)}`;
    const authorizationHash = createHash("sha256").update(authorizationSignature).digest("hex");
    let session = await readRelaySession(sessionId, routerAddress);
    if (!session || Number(session.expires_at || 0) <= now + 120) {
      await authorizeRelaySession({
        relayerPrivateKey,
        routerAddress,
        sessionId,
        logicalUser: ownerWallet,
        allowedContracts: [registryAddress],
        expiresAt: now + 86400,
        authorizationHash
      });
      session = await readRelaySession(sessionId, routerAddress);
    }
    if (!session) throw new Error("Relay session was not readable after authorization.");

    const intentExpiry = Math.min(Number(session.expires_at), now + 3600);
    let caseHash = "";
    if (!existingCase) {
      const createNonce = Number(session.last_nonce || 0) + 1;
      const createPayloadHash = createHash("sha256").update(JSON.stringify({ caseId, ownerWallet, manifest })).digest("hex");
      await consumeRelayIntent({
        relayerPrivateKey,
        routerAddress,
        sessionId,
        logicalUser: ownerWallet,
        targetContract: registryAddress,
        methodName: "create_case",
        nonce: createNonce,
        expiresAt: intentExpiry,
        payloadHash: createPayloadHash
      });
      caseHash = await relayCreateCase({ relayerPrivateKey, registryAddress, caseId, ownerWallet, manifest });
      session = await readRelaySession(sessionId, routerAddress);
      if (!session) throw new Error("Relay session was not readable after case creation.");
    }
    const assessmentNonce = Number(session.last_nonce || 0) + 1;
    const assessmentPayloadHash = createHash("sha256").update(JSON.stringify({ caseId, method: "request_assessment" })).digest("hex");
    await consumeRelayIntent({
      relayerPrivateKey,
      routerAddress,
      sessionId,
      logicalUser: ownerWallet,
      targetContract: registryAddress,
      methodName: "request_assessment",
      nonce: assessmentNonce,
      expiresAt: intentExpiry,
      payloadHash: assessmentPayloadHash
    });
    const assessmentHash = await relayRequestAssessment({ relayerPrivateKey, registryAddress, caseId });
    return NextResponse.json({ configured: true, hash: assessmentHash, createHash: caseHash || undefined, sessionId, caseId, status: "PENDING" });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Relayed assessment failed." }, { status: 400 });
  }
}
