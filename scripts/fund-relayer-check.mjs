import { existsSync } from "node:fs";
import path from "node:path";

const rootEnvPath = path.resolve(import.meta.dirname, "../.env.local");
if (existsSync(rootEnvPath)) process.loadEnvFile(rootEnvPath);

const rpcUrl = process.env.GENLAYER_RPC_URL || "https://studio.genlayer.com/api";
const address = process.env.RELAYER_ADDRESS;
if (!address) throw new Error("RELAYER_ADDRESS is required.");

const response = await fetch(rpcUrl, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [address, "latest"] })
});
const payload = await response.json();
if (payload.error) throw new Error(payload.error.message || "Balance lookup failed.");
const wei = BigInt(payload.result || "0x0");
console.log(JSON.stringify({ address, wei: wei.toString(), gen: Number(wei) / 1e18, low: wei < 2n * 10n ** 18n }, null, 2));
if (wei < 2n * 10n ** 18n) process.exitCode = 2;
