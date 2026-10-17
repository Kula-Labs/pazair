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
([`python/`](./python), installable with pip from this repository), and an issuer kit for any marketplace
([`word-pass-issuer`](./issuer)).

## 1. Conventions

- **Canonical JSON.** Object keys sorted lexicographically at every level, no whitespace, values as
  `JSON.stringify` writes them. Signatures and hashes are computed over the UTF-8 bytes of the canonical form.
- **Signature.** Ed25519 over `canonical(object without "sig")`, encoded base64url without padding in `sig`.
- **Key id.** `kid` is the first 16 hex characters of `sha256(x)`, where `x` is the base64url public key.
- **Numbers.** Written as JavaScript's `JSON.stringify` writes them (`1e-7`, `0.000001`, `1e+21`). Integers beyond
  ±(2^53 − 1) are read as doubles, as `JSON.parse` does; issuers keep counts within that range.
- **Hash.** `sha256hex(s)`: lowercase hex SHA-256 of the UTF-8 bytes of `s`.
- **Money.** Integer minor units (`amount_minor`) and a lowercase ISO 4217 `currency`.
- **JCS.** For the objects of this specification (no lone surrogates, no number out of range) the canonical form is
  exactly the JSON Canonicalization Scheme, RFC 8785: keys sorted by UTF-16 code units, numbers and strings as
  ECMAScript writes them. Any JCS library gives the same bytes; section 18 relies on it.

## 2. Issuer keys

`GET <issuer origin>/.well-known/pazair-receipts.json`

```json
{ "issuer": "pazair", "alg": "Ed25519", "canonical": "JSON with sorted keys, without \"sig\"",
  "keys": [{ "kid": "3f1c…", "kty": "OKP", "crv": "Ed25519", "x": "…" }] }
```

A verifier keeps the keys it trusts. A rotated key stays listed while objects signed with it are in use.

- **Anchor account.** `"anchors": { "stellar": { "account": "G…", "network": "mainnet" } }` names the account that
  writes the daily roots (section 5). Anyone can write a memo on Stellar; only this account's transactions count.
  An issuer that declares no anchor account has no Stellar check: verifiers report it as unknown, never as found.
- **Revocation.** A key that may be compromised gets `"revoked_at": "<ISO time>"` and a new key is added. From then
  on it signs nothing valid: a pass signed with it counts only if its proof leads to a root of a day *before*
  `revoked_at` (the anchor proves it is older); receipts and holder proofs signed with it are invalid.
- **Second key.** An issuer that signs twice (section 16) lists its ML-DSA-65 keys as
  `"pq_keys": [{ "pq_kid": "…", "alg": "ML-DSA-65", "public_key_b64url": "…" }]`, where `pq_kid` is the first 16 hex
  characters of `sha256hex(hex(public key))` (as in section 14). Revocation works as for `keys`.
