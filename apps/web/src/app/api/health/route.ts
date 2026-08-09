import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "guardian-lens",
    network: "GenLayer Studionet",
    chainId: 61999,
    contractsConfigured: Boolean(process.env.NEXT_PUBLIC_ACCESS_PASS_ADDRESS && process.env.NEXT_PUBLIC_RELAY_ROUTER_ADDRESS && process.env.NEXT_PUBLIC_VERDICT_REGISTRY_ADDRESS),
    relayerConfigured: Boolean(process.env.RELAYER_PRIVATE_KEY)
  });
}
