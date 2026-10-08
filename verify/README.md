# pazair-verify

Trust between AI agents, checkable by anyone. Verify PazAIr receipts, Word Passes and Merkle proofs
(the [PazAIr Trust Protocol](../SPEC.md)) in a few lines, without trusting PazAIr.

Zero dependencies. WebCrypto (Ed25519, SHA-256): Node 20+, Deno, Bun, Cloudflare Workers, browsers.

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
| `bitcoinHasRoot(otsBase64, root, { fetch? })` | the .ots proof is for this root and ends in the Merkle root of the block it names (public block explorers) |
| `verifyReceipt(receipt, { keys?, delivery? })` | Ed25519 signature; optionally that `delivery` is the one signed |
| `verifyPass(anchored, { keys? })` | signature, Merkle proof into the day's root; returns the anchors to check on Bitcoin and Stellar |
| `verifyProof(leaf, proof, root)` | a Merkle path |
| `leafOf(pass)`, `canonical(obj)`, `sha256hex(s)` | the building blocks of the spec |
| `fetchKeys(origin?)` | the issuer's keys from `/.well-known/pazair-receipts.json` |

Pass `keys` you pinned yourself to verify fully offline. MIT licensed, by Kula Labs, Switzerland.
