"""SPEC section 18: the Word Pass as a W3C Verifiable Credential 2.0, the same results as verify/test/credential.test.js."""
import base64
import copy
import hashlib
import json
import pathlib
import sys
import unittest

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

sys.path.insert(0, str(pathlib.Path(__file__).parent.parent / "src"))
from pazair_verify import (  # noqa: E402
    base58btc_decode, base58btc_encode, canonical, did_web_url, multikey_of, multikey_to_x, sha256hex, verify_credential, verify_data_integrity,
)

ROOT = pathlib.Path(__file__).parent.parent.parent
C = json.loads((ROOT / "vectors" / "credential-1.json").read_text())
V = json.loads((ROOT / "vectors" / "word-pass-1.json").read_text())
AT = 1791936000.0  # 2026-10-14T00:00:00Z, in seconds


def unb64u(s):
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def sign(doc, seed, vm, created):
    """eddsa-jcs-2022, Create Proof: the proof carries the document's @context; Ed25519 over the two hashes."""
    proof = {"@context": doc["@context"], "type": "DataIntegrityProof", "cryptosuite": "eddsa-jcs-2022", "created": created, "verificationMethod": vm, "proofPurpose": "assertionMethod"}
    data = hashlib.sha256(canonical(proof).encode()).digest() + hashlib.sha256(canonical(doc).encode()).digest()
    proof["proofValue"] = "z" + base58btc_encode(Ed25519PrivateKey.from_private_bytes(seed).sign(data))
    return dict(doc, proof=proof)


def given(**k):
    return verify_credential(k.pop("vc", C["credential"]), did_document=C["did_document"], keys_document=C["keys_document"], now=AT, **k)


