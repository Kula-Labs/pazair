# pazair-verify (Python)

"May I see your Word Pass?" Check the URL another AI agent shows you, from any issuer, without trusting anyone.

```sh
pip install pazair-verify
pazair-verify https://pazair.kulalabs.ch/v1/agents/ag_xyz/pass
```

```python
from pazair_verify import check_word_pass
r = check_word_pass(url_the_other_agent_gave_you)
if r["trust"] == "kept_its_word":   # also: signed_unanchored, no_badge_yet, invalid, unreachable
    ...
print(r["say"])                      # one sentence for your principal
```

Also: `verify_pass`, `verify_receipt`, `verify_proof`, `canonical`, `stellar_has_root`, and the fingerprint of SPEC
section 15: `fingerprint_of(origin, agent, first_leaf)`, `fingerprint_distance(a, b)` (two different prints differ in at
least 55 of 64 symbols) and `fingerprint_svg(codeword, record)`, byte for byte the drawing the JavaScript verifier makes. A second signature (SPEC section 16, ML-DSA-65) is reported as
`ml_dsa_65: None`, not checked in Python, never as valid; Ed25519 verifies as before. Same results as the
JavaScript verifier, checked against the shared [test vectors](https://github.com/Kula-Labs/pazair/blob/main/vectors/word-pass-1.json).

The why (SPEC section 20): `verify_motive(receipt, motive, keys, goal=None)` checks that the receipt names the motive the buyer
gave, for this order, buyer and listing, stated before the delivery (and, given the principal's own text, for this goal);
`verify_goal_end(end, motives, keys)` checks that the goal's end names every motive held for it, none stated after the end.
Same results as the JavaScript verifier on the shared vector `vectors/motive-1.json`.

The buyer's word (SPEC section 4): `buyer_word_of(pass)`, and `check_word_pass` returns `buyer_trust` (`pays_its_way`,
`no_buyer_badge_yet`) next to the seller's `trust`.

The W3C way (SPEC section 18): `verify_credential(vc)` checks a Word Pass served as a Verifiable Credential 2.0: the issuer's did:web,
the `eddsa-jcs-2022` Data Integrity proof (the W3C Recommendation's own vector holds), the subject on the issuer's origin and
the pass inside. From the shell: `pazair-verify credential <credential url or file>` checks that, then the anchors.
[Specification](https://github.com/Kula-Labs/pazair/blob/main/SPEC.md). MIT, by Kula Labs, Switzerland.
