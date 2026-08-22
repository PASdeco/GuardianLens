# Guardian Lens threat model

## Untrusted inputs

Product pages, seller pages, URL parameters, OCR text, barcode-associated metadata, uploaded media, and user-entered claims are untrusted. They can be incomplete, misleading, stale, malicious, or written to inject instructions into a model prompt.

## Controls

- Public evidence URLs must be HTTPS and are bounded by count and length.
- Evidence is canonically hashed and reviewed locally; raw uploads are not placed on-chain.
- Wallet-bound signed messages prevent a relayer request from being reassigned to another wallet.
- Relay sessions enforce logical user, target contract, allowed method, nonce, expiry, and revocation checks.
- The relayer cannot perform arbitrary transfers through the router.
- Contract schemas and manifests are validated before deployment/submission.
- Validators independently retrieve evidence and compare identity, displayed findings, and core safety classifications rather than trusting leader prose.
- Product identity is checked using barcode, lot number, manufacturer, product category, and product name; insufficient or conflicting identity is not treated as verified.
- Source IDs are checked against fetched evidence, and cited sources retain auditable authority, URL, query, retrieval-time, and content-hash provenance.
- Evidence edits supersede any active verdict and require a fresh assessment against the new evidence snapshot.
- Confirmed recalls cannot resolve to low concern.
- Retrieval failure, malformed output, contradiction, or insufficient agreement resolves safely to `UNDETERMINED`.
- Free-tier quotas fail closed with a user-facing quota message.

## Privacy boundary

Wallet identity is used for entitlement and authorization. Private uploads, purchase history, medical information, and full transcripts remain off-chain. Public reports contain approved product and verdict fields, evidence version and snapshot hash, source provenance, policy version, transaction state, and appeal history.

## Residual risks

Public sources can be stale or unavailable. A product may be confused with a similarly named item if the submitted identity evidence is weak. A validator consensus result is an evidence assessment, not a medical diagnosis or guarantee of safety. Studionet is a testnet and its availability, quotas, and state may change.
