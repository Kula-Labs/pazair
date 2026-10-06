import base64
import json
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).parent.parent / "src"))
from pazair_verify import canonical, check_word_pass, leaf_of, say_pass, sha256hex, verify_holder_proof, verify_pass, verify_proof, verify_receipt, verify_signature  # noqa: E402

V = json.loads((pathlib.Path(__file__).parent.parent.parent / "vectors" / "word-pass-1.json").read_text())
KEYS = [V["key"]]


def web(memo=V["stellar_memo"]["memo_base64"], p=V["passes"][0], source="GANCHOR"):
    doc = {"current": p, "anchored": {"pass": p, "leaf": V["leaves"][0], "proof": V["tree"]["proofs"][0], "root": {"day": "2026-10-05", "root": V["tree"]["root"], "bitcoin_ots": "AA==", "stellar_tx": "ab" * 32}}}

    def fetch(url):
        if "horizon.stellar.org" in url:
            return {"successful": True, "memo_type": "hash", "memo": memo, "source_account": source}
        if url.endswith("/.well-known/pazair-receipts.json"):
            return {"keys": KEYS, "anchors": {"stellar": {"account": "GANCHOR", "network": "mainnet"}}}
        if url.endswith("/v1/agents/ag_alpha/pass"):
            return doc
        raise OSError("404")
    return fetch


class Vectors(unittest.TestCase):
    def test_published_vectors(self):
        self.assertEqual(canonical(V["canonical"]["input"]), V["canonical"]["output"])
        for p in V["passes"]:
            self.assertTrue(verify_signature(p, KEYS))
        self.assertEqual([leaf_of(p) for p in V["passes"]], V["leaves"])
        for i, leaf in enumerate(V["leaves"]):
            self.assertTrue(verify_proof(leaf, V["tree"]["proofs"][i], V["tree"]["root"]))
        self.assertTrue(verify_receipt(V["receipt"]["object"], KEYS, V["receipt"]["delivery"])["valid"])
        self.assertEqual(sha256hex(V["receipt"]["delivery"]), V["receipt"]["object"]["delivery_sha256"])
        self.assertEqual(say_pass(V["passes"][0]), V["say"])
        self.assertEqual(canonical({"a": 1.0, "b": 0.99, "c": 99.1}), '{"a":1,"b":0.99,"c":99.1}')

    def test_check_word_pass(self):
        url = "https://issuer.example/v1/agents/ag_alpha/pass"
        ok = check_word_pass(url, web())
        self.assertEqual(ok["trust"], "kept_its_word")
        self.assertEqual(ok["checks"], {"signature": True, "in_root": True, "day": "2026-10-05", "stellar": True, "stellar_account_bound": True, "bitcoin_ots": True, "holder": None})
        self.assertIn("found on Stellar from the issuer's anchor account, stamped in Bitcoin. To be sure it is theirs", ok["say"])
        self.assertEqual(check_word_pass(url, web(source="GOTHER"))["trust"], "invalid")
        self.assertEqual(check_word_pass(url, web(base64.b64encode(b"x" * 32).decode()))["trust"], "invalid")
        forged = dict(V["passes"][0], as_seller=dict(V["passes"][0]["as_seller"], delivered=900))
        self.assertEqual(check_word_pass(url, web(p=forged))["trust"], "invalid")
        self.assertEqual(check_word_pass("http://issuer.example/x", web())["trust"], "unreachable")
        self.assertEqual(check_word_pass("https://issuer.example/nothing", web())["trust"], "unreachable")


    def test_holder_proof_and_revocation(self):
        from datetime import datetime
        h = V["holder_proof"]
        ts = lambda x: datetime.fromisoformat(x.replace("Z", "+00:00")).timestamp()  # noqa: E731
        self.assertEqual(verify_holder_proof(h["object"], KEYS, "ag_alpha", h["object"]["nonce"], ts(h["valid_at"])), {"ok": True, "reason": "ok"})
        self.assertFalse(verify_holder_proof(h["object"], KEYS, "ag_alpha", h["object"]["nonce"], ts(h["expired_at"]))["ok"])
        self.assertFalse(verify_holder_proof(h["object"], KEYS, "ag_beta", h["object"]["nonce"], ts(h["valid_at"]))["ok"])
        anchored = {"pass": V["passes"][0], "proof": V["tree"]["proofs"][0], "root": {"day": "2026-10-05", "root": V["tree"]["root"]}}
        self.assertTrue(verify_pass(anchored, [dict(V["key"], revoked_at="2026-10-06T00:00:00Z")])["valid"])
        self.assertFalse(verify_pass(anchored, [dict(V["key"], revoked_at="2026-10-05T12:00:00Z")])["valid"])
        self.assertFalse(verify_pass(V["passes"][0], [dict(V["key"], revoked_at="2026-10-06T00:00:00Z")])["valid"])


if __name__ == "__main__":
    unittest.main()
