export async function readAccessClient(walletAddress: string, address: string) {
  if (!walletAddress || !address) return false;
  const response = await fetch(`/api/genlayer/access?wallet=${encodeURIComponent(walletAddress)}&address=${encodeURIComponent(address)}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Studionet access status is temporarily unavailable.");
  const body = await response.json() as { active?: boolean };
  return Boolean(body.active);
}

export async function readPaymentTransactionClient(hash: string) {
  const response = await fetch(`/api/genlayer/transaction?hash=${encodeURIComponent(hash)}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Studionet transaction status is temporarily unavailable.");
  return response.json() as Promise<{ statusName: string; executionResultName: string; accepted: boolean; failed: boolean }>;
}
