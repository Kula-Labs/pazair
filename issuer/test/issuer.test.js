import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildDay, generateKey, importKey, keysDocument, passDocument, signPass, signReceipt, stellarMemo, word } from '../src/index.js';
import { checkWordPass, verifyPass, verifyReceipt } from '../../verify/src/index.js';

const V = JSON.parse(readFileSync(new URL('../../vectors/word-pass-1.json', import.meta.url), 'utf8'));

test('reproduces the published test vectors byte for byte', async () => {
  const key = await importKey({ kty: 'OKP', crv: 'Ed25519', x: V.key.x, d: V.key.d_test_only });
  assert.equal(key.kid, V.key.kid);
  for (const p of V.passes) { const { sig, ...body } = p; assert.equal((await key.sign(body)).sig, sig); }
  const day = await buildDay(V.passes);
  assert.equal(day.root, V.tree.root);
  assert.deepEqual([0, 1, 2].map(day.proof), V.tree.proofs);
  assert.equal(stellarMemo(day.root).base64, V.stellar_memo.memo_base64);
});

test('a new marketplace issues passes that the reference verifier accepts, end to end over its own URL', async () => {
  const key = await generateKey();
  const mk = (agent, delivered, buyers) => signPass(key, 'newmarket', { agent, name: agent, since: '2026-10-01T00:00:00.000Z', as_seller: { delivered, not_delivered: 0, buyers } }, new Date('2026-10-06T03:00:00Z'));
  const passes = [await mk('a1', 20, 9), await mk('a2', 2, 1)];
  assert.deepEqual(passes[0].word, { kept_pct: 100, badge: 'word_kept_99' });
  assert.deepEqual(word({ delivered: 20, not_delivered: 0, buyers: 4 }), { kept_pct: 100, badge: null }, 'five different buyers or no badge');
  const day = await buildDay(passes);
  const doc = passDocument(passes[0], { pass: passes[0], leaf: day.leaves[0], proof: day.proof(0), root: { day: '2026-10-06', root: day.root, stellar_tx: null, bitcoin_ots: null } });
  const keys = keysDocument('newmarket', [key]);
  assert.equal((await verifyPass(doc.anchored, { keys: keys.keys })).valid, true);
  const f = async (url) => new URL(url).pathname === '/.well-known/pazair-receipts.json' ? Response.json(keys) : Response.json(doc);
  const c = await checkWordPass('https://newmarket.example/agents/a1/pass', { fetch: f });
  assert.equal(c.trust, 'kept_its_word'); assert.equal(c.issuer, 'newmarket.example');
  const r = await signReceipt(key, 'newmarket', { order: 'o1', listing: 'l1', seller: 'a1', buyer: 'a2', amount_minor: 500, currency: 'chf', delivered_at: '2026-10-06T10:00:00Z', delivery: { ok: true } });
  assert.equal((await verifyReceipt(r, { keys: keys.keys, delivery: { ok: true } })).valid, true);
  assert.equal(JSON.stringify(keys).includes('"d"'), false, 'the private half is never published');
});
