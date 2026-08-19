import type { NextConfig } from "next";
import { existsSync } from "node:fs";
import path from "node:path";

const rootEnvPath = path.resolve(import.meta.dirname, "../../.env.local");
if (existsSync(rootEnvPath)) process.loadEnvFile(rootEnvPath);

const nextConfig: NextConfig = {
  distDir: "../../.next",
  allowedDevOrigins: ["127.0.0.1"],
  transpilePackages: ["@guardian/shared", "@guardian/evidence", "@guardian/database", "@guardian/genlayer", "@guardian/ui"],
  experimental: {
    optimizePackageImports: ["lucide-react"]
  }
};

export default nextConfig;
