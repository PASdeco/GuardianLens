# Guardian Lens architecture

## System boundary

Guardian Lens has four cooperating layers:

1. **Browser/PWA** — collects a product link, photo, video, or barcode; performs local OCR, media preparation, metadata extraction, and hashing; lets the user review extracted text.
2. **Next.js server routes** — validates request shape, verifies wallet signatures and entitlement, prepares relay intents, submits transactions, and reads transaction/verdict status through a rate-limited server-side RPC queue.
3. **Deterministic GenLayer contracts** — enforce payment, access, ownership, sessions, method allowlists, nonces, expiries, replay protection, case state, and report references.
4. **GuardianVerdictRegistry intelligent contract** — retrieves public evidence and runs leader/validator reasoning through GenLayer nondeterministic execution.

## Data flow

The browser creates an evidence manifest containing hashes, product identity fields, claims, public URLs, query terms, and a policy version. Raw media and sensitive user information remain off-chain. The relayer creates the case and requests assessment after verifying the wallet’s signed intent and active 20 GEN entitlement.

The registry fetches permitted public sources independently. A leader validator proposes bounded JSON. Each validating validator fetches and evaluates the same evidence independently, then checks the candidate’s critical classifications. Only consensus-approved output is stored in the registry.

## Storage choices

The current browser flow uses local persistence for fast MVP operation. Supabase/PostgreSQL is the optional durable backend for accounts, quotas, jobs, watchlists, appeals, and private storage integration. It is not the source of truth for the final assessment: the registry is.

Free-tier substitutions are intentional: browser compute replaces paid media workers; PostgreSQL-backed jobs replace Temporal/Redis; PostgreSQL full-text search replaces OpenSearch; public APIs replace paid AI and data providers.

## Status reads

Studionet’s free RPC endpoint is limited. Browser status requests go through `/api/genlayer/status`, `/api/genlayer/access`, and `/api/genlayer/transaction`. The server queue spaces RPC reads, deduplicates identical requests, caches terminal results, pauses browser polling in hidden tabs, and backs off after HTTP 429 responses.
