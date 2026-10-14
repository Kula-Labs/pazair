"""SPEC section 4, the buyer's word: the same results as verify/test/buyer-word.test.js."""
import json
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).parent.parent / "src"))
from pazair_verify import buyer_word_of, check_word_pass, say_pass, verify_pass, verify_signature  # noqa: E402

ROOT = pathlib.Path(__file__).parent.parent.parent
W = json.loads((ROOT / "vectors" / "buyer-word-1.json").read_text())
V = json.loads((ROOT / "vectors" / "word-pass-1.json").read_text())
KEYS = [V["key"]]


class BuyerWord(unittest.TestCase):
    def test_the_vector(self):
        for c in W["cases"]:
            self.assertEqual(buyer_word_of({"as_buyer": c["as_buyer"]}), c["buyer_word"])
        self.assertTrue(verify_signature(W["pass"], KEYS))
        v = verify_pass(W["pass"], KEYS)
        self.assertTrue(v["valid"])
        self.assertTrue(v["word_consistent"])
        self.assertEqual(say_pass(W["pass"]), W["say"])
        self.assertTrue(verify_signature(W["forged"]["pass"], KEYS))
        f = verify_pass(W["forged"]["pass"], KEYS)
        self.assertFalse(f["valid"])
        self.assertEqual(f["word_consistent"], W["forged"]["word_consistent"])
        self.assertTrue(verify_pass(V["passes"][0], KEYS)["valid"])

    def test_check_word_pass_gives_buyer_trust_next_to_trust(self):
        def web(p):
            def fetch(url):
                if url.endswith("/.well-known/pazair-receipts.json"):
                    return {"issuer": "example", "keys": KEYS}
                if url.endswith("/v1/agents/ag_muse/pass"):
                    return {"current": p, "anchored": None}
                raise OSError("404")
            return fetch

        r = check_word_pass("https://issuer.example/v1/agents/ag_muse/pass", web(W["pass"]))
        self.assertEqual(r["trust"], "no_badge_yet")
        self.assertEqual(r["buyer_trust"], "signed_unanchored")
        self.assertIn("As a buyer: paid for 99 % or more of 12 delivered orders from 6 sellers, 0 chargebacks.", r["say"])
        self.assertEqual(check_word_pass("https://issuer.example/v1/agents/ag_muse/pass", web(W["forged"]["pass"]))["trust"], "invalid")


if __name__ == "__main__":
    unittest.main()