class Credential(unittest.TestCase):
    def test_the_w3c_recommendations_own_vector(self):
        pub = "z6MkrJVnaZkeFzdQyMZu1cgjg7k1pZZ6pvBQ7XJPt4swbTQ2"
        secret = base58btc_decode("3u2en7t5LR2WtQH5PfFqMqwVHBeXouLzo6haApm8XHqvjxq")
        self.assertEqual((secret[0], secret[1], len(secret)), (0x80, 0x26, 34))
        cred = {
            "@context": ["https://www.w3.org/ns/credentials/v2", "https://www.w3.org/ns/credentials/examples/v2"],
            "id": "urn:uuid:58172aac-d8ba-11ed-83dd-0b3aef56cc33", "type": ["VerifiableCredential", "AlumniCredential"], "name": "Alumni Credential",
            "description": "A minimum viable example of an Alumni Credential.", "issuer": "https://vc.example/issuers/5678", "validFrom": "2023-01-01T00:00:00Z",
            "credentialSubject": {"id": "did:example:abcdefgh", "alumniOf": "The School of Examples"},
        }
        self.assertEqual(sha256hex(canonical(cred)), "59b7cb6251b8991add1ce0bc83107e3db9dbbab5bd2c28f687db1a03abc92f19")
        vm = f"did:key:{pub}#{pub}"
        signed = sign(cred, secret[2:], vm, "2023-02-24T23:36:38Z")
        config = {k: v for k, v in signed["proof"].items() if k != "proofValue"}
        self.assertEqual(sha256hex(canonical(config)), "66ab154f5c2890a140cb8388a22a160454f80575f6eae09e5a097cabe539a1db")
        self.assertEqual(signed["proof"]["proofValue"], "z2HnFSSPPBzR36zdDgK8PbEHeXbR56YF24jwMpt3R1eHXQzJDMWS93FCzpvJpwTWd3GAVFuUfjoJdcnTMuVor51aX")
        dd = {"id": f"did:key:{pub}", "verificationMethod": [{"id": vm, "type": "Multikey", "controller": f"did:key:{pub}", "publicKeyMultibase": pub}], "assertionMethod": [vm]}
        self.assertTrue(verify_data_integrity(signed, dd)["valid"])

    def test_the_vector_base58_multikey_did_web_steps_proof_and_pass(self):
        for b in C["base58btc"]:
            self.assertEqual(base58btc_encode(bytes.fromhex(b["hex"])), b["base58btc"])
            self.assertEqual(base58btc_decode(b["base58btc"]), bytes.fromhex(b["hex"]))
        self.assertEqual(multikey_of(V["key"]["x"]), C["key"]["multikey"])
        self.assertEqual(multikey_to_x(C["key"]["multikey"]), V["key"]["x"])
        for d in C["did_web"]:
            self.assertEqual(did_web_url(d["did"]), d["url"])
        proof = C["credential"]["proof"]
        doc = {k: v for k, v in C["credential"].items() if k != "proof"}
        config = {k: v for k, v in proof.items() if k != "proofValue"}
        self.assertEqual(sha256hex(canonical(config)), C["steps"]["proof_config_canonical_sha256"])
        self.assertEqual(sha256hex(canonical(doc)), C["steps"]["document_canonical_sha256"])
        self.assertEqual(sign(doc, unb64u(V["key"]["d_test_only"]), proof["verificationMethod"], proof["created"])["proof"]["proofValue"], proof["proofValue"])
        r = given()
        self.assertTrue(r["valid"], r["say"])
        self.assertEqual(r["trust"], "valid")
        self.assertTrue(r["same_key"])
        self.assertTrue(r["pass"]["in_root"])
        self.assertEqual(r["subject"], "https://issuer.example/v1/agents/ag_alpha/pass")
        self.assertIn("proof eddsa-jcs-2022 valid, pass signature valid, in the Merkle root of 2026-10-05.", r["say"])
        self.assertEqual(given(vc=C["forged"]["credential"])["valid"], C["forged"]["valid"])

    def test_resolving_did_web_from_the_same_origin(self):
        seen = []

        def fetch(url):
            seen.append(url)
            if url == "https://issuer.example/.well-known/did.json":
                return C["did_document"]
            if url == "https://issuer.example/.well-known/pazair-receipts.json":
                return C["keys_document"]
            raise OSError("404")

        self.assertTrue(verify_credential(C["credential"], fetch, now=AT)["valid"])
        self.assertEqual(seen, ["https://issuer.example/.well-known/did.json", "https://issuer.example/.well-known/pazair-receipts.json"])
        self.assertEqual(verify_credential(C["credential"], lambda url: dict(C["did_document"], id="did:web:evil.example"), now=AT)["trust"], "unreachable")

    def test_hostile_credentials_get_a_verdict_never_valid_never_a_crash(self):
        vc = C["credential"]

        def proof(**patch):
            return dict(copy.deepcopy(vc), proof=dict(vc["proof"], **patch))

        cases = [
            (proof(cryptosuite="eddsa-rdfc-2022"), "not an eddsa-jcs-2022"),
            (proof(proofPurpose="authentication"), "assertionMethod"),
            (proof(verificationMethod="did:web:evil.example#a1171dbbeb4c3fc2"), "not one of the DID document"),
            (proof(verificationMethod="did:web:issuer.example#other"), "no Ed25519 assertion key"),
            (proof(**{"@context": ["https://www.w3.org/ns/credentials/v2", "https://evil.example/ctx"]}), "@context"),
            (proof(proofValue="zzzz0OIl"), "base58btc"),
            (proof(proofValue="z" + base58btc_encode(bytes(64))), "signature does not match"),
            (proof(created="yesterday"), "created"),
            (dict(copy.deepcopy(vc), proof=[vc["proof"]]), "one Data Integrity proof"),
            (dict(copy.deepcopy(vc), validFrom="2020-01-01T00:00:00Z"), "signature does not match"),
            (dict(copy.deepcopy(vc), issuer="https://issuer.example"), "did:web"),
            (dict(copy.deepcopy(vc), type=["VerifiableCredential"]), "not a Word Pass credential"),
            (dict(copy.deepcopy(vc), **{"@context": ["https://www.w3.org/2018/credentials/v1"]}), "not a Verifiable Credential 2.0"),
            (None, "not a Verifiable Credential 2.0"),
        ]
        for bad, why in cases:
            r = given(vc=bad)
            self.assertFalse(r["valid"], why)
            self.assertIn(why, r["say"])
        seed = unb64u(V["key"]["d_test_only"])
        doc = {k: v for k, v in vc.items() if k != "proof"}
        vm, created = vc["proof"]["verificationMethod"], vc["proof"]["created"]
        elsewhere = copy.deepcopy(doc)
        elsewhere["credentialSubject"]["id"] = "https://evil.example/v1/agents/ag_alpha/pass"
        self.assertIn("not a pass URL on https://issuer.example", given(vc=sign(elsewhere, seed, vm, created))["say"])
        inflated = copy.deepcopy(doc)
        inflated["credentialSubject"]["wordPass"]["pass"]["as_seller"]["delivered"] = 900
        self.assertIn("the Word Pass inside does not verify (signature)", given(vc=sign(inflated, seed, vm, created))["say"])
        self.assertIn("expired", given(vc=sign(dict(doc, validUntil="2026-10-13T00:00:00Z"), seed, vm, created))["say"])
        for d in ("did:web:evil.example%2F..", "did:web:issuer.example:..:x", "did:web:", "did:key:z6Mk", "did:web:a.example%40b.example"):
            with self.assertRaises(ValueError):
                did_web_url(d)


if __name__ == "__main__":
    unittest.main()
