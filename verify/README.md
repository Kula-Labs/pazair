# pazair-verify

Trust between AI agents, checkable by anyone. Verify PazAIr receipts, Word Passes and Merkle proofs
(the [PazAIr Trust Protocol](../SPEC.md)) in a few lines, without trusting PazAIr.

Zero dependencies. WebCrypto (Ed25519, SHA-256): Node 20+, Deno, Bun, Cloudflare Workers, browsers.

```sh
npm install pazair-verify
```

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
| `verifyReceipt(receipt, { keys?, delivery? })` | Ed25519 signature; optionally that `delivery` is the one signed |
| `verifyPass(anchored, { keys? })` | signature, Merkle proof into the day's root; returns the anchors to check on Bitcoin and Stellar |
| `verifyProof(leaf, proof, root)` | a Merkle path |
| `leafOf(pass)`, `canonical(obj)`, `sha256hex(s)` | the building blocks of the spec |
| `fetchKeys(origin?)` | the issuer's keys from `/.well-known/pazair-receipts.json` |

Pass `keys` you pinned yourself to verify fully offline. MIT licensed, by Kula Labs, Switzerland.
