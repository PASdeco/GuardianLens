import { createGuardianReadClient, readAccess } from "@guardian/genlayer";

type RpcState = typeof globalThis & {
  guardianRpcQueue?: Promise<void>;
  guardianRpcLastAt?: number;
  guardianRpcBlockedUntil?: number;
  guardianAccessCache?: Map<string, { value: boolean; expiresAt: number }>;
  guardianAccessInflight?: Map<string, Promise<boolean>>;
};

const state = globalThis as RpcState;
const accessCache = state.guardianAccessCache ??= new Map();
const accessInflight = state.guardianAccessInflight ??= new Map();

export async function withGenlayerRead<T>(operation: () => Promise<T>): Promise<T> {
  const previous = state.guardianRpcQueue || Promise.resolve();
  let release!: () => void;
  state.guardianRpcQueue = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  const blockedFor = (state.guardianRpcBlockedUntil || 0) - Date.now();
  if (blockedFor > 0) await new Promise((resolve) => setTimeout(resolve, blockedFor));
  const elapsed = Date.now() - (state.guardianRpcLastAt || 0);
  if (elapsed < 3000) await new Promise((resolve) => setTimeout(resolve, 3000 - elapsed));
  state.guardianRpcLastAt = Date.now();
  try {
    return await operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/rate limit|too many requests|\b429\b|30 requests per minute/i.test(message)) {
      state.guardianRpcBlockedUntil = Date.now() + 30_000;
    }
    throw error;
  } finally {
    release();
  }
}

export async function readAccessServer(walletAddress: string, address: string) {
  const key = `${walletAddress.toLowerCase()}:${address.toLowerCase()}`;
  const now = Date.now();
  const cached = accessCache.get(key);
  if (cached && cached.expiresAt > now) return cached.value;
  const existing = accessInflight.get(key);
  if (existing) return existing;
  const pending = withGenlayerRead(() => readAccess(walletAddress, address));
  accessInflight.set(key, pending);
  const value = await pending.finally(() => accessInflight.delete(key));
  accessCache.set(key, { value, expiresAt: now + 30_000 });
  if (accessCache.size > 500) {
    for (const [entryKey, entry] of accessCache) if (entry.expiresAt <= now) accessCache.delete(entryKey);
  }
  return value;
}

export async function readTransactionServer(hash: string) {
  const client = createGuardianReadClient();
  return withGenlayerRead(() => client.getTransaction({
    hash: hash as Parameters<typeof client.getTransaction>[0]["hash"]
  }));
}
