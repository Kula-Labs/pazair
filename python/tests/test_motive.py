"""Section 20, the why: the shared vector vectors/motive-1.json gives the same results as the JavaScript verifier."""
import json
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).parent.parent / "src"))
from pazair_verify import verify_goal_end, verify_motive  # noqa: E402

ROOT = pathlib.Path(__file__).parent.parent.parent
W = json.loads((ROOT / "vectors" / "motive-1.json").read_text())
KEYS = [json.loads((ROOT / "vectors" / "word-pass-1.json").read_text())["key"]]


class MotiveTest(unittest.TestCase):
    def test_the_receipt_names_the_motive_and_the_goal_is_the_principals(self):
        r = verify_motive(W["receipt"], W["motive"], KEYS, goal=W["goal"])
        self.assertEqual(r, {"valid": True, "covers": ["motive signed", "receipt signed", "receipt names this motive", "motive for this order", "stated by the buyer", "motive for this listing", "stated before the delivery", "the goal is this text"], "reasons": []})
        self.assertEqual(verify_motive(W["receipt"], W["motive"], KEYS, goal="another task")["reasons"], ["the goal is another text"])

    def test_a_motive_stated_after_the_delivery_fails(self):
        r = verify_motive(W["receipt"], W["stated_late"], KEYS)
        self.assertFalse(r["valid"])
        self.assertIn("stated after the delivery", r["reasons"])
        self.assertIn("receipt names another motive", r["reasons"])

    def test_the_goal_end_names_both_and_nothing_after_it(self):
        both = verify_goal_end(W["goal_end"], [W["motive"], W["second"]], KEYS)
        self.assertTrue(both["valid"]); self.assertEqual(both["named"], 2); self.assertEqual(both["missing"], [])
        after = verify_goal_end(W["goal_end"], [W["motive"], W["after_end"]], KEYS)
        self.assertFalse(after["valid"])
        self.assertIn("motive or_three stated after the end", after["reasons"])
        self.assertIn("motive or_three not named by the end", after["reasons"])
        self.assertEqual(len(after["missing"]), 1)
        self.assertFalse(verify_goal_end({**W["goal_end"], "outcome": "abandoned"}, [], KEYS)["valid"], "an end cannot be rewritten")

    def test_hostile_input_never_throws(self):
        for bad in [None, [], "x", {"kind": "motive"}]:
            self.assertFalse(verify_motive(bad, bad, KEYS)["valid"])
            self.assertFalse(verify_goal_end(bad, [bad], KEYS)["valid"])


if __name__ == "__main__":
    unittest.main()
