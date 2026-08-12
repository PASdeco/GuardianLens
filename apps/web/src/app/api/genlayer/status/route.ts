import { NextRequest, NextResponse } from "next/server";
import { readAssessmentTransaction, readVerdict } from "@guardian/genlayer";
import { withGenlayerRead } from "@/lib/genlayer-rpc";
import type { Assessment, AssessmentStatus } from "@guardian/shared";

type StatusPayload = {
  caseId: string;
  hash: string;
  status: AssessmentStatus;
  transactionStatus: string;
  verdict: Assessment | null;
  retryAfterMs: number;
  cached?: boolean;
  rateLimited?: boolean;
};

type CacheEntry = { value: StatusPayload; expiresAt: number; staleUntil: number };

const globalCache = globalThis as typeof globalThis & {
  guardianStatusCache?: Map<string, CacheEntry>;
  guardianStatusInflight?: Map<string, Promise<StatusPayload>>;
};
const statusCache = globalCache.guardianStatusCache ??= new Map<string, CacheEntry>();
const inflight = globalCache.guardianStatusInflight ??= new Map<string, Promise<StatusPayload>>();

function isRateLimitError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /rate limit|too many requests|\b429\b|30 requests per minute/i.test(message);
}

function mapStatus(transactionStatus: string, executionResult: string, verdict: Assessment | null): AssessmentStatus {
  if (executionResult === "FINISHED_WITH_ERROR") return "FAILED";
  if (verdict?.risk_level === "UNDETERMINED") return "UNDETERMINED";
  if (transactionStatus === "FINALIZED" && verdict) return "FINALIZED";
  if (verdict) return "ACCEPTED";
  if (["PENDING", "PROPOSING", "COMMITTING", "ACCEPTED", "UNDER_APPEAL"].includes(transactionStatus)) {
    return transactionStatus as AssessmentStatus;
  }
  return "PENDING";
}

async function loadStatus(caseId: string, hash: string, registryAddress: string): Promise<StatusPayload> {
  const transaction = await withGenlayerRead(() => readAssessmentTransaction(hash));
  const transactionStatus = transaction?.statusName || "PENDING";
  const shouldReadVerdict = transactionStatus === "ACCEPTED" || transactionStatus === "FINALIZED";
  const verdict = shouldReadVerdict ? await withGenlayerRead(() => readVerdict(caseId, registryAddress)) : null;
  const status = mapStatus(transactionStatus, transaction?.executionResultName || "", verdict);
  const retryAfterMs = status === "FINALIZED" || status === "UNDETERMINED" || status === "FAILED" ? 300_000 : 15_000;
  return { caseId, hash, status, transactionStatus, verdict, retryAfterMs };
}

export async function GET(request: NextRequest) {
  const caseId = String(request.nextUrl.searchParams.get("caseId") || "").trim().slice(0, 96);
  const hash = String(request.nextUrl.searchParams.get("hash") || "").trim().toLowerCase();
  const registryAddress = process.env.NEXT_PUBLIC_VERDICT_REGISTRY_ADDRESS || "";
  if (!caseId || !/^0x[a-f0-9]{64}$/.test(hash) || !registryAddress) {
    return NextResponse.json({ message: "A valid case, transaction hash, and registry configuration are required." }, { status: 400 });
  }

  const key = `${caseId}:${hash}`;
  const now = Date.now();
  if (statusCache.size > 500) {
    for (const [entryKey, entry] of statusCache) {
      if (entry.staleUntil <= now) statusCache.delete(entryKey);
    }
  }
  const cached = statusCache.get(key);
  if (cached && cached.expiresAt > now) {
    return NextResponse.json({ ...cached.value, cached: true }, {
      headers: { "Cache-Control": "private, max-age=10, stale-if-error=60" }
    });
  }

  try {
    let pending = inflight.get(key);
    if (!pending) {
      pending = loadStatus(caseId, hash, registryAddress);
      inflight.set(key, pending);
    }
    const value = await pending;
    const terminal = ["FINALIZED", "UNDETERMINED", "FAILED"].includes(value.status);
    const ttl = terminal ? 300_000 : 15_000;
    statusCache.set(key, { value, expiresAt: now + ttl, staleUntil: now + Math.max(ttl, 120_000) });
    return NextResponse.json(value, {
      headers: { "Cache-Control": terminal ? "private, max-age=300" : "private, max-age=10, stale-if-error=60" }
    });
  } catch (error) {
    if (cached && cached.staleUntil > now) {
      return NextResponse.json({ ...cached.value, cached: true, rateLimited: isRateLimitError(error), retryAfterMs: 60_000 });
    }
    if (isRateLimitError(error)) {
      return NextResponse.json({ message: "Studionet is rate limited. Status checks have been slowed automatically.", retryAfterMs: 60_000 }, {
        status: 429,
        headers: { "Retry-After": "60" }
      });
    }
    return NextResponse.json({ message: error instanceof Error ? error.message : "GenLayer status could not be read.", retryAfterMs: 30_000 }, { status: 503 });
  } finally {
    inflight.delete(key);
  }
}
