import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const rootEnvPath = path.resolve(import.meta.dirname, "../.env.local");
if (existsSync(rootEnvPath)) process.loadEnvFile(rootEnvPath);

const child = spawn("npm", ["--workspace", "@guardian/contracts", "run", "deploy"], {
  cwd: new URL("..", import.meta.url),
  env: process.env,
  shell: true,
  stdio: "inherit"
});
child.on("exit", (code) => process.exit(code ?? 1));
