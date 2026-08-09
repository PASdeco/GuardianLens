import { existsSync } from "node:fs";
import path from "node:path";

const rootEnvPath = path.resolve(import.meta.dirname, "../.env.local");
if (existsSync(rootEnvPath)) process.loadEnvFile(rootEnvPath);

const appUrl = (process.env.GUARDIAN_APP_URL || "http://localhost:3000").replace(/\/$/, "");
const secret = process.env.CRON_SECRET;
if (!secret) throw new Error("CRON_SECRET is required.");

const response = await fetch(`${appUrl}/api/cron/recalls`, {
  method: "POST",
  headers: { authorization: `Bearer ${secret}` }
});
const payload = await response.json();
console.log(JSON.stringify(payload, null, 2));
if (!response.ok) process.exitCode = 1;
