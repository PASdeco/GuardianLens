# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
from datetime import datetime, timezone
import json


ALLOWED_METHODS = (
    "create_case",
    "add_evidence",
    "request_assessment",
    "open_challenge",
    "submit_appeal_evidence",
    "request_appeal_assessment",
    "publish_report_reference",
)


class GuardianRelayRouter(gl.Contract):
    owner: str
    relayer: str
    access_pass: str
    sessions: TreeMap[str, str]
    consumed_intents: TreeMap[str, str]

    def __init__(self, relayer_address: str, access_pass_address: str):
        self.owner = self._wallet(gl.message.sender_address.as_hex)
        self.relayer = self._wallet(relayer_address)
        self.access_pass = self._wallet(access_pass_address)

    def _wallet(self, value):
        wallet = str(value).strip().lower()
        if len(wallet) != 42 or not wallet.startswith("0x"):
            raise gl.vm.UserError("[EXPECTED] A wallet address is required.")
        return wallet

    def _caller(self):
        return self._wallet(gl.message.sender_address.as_hex)

    def _now(self):
        return int(datetime.now(timezone.utc).timestamp())

    def _require_operator(self):
        caller = self._caller()
        if caller != self.owner and caller != self.relayer:
            raise gl.vm.UserError("[EXPECTED] Guardian Lens operator only.")

    @gl.public.write
    def set_relayer(self, relayer_address: str) -> None:
        if self._caller() != self.owner:
            raise gl.vm.UserError("[EXPECTED] Contract owner only.")
        self.relayer = self._wallet(relayer_address)

    @gl.public.write
    def authorize_session(
        self,
        session_id: str,
        logical_user: str,
        allowed_contracts_json: str,
        expires_at: int,
        authorization_hash: str,
    ) -> dict:
        self._require_operator()
        key = str(session_id).strip()[:96]
        if len(key) == 0 or key in self.sessions:
            raise gl.vm.UserError("[EXPECTED] A new session id is required.")
        if int(expires_at) <= self._now():
            raise gl.vm.UserError("[EXPECTED] Session expiry must be in the future.")
        allowed_contracts_input = json.loads(str(allowed_contracts_json))
        if not isinstance(allowed_contracts_input, list) or len(allowed_contracts_input) == 0 or len(allowed_contracts_input) > 4:
            raise gl.vm.UserError("[EXPECTED] One to four allowed contracts are required.")
        logical_wallet = self._wallet(logical_user)
        access_pass = gl.get_contract_at(Address(self.access_pass))
        if access_pass.view().has_access(logical_wallet) is not True:
            raise gl.vm.UserError("[EXPECTED] Guardian Lens access is required before a relay session can be authorized.")
        allowed_contracts = [self._wallet(address) for address in allowed_contracts_input]
        record = {
            "session_id": key,
            "logical_user": logical_wallet,
            "allowed_contracts": allowed_contracts,
            "allowed_methods": list(ALLOWED_METHODS),
            "authorization_hash": str(authorization_hash).strip()[:128],
            "last_nonce": 0,
            "created_at": self._now(),
            "expires_at": int(expires_at),
            "revoked_at": 0,
        }
        self.sessions[key] = json.dumps(record, separators=(",", ":"))
        return record

    @gl.public.write
    def consume_intent(
        self,
        session_id: str,
        logical_user: str,
        target_contract: str,
        method_name: str,
        nonce: int,
        expires_at: int,
        payload_hash: str,
    ) -> dict:
        if self._caller() != self.relayer:
            raise gl.vm.UserError("[EXPECTED] Configured relayer only.")
        key = str(session_id).strip()[:96]
        if key not in self.sessions:
            raise gl.vm.UserError("[EXPECTED] Relay session does not exist.")
        session = json.loads(self.sessions[key])
        now = self._now()
        if session.get("revoked_at", 0) != 0 or int(session.get("expires_at", 0)) <= now:
            raise gl.vm.UserError("[EXPECTED] Relay session is inactive.")
        if self._wallet(logical_user) != session.get("logical_user"):
            raise gl.vm.UserError("[EXPECTED] Logical user does not match the session.")
        target = self._wallet(target_contract)
        if target not in session.get("allowed_contracts", []):
            raise gl.vm.UserError("[EXPECTED] Target contract is not allowed.")
        method = str(method_name).strip()
        if method not in ALLOWED_METHODS:
            raise gl.vm.UserError("[EXPECTED] Contract method is not allowed.")
        if int(expires_at) <= now or int(expires_at) > int(session.get("expires_at", 0)):
            raise gl.vm.UserError("[EXPECTED] Intent has expired.")
        expected_nonce = int(session.get("last_nonce", 0)) + 1
        if int(nonce) != expected_nonce:
            raise gl.vm.UserError("[EXPECTED] Intent nonce is invalid.")
        intent_key = key + ":" + str(nonce)
        if intent_key in self.consumed_intents:
            raise gl.vm.UserError("[EXPECTED] Intent has already been consumed.")

        session["last_nonce"] = expected_nonce
        self.sessions[key] = json.dumps(session, separators=(",", ":"))
        receipt = {
            "session_id": key,
            "logical_user": session["logical_user"],
            "target_contract": target,
            "method": method,
            "nonce": expected_nonce,
            "payload_hash": str(payload_hash).strip()[:128],
            "consumed_at": now,
        }
        self.consumed_intents[intent_key] = json.dumps(receipt, separators=(",", ":"))
        return receipt

    @gl.public.write
    def revoke_session(self, session_id: str) -> None:
        key = str(session_id).strip()[:96]
        if key not in self.sessions:
            raise gl.vm.UserError("[EXPECTED] Relay session does not exist.")
        session = json.loads(self.sessions[key])
        caller = self._caller()
        if caller != session.get("logical_user") and caller != self.owner and caller != self.relayer:
            raise gl.vm.UserError("[EXPECTED] Session owner or operator only.")
        session["revoked_at"] = self._now()
        self.sessions[key] = json.dumps(session, separators=(",", ":"))

    @gl.public.view
    def get_session(self, session_id: str) -> dict:
        key = str(session_id).strip()[:96]
        if key not in self.sessions:
            return {}
        return json.loads(self.sessions[key])