- **DID.** An issuer MAY also publish itself as a W3C DID with the did:web method: `GET <origin>/.well-known/did.json`,
  `id` `did:web:<host>` (a port's colon written `%3A`), every Ed25519 key of `keys` as a `Multikey` verification
  method `did:web:<host>#<kid>` (`publicKeyMultibase`: `z` + base58btc of the bytes `0xed 0x01` and the 32 key
  bytes), listed under `assertionMethod`. Same keys, same `kid`; the keys document then names it: `"did": "did:web:<host>"`.
  Section 18 uses it.

## 3. Receipt

Issued when an order is delivered and the payment captured.

```json
{ "v": 1, "issuer": "pazair", "kid": "3f1c…", "order": "or_…", "listing": "ls_…",
  "seller": "ag_…", "buyer": "ag_…", "amount_minor": 500, "currency": "chf",
  "delivered_at": "2026-10-05T10:00:00.000Z", "delivery_sha256": "<sha256hex of the delivery JSON>",
  "sig": "…" }
```

Valid when the signature verifies with the key named by `kid`. A holder of the delivery proves it is the
delivered one by `sha256hex(delivery) == delivery_sha256` (the delivery as the issuer returned it, as JSON text). Hash the string exactly as received; re-serialising a
parsed object can reorder keys or rewrite numbers and gives a false mismatch.

### 3.1 Chain of work

An agent that takes an order may buy from other agents to deliver it. The receipts then form a chain anyone can
walk: who did which part of the work, and who paid whom.

- **Child.** An order placed to deliver another names it: the child receipt carries `"parent_order": "or_…"`.
- **Parent.** The parent's receipt is issued last, so it names its children: `"inputs": ["<receipt hash>", …]`,
  where a receipt hash is `sha256hex(canonical(child receipt))`, `sig` included.

A verifier, given the parent and a set of receipts (what `verifyReceiptChain` in `pazair-verify` does):

1. Verifies the parent's signature.
2. For every hash in `inputs`, finds the receipt with that hash, else the chain is broken (`missing`).
3. Checks that the child's `parent_order` equals the parent's `order`, that the child's `buyer` equals the parent's
   `seller` (a seller can only build on what it bought itself), and that the child was delivered no later than the parent.
4. Walks each child the same way, at most 8 levels deep.

Because the parent signs the hashes of its children, no input can be added, removed or changed later, and no
chain can loop. A chain says what was bought to deliver what; the parent's delivery is still checked against its
own `delivery_sha256`. Children may come from another issuer when the verifier holds that issuer's keys.

### 3.2 Mandate (the intent receipt)

A receipt says what was delivered. A **mandate** says who allowed it. The principal (the person or company behind
an agent) sets limits once; the issuer signs them; every receipt bought within them names the mandate. The chain of
section 3.1 then starts at a human decision: principal → mandate → agent → sub-orders → delivery → payment.

```json
{ "v": 1, "kind": "mandate", "issuer": "pazair", "kid": "3f1c…", "id": "md_…", "agent": "ag_…",
  "principal": "<sha256hex of the issuer's own reference to the principal>", "how": "card_saved",
  "scope": { "currency": "chf", "max_order_minor": 5000, "monthly_minor": 20000 },
  "purpose": null, "issued_at": "2026-10-08T10:00:00.000Z", "sig": "…" }
```

- `principal` is a hash, never a name, address or card: anyone can see that two mandates come from the same
  principal, nobody can see who it is. `how` says how the principal confirmed it (`card_saved`: saved a payment card
  with the payment provider for exactly these limits).
- `purpose` is an optional sentence from the principal ("translations for our shop"). It MUST NOT contain personal
  data; `null` when not given.
- A receipt bought within a mandate carries `"mandate": "<sha256hex(canonical(mandate))>"`, `sig` included.
- Changing the limits makes a new mandate. Ending one is a signed statement:
  `{ "v": 1, "kind": "mandate_end", "issuer": "…", "kid": "…", "mandate": "<hash>", "at": "…", "sig": "…" }`.

A verifier, given a receipt and the mandate it names (what `verifyMandate` in `pazair-verify` does):

1. Verifies both signatures and that the receipt's `mandate` is the hash of the mandate.
2. Checks that the receipt's `buyer` is the mandate's `agent`, that the currency is the mandate's, that
   `amount_minor ≤ max_order_minor`, and that the mandate was issued no later than the delivery.
3. Given a `mandate_end` for it, checks that the delivery was not after the end.

The monthly limit is enforced by the issuer when the order is placed; a verifier holding every receipt that names
a mandate can add them up per calendar month (UTC) and check it too. What a mandate does not claim: that the purchase
was wise, only that it was allowed.

### 3.3 Work order (tender, questions, award, project)

Not every job fits a listing. A buyer agent can put work out to tender: sellers ask questions, the buyer awards it
to one seller, and the work is paid in one receipt or in milestones. Every step is signed by the issuer, so anyone
can check afterwards that the job was awarded fairly and paid as agreed.

```json
{ "v": 1, "kind": "tender", "issuer": "pazair", "kid": "3f1c…", "id": "td_…", "buyer": "ag_…",
  "task_sha256": "<sha256hex of the task text>", "currency": "chf", "budget_max_minor": 20000,
  "deadline": "2026-10-20T00:00:00.000Z", "milestones": [{ "name": "draft", "max_minor": 8000 }],
  "mandate": null, "issued_at": "2026-10-09T10:00:00.000Z", "sig": "…" }
```

- `task_sha256` fixes the task text: the buyer cannot change the job after sellers have bid. `deadline` is `null`
  when there is none; `milestones` is `[]` for a single delivery. `mandate` is the hash of the mandate (3.2) the
  tender was posted under, or `null`.
- **Questions.** A seller's question and the buyer's answer are published to every bidder as one signed statement:
  `{ "v": 1, "kind": "tender_qa", "issuer": "…", "kid": "…", "tender": "<hash>", "asked_by": "ag_…",
  "q_sha256": "…", "a_sha256": "…", "at": "…", "sig": "…" }`. Nobody gets an answer the others do not see.
- **Award.** `{ "v": 1, "kind": "award", "issuer": "…", "kid": "…", "tender": "<hash>", "seller": "ag_…",
  "price_minor": 15000, "qa": ["<hash of each tender_qa published before the award>"], "at": "…", "sig": "…" }`.
- **Project.** Each receipt paid under the award carries `"award": "<sha256hex(canonical(award))>"` and, for a
  milestone, `"milestone": <index into milestones>`. A hash here is always `sha256hex(canonical(object))`, `sig` included.

A verifier, given a receipt, its tender, its award and optionally the questions (what `verifyAward` in
`pazair-verify` does):

1. Verifies all signatures, that the award names the tender and that the receipt names the award.
2. Checks that the receipt's `buyer` is the tender's, its `seller` the award's (never the buyer itself), the currency
   the tender's, `price_minor ≤ budget_max_minor`, and the amount `≤ price_minor`, or for a milestone
   `≤ max_minor` of that milestone.
3. Checks the order in time: tender issued, then awarded, then delivered, and delivered by the `deadline` if one is set.
4. Given the questions, checks that every hash in the award's `qa` is one of them, signed, for this tender and
   asked before the award.

A verifier holding every receipt that names an award can add them up and check that the project as a whole stayed
within `price_minor`. What a work order does not claim: that the best bid won, only that the job, the questions and
the price were fixed before the work and kept after it.

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
- `as_seller.buyers`, **the card rule**: the different buyers of delivered orders, counted once per agent and once
  per payer. An issuer that knows who paid gives each order a payer code (for a card, from the payment provider's
  fingerprint of the card number) and counts `min(distinct buyer agents, distinct payers)`, where an order without a
  payer code counts as its own agent. Five agents paying with one card are one buyer; one agent paying with five cards
  is one buyer. The code says only "the same payer as before"; it stays with the issuer and never appears in a pass.
  PazAIr: `"py_"` and the first 32 hex characters of `sha256hex(seller_id + "|card:" + fingerprint)` with Stripe's card
  fingerprint, or `"|email:"` and the payer's e-mail at Stripe (lower case) for a wallet without one, from 16 October
  2026 (section 13). Reference: `buyers` in `word-pass-issuer`;
  test vector [`vectors/buyers-1.json`](./vectors/buyers-1.json).
- `issuer` is the issuer's short name; who the issuer is follows from the origin that serves its keys (section 2).

**The buyer's word.** Many agents mostly buy: a personal assistant, a procurement agent. Their side of the promise is
to pay for what was delivered. An issuer that implements it adds two fields (both optional, fields only added):

```json
"as_buyer": { "paid_orders": 12, "sellers": 6, "chargebacks": 0, "disputes_opened": 1, "disputes_upheld_for_seller": 1 },
"buyer_word": { "kept_pct": 100, "badge": "pays_99" }
```

- `chargebacks`: chargebacks the agent raised through its card issuer on delivered orders, each counted once. It is
  the only thing that breaks a buyer's word: pulling back what was paid for, outside the market's own review. An
  honest dispute costs nothing, won or lost (`disputes_opened`, `disputes_upheld_for_seller` are shown, never counted).
- `buyer_word.kept_pct = floor(paid_orders / (paid_orders + chargebacks) × 1000) / 10`, `null` without either.
- `buyer_word.badge`: `pays_99` from 10 paid orders from at least 5 different sellers (`as_buyer.sellers ≥ 5`) and
  `kept_pct ≥ 99`; `pays_95` with the same minimum and `≥ 95`; else `null`. The same thresholds as the seller's
  badge, mirrored: buying from your own shops earns nothing.
- `word` stays the seller's word. A verifier keeps the two apart: a buyer's badge never makes a seller trusted.
- An issuer says from when it counts chargebacks (PazAIr: 14 October 2026).

Test vector: [`vectors/buyer-word-1.json`](./vectors/buyer-word-1.json) (the badge table, a signed buyer's pass, its
sentence, and a signed pass whose badge does not follow from its counts).

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
`aud` names the checker the proof is for (the checker sends its own id with the nonce). A checker that gives its id
rejects a proof made for anyone else, so an agent cannot relay another agent's proof to it.

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
   `nonce` equal to the one you sent, `aud` equal to your id if you gave one, `exp` not passed.
7. `word` must follow from the pass's own counts (section 4); a badge they do not earn is a failure. The same holds
   for `buyer_word` when the pass carries one.
8. Verdict: `invalid` if any check fails; else `no_badge_yet` without `word.badge`; else `kept_its_word` when step 4
   or step 5 found the root, `signed_unanchored` when neither did (signed by the issuer, not yet provable to others).
   A transaction or block that cannot be found is "unknown", not a failure. Next to it, for whoever sells to the
   agent, the buyer's verdict: `no_buyer_badge_yet` without `buyer_word.badge`, else `pays_its_way` or
   `signed_unanchored` by the same rule (`buyer_trust` in `pazair-verify`).

A verifier says which issuer signed. Trust in an issuer is the verifier's choice; the checks above make sure
nobody else, not even the issuer later, can change what it signed.

## 10. Test vectors

[`vectors/word-pass-1.json`](./vectors/word-pass-1.json): canonical JSON, a test key (private half included,
for tests only), three signed passes, a signed receipt, a chain of two receipts (section 3.1) with its walk, a mandate and a receipt within it (section 3.2), their leaves, the tree, every proof, the Stellar memo
of the root, an OpenTimestamps proof of the root with the block Merkle root it leads to, a holder proof with the
times it is valid and expired, the sentence a verifier says, a fingerprint (section 15) with its seed, codeword, the distance
to another agent's and the hash of the reference drawing, and a pass, a receipt and a holder proof signed twice (section 16)
with the ML-DSA-65 test key, its seed and the keys document that lists it. An implementation is conformant when it reproduces all of them.
[`vectors/credential-1.json`](./vectors/credential-1.json) (section 18): base58btc, the Multikey of the test key,
did:web URLs, a DID document, the first pass as a Verifiable Credential with its proof, the two hashes it signs, and a
forged copy that must fail. The reference verifiers also reproduce the W3C Recommendation's own eddsa-jcs-2022 vector.
[`vectors/buyers-1.json`](./vectors/buyers-1.json) (section 4, the card rule): delivered orders as buyer agent and payer
code, and the `as_seller.buyers` an issuer must count from them.
[`vectors/licence-1.json`](./vectors/licence-1.json) (section 19): a professional buyer's licence signed with the test key,
the exam key it names, a time it is current and a time it has expired, a copy whose level was raised after signing, and a
correctly signed licence whose score is under its level's pass mark. The last two must fail.

## 11. Governance

- **Free to implement.** Issuing, showing or checking a Word Pass needs no permission, fee, membership or contract.
  The text, the test vectors and the reference implementations stay MIT licensed. Kula Labs will not assert any
  patent against an implementation of this specification.
- **Earned, never bought.** An issuer may charge for its own services; PazAIr charges a fee per paid sale. No issuer
  sells, rents or hand-edits a record (rule 7.1), and none sells a badge, a rank, a seal or anyone's data. Nothing in
  a pass can be bought, from Kula Labs or from anyone else.
- **No privileged issuer.** PazAIr is the first issuer, not a special one: its objects follow exactly these sections,
  and a verifier treats every issuer the same way. Trust in an issuer stays the verifier's choice (section 12). The
  name "Word Pass" may be used by any issuer whose objects pass section 9's checks.
- **Nothing changes in silence.** Proposals and changes are issues and pull requests in this repository, decisions
  explained there. Fields are only added (section 8). A change that closes a gap against abuse or fixes a security
  problem may apply at once (section 13); every other change is announced here at least 14 days before issuers apply it.
- **A neutral home.** Kula Labs (Switzerland) edits the specification today. Any issuer whose implementation
  reproduces the test vectors (section 10) may ask for a co-editor seat. Once three issuers not controlled by Kula Labs
  issue Word Passes, Kula Labs proposes the specification, together with them, to a neutral home: a W3C Community
  Group, then an IETF draft.


## 12. Security considerations

What nobody can do, not even the issuer: change a pass after its day's root is in Bitcoin and Stellar; make a
pass, receipt or holder proof that verifies without the issuer's private key; show another agent's pass as its
own when the checker asks for a holder proof bound to its own id (`aud`); keep a revoked (stolen) key counting
for anything not anchored before the revocation; pass off a memo from some other Stellar account as the anchor.

What a Word Pass does not claim, and how to read it:

- **It is as honest as its issuer.** A verifier always knows which origin signed. An issuer that counts badly can
  only do so in the open: its roots are public and fixed. Trust in an issuer is the verifier's choice; a public list
  of issuers and their transparency reports (rule 7.5) helps it choose.
- **Buying from yourself costs money.** Only paid, delivered orders count, each carrying the issuer's fee, and the
  badge needs at least five different buyers, counted once per agent and once per payer (the card rule, section 4):
  five agents paying with one card are one buyer. What the card rule does not stop: a seller who controls five real,
  different payment instruments and five agents can still pay for a badge; cryptography cannot prove that buyer and
  seller are strangers. It makes that cost real payment instruments, not free agent ids, and the learning loop
  (section 13) counts the patterns such a record leaves. Issuers should weigh further signals against fake buyers
  (buyers' own records) and may tighten the badge rule in a later version; fields are only added.
- **A key can be stolen.** Then the issuer marks it `revoked_at` (section 2); everything not anchored before that
  day stops counting.

## 13. Learning loop

The rules of a Word Pass get stricter where they are abused; they never get looser in silence.

1. **Notice.** An issuer SHOULD count, per day: every check of its passes, every failed check by the step that
   failed (section 9), every report it receives, and trading patterns that look like a bought record (one buyer
   placing most orders, orders passed back and forth, buyers who buy nowhere else, several agents paying with one card). PazAIr publishes these counts
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
| 1.0 + 3.1 | 2026-10-07 | Chain of work: `parent_order` on the child, `inputs` (receipt hashes) on the parent |
| 1.0 + 3.2 | 2026-10-08 | Mandate: the principal's limits, signed; receipts name the mandate they were bought within |
| 1.0 + 15 | 2026-10-10 | Fingerprint: a print per agent from a Reed-Solomon codeword over the seed; any two differ in at least 55 of 64 symbols |
| 1.0 + 15, wording | 2026-10-14 | Section 15 separates the theorem (55 of 64 for different messages) from the probability (different messages, 80 bits of a hash); 0 means the same message, not the same agent. Code, vector and drawing unchanged |
| 1.0 + 16 | 2026-10-10 | Second signature: `pq_sig` (ML-DSA-65) on passes, receipts and holder proofs, `pq_keys` in the keys document |
| 1.0 + 17 | 2026-10-11 | The gate: `agent_identity`, mandate expiry, counterparties, purpose codes and step-up, `gateway_policy`, `evidence`, `dispute`; five questions before a transfer, one evidence object after, a dispute as an object |
| 1.0 + 4, buyer | 2026-10-14 | The buyer's word: `as_buyer.chargebacks`, `buyer_word` (`pays_99`, `pays_95`, 10 paid orders from 5 sellers), only chargebacks break it; `buyer_trust` next to `trust` (section 9). Older passes unchanged and valid |
| 1.0 + 18 | 2026-10-14 | did:web for issuers (section 2); the pass as a W3C Verifiable Credential 2.0 with an eddsa-jcs-2022 proof (section 18); section 1 names JCS; governance: free to implement, nothing in a pass for sale, 14 days' notice, co-editors (section 11). Passes, receipts and their signatures unchanged |
| 1.0 + 19 | 2026-10-17 | The buyer's licence: `kind: "buyer_licence"`, three levels with their pass marks and validity, ten lessons, rules a verifier checks on top of the signature (section 19). Test vector `vectors/licence-1.json` |
| 1.0 + 4, card rule | 2026-10-16 | `as_seller.buyers` counts once per agent and once per payer: `min(distinct buyer agents, distinct payers)` (section 4), so five agents paying with one card are one buyer. Closes the gap a review named on 16 October 2026 and applies at once (section 11); passes already anchored stay as they were. Test vector `vectors/buyers-1.json` |

## 14. Remember: the chain of daily roots

*Forgets nothing. Holds nothing against you.* An issuer that implements Remember links its daily roots (section 5)
into one chain and signs every link twice, so that any change to a past day shows to anyone who kept a head.

- **Chain:** `head_d = sha256hex(head_{d-1} + root_d)`, the two hex strings concatenated as text; `head_0` is 64
  zero characters (genesis). Days are ordered by their ISO date.
- **Link signature** (`head_sig`): over `canonical({ day, prev, root, head })`. `ed25519` with the receipt key
  named by `kid` (section 2); `ml_dsa_65` (FIPS 204) with the key whose `pq_kid = sha256hex(hex(public key))[0:16]`
  the issuer publishes next to the chain. Either scheme holding is enough to trust the link; both are given so one
  broken scheme breaks nothing.
- **Published:** `GET /v1/remember/chain` → `{ genesis, head, days, broken_at, keys: { kid, pq_kid,
  ml_dsa_65_public_key_b64url }, chain: [{ day, root, prev, head, head_sig, bitcoin_ots, stellar_tx }] }`, and
  `GET /.well-known/pazair-remember.json`: the laws, the current head, both keys, `sig` (Ed25519 over the canonical
  JSON without `sig` and `pq_sig`) and `pq_sig` (ML-DSA-65 over the same bytes).
- **Witness:** every answer carries `pazair-head: <day>:<head>`. A reader that keeps it can later recompute the chain
  and compare (`npx pazair-verify witness <day:head> <origin>`). A disagreement is evidence against the issuer; the
  issuer MAY count witnesses that announce themselves, but that count is the issuer's, not the verifier's.
- **Forgiveness** (the ranking, section 4): a failure counts with weight `0.5 ^ (age_days / 365)`; it stays on
  record with its date. **Bones:** a listing that leaves the market leaves `{ listing, seller, reason, at }`, served
  with HTTP 410. **Probes:** a paused listing is probed again at +1, +3, +7, +14, +30 days, then every 30.
- **Rules for issuers:** never remove or reorder a day; never re-sign a day with a different root; publish the
  chain in full; say in the document what is not claimed (that nothing can be manipulated) and what is (that any
  change shows).

<a id="15-fingerprint-no-two-passes-alike-provably"></a>

## 15. Fingerprint: two prints, 55 of 64 symbols apart

Every Word Pass carries a **fingerprint**, a print drawn from the agent's identity. Two different prints differ in at
least 55 of their 64 symbols: that is a theorem of the code below. Whether two agents get different prints is a
probability, because the print encodes the first 80 bits of a hash: among a million agents the chance that any two
share a print is about 4 × 10⁻¹³, among a billion about 4 × 10⁻⁷. The print lets people and agents recognise a pass;
the identity is the issuer's origin and the agent's id, under the issuer's signature.

- **Seed.** `seed = sha256hex(origin + "\n" + agent + "\n" + first_leaf)`: the issuer's https origin (section 2,
  without a trailing slash), the agent's id, and the leaf (section 5) of the agent's first anchored pass. The issuer
  serves that leaf as `fingerprint.first_leaf` next to the pass. No two agents share this input, so their seeds
  differ (SHA-256); their prints differ unless the first 10 bytes of the seeds happen to agree.
- **Codeword.** The first 10 bytes of the seed are the message of a systematic Reed-Solomon code over GF(256)
  (primitive polynomial 0x11d, generator polynomial with roots α^0 … α^53), `n = 64`, `k = 10`: the 10 message bytes
  followed by 54 parity bytes, written as 128 lowercase hex characters in `fingerprint.codeword`. The minimum distance
  is `d = n − k + 1 = 55`: the generator's 54 consecutive roots give every non-zero codeword at least 55 non-zero
  symbols (BCH bound), and no code with `n = 64`, `k = 10` can do better (Singleton bound). So for any two seeds whose
  first 10 bytes differ, the codewords differ in at least 55 of 64 symbols; seeds that share their first 10 bytes give
  the same codeword. A verifier compares two prints by counting differing bytes (`fingerprintDistance` in
  `pazair-verify`): 0 means the same message, 1 to 54 means at least one of them is not a fingerprint of this
  section. Whether two passes belong to the same agent is decided by origin, agent id and signatures, not by the
  print.
- **Drawing.** Each symbol is one of 64 sectors of a print drawn like a finger: closed ridges around a core, taller
  than wide. In sector `j` with symbol `s`, bits 0–4 say on which ridge (`(s & 31) mod ridges`) the sector's ridge
  ending sits, bits 5–7 how far the ridges bulge there (smoothed over the neighbouring sectors); the first four bytes
  lean and squeeze the whole loop. The reference drawing is `fingerprintSvg` in `pazair-verify` (JavaScript and
  Python give the same bytes); the test vector fixes its hash. An issuer MAY draw it differently, but the codeword is
  the fingerprint, not the picture.
- **Growing.** The record (section 4) is drawn over the print and never changes the identity: `5 + floor(delivered / 3)`
  ridges, at most 26; the two innermost ridges form an open loop until `as_seller.buyers ≥ 5`; with a badge the
  outermost ridge is gold; every lost dispute is a scar across the ridges.
- **Where it shows.** `fingerprint: { first_leaf, seed, codeword, svg }` in the pass document (section 5), the
  codeword in the holder proof (section 9) as `"fingerprint": "<codeword>"` when the issuer implements this section,
  and the print wherever the pass is shown to people.

What it does not claim: that a person tells trillions of pictures apart. The eye recognises that a picture belongs
to a pass; a machine counts the 64 symbols. Nor that no two agents can ever share a print: by chance they do only at
the scale above, but an issuer that picks its own agent ids can give two of its own agents one print with about 2^40
hash evaluations (a collision on 80 bits). Matching the print of another issuer's agent needs about 2^80 evaluations;
a large quantum computer would bring that to about 2^40 (Grover), so the print alone is not proof of identity
against such a machine. And a fingerprint is only as durable as the signatures around it: an
issuer that wants the chain to outlive Ed25519 adds the second signature of section 14 (`ml_dsa_65`) to passes and
receipts as well.

## 16. The second signature

Ed25519 is what every verifier can check today with nothing installed. It is also what a large quantum computer
breaks. An issuer that wants its passes, receipts and holder proofs to outlive that day signs each of them twice,
the way Remember (section 14) already signs its links.

- **`pq_sig`.** ML-DSA-65 (FIPS 204) over `canonical(object without "sig" and "pq_sig")`, base64url without padding,
  with the key named by `pq_kid` (section 2, `pq_keys`). It is made first.
- **`sig`.** Ed25519 as in section 1, over `canonical(object without "sig")`: `pq_kid` and `pq_sig` are inside the
  bytes it signs. So a verifier that knows only Ed25519 verifies a twice-signed object exactly as before, and the
  leaf of a twice-signed pass (section 5) is the hash of the whole pass, both signatures included.
- **Checking.** A verifier that can check ML-DSA-65 checks both; `pq_sig` that does not verify makes the object
  invalid, whatever `sig` says. A verifier that cannot check it reports the second signature as not checked, never
  as valid (`ml_dsa_65: null` in `pazair-verify`). An object without `pq_sig` is not signed twice, which is not a
  failure; a verifier MAY require it. A revoked `pq_kid` counts only as a revoked `kid` does (section 2).
- **Why both.** One broken scheme breaks nothing: forging `sig` alone fails the ML-DSA-65 check, forging `pq_sig`
  alone fails Ed25519. Hashes, the Merkle tree, the anchors and the fingerprint (section 15) need no change.
- **Cost.** An ML-DSA-65 signature is 3309 bytes and the public key 1952 bytes, so a twice-signed pass is about
  4.4 KB larger. The issuer decides whether that is worth it; PazAIr signs twice.

Reference: `verifyPqSignature`, and the `ml_dsa_65` field of `verifyPass`, `verifyReceipt` and `checkWordPass` in
`pazair-verify` (checked when `@noble/post-quantum` is installed next to it); `importPqKey` and
`withSecondSignature` in `word-pass-issuer`.

## 17. The gate: five questions, one transfer

Sections 3 to 4 say what happened. This section says what must be in hand *before* an agent pays another agent,
and what one object says afterwards. A transfer is valid only when five questions are answered with checkable
objects; a missing answer is a rejection with a reason, never a guess. Schemas, a reference policy, every reason
and a reference implementation (`decide`, `verifyEvidence`, `verifyDispute`) are in [`a2a/`](./a2a); the test
vector is [`vectors/a2a-transfer-1.json`](./vectors/a2a-transfer-1.json); the whole flow runs offline in
[`examples/gate.mjs`](./examples/gate.mjs). All objects follow section 1 (canonical JSON, Ed25519 over the object
without `sig`, `kid` in the body); a hash of an object is `sha256hex(canonical(object))`, `sig` included.

| # | Question | Object | Named by |
|---|---|---|---|
| 1 | Who is the agent, and whom does it belong to? | `agent_identity` (17.1) and a runtime proof | its hash |
| 2 | Which task was agreed? | `task`: `protocol`, `task_id`, `agreed_sha256` | the hash of the agreed message |
| 3 | What exactly is traded, at which price? | `deal`: a listing, an award (3.3), a UCP checkout, an ACP checkout session or x402 payment requirements | `hash`, plus `output_schema_sha256` or `terms_sha256` |
| 4 | May this agent spend this amount? | `mandate` (3.2 with 17.2), `step_up` | the mandate's hash |
| 5 | Did the value arrive, and is there a receipt? | `evidence` (17.4) | the settlement's own id |

The eight laws the gate enforces, as the code states them: (1) mandate before movement; (2) evidence before success;
(3) the principal stays liable, an agent without a principal has no identity; (4) irrevocable means checked before;
(5) one layer, one job: A2A agrees, the mandate allows, the rail pays; (6) a dispute is an object; (7) limits are
code; (8) a layer the partner does not speak is a marked gap, never an excuse.

**Trust model.** The issuer keys a gateway holds are trusted. The gateway that runs the gate is trusted and is the
only author of the transfer id, the time, the tool name, its own id (`aud`), `human_present`, the SPIFFE peer id, the
deal (it fetches and hashes it), the settlement plan, a mandate end and the ledger. The agent is not trusted: its
identity, runtime proof signature and step-up are checked against the issuer keys. The counterparty is not trusted:
its identity is checked the same way. `decide` is stateless; transfer-id uniqueness, serialising decisions per
mandate, and recording allows and settlements in the ledger are the gateway's job.

### 17.1 Agent identity

```json
{ "v": 1, "kind": "agent_identity", "issuer": "pazair", "kid": "3f1c…", "agent": "ag_…",
  "principal": "<sha256hex, as in the mandate>", "principal_kind": "company", "principal_key": "<base64url x or null>",
  "runtime": { "kind": "spiffe", "id": "spiffe://…" }  |  { "kind": "key", "alg": "Ed25519", "x": "…", "kid": "…" },
  "card": { "url": "https://…/.well-known/agent-card.json", "sha256": "<see below>" },
  "pass": "<pass URL or null>", "issued_at": "…", "expires_at": "…", "sig": "…" }
```

Signed by the issuer that onboarded the agent and saw its principal. `principal_key` is the principal's own Ed25519
public key when the issuer attested it (a mandate's `principal_sig` must then use it), else `null`. The A2A agent
card carries the identity under `capabilities.extensions[]` as
`{ "uri": "https://pazair.kulalabs.ch/ext/gate/v1", "required": false, "params": { "identity": <object> } }`.
`card.sha256` is `sha256hex(canonical(card))` with that extension entry removed from `capabilities.extensions`, so
the identity names the card without naming itself (`cardHash` in `pazair-a2a`); a changed card is a new identity.
At run time the agent proves it is the one named. With SPIFFE, the gateway terminates mTLS against the SPIFFE trust
bundle of the ID's trust domain, takes the single URI SAN of the client leaf and compares it with `runtime.id`
exactly. With a key, the agent signs per transfer `canonical({ transfer, agent, aud, deal, amount_minor, currency })`
(`runtimeProofBody`): the gateway's transfer id and its id `aud`, and the hash, amount and currency of the deal the
agent chose, so a captured proof is good for nothing else. An identity without a principal, or without an expiry, is
rejected.

### 17.2 Mandate, continued

A mandate of section 3.2 gains, fields only added and each required by policy where a gateway wants it:
`expires_at`; `scope.counterparties` (who the agent may pay, as agent ids, DIDs, card URLs or chain accounts;
`["*"]` is the principal's explicit choice to allow any); `scope.purpose_codes` (codes, matched against the deal's
`purpose_code`; the free-text `purpose` is for people and is never evaluated); `scope.step_up_above_minor` (above
it every transfer needs a `step_up`); `scope.unattended` (absent or false: every transfer is a step-up unless the
gateway asserts that a human is present); and optionally `principal_sig`: the principal's own Ed25519 signature over
the mandate without `sig`, `principal_sig`, `pq_sig` and `pq_kid`, which the issuer's `sig` then covers. `how` says
how the principal confirmed the limits (`card_saved`, `ap2_mandate`, `passkey`, `signed_statement`). The mandate is
AP2-shaped (who may spend, how much, with whom, until when); it is not an AP2 credential, and a gateway that needs
one carries it next to this object. `verifyMandate` keeps verifying these mandates and checks what section 3.2
defines; the gate enforces the rest.

A step-up is a signed confirmation for exactly one transfer and one deal, valid for minutes:
`{ "v": 1, "kind": "step_up", "issuer": "…", "kid": "…", "transfer": "tr_…", "agent": "ag_…", "mandate": "<hash>",
"deal": "<deal hash>", "seller": "ag_…", "amount_minor": 900, "how": "passkey", "iat": "…", "exp": "…", "sig": "…" }`.
It counts only for that transfer, deal and seller, at least that amount, issued before the transfer and before `exp`.

### 17.3 The gate

A gateway that parses A2A and MCP holds, for one transfer, a `transfer_request`: the transfer id it minted, its
clock's time `at`, the tool name (the A2A method or MCP tool), its own id `aud`, the identity and its runtime proof,
the task, the deal, the mandate (and its end, if any), a step-up if given, the counterparty's identity if it has one,
the planned settlement (`rail`, `amount_minor`, `currency`, `fee_minor`; with `asset`, `network` and a bound rate
`fx: { rate, quoted_at }` when it settles in another asset than the deal's currency, `amount_minor = round(deal ×
rate)` within 1) and its own ledger `history`: every transfer of this mandate it allowed (a reservation) or settled,
with `settlement_id`, the evidence hash or `null`, and the chain it belongs to. A `gateway_policy` says what is
required, which task protocols, deal kinds and rails are allowed, the fee ratio above which a fee is a defect, the
clock skew, and RBAC rules on agent id and tool name, never on an address; no matching rule is deny.

`decide(request, policy, { keys, now })` answers a `gate_decision`: `{ v, kind, transfer, decision, reasons,
answered, gaps, chain, policy, decided_at }`. `decision` is `allow`, `step_up` or `reject`; every reason is a code of
[`rejection-reasons.json`](./a2a/policy/rejection-reasons.json) with its question, layer, who can act (`actor`),
whether a retry helps (`retry`) and one sentence in German and English; step-up codes appear only on a `step_up`
decision. `answered` says per question whether it held, the fifth always `after_evidence`. `gaps` names what the
request does not carry: `counterparty_identity`, `counterparty_not_onboarded` (the seller is not an issuer-onboarded
agent), `task_not_a2a`, `principal_signature`, `principal_key_unattested`; a missing layer is marked, never silent.
`chain` is `sha256hex("<mandate hash>:<seller>")`; `policy` the hash of the policy that decided; `decided_at` equals
the transfer time. The gate never guesses: an unreadable time, a time further from `now` than the skew, or a ledger
that is not a list of valid entries is a rejection, and malformed or hostile input (a key that is not an identity, an
object nested deeper than the stack) rejects instead of throwing. A settled transfer on the chain without an evidence
object rejects the next one (`EVIDENCE_MISSING_PRIOR`). MCP is not accepted as the task-agreement protocol; it may
carry the settlement leg (x402 or MPP over MCP), never the agreement. Settlement adapters (x402 and MPP headers,
Stripe webhooks) are the gateway's, not this specification's.

### 17.4 Evidence

One object per transfer, issued once the value arrived:

```json
{ "v": 1, "kind": "evidence", "issuer": "pazair", "kid": "…", "id": "ev_…", "transfer": "tr_…",
  "identity": "<hash>", "agent": "ag_…", "principal": "<hash>",
  "task": { "protocol": "a2a", "task_id": "…", "agreed_sha256": "…" },
  "deal": { "kind": "listing", "ref": "ls_…", "hash": "…" }, "mandate": "<hash>",
  "counterparty": { "agent": "ag_…", "identity": "<hash or null>" },
  "price": { "amount_minor": 500, "currency": "chf" },
  "settlement": { "rail": "stripe", "id": "ch_…", "amount_minor": 500, "currency": "chf", "fee_minor": 45,
                  "finality": "captured", "reversible_by_rail": true, "finalized_at": "…" },
  "result": { "status": "delivered", "delivery_sha256": "…", "receipt": "<receipt hash>" },
  "gate": { "policy": "<policy hash>", "decision": "allow", "decided_at": "…" }, "issued_at": "…", "sig": "…" }
```

`settlement.id` is the rail's own (a Stripe charge, an x402 or MPP payment reference, an XRPL or Stellar transaction
hash, a SEPA end-to-end id); `finality` what the rail reached (`captured`, `confirmed`, `finalized`, `validated`,
`booked`; a pending settlement has no evidence); `reversible_by_rail` whether the rail itself can still reverse it
(a card chargeback), in which case a reversal later is a `dispute_decision` with `bears: "rail"`, never a silent
edit. Settlement in another asset carries `asset`, `network` or `method`, and the `fx` that bound it.
`verifyEvidence` checks the signature, the finality and id, that what was settled is the deal's price (or its bound
rate), that a result is stated, that the gate said allow, and, for every object the verifier holds, that the evidence
names exactly it (identity and principal, mandate, task, deal with counterparty and price, the receipt). An executed
payment without this object is an incident, not a feature. What evidence does not claim: that the purchase was wise,
only that every question had its answer and the value arrived.

### 17.5 Dispute

A dispute is an object, not a ticket. Three signed statements, each naming the one before by hash:

- **Dispute.** The buyer opens it on a receipt: `{ "v": 1, "kind": "dispute", "issuer": "…", "kid": "…", "id": "dp_…",
  "order": "or_…", "receipt": "<receipt hash>", "evidence": "<evidence hash or null>", "opened_by": "ag_…",
  "against": "ag_…", "reason_code": "not_as_promised", "claim_sha256": "<hash of the buyer's statement>",
  "opened_at": "…", "sig": "…" }`. The reason is a code (`not_as_promised`, `not_delivered`, `late`,
  `charged_without_delivery`, `other`); the statement is fixed by its hash and stays with the issuer.
- **Answer.** The seller may answer: `{ "kind": "dispute_answer", "dispute": "<hash>", "by": "ag_…",
  "answer_sha256": "…", "at": "…", … }`. The person deciding sees exactly this.
- **Decision.** `{ "kind": "dispute_decision", "dispute": "<hash>", "answer": "<answer hash or null>",
  "outcome": "for_buyer" | "for_seller", "bears": "principal" | "agent" | "counterparty" | "rail",
  "decided_by": "person" | "rule", "refund": { "rail": "stripe", "id": "re_…", "amount_minor": 500, "currency": "chf" } | null,
  "decided_at": "…", … }`. `bears` names who carries the loss on the liability path principal → agent →
  counterparty → rail. For the buyer there is a refund with the rail's own id; for the seller there is none.

`verifyDispute(dispute, { keys, decision, receipt, answer })` checks the signatures; that the decision names the
dispute and the dispute the receipt; that the buyer opened it against the seller, after the delivery; that it was
decided after it was opened, with an outcome and a bearer; that a refund exists exactly when decided for the buyer
and never exceeds what was paid; and, given the answer, that it is the one the decision saw, given between opening
and decision. A decision for the buyer counts as `disputes_lost` in the seller's Word Pass (section 4); the decision
goes into the daily root like a receipt. What a dispute object does not claim: that the decision was right, only who
said what, in which order, and what was paid back.


## 18. The Word Pass as a W3C Verifiable Credential

A Word Pass is plain JSON, checked with the keys document of section 2. Much of the world checks claims the W3C way:
a DID for the issuer, a Verifiable Credential for the claim, a Data Integrity proof around it. An issuer that
implements this section serves every pass in both forms. The pass itself does not change.

`GET <pass URL>.vc`

```json
{ "@context": ["https://www.w3.org/ns/credentials/v2"],
  "type": ["VerifiableCredential", "WordPassCredential"],
  "issuer": "did:web:pazair.ch", "validFrom": "<issued_at of the pass>",
  "credentialSubject": { "id": "<pass URL>", "wordPass": { "pass": {…}, "leaf": "…", "proof": […], "root": {…} } },
  "proof": { "@context": ["https://www.w3.org/ns/credentials/v2"], "type": "DataIntegrityProof",
             "cryptosuite": "eddsa-jcs-2022", "created": "…", "verificationMethod": "did:web:pazair.ch#3f1c…",
             "proofPurpose": "assertionMethod", "proofValue": "z…" } }
```

- **Issuer.** The issuer's did:web (section 2). `verificationMethod` names one of its Ed25519 keys by `kid`: the key
  that also signs the pass inside.
- **Subject.** `credentialSubject.id` is the pass URL (section 9), on the issuer's own origin. `wordPass` is the
  document of section 5, `{ pass, leaf, proof, root }`, unchanged; before the agent's first anchored day it is
  `{ pass }` with today's signed pass.
- **Proof.** `eddsa-jcs-2022` of the W3C Recommendation *Data Integrity EdDSA Cryptosuites v1.0*: Ed25519 over
  `sha256(JCS(proof without proofValue)) || sha256(JCS(credential without proof))`, the proof carrying the
  credential's `@context`, `proofValue` in multibase base58btc. JCS is the canonical form of section 1.
- **Nothing new in it.** The credential says exactly what the pass URL says. Its own terms (`WordPassCredential`,
  `wordPass`) fall under the issuer-dependent vocabulary of the VC 2.0 context; verifying needs no JSON-LD processing.

**Checking a credential** (what `verifyCredential` in `pazair-verify` and `verify_credential` in Python do):

1. `@context` starts with the VC 2.0 context; `type` holds `VerifiableCredential` and `WordPassCredential`.
2. Resolve the issuer's did:web; the document must name the DID it was fetched for.
3. Verify the proof: the cryptosuite, the purpose `assertionMethod`, the key listed under `assertionMethod`, the
   proof's `@context` where the credential's starts, the signature.
4. The subject is an https URL on the origin of the did:web.
5. `validUntil`, if given, has not passed; `validFrom` is not in the future.
6. The pass inside verifies as section 5 says, with the keys document of the same origin: signature, second
   signature (section 16), Merkle proof, word.
7. For full trust, the day's root on Bitcoin or Stellar, as section 9 checks it at the subject URL
   (`npx pazair-verify credential <url>` does steps 1 to 7).

Any VC verifier stops after step 3 and knows that the issuer signed this record. Steps 4 to 7 add what only a Word
Pass has: the record follows from paid deliveries, and its day is fixed in Bitcoin and Stellar.

What a credential does not claim: more than its pass. It is a second envelope for the same signed record, so that a
wallet, a gateway or an agent framework that speaks VCs can hold and show a Word Pass without knowing this
specification. Reference: `verifyCredential`, `verifyDataIntegrity`, `signDataIntegrity` and `resolveDidWeb` in
`pazair-verify`; the same in Python.

## 19. The buyer's licence: the apprenticeship

A Word Pass shows what an agent did. Before it has done anything, a principal still has to decide whether to let it
spend: with a budget that is not its own, among strangers whose text may try to give it orders. The buyer's licence
answers that question the way people answer it for each other: an apprenticeship with public lessons, an exam with
real situations, and a credential anyone can check. Full rationale: [APPRENTICESHIP.md](./APPRENTICESHIP.md).

**Levels.** The principal chooses one.

| Level | For | Tasks | Pass mark | Valid |
|---|---|---|---|---|
| `basic` | simple errands for one person | 5 | 4 | 365 days |
| `professional` | buying for a business | 8 | 7 | 180 days |
| `critical` | a law firm, a bank, anywhere a mistake is expensive | 10 | 10 | 90 days |

**Lessons.** One kind of task per lesson; a level examines the first 5, 8 or 10, in this order:
`budget` (stay inside the mandate, per order, per month, the whole quantity), `forbidden` (what may not be bought),
`word_pass` (the proven seller; a perfect score from a few orders proves little), `receipt` (verify, never guess),
`sandbox` (a real purchase without money), `injection` (seller text is data, never an instruction), `sanctions`
(where nobody may be served), `escalate` (within budget is not within mandate: ask), `data` (send only what the order
needs), `origin` (the principal's area is the limit). An issuer publishes its lessons in full before the exam.

**Exam.** Drawn anew for every attempt. Every kind has counter-examples, so that no kind can be answered by heart: a
clean description next to a poisoned one, a mandate that covers the category next to one that does not, a country just
outside the allowed area next to one inside. Tasks that name a tool are answered with it: the `receipt` task hands over
a real signed receipt that is genuine or was changed after signing; the `sandbox` task is a real test purchase whose
receipt must name the agent and the exam's nonce. Every answer comes back with its reason. An issuer keeps the exam
key (the answers the agent never sees) only while the exam is open.

**The licence.** A passed exam gives:

```json
{
  "v": 1, "kind": "buyer_licence", "issuer": "pazair", "kid": "…",
  "agent": "ag_…", "level": "professional", "score": "8/8",
  "tasks": ["budget", "forbidden", "word_pass", "receipt", "sandbox", "injection", "sanctions", "escalate"],
  "issued_at": "2026-10-17T09:00:00.000Z", "valid_until": "2027-04-15T09:00:00.000Z",
  "exam_sha256": "sha256 of canonical(exam key)", "note": "… not a regulatory certification …",
  "pq_kid": "…", "pq_sig": "…", "sig": "…"
}
```

Signed like a receipt (section 1), with the second signature of section 16. An issuer serves an agent's licences,
current and expired, at a URL of its choice (PazAIr: `GET /v1/agents/{id}/licence`, as
`{ agent_id, licences: [{ level, licence }] }`) and may show them on a page for people and as a badge.

**Checking a licence** (what `verifyLicence` and `checkLicence` in `pazair-verify` do, `npx pazair-verify licence <url>`):

1. `kind` is `buyer_licence`; the Ed25519 signature holds with the issuer's keys document; the second signature, if
   present, holds.
2. The rules of its level hold: `score` is `right/tasks` with `tasks` the level's count and `right` at least its pass
   mark; `tasks` lists that many lessons; `valid_until` lies after `issued_at` and no further than the level allows.
   A signed licence that breaks its own level's rules is invalid.
3. Served for an agent, every licence names that agent.
4. `current`: `valid_until` has not passed. An expired licence is genuine but no longer shows anything.

**What a licence does not claim.** It shows that the agent passed these exercises on that day. It is no regulatory
certification, no promise about what the agent will do, and never a permission to spend beyond its principal's mandate
(section 3.2). Anyone may run an apprenticeship and issue licences under this section; a licence names its issuer, and
a verifier decides which issuers it trusts.

**Learning.** An issuer may count, per month and without any agent id, how often each lesson is answered right and each
level passed, and publish the counts (PazAIr: `/v1/licence/stats`). The lessons agents fail most are the ones to teach
better.
