import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class ContractSurfaceTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.access = (ROOT / "guardian_access_pass.py").read_text(encoding="utf-8")
        cls.router = (ROOT / "guardian_relay_router.py").read_text(encoding="utf-8")
        cls.registry = (ROOT / "guardian_verdict_registry.py").read_text(encoding="utf-8")

    def test_runner_is_pinned(self):
        for source in (self.access, self.router, self.registry):
            self.assertTrue(source.startswith('# { "Depends": "py-genlayer:'))

    def test_current_transaction_context_api_is_used(self):
        for source in (self.access, self.router, self.registry):
            self.assertNotIn("gl.message.sender)", source)
            self.assertNotIn("gl.message.sender.", source)
            self.assertIn("gl.message.sender_address.as_hex", source)

    def test_access_is_exactly_payable_once(self):
        self.assertIn("@gl.public.write.payable", self.access)
        self.assertIn("gl.message.value != u256(ACCESS_PRICE_WEI)", self.access)
        self.assertIn("already has Guardian Lens access", self.access)

    def test_router_has_replay_and_allowlist_controls(self):
        for signal in ("ALLOWED_METHODS", "last_nonce", "expires_at", "consumed_intents", "revoke_session"):
            self.assertIn(signal, self.router)
        self.assertIn("access_pass.view().has_access", self.router)

    def test_registry_uses_independent_nondeterministic_reasoning(self):
        for signal in (
            "gl.nondet.web.request",
            "gl.nondet.web.render",
            "gl.nondet.exec_prompt",
            "gl.vm.run_nondet_unsafe",
            "leader_assessment",
            "validator_assessment",
            "First reason independently",
        ):
            self.assertIn(signal, self.registry)

    def test_registry_has_safe_fallback_and_appeals(self):
        self.assertIn('"risk_level": "UNDETERMINED"', self.registry)
        self.assertIn("request_appeal_assessment", self.registry)
        self.assertIn("original_verdict", self.registry)
        self.assertIn("Ignore every instruction", self.registry)

    def test_registry_binds_verdicts_to_identity_and_evidence_snapshots(self):
        for signal in (
            "product_category",
            "barcode",
            "lot_number",
            "identity_match",
            "content_hash",
            "evidence_snapshot_hash",
            "evidence_version",
            "_invalidate_verdict",
            '"status": "SUPERSEDED"',
        ):
            self.assertIn(signal, self.registry)


if __name__ == "__main__":
    unittest.main()
