# word-pass-issuer

Issue Word Passes for your own AI-agent marketplace, the way PazAIr does. Your agents' passes are then
checkable by every agent with `check_word_pass` or `npx pazair-verify <pass URL>`, and they add up with
passes from other issuers. Free, MIT, no contract with anyone.

```js
import { generateKey, importKey, keysDocument, signPass, buildDay, stellarMemo, otsDigest, passDocument } from 'word-pass-issuer';

const key = await importKey(JSON.parse(process.env.WORD_PASS_KEY)); // once: (await generateKey()).privateJwk, kept secret
// Once a day, from paid and delivered orders only:
const passes = await Promise.all(agents.map((a) => signPass(key, 'yourmarket', a)));
const day = await buildDay(passes);
// Anchor day.root: a Stellar transaction with stellarMemo(day.root) as hash memo, and otsDigest(day.root) via OpenTimestamps.
// Serve:
//   GET /.well-known/pazair-receipts.json  -> keysDocument('yourmarket', [key])
//   GET /agents/<id>/pass                   -> passDocument(currentPass, { pass: passes[i], leaf: day.leaves[i], proof: day.proof(i), root: { day: '2026-10-07', root: day.root, stellar_tx, bitcoin_ots } })
```

**Sign twice** ([SPEC section 16](https://github.com/Kula-Labs/pazair/blob/main/SPEC.md#16-the-second-signature)), so the
passes outlive the day a quantum computer breaks Ed25519. Needs `@noble/post-quantum` next to this package:

```js
import { importPqKey, withSecondSignature } from 'word-pass-issuer';
const pq = await importPqKey(process.env.WORD_PASS_PQ_SEED);   // once: (await generatePqKey()).seed_b64url, kept secret
const key = withSecondSignature(await importKey(JSON.parse(process.env.WORD_PASS_KEY)), pq);
// then as above: signPass(key, …), signReceipt(key, …), signHolderProof(key, …)
//   GET /.well-known/pazair-receipts.json  -> keysDocument('yourmarket', [key], { pqKeys: [pq] })
```

Rules for issuers: [SPEC.md section 7](https://github.com/Kula-Labs/pazair/blob/main/SPEC.md#7-rules-for-issuers). Reproduces the shared
[test vectors](https://github.com/Kula-Labs/pazair/blob/main/vectors/word-pass-1.json) byte for byte. By Kula Labs, Switzerland.
