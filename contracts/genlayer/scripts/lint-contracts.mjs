import { readFile } from "node:fs/promises";
import path from "node:path";

const files = [
  "guardian_access_pass.py",
  "guardian_relay_router.py",
  "guardian_verdict_registry.py"
];

let failed = false;
for (const file of files) {
  const source = await readFile(path.resolve(process.cwd(), file), "utf8");
  const errors = [];
  const lines = source.split(/\r?\n/);
  if (!lines[0]?.startsWith('# { "Depends": "py-genlayer:')) errors.push("runner dependency must be pinned on line 1");
  if (!source.includes("class ") || !source.includes("gl.Contract")) errors.push("missing gl.Contract class");
  if (/\bsorted\s*\(|\blambda\b/.test(source)) errors.push("unsupported GenVM Python construct");
  if (errors.length) {
    failed = true;
    console.error(`${file}: ${errors.join(", ")}`);
  } else {
    console.log(`${file}: surface lint passed`);
  }
}

if (failed) process.exitCode = 1;
