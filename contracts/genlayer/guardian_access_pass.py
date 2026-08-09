# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
from datetime import datetime, timezone
import json


ACCESS_PRICE_WEI = 20 * (10 ** 18)


class GuardianAccessPass(gl.Contract):
    owner: str
    entitlements: TreeMap[str, str]
    entitlement_count: u64

    def __init__(self):
        self.owner = self._wallet(gl.message.sender_address.as_hex)
        self.entitlement_count = u64(0)

    def _wallet(self, value):
        wallet = str(value).strip().lower()
        if len(wallet) != 42 or not wallet.startswith("0x"):
            raise gl.vm.UserError("[EXPECTED] A wallet address is required.")
        return wallet

    def _now(self):
        return int(datetime.now(timezone.utc).timestamp())

    @gl.public.write.payable
    def pay_for_access(self) -> dict:
        wallet = self._wallet(gl.message.sender_address.as_hex)
        if wallet in self.entitlements:
            raise gl.vm.UserError("[EXPECTED] This wallet already has Guardian Lens access.")
        if gl.message.value != u256(ACCESS_PRICE_WEI):
            raise gl.vm.UserError("[EXPECTED] Send exactly 20 GEN for testnet access.")

        record = {
            "wallet": wallet,
            "active": True,
            "amount_wei": str(ACCESS_PRICE_WEI),
            "created_at": self._now(),
        }
        self.entitlements[wallet] = json.dumps(record, separators=(",", ":"))
        self.entitlement_count = u64(int(self.entitlement_count) + 1)
        return record

    @gl.public.view
    def has_access(self, wallet_address: str) -> bool:
        wallet = self._wallet(wallet_address)
        if wallet not in self.entitlements:
            return False
        record = json.loads(self.entitlements[wallet])
        return record.get("active") is True

    @gl.public.view
    def get_entitlement(self, wallet_address: str) -> dict:
        wallet = self._wallet(wallet_address)
        if wallet not in self.entitlements:
            return {}
        return json.loads(self.entitlements[wallet])

    @gl.public.view
    def get_access_price_wei(self) -> str:
        return str(ACCESS_PRICE_WEI)
