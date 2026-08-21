# Consensus boundary

## Deterministic responsibilities

Deterministic code owns all actions where ambiguity would be unsafe:

- exact 20 GEN payment and duplicate-entitlement prevention;
- wallet ownership and case ownership;
- relay operator authorization and contract/method allowlists;
- session expiry, revocation, sequential nonces, and replay prevention;
- evidence manifest canonical hashing, product-category validation, evidence versions, and verdict invalidation after evidence changes;
- valid assessment, challenge, appeal, and report-reference state transitions;
- preservation of original verdicts in appeal history.

## Nondeterministic responsibilities

GenLayer validators own interpretation of live evidence:

- product identity and recall matching using product name, manufacturer, barcode, lot, and product category;
- authority and professional-credential signals;
- health claims and prohibited claims;
- sponsorship disclosure signals;
- seller risk and public product evidence;
- recommended consumer action;
- challenge and appeal reassessment.

## Agreement rules

Validators must agree on:

```text
risk_level
recall_status
recommended_action_code
identity_match
authority_status
claims_status
sponsorship_status
seller_status
policy_version
```

Summary and reasoning prose may vary. A valid JSON shape alone is not enough: source IDs must be present in independently fetched evidence; source URLs, query terms, content hashes, and retrieval time are persisted with the verdict; confirmed recalls must produce `CRITICAL_ALERT` and `STOP_USE`; and malformed or conflicting results become `UNDETERMINED`. Changing a manifest or adding evidence supersedes the active verdict and requires reassessment against a new immutable snapshot.

## Prompt-injection boundary

Submitted text and fetched pages are data, never instructions. Validator prompts explicitly ignore instructions found inside evidence, require traceable source IDs, prohibit invented medical or regulatory facts, and require uncertainty when evidence is missing.
