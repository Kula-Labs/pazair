"""Section 3.2, other currencies: counted only with the rates the mandate itself was signed with, while they are valid.
The same rule as verify/src/index.js and the issuer's own check; the same numbers."""
import pathlib
import sys
import unittest
from unittest import mock

sys.path.insert(0, str(pathlib.Path(__file__).parent.parent / "src"))
import pazair_verify as pv  # noqa: E402

FX = {"margin_bps": 500, "as_of": "2026-10-23", "source": "ECB reference rates", "valid_days": 60, "per_chf": {"chf": 1, "usd": 1.2131, "eur": 1.0838}}
AT = "2026-10-24T10:00:00Z"


class MandateFx(unittest.TestCase):
    def test_counting_rule_matches_the_javascript_verifier_and_the_issuer(self):
        self.assertEqual(pv.count_under_mandate(FX, 500, "usd", "usd", AT), 500)
        self.assertEqual(pv.count_under_mandate(FX, 500, "chf", "usd", AT), 637)
        self.assertEqual(pv.count_under_mandate(FX, 600, "chf", "usd", AT), 765)

    def test_refuses_what_it_cannot_count(self):
        self.assertIsNone(pv.count_under_mandate(None, 500, "chf", "usd", AT))
        self.assertIsNone(pv.count_under_mandate(FX, 500, "cad", "usd", AT))
        self.assertIsNone(pv.count_under_mandate(FX, 500, "chf", "usd", "2026-12-24T00:00:00Z"))
        self.assertIsNotNone(pv.count_under_mandate(FX, 500, "chf", "usd", "2026-12-23T00:00:00Z"))
        self.assertIsNone(pv.count_under_mandate({**FX, "margin_bps": -1}, 500, "chf", "usd", AT))
        self.assertIsNone(pv.count_under_mandate(FX, 5.5, "chf", "usd", AT))
        self.assertIsNone(pv.count_under_mandate(FX, True, "chf", "usd", AT))
        self.assertIsNone(pv.count_under_mandate({**FX, "per_chf": {"chf": 1, "usd": 0}}, 500, "chf", "usd", AT))
        self.assertIsNone(pv.count_under_mandate(FX, 500, "chf", "usd", "not a date"))

    def verdict(self, receipt_over=None, fx=FX, cap=700):
        mandate = {"kind": "mandate", "agent": "ag_b", "issued_at": "2026-10-23T10:00:00.000Z", "scope": {"currency": "usd", "max_order_minor": cap, "monthly_minor": 5000, **({"fx": fx} if fx else {})}}
        receipt = {"mandate": "h", "buyer": "ag_b", "amount_minor": 500, "currency": "chf", "delivered_at": "2026-10-24T09:00:00.000Z", **(receipt_over or {})}
        with mock.patch.object(pv, "verify_signature", return_value=True), mock.patch.object(pv, "receipt_hash", return_value="h"):
            return pv.verify_mandate(receipt, mandate, [])

    def test_a_chf_receipt_within_a_usd_mandate_holds_and_the_ways_around_are_caught(self):
        good = self.verdict()
        self.assertTrue(good["valid"], good["reasons"])
        self.assertIn("currency counted with the mandate's rates", good["covers"])
        over = self.verdict({"amount_minor": 600})
        self.assertFalse(over["valid"]); self.assertIn("counts as 765 usd, over the cap 700", " ".join(over["reasons"]))
        self.assertIn("older than their validity", " ".join(self.verdict({"delivered_at": "2027-01-10T09:00:00.000Z"})["reasons"]))
        self.assertIn("carries no rates", " ".join(self.verdict(fx=None)["reasons"]))
        self.assertTrue(self.verdict({"currency": "usd", "amount_minor": 700})["valid"], "a mandate in its own currency is unchanged")


if __name__ == "__main__":
    unittest.main()
