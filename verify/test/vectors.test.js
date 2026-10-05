import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canonical, checkWordPass, leafOf, sayPass, sha256hex, verifyProof, verifySignature, stellarHasRoot } from '../src/index.js';

const V = JSON.parse(readFileSync(new URL('../../vectors/word-pass-1.json', import.meta.url), 'utf8'));
const keys = [V.key];

test('the published test vectors hold: canonical form, signatures, leaves, root, proofs, Stellar memo, sentence', async () => {
  assert.equal(canonical(V.canonical.input), V.canonical.output);
  for (const p of V.passes) assert.equal(await verifySignature(p, keys), true);
  assert.equal(await verifySignature(V.receipt.object, keys), true);
  assert.equal(await sha256hex(V.receipt.delivery), V.receipt.object.delivery_sha256);
  assert.deepEqual(await Promise.all(V.passes.map(leafOf)), V.leaves);
  for (let i = 0; i < V.leaves.length; i++) assert.equal(await verifyProof(V.leaves[i], V.tree.proofs[i], V.tree.root), true);
  // Ed25519 is deterministic: the private test key signs to the same bytes.
  const priv = await crypto.subtle.importKey('jwk', { kty: 'OKP', crv: 'Ed25519', x: V.key.x, d: V.key.d_test_only }, { name: 'Ed25519' }, false, ['sign']);
  const { sig, ...body } = V.passes[0];
  const again = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign({ name: 'Ed25519' }, priv, new TextEncoder().encode(canonical(body)))))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  assert.equal(again, sig);
  assert.equal(sayPass(V.passes[0]), V.say);
});

/** A tiny web: one issuer serving Alpha's pass and its keys, and Horizon. */
function web(memo = V.stellar_memo.memo_base64, pass = V.passes[0]) {
  const doc = { current: pass, anchored: { pass, leaf: V.leaves[0], proof: V.tree.proofs[0], root: { day: '2026-10-05', root: V.tree.root, bitcoin_ots: 'AA==', stellar_tx: 'ab'.repeat(32) } } };
  return async (url) => {
    const u = new URL(url);
    if (u.host === 'horizon.stellar.org') return Response.json({ successful: true, memo_type: 'hash', memo });
    if (u.pathname === '/.well-known/pazair-receipts.json') return Response.json({ keys });
    if (u.pathname === '/v1/agents/ag_alpha/pass') return Response.json(doc);
    return new Response('no', { status: 404 });
  };
}

test('"May I see your Word Pass?": one URL, checked against the issuer key, the proof and Stellar', async () => {
  const ok = await checkWordPass('https://issuer.example/v1/agents/ag_alpha/pass', { fetch: web() });
  assert.equal(ok.trust, 'kept_its_word');
  assert.deepEqual(ok.checks, { signature: true, in_root: true, day: '2026-10-05', stellar: true, bitcoin_ots: true });
  assert.match(ok.say, /^Alpha .* Checked: signature of issuer\.example valid, in the Merkle root of 2026-10-05, found on Stellar, stamped in Bitcoin\.$/);

  assert.equal((await checkWordPass('https://issuer.example/v1/agents/ag_alpha/pass', { fetch: web(btoa('x'.repeat(32))) })).trust, 'invalid');
  const forged = { ...V.passes[0], as_seller: { ...V.passes[0].as_seller, delivered: 900 } };
  assert.equal((await checkWordPass('https://issuer.example/v1/agents/ag_alpha/pass', { fetch: web(undefined, forged) })).trust, 'invalid');
  assert.equal((await checkWordPass('http://issuer.example/v1/agents/ag_alpha/pass', { fetch: web() })).trust, 'unreachable');
  assert.equal((await checkWordPass('https://issuer.example/nothing', { fetch: web() })).trust, 'unreachable');
  assert.equal(await stellarHasRoot('ab'.repeat(32), V.tree.root, { fetch: async () => new Response('', { status: 404 }) }), null);
});
