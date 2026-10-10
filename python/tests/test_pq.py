import json
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).parent.parent / "src"))
from pazair_verify import verify_pass, verify_receipt, verify_signature  # noqa: E402

V = json.loads((pathlib.Path(__file__).parent.parent.parent / "vectors" / "word-pass-1.json").read_text())
P = V["pq"]
KEYS = P["keys_document"]["keys"]


class SecondSignature(unittest.TestCase):
    def test_ed25519_still_verifies_and_pq_is_reported_not_checked(self):
        self.assertTrue(verify_signature(P["pass"], KEYS))
        self.assertTrue(verify_signature(P["receipt"], KEYS))
        v = verify_pass(P["pass"], KEYS)
        self.assertEqual((v["valid"], v["pq_signed"], v["ml_dsa_65"]), (True, True, None))
        r = verify_receipt(P["receipt"], KEYS, V["receipt"]["delivery"])
        self.assertEqual((r["valid"], r["pq_signed"], r["ml_dsa_65"], r["delivery_matches"]), (True, True, None, True))
        self.assertEqual(verify_pass(V["passes"][0], KEYS)["pq_signed"], False)


if __name__ == "__main__":
    unittest.main()
