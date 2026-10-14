// SPEC section 4, the buyer's word: buyer_word follows from as_buyer; only a chargeback breaks it; a forged badge fails;
// checkWordPass gives the seller's verdict (trust) and the buyer's (buyer_trust) side by side.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buyerWordOf, checkWordPass, sayPass, verifyPass, verifySignature } from '../src/index.js';

const W = JSON.parse(readFileSync(new URL('../../vectors/buyer-word-1.json', import.meta.url), 'utf8'));
const V = JSON.parse(readFileSync(new URL('../../vectors/word-pass-1.json', import.meta.url), 'utf8'));
const keys = [V.key];

test('vectors/buyer-word-1.json: the table, the signed pass, the sentence, the forged badge', async () => {
  for (const c of W.cases) assert.deepEqual(buyerWordOf({ as_buyer: c.as_buyer }), c.buyer_word);
  assert.equal(await verifySignature(W.pass, keys), true);
  const v = await verifyPass(W.pass, { keys });
  assert.deepEqual([v.valid, v.word_consistent], [true, true]);
  assert.equal(sayPass(W.pass), W.say);
  // An honest dispute it lost changes nothing: still pays_99.
  assert.equal(W.pass.as_buyer.disputes_upheld_for_seller, 1);
  assert.equal(W.pass.buyer_word.badge, 'pays_99');
  const f = await verifyPass(W.forged.pass, { keys });
  assert.equal(await verifySignature(W.forged.pass, keys), true); // signed by the issuer ...
  assert.deepEqual([f.valid, f.word_consistent], [false, W.forged.word_consistent]); // ... and still caught
  // A pass from before section 4 grew the buyer's word claims nothing about it, and stays valid.
  assert.equal((await verifyPass(V.passes[0], { keys })).valid, true);
});

test('checkWordPass: trust for the seller, buyer_trust for the buyer; a forged buyer badge makes the pass invalid', async () => {
  const web = (pass) => async (url) => {
    const u = new URL(url);
    if (u.pathname === '/.well-known/pazair-receipts.json') return Response.json({ issuer: 'example', keys });
    if (u.pathname === '/v1/agents/ag_muse/pass') return Response.json({ current: pass, anchored: null });
    return new Response('no', { status: 404 });
  };
  const r = await checkWordPass('https://issuer.example/v1/agents/ag_muse/pass', { fetch: web(W.pass) });
  assert.equal(r.trust, 'no_badge_yet'); // it sells nothing: no seller's badge
  assert.equal(r.buyer_trust, 'signed_unanchored'); // it has the buyer's badge, not anchored in this test
  assert.match(r.say, /As a buyer: paid for 99 % or more of 12 delivered orders from 6 sellers, 0 chargebacks\./);
  const bad = await checkWordPass('https://issuer.example/v1/agents/ag_muse/pass', { fetch: web(W.forged.pass) });
  assert.equal(bad.trust, 'invalid');
  assert.equal(bad.buyer_trust, undefined);
});
