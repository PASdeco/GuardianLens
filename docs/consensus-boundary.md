# Consensus boundary

## Deterministic responsibilities

Deterministic code owns all actions where ambiguity would be unsafe:

- exact 20 GEN payment and duplicate-entitlement prevention;
- wallet ownership and case ownership;
- relay operator authorization and contract/method allowlists;
- session expiry, revocation, sequential nonces, and replay prevention;
- evidence manifest limits and policy-version validation;
- valid assessment, challenge, appeal, and report-reference state transitions;
- preservation of original verdicts in appeal history.

## Nondeterministic responsibilities

GenLayer validators own interpretation of live evidence:

- product identity and recall matching;
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
policy_version
```

They independently validate authority, claims, sponsorship, seller, and source IDs. Summary and reasoning prose may vary. A valid JSON shape alone is not enough: source IDs must be present in independently fetched evidence, confirmed recalls must produce `CRITICAL_ALERT` and `STOP_USE`, and malformed or conflicting results become `UNDETERMINED`.

## Prompt-injection boundary

Submitted text and fetched pages are data, never instructions. Validator prompts explicitly ignore instructions found inside evidence, require traceable source IDs, prohibit invented medical or regulatory facts, and require uncertainty when evidence is missing.
