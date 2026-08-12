import { NextRequest, NextResponse } from "next/server";
import { readAccessServer } from "@/lib/genlayer-rpc";

export async function GET(request: NextRequest) {
  const wallet = String(request.nextUrl.searchParams.get("wallet") || "").trim();
  const address = String(request.nextUrl.searchParams.get("address") || "").trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet) || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ message: "A valid wallet and access contract are required." }, { status: 400 });
  }
  try {
    const active = await readAccessServer(wallet, address);
    return NextResponse.json({ active }, { headers: { "Cache-Control": "private, max-age=15" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Studionet access status could not be read.";
    const rateLimited = /rate limit|too many requests|\b429\b|30 requests per minute/i.test(message);
    return NextResponse.json({ message, active: false }, { status: rateLimited ? 429 : 503, headers: rateLimited ? { "Retry-After": "30" } : undefined });
  }
}
