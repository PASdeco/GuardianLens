# Guardian Lens

Scanner-first health-commerce safety verification powered by GenLayer validator consensus.

Guardian Lens helps consumers inspect medicines, supplements, and health-commerce products before purchase or use. Evidence is prepared privately in the browser, public sources are retrieved independently by GenLayer validators, and the final bounded assessment is stored on GenLayer Studionet.

| Surface | Value |
| --- | --- |
| Network | GenLayer Studionet |
| Chain ID | `61999` |
| Currency | `GEN` testnet token |
| RPC | [studio.genlayer.com/api](https://studio.genlayer.com/api) |
| Explorer | [explorer-studio.genlayer.com](https://explorer-studio.genlayer.com/) |
| Access | One-time `20 GEN` testnet entitlement |
| Frontend | Next.js PWA |
| Status | Testnet MVP |

## Why Guardian Lens exists

Health-product decisions often depend on scattered evidence: a label, a product page, a barcode, a seller, a recall notice, and the claims made in an advertisement. Guardian Lens brings those inputs into one consumer-facing flow without turning the browser or backend into the final judge.

The application deliberately separates deterministic security and payment rules from non-deterministic evidence interpretation:

- deterministic contracts enforce payment, entitlements, ownership, permissions, nonces, expiries, replay protection, and valid state transitions;
- GenLayer validators independently retrieve and interpret public evidence;
- consensus compares bounded safety classifications, not identical explanatory prose;
- missing, conflicting, malformed, or unreachable evidence safely produces `UNDETERMINED`.

Guardian Lens is an evidence and verification tool. It is not a medical diagnosis service and does not replace a qualified professional, official recall notice, or product instructions.

## Live Studionet deployment

These addresses are the current testnet deployment used by the application.

| Contract | Address | Deployment transaction |
| --- | --- | --- |
| GuardianAccessPass | [`0xdaeb9439...eE0F3d`](https://explorer-studio.genlayer.com/address/0xdaeb94393b21c2A3D62EbD3132Ecb2D362eE0F3d) | [`0xbf01e2...02ddbf`](https://explorer-studio.genlayer.com/tx/0xbf01e2bb29a747e8a267414e93bb5615dfcf8eb43440c60195f66d624e02ddbf) |
| GuardianRelayRouter | [`0x0A123de5...b88cf`](https://explorer-studio.genlayer.com/address/0x0A123de5fc7c4C8290c990129770b8b9cEaB88cf) | [`0x2abfba...af1d5`](https://explorer-studio.genlayer.com/tx/0x2abfba2582591c322682bd0d06ac5caab5bd6ef5acdcb5200c5aab0aa61af1d) |
| GuardianVerdictRegistry | [`0xc113a796...4d6e9`](https://explorer-studio.genlayer.com/address/0xc113a796aC8Bd86de8875F3e37b9Ac182244d6e9) | [`0x0412ef...84b6f`](https://explorer-studio.genlayer.com/tx/0x0412ef90b459eb6d0b894d8dbc5b29531140f388cae7f9b9aab579e723884b6f) |

The deployment manifest is stored at [`contracts/genlayer/deployment.studionet.json`](contracts/genlayer/deployment.studionet.json). Testnet state may be redeployed or reset as the GenLayer network evolves.

## How it works

```text
Scan: link, photo, video, or barcode
             |
             v
Browser evidence preparation
OCR · hashes · metadata · user correction
             |
             v
Privacy-safe evidence manifest
             |
             v
Relayer + deterministic contracts
access · ownership · nonce · allowlist · replay protection
             |
             v
GuardianVerdictRegistry
leader fetches and reasons over public sources
             |
             v
Independent validator review
bounded field agreement through GenLayer consensus
             |
             v
Accepted / Finalized / Undetermined report
```

The frontend may show an informational openFDA preview, but that preview never becomes the authoritative verdict. The authoritative assessment is the structured result accepted and stored by `GuardianVerdictRegistry`.

## Assessment model

Every completed assessment uses bounded fields instead of an unexplained numerical score:

```json
{
  "risk_level": "LOW_CONCERN | USE_CAUTION | HIGH_RISK | CRITICAL_ALERT | UNDETERMINED",
  "recall_status": "NONE_FOUND | POSSIBLE_MATCH | CONFIRMED | UNKNOWN",
  "authority_status": "VERIFIED | UNVERIFIED | MISLEADING | NOT_APPLICABLE | UNKNOWN",
  "claims_status": "SUPPORTED | PARTIALLY_SUPPORTED | UNSUPPORTED | PROHIBITED | UNKNOWN",
  "sponsorship_status": "DISCLOSED | UNDISCLOSED_SIGNALS | NONE_FOUND | UNKNOWN",
  "seller_status": "VERIFIED | LIMITED_INFORMATION | HIGH_RISK | UNKNOWN",
  "recommended_action_code": "PROCEED | VERIFY_FIRST | AVOID | STOP_USE | SEEK_PROFESSIONAL_HELP",
  "source_ids": ["FDA-ENFORCEMENT", "PRODUCT-1"],
  "policy_version": "GL-POLICY-1",
  "summary": "...",
  "reasoning": "...",
  "uncertainties": ["..."]
}
```

`CONFIRMED` recalls must map to `CRITICAL_ALERT` and `STOP_USE`. Validators may phrase summaries differently, but critical bounded classifications must agree. If they cannot, the safe outcome is `UNDETERMINED`.

## Product experience

The PWA includes:

- `Scan`: link, photo, video, and barcode evidence intake;
- browser-side OCR and SHA-256 evidence hashing;
- evidence review before submission;
- `History`: local scan history and transaction lifecycle;
- `Watchlist`: products available for scheduled recall checks;
- `Profile`: Privy or injected-wallet sign-in, one-time access activation, and light/dark appearance;
- consumer reports showing findings, source IDs, uncertainties, policy version, and GenLayer status;
- challenge and appeal contract surfaces, with original verdict preservation at the contract layer.

The lifecycle distinguishes `Accepted` from `Finalized`: acceptance means consensus output is available; finalization means the transaction has reached Studionet's terminal state.

## Repository layout

```text
apps/web/                 Next.js PWA, API routes, scanner, reports, relayer endpoints
contracts/genlayer/       Access pass, relay router, and verdict registry contracts
packages/shared/          Zod schemas, statuses, risk and evidence types
packages/genlayer/        GenLayerJS clients and transaction helpers
packages/evidence/        Browser-side OCR, media preparation, and hashing
packages/database/        PostgreSQL/Supabase schema helpers
packages/ui/              Shared UI package
supabase/migrations/      Optional PostgreSQL schema and RLS policies
scripts/                  Studionet smoke test, deployment, and recall utilities
docs/                     Architecture, consensus, threat model, and deployment notes
```

## Run locally

Requirements: Node.js 22+, npm, a browser wallet or Privy configuration, and optional Studionet test GEN for live transactions.

```powershell
cd C:\Vibecode\Guardian
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app can render its local scanner and demonstration records without hosted credentials. Live payment and validator assessment require the deployed contract addresses, a wallet on Studionet, and a funded relayer.

Never commit `.env.local`, `DEPLOYER_PRIVATE_KEY`, `RELAYER_PRIVATE_KEY`, or Supabase service-role credentials.

## Environment configuration

Copy [`.env.example`](.env.example) to `.env.local` and fill only the values relevant to your environment.

| Variable group | Purpose |
| --- | --- |
| `NEXT_PUBLIC_*` | Browser-safe app, Privy, RPC, and deployed contract configuration |
| `GENLAYER_RPC_URL` | Server-side Studionet RPC endpoint |
| `DEPLOYER_PRIVATE_KEY` | Contract deployment only; never expose to the browser |
| `RELAYER_PRIVATE_KEY` / `RELAYER_ADDRESS` | Sponsored deterministic contract interactions |
| `SUPABASE_*` | Optional PostgreSQL/private-storage integration |
| `CRON_SECRET` | Authenticates scheduled recall checks |

## Deploy contracts to Studionet

Fund a deployer and a separate relayer with faucet-provided test GEN, then set the deployment and relayer variables in `.env.local`.

```powershell
npm run contract:lint
npm run contract:test
npm --workspace @guardian/contracts run deploy
```

The deployment script validates contract schemas, rejects GenVM execution failures, verifies deployed schemas, writes the deployment manifest, and updates the public contract addresses only after successful deployment.

## Verify the project

```powershell
npm run typecheck
npm run test
npm run contract:lint
npm run contract:test
npm run build
```

Run the live smoke test only when the wallet and deployed addresses are configured:

```powershell
npm run smoke:studionet
```

## Free-tier operating model

Guardian Lens is designed for a zero-cost testnet MVP:

- Next.js on a free hosting tier;
- Supabase Free for optional PostgreSQL and private storage;
- Privy free developer access or a browser wallet;
- faucet-funded Studionet test GEN;
- browser-side OCR and media processing;
- public openFDA and manufacturer/seller sources;
- PostgreSQL-backed quotas and jobs instead of paid workflow infrastructure;
- no paid AI API in the active assessment path.

Free quotas limit throughput and upload size. They do not replace genuine GenLayer validator reasoning with a mocked verdict.

## Security and privacy

- Uploaded media, purchase history, medical information, and full transcripts are not sent on-chain.
- Web pages, submitted claims, OCR text, and seller content are untrusted evidence.
- Relay sessions are wallet-bound and restricted by contract, method, nonce, expiry, and replay protection.
- Public reports expose approved fields and source references rather than private evidence.
- Public-source failures and validator disagreement fail safely to `UNDETERMINED`.
- This testnet MVP does not provide medical advice, diagnosis, treatment, or a guarantee that a product is safe.

See [`docs/threat-model.md`](docs/threat-model.md) for the detailed threat boundaries.

## Documentation

- [`docs/architecture.md`](docs/architecture.md) - system components and data flow
- [`docs/consensus-boundary.md`](docs/consensus-boundary.md) - deterministic versus non-deterministic responsibilities
- [`docs/threat-model.md`](docs/threat-model.md) - privacy, prompt injection, relay, and quota risks
- [`docs/deployment.md`](docs/deployment.md) - local, Studionet, hosted, and scheduled-job setup

## Current scope

This repository is the Guardian Lens testnet MVP. Browser extensions, native mobile clients, enterprise workflows, insurance, compensation, and production medical or regulatory guarantees are outside the current scope.
