import base64
import pathlib
import sys
import unittest

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

sys.path.insert(0, str(pathlib.Path(__file__).parent.parent / "src"))
from pazair_verify import canonical, receipt_hash, sha256hex, verify_award  # noqa: E402


def b64u(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode().rstrip("=")


SK = Ed25519PrivateKey.generate()
X = b64u(SK.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw))
KID = sha256hex(X)[:16]
KEYS = [{"kid": KID, "kty": "OKP", "crv": "Ed25519", "x": X}]
BASE = {"v": 1, "issuer": "pazair", "kid": KID}


def sign(body: dict) -> dict:
    body = {**BASE, **body}
    return {**body, "sig": b64u(SK.sign(canonical(body).encode()))}


TENDER = sign({"kind": "tender", "id": "td_1", "buyer": "ag_b", "task_sha256": sha256hex("translate"), "currency": "chf", "budget_max_minor": 20000,
               "deadline": "2026-10-20T00:00:00Z", "milestones": [{"name": "draft", "max_minor": 8000}], "mandate": None, "issued_at": "2026-10-09T10:00:00Z"})
QA = sign({"kind": "tender_qa", "tender": receipt_hash(TENDER), "asked_by": "ag_s", "q_sha256": "q", "a_sha256": "a", "at": "2026-10-09T11:00:00Z"})
AWARD = sign({"kind": "award", "tender": receipt_hash(TENDER), "seller": "ag_s", "price_minor": 15000, "qa": [receipt_hash(QA)], "at": "2026-10-09T12:00:00Z"})


def receipt(**extra) -> dict:
    return sign({"order": "or_1", "listing": None, "seller": "ag_s", "buyer": "ag_b", "amount_minor": 7000, "currency": "chf",
                 "delivered_at": "2026-10-10T10:00:00Z", "delivery_sha256": "x", "award": receipt_hash(AWARD), "milestone": 0, **extra})


class AwardTest(unittest.TestCase):
    def test_holds(self):
        r = verify_award(receipt(), TENDER, AWARD, KEYS, [QA])
        self.assertTrue(r["valid"], r["reasons"])
        self.assertIn("amount within milestone 0", r["covers"])

    def test_caught(self):
        self.assertIn("amount 9000 over 8000", verify_award(receipt(amount_minor=9000), TENDER, AWARD, KEYS)["reasons"])
        self.assertIn("delivered after the deadline", verify_award(receipt(delivered_at="2026-10-21T00:00:00Z"), TENDER, AWARD, KEYS)["reasons"])
        self.assertIn("tender signature", verify_award(receipt(), {**TENDER, "budget_max_minor": 99999}, AWARD, KEYS)["reasons"])
        self.assertTrue(any(x.endswith("missing or invalid") for x in verify_award(receipt(), TENDER, AWARD, KEYS, [])["reasons"]))


if __name__ == "__main__":
    unittest.main()
