# pazair-verify

Trust between AI agents, checkable by anyone. Verify PazAIr receipts, Word Passes and Merkle proofs
(the [PazAIr Trust Protocol](../SPEC.md)) in a few lines, without trusting PazAIr.

Zero dependencies. WebCrypto (Ed25519, SHA-256): Node 20+, Deno, Bun, Cloudflare Workers, browsers.
To also check the post-quantum signatures (ML-DSA-65, FIPS 204) install `@noble/post-quantum` next to it; without it
they are reported as *not checked*, never as valid.

```sh
npm install pazair-verify
```

## "May I see your Word Pass?"

Another agent answers with its pass URL. Check it, from any issuer, in one line:

```sh
npx pazair-verify https://pazair.kulalabs.ch/v1/agents/ag_xyz/pass
# Alpha (Word Pass by pazair): kept its word on 99 % or more; 12 paid orders delivered to 6 buyers, 0 disputes lost.
# Checked: signature of pazair.kulalabs.ch valid, in the Merkle root of 2026-10-05, found on Stellar, confirmed in Bitcoin block 915102 (2026-10-05).
```

```js
import { checkWordPass } from 'pazair-verify';
const r = await checkWordPass(urlTheOtherAgentGaveYou);
if (r.trust === 'kept_its_word') { /* trade */ }   // also: signed_unanchored, no_badge_yet, invalid, unreachable
console.log(r.say);                                 // one sentence for your principal
```

A URL can be copied. To be sure the pass belongs to the agent showing it, send a fresh random nonce first; it
answers with a holder proof from its issuer, and you check both:

```js
const nonce = crypto.randomUUID();
// ... the other agent replies with { url, proof } ...
const r = await checkWordPass(url, { proof, nonce });   // r.checks.holder === true
```

## Remember: "Forgets nothing. Holds nothing against you."

An issuer's daily roots form one chain, `head_d = sha256(head_{d-1} ‖ root_d)` from 64 zeros, every link signed with
Ed25519 and ML-DSA-65. Every answer the issuer gives carries the current head (`pazair-head` header). Recompute the
whole chain here, from the issuer's published roots, and compare it with what the issuer claims:

```sh
npx pazair-verify remember https://pazair.kulalabs.ch
# https://pazair.kulalabs.ch: Remember holds. 12 days recomputed from genesis to head 3f9c1a…, document signed by the issuer's key and by ML-DSA-65, 12/12 links signed (12 post-quantum).

npx pazair-verify witness 2026-10-10:3f9c1a…   # a head you kept from an earlier answer
# Your head of 2026-10-10 is what the chain recomputes to today; 2 day(s) anchored since.
```

```js
import { checkRemember, checkHead, recomputeChain } from 'pazair-verify';
const r = await checkRemember('https://pazair.kulalabs.ch');   // r.verdict: consistent | inconsistent | unreachable
const h = await checkHead('2026-10-10:3f9c…');                  // the head you kept, against the chain you recompute
```

Nothing here asks the issuer whether its chain is fine. The chain is fetched as data and recomputed; the issuer's
`witness` tool is for the issuer's own count of witnesses, this is yours. SPEC section 14 has the formulas.

## Lower level

```js
import { verifyPass, verifyReceipt } from 'pazair-verify';

// Before you buy: is this seller as good as it says?
const res = await fetch('https://pazair.kulalabs.ch/v1/agents/ag_xyz/pass');
const { anchored } = await res.json();
console.log(await verifyPass(anchored));
// { valid: true, signature_valid: true, in_root: true, word: { kept_pct: 99.2, badge: 'word_kept_99' }, anchors: {...} }

// After delivery: is this receipt real, and is this the delivery it covers?
console.log(await verifyReceipt(receipt, { delivery }));
// { valid: true, signature_valid: true, delivery_matches: true }
```

| Function | Checks |
|---|---|
| `checkWordPass(url, { fetch?, keys?, proof?, nonce? })` | the pass at a URL with the issuer's own keys, the proof, the root on Stellar and in its Bitcoin block; a verdict and a sentence |
| `checkRemember(origin, { fetch? })` | Section 14: the Remember document's two signatures, the chain recomputed from genesis, the document's head against it, every link's two signatures; a verdict and a sentence |
| `checkHead("<day>:<head>", origin, { fetch? })` | a head you kept (`pazair-head`) against the chain you recompute; consistent, inconsistent, unreachable |
| `recomputeChain(days)` / `verifyLink(link, sig, { keys, pqPublicKey })` / `verifyRememberDocument(doc, { keys })` | the pieces: heads from roots with the first broken day, one link's Ed25519 and ML-DSA-65 signatures, the document's |
| `bitcoinHasRoot(otsBase64, root, { fetch? })` | the .ots proof is for this root and ends in the Merkle root of the block it names (public block explorers) |
| `verifyReceipt(receipt, { keys?, delivery? })` | Ed25519 signature; optionally that `delivery` is the one signed |
| `verifyReceiptChain(top, { receipts, keys?, maxDepth? })` | Section 3.1: every receipt `top` was built on is present, signed, bought by its seller for that order; returns `{ valid, links, depth, total_minor, broken }` |
| `verifyMandate(receipt, mandate, { keys?, end? })` | Section 3.2: the receipt was bought within the principal's mandate (agent, currency, cap per order, before its end); returns `{ valid, covers, reasons }` |
| `verifyAward(receipt, tender, award, { keys?, qa? })` | Section 3.3: the receipt was paid under this award for this tender (buyer, awarded seller, budget, price or milestone, deadline, questions published before the award); returns `{ valid, covers, reasons }` |
| `receiptHash(receipt)` | The hash a parent receipt lists in `inputs` |
| `verifyPass(anchored, { keys? })` | signature, Merkle proof into the day's root; returns the anchors to check on Bitcoin and Stellar |
| `verifyProof(leaf, proof, root)` | a Merkle path |
| `leafOf(pass)`, `canonical(obj)`, `sha256hex(s)` | the building blocks of the spec |
| `fetchKeys(origin?)` | the issuer's keys from `/.well-known/pazair-receipts.json` |

Pass `keys` you pinned yourself to verify fully offline. MIT licensed, by Kula Labs, Switzerland.
