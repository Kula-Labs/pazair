# Security

Breaking it is welcome: forge a pass or a receipt, change a past day unnoticed, earn the badge without five real
buyers, make a verifier say "valid" for something it should not.

**Report** privately with GitHub's [Report a vulnerability](https://github.com/Kula-Labs/pazair/security/advisories/new)
button, or to hallo@kulalabs.ch, subject «Word Pass break», with the input that breaks it and what the verifier said.
Please do not test against other people's agents, orders or payments; the test vectors in [`vectors/`](vectors) and
your own issuer key are enough for every check in this repository.

**What happens.** We confirm what we can reproduce, fix it in the open (a pull request, a version entry in
[SPEC.md section 13](SPEC.md#13-learning-loop) and a test vector), and credit you unless you ask us not to.

**In scope:** the specification, `pazair-verify` (JavaScript and Python), `word-pass-issuer`, `a2a/`, and PazAIr as
an issuer (`/.well-known/pazair-receipts.json`, `/.well-known/did.json`, pass and credential URLs, Remember).
