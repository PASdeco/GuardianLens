# Deployment guide

## Local development

```powershell
cd C:\Vibecode\Guardian
npm install
Copy-Item .env.example .env.local
npm run dev
```

If port 3000 is already in use, stop the existing Next.js process or run the web workspace on another port. Do not copy private keys into any `NEXT_PUBLIC_*` variable.

## Studionet contracts

Use a faucet-funded deployer and a separate faucet-funded relayer. Set `DEPLOYER_PRIVATE_KEY`, `RELAYER_ADDRESS`, `RELAYER_PRIVATE_KEY`, and `GENLAYER_RPC_URL` in `.env.local`.

```powershell
npm run contract:lint
npm run contract:test
npm --workspace @guardian/contracts run deploy:v2
```

`deploy:v2` deploys a new `GuardianVerdictRegistry` without replacing the existing access pass or relay router. It validates the schema, waits for acceptance, rejects GenVM failures, verifies the deployed schema, writes `contracts/genlayer/deployment.studionet.v2.json`, and updates `NEXT_PUBLIC_VERDICT_REGISTRY_ADDRESS` only after success. V1 is retained as a historical record.

## Web hosting

Deploy the repository as a Next.js application on a free hosting tier. The current production deployment is [guardianlen.vercel.app](https://guardianlen.vercel.app/). Configure the variables from `.env.example` in the host’s server and browser environments. Keep `DEPLOYER_PRIVATE_KEY`, `RELAYER_PRIVATE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` server-only.

The browser needs the `NEXT_PUBLIC_PRIVY_*`, `NEXT_PUBLIC_GENLAYER_RPC_URL`, and deployed contract address variables. The server needs `GENLAYER_RPC_URL`, relayer credentials, and any Supabase/cron values used by the selected deployment. On a registry upgrade, update `NEXT_PUBLIC_VERDICT_REGISTRY_ADDRESS` in the host before redeploying; the relay creates registry-specific sessions so an old allowlist cannot be reused.

## Supabase (optional durable backend)

Create a free Supabase project and apply `supabase/migrations/0001_guardian_lens.sql`. Use the anon key for browser-safe operations and the service-role key only in server code. The MVP can fall back to local browser persistence when Supabase is not configured.

## Scheduled recall checks

The GitHub Actions workflow in `.github/workflows/recall-check.yml` calls the deployed `/api/cron/recalls` route. Configure repository secrets:

```text
GUARDIAN_APP_URL=https://your-deployed-app.example
CRON_SECRET=<long random secret>
```

The workflow is free-tier friendly and should remain disabled or manually triggered until the hosted route and secret are configured.

## Verification checklist

```powershell
npm run typecheck
npm run test
npm run contract:lint
npm run contract:test
npm run build
npm run smoke:studionet
```

For a new deployment, verify one-time payment, entitlement activation, relay authorization, case creation, genuine nondeterministic assessment, status transitions, report redaction, and appeal preservation.
