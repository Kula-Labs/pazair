// Hostile input from an issuer or a forger: a verdict, never a crash, and never valid.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canonical, checkWordPass, receiptHash, sha256hex, verifyReceiptChain, verifySignature } from '../src/index.js';
import { checkRemember, loadMlDsa } from '../src/remember.js';

const b64u = (b) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function issuer() {
  const pair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  const kid = (await sha256hex(jwk.x)).slice(0, 16);
  const sign = async (body) => ({ ...body, kid, sig: b64u(await crypto.subtle.sign({ name: 'Ed25519' }, pair.privateKey, new TextEncoder().encode(canonical({ ...body, kid })))) });
  return { keys: [{ kid, kty: 'OKP', crv: 'Ed25519', x: jwk.x }], kid, sign };
}

test('a signed null cannot be read back as Infinity (1e400)', async () => {
  const I = await issuer();
  const m = await I.sign({ kind: 'mandate', scope: { currency: 'chf', max_order_minor: null } });
  assert.equal(await verifySignature(m, I.keys), true);
  const swapped = JSON.parse(JSON.stringify(m).replace('"max_order_minor":null', '"max_order_minor":1e400'));
  assert.equal(swapped.scope.max_order_minor, Infinity);
  assert.equal(await verifySignature(swapped, I.keys), false);
  assert.throws(() => canonical({ a: NaN }), /out of range/);
});

test('keys that are not a list of objects make a signature invalid, not a crash', async () => {
  const I = await issuer(); const m = await I.sign({ kind: 'x' });
  for (const keys of [5, [null], null, 'k', [5]]) assert.equal(await verifySignature(m, keys), false);
});

test('checkWordPass answers a hostile issuer with a verdict', async () => {
  let deep = 'null'; for (let i = 0; i < 20000; i++) deep = `[${deep}]`;
  for (const [pass, keys] of [[{ kind: 'word_pass', agent: 'ag_1', sig: 'x', kid: 'k' }, '{"keys":5}'], [{ kind: 'word_pass', agent: 'ag_1', sig: 'x', kid: 'k' }, 'null'], [null, '{"keys":[]}']]) {
    const f = async (url) => new URL(url).pathname.startsWith('/.well-known') ? new Response(keys) : new Response(pass ? JSON.stringify(pass) : `{"anchored":{"pass":{"kind":"word_pass","x":${deep}},"proof":[],"root":{}}}`);
    const r = await checkWordPass('https://issuer.example/v1/agents/ag_1/pass', { fetch: f });
    assert.notEqual(r.trust, 'verified');
  }
});

test('a receipt chain counts each input once', async () => {
  const I = await issuer();
  const child = await I.sign({ order: 'or_c', buyer: 'ag_s', seller: 'ag_x', parent_order: 'or_p', amount_minor: 100, currency: 'chf', delivered_at: '2026-10-10T00:00:00Z' });
  const h = await receiptHash(child);
  const parent = { order: 'or_p', buyer: 'ag_b', seller: 'ag_s', amount_minor: 500, currency: 'chf', delivered_at: '2026-10-11T00:00:00Z' };
  const top = await I.sign({ ...parent, inputs: [h, h, h] });
  const r = await verifyReceiptChain(top, { receipts: [child], keys: I.keys });
  assert.equal(r.valid, false);
  const once = await verifyReceiptChain(await I.sign({ ...parent, inputs: [h] }), { receipts: [child], keys: I.keys });
  assert.equal(once.valid, true);
});

test('Remember: a document and chain that bring their own ML-DSA key do not pass when the issuer publishes another', { skip: false }, async () => {
  if (!(await loadMlDsa())) return; // the second signature is checked only with @noble/post-quantum installed
  const m = await loadMlDsa();
  const real = m.keygen(crypto.getRandomValues(new Uint8Array(32))), fake = m.keygen(crypto.getRandomValues(new Uint8Array(32)));
  const hex = (b) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  const kidOf = async (pub) => (await sha256hex(hex(pub))).slice(0, 16);
  const I = await issuer();
  const pq_kid = await kidOf(fake.publicKey);
  const body = { v: 1, issuer: 'pazair', kid: I.kid, pq_kid, head: { day: null, head: null, days: 0 }, keys: { ml_dsa_65: { public_key_b64url: b64u(fake.publicKey) } } };
  const bytes = new TextEncoder().encode(canonical(body));
  const sig = b64u(await crypto.subtle.sign({ name: 'Ed25519' }, (await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign'])).privateKey, bytes));
  const doc = { ...body, sig, pq_sig: b64u(m.sign(bytes, fake.secretKey)) };
  const keysDoc = { keys: I.keys, pq_keys: [{ pq_kid: await kidOf(real.publicKey), alg: 'ML-DSA-65', public_key_b64url: b64u(real.publicKey) }] };
  const f = async (url) => { const p = new URL(url).pathname; return new Response(JSON.stringify(p === '/.well-known/pazair-remember.json' ? doc : p === '/.well-known/pazair-receipts.json' ? keysDoc : { chain: [], keys: { ml_dsa_65_public_key_b64url: b64u(fake.publicKey) } })); };
  const r = await checkRemember('https://pazair.test', { fetch: f });
  assert.equal(r.checks.document.ml_dsa_65, false);
  assert.equal(r.verdict, 'inconsistent');
});
