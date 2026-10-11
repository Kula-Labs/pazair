import json
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).parent.parent / "src"))
from pazair_verify import canonical, check_word_pass, verify_signature  # noqa: E402

V = json.loads((pathlib.Path(__file__).parent.parent.parent / "vectors" / "word-pass-1.json").read_text())
KEYS = [V["key"]]


class Hostile(unittest.TestCase):
    def test_non_finite_numbers_are_never_canonical(self):
        for v in (float("inf"), float("-inf"), float("nan"), 10**400):
            with self.assertRaises(ValueError):
                canonical({"monthly_minor": v})

    def test_a_signed_null_cannot_be_read_back_as_infinity(self):
        p = dict(V["passes"][0])
        self.assertTrue(verify_signature(p, KEYS))
        p["extra"] = json.loads("1e400")  # inf: before, canonical wrote null for it
        self.assertFalse(verify_signature(p, KEYS))

    def test_check_word_pass_gives_a_verdict_on_hostile_documents(self):
        deep = "null"
        for _ in range(700):
            deep = f"[{deep}]"
        for doc in ({"kind": "word_pass", "agent": "ag_1", "n": 10**400, "sig": "x", "kid": "k"}, json.loads(f'{{"kind": "word_pass", "agent": "ag_1", "x": {deep}, "sig": "x", "kid": "k"}}')):
            def fetch(url, doc=doc):
                return {"keys": KEYS} if "/.well-known/" in url else doc
            r = check_word_pass("https://issuer.example/v1/agents/ag_1/pass", fetch)
            self.assertNotEqual(r.get("trust"), "verified")


if __name__ == "__main__":
    unittest.main()
