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

    def test_proof(self):
        # Every codeword, first byte as the highest power, vanishes at α^0 … α^53: at least 55 non-zero symbols (BCH
        # bound). A one-byte change reaches exactly 55, the Singleton limit for n = 64, k = 10.
        exp, log, x = [0] * 512, [0] * 256, 1
        for i in range(255):
            exp[i], log[x] = x, i
            x <<= 1
            if x & 256:
                x ^= 0x11D
        for i in range(255, 512):
            exp[i] = exp[i - 255]
        mul = lambda a, b: exp[log[a] + log[b]] if a and b else 0  # noqa: E731
        for i in range(10):
            m = bytearray(10)
            m[i] = 1
            c = rs_encode(bytes(m))
            for t in range(54):
                s = 0
                for j in range(64):
                    s ^= mul(c[j], exp[(t * (63 - j)) % 255])
                self.assertEqual(s, 0, f"basis {i}, root α^{t}")
        one = bytearray(10)
        one[9] = 1
        self.assertEqual(fingerprint_distance(bytes(rs_encode(bytes(10))).hex(), bytes(rs_encode(bytes(one))).hex()), 55)

    def test_boundary(self):
        # Only the first 10 bytes of the seed are encoded: seeds that share them share the print (SPEC 15).
        m = bytearray(os.urandom(32))
        m2 = bytearray(m)
        m2[20] ^= 0xFF
        self.assertNotEqual(m, m2)
        self.assertEqual(fingerprint_distance(bytes(rs_encode(bytes(m))).hex(), bytes(rs_encode(bytes(m2))).hex()), 0)

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
