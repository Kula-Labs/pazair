import hashlib
import json
import os
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).parent.parent / "src"))
from pazair_verify import FINGERPRINT, fingerprint_distance, fingerprint_of, fingerprint_svg, record_of, ridges_of, rs_encode  # noqa: E402

V = json.loads((pathlib.Path(__file__).parent.parent.parent / "vectors" / "word-pass-1.json").read_text())
F = V["fingerprint"]


class Fingerprint(unittest.TestCase):
    def test_vector(self):
        a = fingerprint_of(F["origin"], F["agent"], F["first_leaf"])
        self.assertEqual(a, {"seed": F["seed"], "codeword": F["codeword"]})
        b = fingerprint_of(F["origin"], F["other"]["agent"], F["other"]["first_leaf"])
        self.assertEqual(fingerprint_distance(a, b), F["other"]["distance"])
        svg = fingerprint_svg(a, F["record"])
        self.assertEqual(hashlib.sha256(svg.encode("utf-8")).hexdigest(), F["svg_sha256"])
        self.assertEqual(svg.count("<path "), ridges_of(F["record"]["delivered"]) + F["record"]["disputes_lost"])
        self.assertEqual(fingerprint_of(F["origin"] + "/", F["agent"], F["first_leaf"]), a)

    def test_theorem(self):
        self.assertEqual((FINGERPRINT["n"], FINGERPRINT["k"], FINGERPRINT["d"]), (64, 10, 55))
        low = 64
        for t in range(2000):
            m = bytearray(os.urandom(32))
            m2 = bytearray(m)
            m2[t % 10] ^= 1 << (t % 8)
            x, y = rs_encode(bytes(m)), rs_encode(bytes(m2))
            low = min(low, sum(1 for i in range(64) if x[i] != y[i]))
        self.assertGreaterEqual(low, 55)
        self.assertEqual(fingerprint_distance(F["codeword"], F["codeword"]), 0)
        with self.assertRaises(TypeError):
            fingerprint_distance("ab", F["codeword"])

    def test_record(self):
        self.assertEqual((ridges_of(0), ridges_of(3), ridges_of(1000)), (5, 6, 26))
        self.assertEqual(record_of(V["passes"][0]), {"delivered": 12, "buyers": 6, "badge": "word_kept_99", "disputes_lost": 0})
        young = fingerprint_svg(F["codeword"], {"delivered": 0, "buyers": 0, "badge": None, "disputes_lost": 0})
        old = fingerprint_svg(F["codeword"], {"delivered": 60, "buyers": 9, "badge": "word_kept_95", "disputes_lost": 2})
        self.assertEqual((young.count("<path "), old.count("<path ")), (5, 27))
        self.assertIn('<mask id="scars">', old)
        self.assertNotIn("<mask", young)
        with self.assertRaises(TypeError):
            fingerprint_of("", "ag_x", "ab")


if __name__ == "__main__":
    unittest.main()
