import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildDay, signMandate, signMandateEnd, generateKey, importKey, keysDocument, passDocument, signHolderProof, signPass, signReceipt, stellarMemo, word } from '../src/index.js';
import { checkWordPass, verifyHolderProof, verifyPass, verifyReceipt, verifyReceiptChain, verifyMandate } from '../../verify/src/index.js';

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
  assert.equal(c.trust, 'signed_unanchored', 'a badge counts as proven once a root is anchored on Stellar or Bitcoin'); assert.equal(c.issuer, 'newmarket.example');
  const r = await signReceipt(key, 'newmarket', { order: 'o1', listing: 'l1', seller: 'a1', buyer: 'a2', amount_minor: 500, currency: 'chf', delivered_at: '2026-10-06T10:00:00Z', delivery: { ok: true } });
  assert.equal((await verifyReceipt(r, { keys: keys.keys, delivery: { ok: true } })).valid, true);
  assert.equal(JSON.stringify(keys).includes('"d"'), false, 'the private half is never published');
});

test('holder proofs from the kit pass the reference check; the anchor account is declared with the keys', async () => {
  const key = await generateKey();
  const doc = keysDocument('newmarket', [key], { stellarAnchor: 'GANCHOR' });
  assert.deepEqual(doc.anchors, { stellar: { account: 'GANCHOR', network: 'mainnet' } });
  const p = await signHolderProof(key, 'newmarket', 'a1', 'nonce-123456');
  assert.deepEqual(await verifyHolderProof(p, { keys: doc.keys, agent: 'a1', nonce: 'nonce-123456' }), { ok: true, reason: 'ok' });
  await assert.rejects(signHolderProof(key, 'newmarket', 'a1', 'short'));
  assert.equal(keysDocument('newmarket', [key], { revoked: { [key.kid]: '2026-10-06T00:00:00Z' } }).keys[0].revoked_at, '2026-10-06T00:00:00Z');
});

test('a seller that buys to deliver: the kit signs the chain, the reference check walks it', async () => {
  const key = await generateKey(); const keys = keysDocument('newmarket', [key]).keys;
  const base = { listing: 'l', currency: 'chf', delivery: { ok: true } };
  const sub = await signReceipt(key, 'newmarket', { ...base, order: 'o2', seller: 'a3', buyer: 'a2', amount_minor: 100, delivered_at: '2026-10-06T10:00:00Z', parent_order: 'o1' });
  const top = await signReceipt(key, 'newmarket', { ...base, order: 'o1', seller: 'a2', buyer: 'a1', amount_minor: 500, delivered_at: '2026-10-06T10:01:00Z', inputs: [sub] });
  assert.equal((await verifyReceiptChain(top, { receipts: [sub], keys })).valid, true);
  const foreign = await signReceipt(key, 'newmarket', { ...base, order: 'o3', seller: 'a3', buyer: 'a9', amount_minor: 100, delivered_at: '2026-10-06T10:00:00Z', parent_order: 'o1' });
  const claims = await signReceipt(key, 'newmarket', { ...base, order: 'o1', seller: 'a2', buyer: 'a1', amount_minor: 500, delivered_at: '2026-10-06T10:01:00Z', inputs: [foreign] });
  assert.match((await verifyReceiptChain(claims, { receipts: [foreign], keys })).broken, /bought by a9/, 'no claiming someone else\'s purchase');
});

test('a mandate from the kit: receipts within it pass, one over the cap or after the end does not', async () => {
  const key = await generateKey(); const keys = keysDocument('newmarket', [key]).keys;
  const m = await signMandate(key, 'newmarket', { id: 'md_1', agent: 'a1', principal: 'cus_1', currency: 'chf', max_order_minor: 1000, issued_at: '2026-10-08T08:00:00Z' });
  assert.equal(m.principal.length, 64, 'only a hash of the principal is published');
  const r = (amount_minor, delivered_at = '2026-10-08T10:00:00Z') => signReceipt(key, 'newmarket', { order: 'o1', listing: 'l', seller: 'a2', buyer: 'a1', amount_minor, currency: 'chf', delivered_at, delivery: { ok: true }, mandate: m });
  assert.equal((await verifyMandate(await r(500), m, { keys })).valid, true);
  assert.equal((await verifyMandate(await r(5000), m, { keys })).valid, false);
  const end = await signMandateEnd(key, 'newmarket', m, new Date('2026-10-08T09:00:00Z'));
  assert.deepEqual((await verifyMandate(await r(500), m, { keys, end })).reasons, ['delivered after the mandate ended']);
});

test('section 16: a key that signs twice; verifiers that know only Ed25519 keep verifying', async (t) => {
  try { await import('@noble/post-quantum/ml-dsa.js'); } catch { return t.skip('@noble/post-quantum not installed: the second signature is optional'); }
  const { importPqKey, withSecondSignature, canonical } = await import('../src/index.js');
  const ed = await importKey({ kty: 'OKP', crv: 'Ed25519', x: V.key.x, d: V.key.d_test_only });
  const pq = await importPqKey(V.pq.seed_test_only);
  assert.equal(pq.pq_kid, V.pq.pq_kid);
  assert.equal(pq.public_key_b64url, V.pq.public_key_b64url);
  const key = withSecondSignature(ed, pq);
  const { sig, pq_sig, ...body } = V.pq.pass;
  const signed = await key.sign(body);
  assert.equal(signed.pq_kid, V.pq.pq_kid);
  assert.equal(typeof signed.pq_sig, 'string');
  const kd = keysDocument('example', [ed], { pqKeys: [pq] });
  assert.deepEqual(kd.pq_keys, V.pq.keys_document.pq_keys);
  const { ml_dsa65 } = await import('@noble/post-quantum/ml-dsa.js');
  const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
  const { sig: s2, pq_sig: p2, ...b2 } = signed;
  assert.equal(ml_dsa65.verify(unb64u(p2), new TextEncoder().encode(canonical(b2)), unb64u(pq.public_key_b64url)), true);
});
