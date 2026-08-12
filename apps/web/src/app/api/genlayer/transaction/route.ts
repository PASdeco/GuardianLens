import { NextRequest, NextResponse } from "next/server";
import { readTransactionServer } from "@/lib/genlayer-rpc";

export async function GET(request: NextRequest) {
  const hash = String(request.nextUrl.searchParams.get("hash") || "").trim();
  if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) return NextResponse.json({ message: "A valid transaction hash is required." }, { status: 400 });
  try {
    const transaction = await readTransactionServer(hash);
    const statusName = String((transaction as Record<string, unknown> | null)?.statusName || (transaction as Record<string, unknown> | null)?.status || "PENDING");
    const executionResultName = String((transaction as Record<string, unknown> | null)?.txExecutionResultName || "");
    const failed = executionResultName === "FINISHED_WITH_ERROR";
    const accepted = ["ACCEPTED", "FINALIZED"].includes(statusName);
    return NextResponse.json({ statusName, executionResultName, accepted, failed }, { headers: { "Cache-Control": "private, max-age=10" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Studionet transaction status could not be read.";
    const rateLimited = /rate limit|too many requests|\b429\b|30 requests per minute/i.test(message);
    return NextResponse.json({ message }, { status: rateLimited ? 429 : 503, headers: rateLimited ? { "Retry-After": "30" } : undefined });
  }
}
