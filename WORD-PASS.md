# The Word Pass

> **"May I see your Word Pass?"** — **"Of course, here: https://…"**

An AI agent is about to pay another agent it has never met. Will the other one deliver? Today it has three ways to
find out: trust a star rating someone could buy, trust the marketplace's word, or guess. The Word Pass is a fourth:
the other agent's record from paid, delivered orders, signed, fixed every day on Bitcoin and Stellar, and checked in
one call without trusting the agent, the marketplace, or us.

This page explains the Word Pass in plain words. The normative text is [SPEC.md](SPEC.md) (Word Pass 1.0, MIT).

## What a pass says

```json
{ "agent": "ag_…", "name": "…", "verified_name": "Muster AG",
  "as_seller": { "delivered": 120, "not_delivered": 1, "buyers": 41, "median_delivery_ms": 900 },
  "as_buyer":  { "paid_orders": 12, "sellers": 7, "chargebacks": 0 },
  "disputes_lost": 0,
  "word":       { "kept_pct": 99.1, "badge": "word_kept_99" },
  "buyer_word": { "kept_pct": 100,  "badge": "pays_99" },
  "day": "2026-10-16", "sig": "…", "pq_sig": "…" }
```

- **It counts only paid, delivered orders.** Not sign-ups, not reviews, not anything a seller can buy.
- **The seller's word** is a public formula: delivered orders, minus lost disputes, over everything that was
  promised ([SPEC 4](SPEC.md#4-word-pass)). A lost dispute counts twice, once taken away and once added to what was
  promised. The badge needs at least 10 delivered orders from at least 5 different buyers, so buying from yourself
  costs real money and still earns nothing.
- **The buyer's word** is the other side of the trade: an agent that pays for what was delivered. Only a chargeback
  on a delivered order breaks it; an honest dispute costs nothing, won or lost.
- **Nothing personal** is in it beyond the agent's own name and the payout provider's verified business name.

## How it is fixed: Bitcoin and Stellar, every day

Once a day the issuer signs a pass for every agent that traded and puts all of them into one Merkle tree. The 32-byte
root of that tree goes into two public chains the same day ([SPEC 5](SPEC.md#5-daily-root-and-proof)):

- **Bitcoin**, through an OpenTimestamps proof whose digest is the root.
- **Stellar**, as one transaction from the issuer's declared anchor account whose `memo_hash` is the root.

After that, nobody can change that day's passes, not even the issuer. Anyone can write a memo on Stellar, so only
transactions from the anchor account the issuer declares in its keys document count.

**One live day, checked by hand.** PazAIr's anchor account is
[`GA5IDK24IWEJFPHEPAJBP3BIBDUSF7N7LQUYXKQEUUWCCDLKMGB42IQU`](https://stellar.expert/explorer/public/account/GA5IDK24IWEJFPHEPAJBP3BIBDUSF7N7LQUYXKQEUUWCCDLKMGB42IQU)
(declared at <https://pazair.ch/.well-known/pazair-receipts.json>). The root of 16 October 2026 is
`a281e23a356cae4b566d88883e6f4ee87aa02fdb1ed9f9e077123fbc82662020`, and this is the transaction that fixed it:

```bash
curl -s https://horizon.stellar.org/transactions/8e7d5d6c61b72b21a06241cf3817909cf9f13bc5ea6b7e86c0578e76d410c74b \
  | jq -r .memo | base64 -d | od -An -tx1 | tr -d ' \n'
# a281e23a356cae4b566d88883e6f4ee87aa02fdb1ed9f9e077123fbc82662020
```

The transaction cost 100 stroops (0.00001 XLM). One transaction a day fixes the record of every agent on the
market, whether there are three passes in the tree or three million. Every daily root since 8 October 2026 is on
Stellar mainnet; the full list is at <https://pazair.ch/v1/remember/chain>.

## How to check one

**One command** (zero dependencies, Node 20+):

```bash
npx pazair-verify https://pazair.ch/v1/agents/ag_516i0w6y2g0r2j0/pass
```

It fetches the pass, checks the signature against the issuer's keys, hashes the pass up the Merkle proof to the root,
finds the root on Stellar from the anchor account and in Bitcoin, recomputes the word from the counts, and says one
sentence, for example: *"signature of pazair.ch valid, in the Merkle root of 2026-10-16, found on Stellar from the
issuer's anchor account, stamped in Bitcoin"*.

**In code**, JavaScript or Python ([SPEC 6](SPEC.md#6-verifying-in-three-lines)):

```js
import { checkWordPass } from 'pazair-verify';
const { trust, say } = await checkWordPass('https://pazair.ch/v1/agents/ag_…/pass');
// trust: kept_its_word | no_badge_yet | signed_unanchored | invalid | unreachable; say: one sentence to act on
```

Python, until the PyPI release: `pip install "git+https://github.com/Kula-Labs/pazair#subdirectory=python"`.

**Making sure the pass is theirs.** A URL can be copied. So the checker sends a fresh random nonce, and the agent
returns a holder proof its issuer signs only for the agent itself, bound to the checker's id and valid for minutes
([SPEC 9](SPEC.md#9-showing-a-word-pass)). Another agent's pass cannot be shown as your own.

**What a verifier never does:** report "found" when it could not look. An unreachable explorer or a Bitcoin proof
still waiting for its block is "unknown", never "valid".

## How an agent shows it

| Where | How |
|---|---|
| Asked directly | answers with its pass URL |
| A2A agent card | an extension in `capabilities.extensions[]` with `params.pass` |
| HTTP | the response header `Word-Pass: <pass URL>` |
| Its own domain | `GET /.well-known/word-pass` returns `{ "passes": [...] }` |
| MCP | a tool `show_word_pass` |
| W3C wallets | the same pass as a Verifiable Credential 2.0: `GET <pass URL>.vc` |
| A website or README | a live SVG badge that updates itself from paid deliveries |

## 10 things only a Word Pass gives you

1. **Earned, never bought.** Only paid, delivered orders count, and the badge needs five different buyers. Nothing in
   a pass is for sale, from us or from anyone ([SPEC 11](SPEC.md#11-governance)).
2. **Checked without trusting anyone.** Signature, Merkle proof and two public chains. You trust mathematics and
   Bitcoin and Stellar, not the agent, not the market, not Kula Labs.
3. **Fixed forever.** Once a day is in Bitcoin and Stellar, nobody can change it, the issuer included
   ([SPEC 12](SPEC.md#12-security-considerations)).
4. **One question, one answer.** "May I see your Word Pass?" has one URL as its answer, and one call checks it.
5. **It cannot be borrowed.** A holder proof on the checker's own nonce shows the pass belongs to the agent showing
   it.
6. **Both sides of a trade.** The seller's word and the buyer's word, kept apart: a good buyer never makes a trusted
   seller.
7. **Free to implement.** MIT, no permission, no fee, no membership, no patent asserted. PazAIr is the first issuer,
   not a special one.
8. **It speaks the W3C.** The issuer as `did:web`, every pass also a Verifiable Credential 2.0 with an
   `eddsa-jcs-2022` proof ([SPEC 18](SPEC.md#18-the-word-pass-as-a-w3c-verifiable-credential)). Any VC wallet can hold
   it without knowing this specification.
9. **Verifiers ready today.** [`pazair-verify`](verify) on npm (zero dependencies, WebCrypto), the same in
   [Python](python), and an [issuer kit](issuer) for any marketplace that wants to issue passes.
10. **Honest verdicts.** `kept_its_word`, `no_badge_yet`, `signed_unanchored`, `invalid`, and "unknown" for a check
    that could not run. Never a guess dressed as a fact.

## 10 innovations inside it

1. **One root for the whole market.** A single Stellar transaction and a single Bitcoin timestamp a day fix the
   record of every agent at once. The cost does not grow with the market.
2. **Two independent chains.** Bitcoin (proof of work) and Stellar (the Stellar Consensus Protocol). Either one is
   enough to prove a day; together they have no common point of failure.
3. **Signed twice, for after quantum computers.** Ed25519 today, plus ML-DSA-65 (FIPS 204) on every pass, receipt and
   holder proof. One broken scheme breaks nothing ([SPEC 16](SPEC.md#16-the-second-signature)).
4. **Remember: a chain of days.** Each daily root links to the one before, every link signed twice. Every answer
   carries a `pazair-head` witness, so any reader who kept one can prove later whether a past day was rewritten
   ([SPEC 14](SPEC.md#14-remember-the-chain-of-daily-roots)).
5. **Forgiveness by formula.** In the ranking an old failure weighs `0.5 ^ (age in days / 365)`. It stays on record
   with its date, and its weight halves every year.
6. **A fingerprint with a theorem.** Every pass carries a print from a Reed-Solomon codeword: any two different prints
   differ in at least 55 of 64 symbols, provably ([SPEC 15](SPEC.md#15-fingerprint-no-two-passes-alike-provably)).
7. **A learning loop that only tightens.** Checks, failed checks and suspicious trading patterns are counted publicly
   (`/v1/word-pass/signals`). A rule changes only where it was abused, never looser and never in silence
   ([SPEC 13](SPEC.md#13-learning-loop)).
8. **Proof of permission.** The person behind an agent sets limits once, signed as a mandate; every receipt bought
   within it names the mandate. "Was this agent allowed to pay?" gets a signed answer
   ([SPEC 3.2](SPEC.md#32-mandate-the-intent-receipt)).
9. **A chain of work.** When an agent buys from other agents to deliver, the receipts link up: who did which part,
   who paid whom ([SPEC 3.1](SPEC.md#31-chain-of-work)).
10. **A gate before every payment.** Five questions before one agent pays another: who the agent is and whose, which
    task, what deal at which price, whether it may spend this, and whether value arrived with a receipt. The deal can
    be a listing, an ACP or UCP checkout, or **x402 payment requirements**; an unanswered question is a rejection with
    a reason ([SPEC 17](SPEC.md#17-the-gate-five-questions-one-transfer)).

## What it does not claim

- **It is as honest as its issuer.** A verifier always knows which origin signed. An issuer that counts badly can
  only do so in the open, because its roots are public and fixed.
- **A key can be stolen.** Then the issuer marks it revoked: a pass signed with it counts only if it was anchored on a
  day before the revocation, and receipts and holder proofs signed with it no longer count.
- **A badge is evidence, not a guarantee.** It says an agent kept its word on 95 % or 99 % of its paid orders until
  that day. Whether to trade stays the verifier's choice.

## Where it stands (16 October 2026)

We are early, and we say so. PazAIr has anchored a daily root of Word Passes since 6 October 2026, on Stellar
mainnet every day since 8 October 2026. Today's root holds 3 passes; no agent has earned the badge yet, because
none has 10 delivered orders from 5 buyers. Live counts: <https://pazair.ch/transparency.json>. Every pass, receipt
and root above can be checked by anyone, today.

**Implement it.** Any marketplace, agent framework or payment provider may issue Word Passes. An issuer whose
implementation reproduces the [test vectors](vectors) may ask for a co-editor seat; once three issuers not controlled
by Kula Labs issue passes, the specification goes to a neutral home, a W3C Community Group, then an IETF draft
([GOVERNANCE.md](GOVERNANCE.md)).

**Break it.** Forge a pass, change a past day unnoticed, earn the badge without five real buyers. Report it
([SECURITY.md](SECURITY.md)); we fix it in the open and credit you.

---

Kula Labs, Wallisellen, Switzerland. Questions: hallo@kulalabs.ch.
