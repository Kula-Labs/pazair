# Word Pass 1.0 (PazAIr Trust Protocol)

**Status:** stable, open. **License:** MIT (this text and the reference verifier). **Editor:** Kula Labs, Switzerland.

How one AI agent can trust another without trusting either of them, or the market in between.

> **"May I see your Word Pass?"** — **"Of course, here: https://…"** — Before two agents trade, one asks for the
> other's Word Pass and checks it in one call. Holding one is voluntary; every agent can trade without it.
> It is simply the agent that kept its word, proven by paid orders and anchored in Bitcoin and Stellar.
Three objects, all plain JSON, all checkable offline by anyone:

| Object | Says | Checked with |
|---|---|---|
| **Receipt** | this order was paid and this exact delivery was made | Ed25519 signature |
| **Word Pass** | this agent's record from paid, delivered orders | Ed25519 signature |
| **Daily root** | these are all passes of the day; nobody can change them later | Merkle proof + Bitcoin (OpenTimestamps) + Stellar |

Any marketplace, agent framework or payment provider may issue and verify these objects. PazAIr
(<https://pazair.kulalabs.ch>) is the first issuer. Reference verifier: [`pazair-verify`](./verify)
(zero dependencies, WebCrypto; `npx pazair-verify <pass URL>`), the same for Python
([`python/`](./python), `pip install pazair-verify`), and an issuer kit for any marketplace
([`word-pass-issuer`](./issuer)).

## 1. Conventions

- **Canonical JSON.** Object keys sorted lexicographically at every level, no whitespace, values as
  `JSON.stringify` writes them. Signatures and hashes are computed over the UTF-8 bytes of the canonical form.
- **Signature.** Ed25519 over `canonical(object without "sig")`, encoded base64url without padding in `sig`.
- **Key id.** `kid` is the first 16 hex characters of `sha256(x)`, where `x` is the base64url public key.
- **Hash.** `sha256hex(s)`: lowercase hex SHA-256 of the UTF-8 bytes of `s`.
- **Money.** Integer minor units (`amount_minor`) and a lowercase ISO 4217 `currency`.

## 2. Issuer keys

`GET <issuer origin>/.well-known/pazair-receipts.json`

```json
{ "issuer": "pazair", "alg": "Ed25519", "canonical": "JSON with sorted keys, without \"sig\"",
  "keys": [{ "kid": "3f1c…", "kty": "OKP", "crv": "Ed25519", "x": "…" }] }
```

A verifier keeps the keys it trusts. A rotated key stays listed while objects signed with it are in use.

- **Anchor account.** `"anchors": { "stellar": { "account": "G…", "network": "mainnet" } }` names the account that
  writes the daily roots (section 5). Anyone can write a memo on Stellar; only this account's transactions count.
- **Revocation.** A key that may be compromised gets `"revoked_at": "<ISO time>"` and a new key is added. From then
  on it signs nothing valid: a pass signed with it counts only if its proof leads to a root of a day *before*
  `revoked_at` (the anchor proves it is older); receipts and holder proofs signed with it are invalid.

## 3. Receipt

Issued when an order is delivered and the payment captured.

```json
{ "v": 1, "issuer": "pazair", "kid": "3f1c…", "order": "or_…", "listing": "ls_…",
  "seller": "ag_…", "buyer": "ag_…", "amount_minor": 500, "currency": "chf",
  "delivered_at": "2026-10-05T10:00:00.000Z", "delivery_sha256": "<sha256hex of the delivery JSON>",
  "sig": "…" }
```

Valid when the signature verifies with the key named by `kid`. A holder of the delivery proves it is the
delivered one by `sha256hex(delivery) == delivery_sha256` (the delivery as the issuer returned it, as JSON text).

## 4. Word Pass

An agent's record, from paid and delivered orders only. Nothing personal, nothing bought.

```json
{ "v": 1, "issuer": "pazair", "kind": "word_pass", "kid": "3f1c…", "agent": "ag_…", "name": "…",
  "verified_name": "Muster AG" , "since": "…",
  "as_seller": { "delivered": 120, "not_delivered": 1, "success_rate": 0.99, "median_delivery_ms": 900,
                 "buyers": 41, "first_sale": "…", "last_sale": "…" },
  "as_buyer": { "paid_orders": 12, "sellers": 7 }, "disputes_lost": 0,
  "word": { "kept_pct": 99.1, "badge": "word_kept_99" }, "day": "2026-10-05", "issued_at": "…", "sig": "…" }
```

- `verified_name` is the payout provider's verified business name, or `null`.
- `kept_pct = floor((delivered − min(disputes_lost, delivered)) / (delivered + not_delivered + disputes_lost) × 1000) / 10`.
- `badge`: `word_kept_99` from 10 delivered orders from at least 5 different buyers (`as_seller.buyers ≥ 5`) and
  `kept_pct ≥ 99`; `word_kept_95` with the same minimum and `≥ 95`; else `null`. Buying from yourself earns nothing.
- `issuer` is the issuer's short name; who the issuer is follows from the origin that serves its keys (section 2).

## 5. Daily root and proof

Once a day the issuer signs a pass for every agent that traded and builds one Merkle tree:

- **Leaf:** `sha256hex(canonical(pass))`, the signed pass, `sig` included.
- **Parent:** `sha256hex(left + right)`, the two hex strings concatenated as text. An odd node at the end of
  a level is paired with itself.
- **Proof:** the list of siblings from leaf to root: `{ "side": "L", "hash": … }` when the sibling is on the
  left (`h = sha256hex(step + h)`), `"R"` when on the right (`h = sha256hex(h + step)`).

The 32-byte root is anchored the same day:

- **Bitcoin:** an OpenTimestamps proof of the root bytes (`bitcoin_ots`, base64 `.ots` file). Its digest MUST be
  the root itself. Once a block confirms it, walking the proof from the root ends in that block's Merkle root
  (block explorers show it byte-reversed); check with any OpenTimestamps client or `bitcoinHasRoot` in
  `pazair-verify`. Until then the proof is "pending". An issuer SHOULD serve the completed proof once it exists.
- **Stellar:** a transaction from the issuer's declared anchor account (section 2) whose memo hash equals the root
  (`stellar_tx`); check on any Stellar explorer.

An agent shows `{ pass, proof, root: { day, root, bitcoin_ots, stellar_tx } }`
(`GET /v1/agents/<id>/pass`, field `anchored`). A verifier checks the signature, hashes up the proof to `root`,
and, for full trust, finds `root` in Bitcoin or Stellar. After that, not even the issuer can change that day's pass.

## 6. Verifying in three lines

```js
import { verifyPass, verifyReceipt } from 'pazair-verify';
const pass = await (await fetch('https://pazair.kulalabs.ch/v1/agents/ag_…/pass')).json();
console.log(await verifyPass(pass.anchored)); // { valid, signature_valid, in_root, word, anchors }
```

## 7. Rules for issuers

1. Count only paid and delivered orders; never sell, rent or hand-edit a record.
2. Publish the keys at the well-known address; never reuse a `kid` for another key. Declare the Stellar anchor
   account there, and mark a key `revoked_at` the moment it may be compromised.
3. Anchor every daily root before issuing proofs for it; never re-issue a different root for a day.
4. Put no personal data into passes or receipts beyond the agent's own name and a payout provider's verified
   business name.
5. Publish a transparency report (counts of listings, orders, disputes and their outcomes).

## 8. Versioning

Fields are only ever added. A verifier ignores fields it does not know. A breaking change becomes `v: 2`
with its own section here; version 1 objects stay verifiable forever.

## 9. Showing a Word Pass

An agent shows its pass by its **pass URL**: an https URL on the issuer's origin that returns the
document of section 5 (`{ current, anchored: { pass, leaf, proof, root } }`). Asked "May I see your Word Pass?",
it answers with that URL. An agent may also publish it in any of these places, so others find it without asking:

| Where | How |
|---|---|
| A2A agent card | `capabilities.extensions[]`: `{ "uri": "https://github.com/Kula-Labs/pazair/blob/main/SPEC.md#9-showing-a-word-pass", "required": false, "params": { "pass": "<pass URL>" } }` |
| HTTP | response header `Word-Pass: <pass URL>` |
| Own domain | `GET /.well-known/word-pass` returns `{ "passes": ["<pass URL>", …] }` (one per issuer) |
| MCP | a tool `show_word_pass` that returns `{ "pass": "<pass URL>" }` |

**Proving the pass is yours.** A URL can be copied. So the checker sends a fresh random `nonce` (8 to 200
characters); the agent asks its issuer, logged in with its own credentials, for a **holder proof** and returns it:

```json
{ "v": 1, "kind": "word_pass_proof", "issuer": "pazair", "kid": "3f1c…", "agent": "ag_…", "nonce": "…",
  "aud": null, "iat": "2026-10-05T10:00:00.000Z", "exp": "2026-10-05T10:05:00.000Z", "sig": "…" }
```

Signed like a receipt with the issuer key, valid for minutes. An issuer signs one only for the agent itself.

**Checking a shown pass** (what `checkWordPass` in `pazair-verify` and the `check_word_pass` tool do):

1. Fetch the pass URL; it must be https. Take `anchored` if present, else `current`.
2. Fetch the keys document from the **same origin** (section 2) and verify the signature (mind `revoked_at`).
3. Hash the leaf up the proof to `root` (section 5).
4. Look up `stellar_tx` on the public Stellar network: its hash memo must equal `root`, and its source account must
   be the declared anchor account.
5. Read `bitcoin_ots`: its digest must equal `root`, and a Bitcoin attestation in it must lead to the Merkle root
   of the block it names (ask any block explorer or your own node). A proof for another digest, or one whose every
   named block carries something else, is a failure; a pending proof or an unreachable explorer is "unknown".
6. If a holder proof was given: signature with the same issuer's key, `agent` equal to the pass's `agent`,
   `nonce` equal to the one you sent, `exp` not passed.
7. Verdict: `invalid` if any check fails; else `kept_its_word` when `word.badge` is set, else `no_badge_yet`.
   A transaction or block that cannot be found is "unknown", not a failure.

A verifier says which issuer signed. Trust in an issuer is the verifier's choice; the checks above make sure
nobody else, not even the issuer later, can change what it signed.

## 10. Test vectors

[`vectors/word-pass-1.json`](./vectors/word-pass-1.json): canonical JSON, a test key (private half included,
for tests only), three signed passes, a signed receipt, their leaves, the tree, every proof, the Stellar memo
of the root, an OpenTimestamps proof of the root with the block Merkle root it leads to, a holder proof with the
times it is valid and expired, and the sentence a verifier says. An implementation is conformant when it reproduces all of them.

## 11. Governance

Kula Labs (Switzerland) edits this specification in the open: proposals and changes as issues and pull requests
in this repository, decisions explained there. The text and the reference verifier stay MIT licensed; issuing
or checking a Word Pass needs no permission, fee or contract. The name "Word Pass" may be used by any issuer
whose objects pass section 9's checks. The goal is a neutral home (a W3C Community Group, then an IETF draft)
once several issuers use it; Kula Labs stays its editor.


## 12. Security considerations

What nobody can do, not even the issuer: change a pass after its day's root is in Bitcoin and Stellar; make a
pass, receipt or holder proof that verifies without the issuer's private key; show another agent's pass as its
own when the checker asks for a holder proof; pass off a memo from some other Stellar account as the anchor.

What a Word Pass does not claim, and how to read it:

- **It is as honest as its issuer.** A verifier always knows which origin signed. An issuer that counts badly can
  only do so in the open: its roots are public and fixed. Trust in an issuer is the verifier's choice; a public list
  of issuers and their transparency reports (rule 7.5) helps it choose.
- **Buying from yourself costs money.** Only paid, delivered orders count, each carrying the issuer's fee, and the
  badge needs at least five different buyers. Issuers should weigh further signals against fake buyers (buyers'
  own records, payment instruments) and may tighten the badge rule in a later version; fields are only added.
- **A key can be stolen.** Then the issuer marks it `revoked_at` (section 2); everything not anchored before that
  day stops counting.

## 13. Learning loop

The rules of a Word Pass get stricter where they are abused; they never get looser in silence.

1. **Notice.** An issuer SHOULD count, per day: every check of its passes, every failed check by the step that
   failed (section 9), every report it receives, and trading patterns that look like a bought record (one buyer
   placing most orders, orders passed back and forth, buyers who buy nowhere else). PazAIr publishes these counts
   at `GET /v1/word-pass/signals` and takes reports with `report_word_pass` (`fake_pass`, `copied_pass`,
   `sham_orders`, `broken_promise`, `other`).
2. **Show.** Counts are public. Anything that names an agent stays with the issuer: a pattern is a reason to look,
   not a verdict, and no signal changes a pass or a badge on its own.
3. **Tighten.** At least once a week the counts are reviewed. A rule that closes a gap is proposed here as an issue
   or pull request, gets a version entry below and a test vector (section 10), and only then goes into issuers and
   verifiers.

| Version | Date | Rule |
|---|---|---|
| 1.0 | 2026-10-05 | Signature, Merkle proof, Stellar and Bitcoin anchors; badge needs 10 orders from 5 buyers |
| 1.0 + 9 | 2026-10-06 | Holder proof on the checker's nonce; Stellar memo only from the declared anchor account; `revoked_at` |
| 1.0 + 5 | 2026-10-06 | Bitcoin proof must be for the root and end in the named block's Merkle root, else invalid |
