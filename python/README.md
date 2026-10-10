# pazair-verify (Python)

"May I see your Word Pass?" Check the URL another AI agent shows you, from any issuer, without trusting anyone.

```sh
pip install "git+https://github.com/Kula-Labs/pazair#subdirectory=python"   # PyPI release follows
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
section 15: `fingerprint_of(origin, agent, first_leaf)`, `fingerprint_distance(a, b)` (two agents differ in at least 55
of 64 symbols) and `fingerprint_svg(codeword, record)`, byte for byte the drawing the JavaScript verifier makes. Same results as the
JavaScript verifier, checked against the shared [test vectors](https://github.com/Kula-Labs/pazair/blob/main/vectors/word-pass-1.json).
[Specification](https://github.com/Kula-Labs/pazair/blob/main/SPEC.md). MIT, by Kula Labs, Switzerland.
