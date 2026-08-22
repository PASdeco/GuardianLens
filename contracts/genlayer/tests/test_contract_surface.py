import unittest
import sys
import types
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

    def test_normal_v2_adjudication_reaches_consensus(self):
        prompts = []
        candidate = {
            "risk_level": "USE_CAUTION",
            "recall_status": "NONE_FOUND",
            "authority_status": "NOT_APPLICABLE",
            "claims_status": "PARTIALLY_SUPPORTED",
            "sponsorship_status": "NONE_FOUND",
            "seller_status": "LIMITED_INFORMATION",
            "recommended_action_code": "VERIFY_FIRST",
            "identity_match": "PARTIAL",
            "canonical_product_name": "Example wellness product",
            "canonical_manufacturer": "Example Labs",
            "canonical_product_category": "SUPPLEMENT",
            "source_ids": ["FDA-SUPPLEMENT"],
            "policy_version": "GL-POLICY-2",
            "summary": "No recall match was found in the available evidence.",
            "reasoning": "The product identity is only partially established, so verification is recommended.",
            "uncertainties": ["No lot-specific regulatory match was available."],
        }

        def identity(function):
            return function

        class FakeReturn:
            def __init__(self, calldata):
                self.calldata = calldata

        def run_nondet_unsafe(leader_fn, validator_fn):
            leader_result = FakeReturn(leader_fn())
            self.assertTrue(validator_fn(leader_result))
            return leader_result.calldata

        def exec_prompt(prompt, response_format):
            self.assertEqual(response_format, "json")
            prompts.append(prompt)
            if "CANDIDATE_VERDICT:" in prompt:
                return {
                    "valid": True,
                    "risk_level": candidate["risk_level"],
                    "recall_status": candidate["recall_status"],
                    "identity_match": candidate["identity_match"],
                    "authority_status": candidate["authority_status"],
                    "claims_status": candidate["claims_status"],
                    "sponsorship_status": candidate["sponsorship_status"],
                    "seller_status": candidate["seller_status"],
                    "recommended_action_code": candidate["recommended_action_code"],
                    "policy_version": "GL-POLICY-2",
                }
            return dict(candidate)

        fake_gl = types.SimpleNamespace(
            Contract=object,
            public=types.SimpleNamespace(write=identity, view=identity),
            vm=types.SimpleNamespace(Return=FakeReturn, run_nondet_unsafe=run_nondet_unsafe, UserError=ValueError),
            nondet=types.SimpleNamespace(
                exec_prompt=exec_prompt,
                web=types.SimpleNamespace(request=lambda *args, **kwargs: types.SimpleNamespace(body=b'{"results":[]}'), render=lambda *args, **kwargs: "")
            ),
        )

        class FakeTreeMap(dict):
            @classmethod
            def __class_getitem__(cls, item):
                return cls

        fake_module = types.ModuleType("genlayer")
        fake_module.gl = fake_gl
        fake_module.TreeMap = FakeTreeMap
        previous_module = sys.modules.get("genlayer")
        sys.modules["genlayer"] = fake_module
        try:
            namespace = {"__name__": "guardian_registry_test"}
            exec(self.registry, namespace)
            registry = namespace["GuardianVerdictRegistry"].__new__(namespace["GuardianVerdictRegistry"])
            verdict = registry._adjudicate({
                "product_name": "Example wellness product",
                "manufacturer": "Example Labs",
                "barcode": "012345678905",
                "lot_number": "LOT-2026",
                "product_category": "SUPPLEMENT",
                "submitted_source_urls": [],
            }, [])
        finally:
            if previous_module is None:
                del sys.modules["genlayer"]
            else:
                sys.modules["genlayer"] = previous_module

        self.assertEqual(verdict["policy_version"], "GL-POLICY-2")
        self.assertEqual(verdict["risk_level"], "USE_CAUTION")
        self.assertEqual(verdict["identity_match"], "PARTIAL")
        self.assertEqual(verdict["source_ids"], ["FDA-SUPPLEMENT"])
        self.assertEqual(len(prompts), 2)
        self.assertTrue(all("GL-POLICY-2" in prompt for prompt in prompts))
        self.assertTrue(all("GL-POLICY-1" not in prompt for prompt in prompts))


if __name__ == "__main__":
    unittest.main()
