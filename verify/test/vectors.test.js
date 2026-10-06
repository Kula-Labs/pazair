import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bitcoinHasRoot, canonical, checkWordPass, readOts, leafOf, sayPass, sha256hex, verifyHolderProof, verifyPass, verifyProof, verifySignature, stellarHasRoot } from '../src/index.js';

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
function web(memo = V.stellar_memo.memo_base64, pass = V.passes[0], { source = 'GANCHOR', anchors = { stellar: { account: 'GANCHOR', network: 'mainnet' } }, ots = V.bitcoin.ots_base64, merkle = V.bitcoin.block_merkle_root } = {}) {
  const doc = { current: pass, anchored: { pass, leaf: V.leaves[0], proof: V.tree.proofs[0], root: { day: '2026-10-05', root: V.tree.root, bitcoin_ots: ots, stellar_tx: 'ab'.repeat(32) } } };
  return async (url) => {
    const u = new URL(url);
    if (u.host === 'blockstream.info' && u.pathname === `/api/block-height/${V.bitcoin.height}`) return new Response(V.bitcoin.block_hash);
    if (u.host === 'blockstream.info' && u.pathname === `/api/block/${V.bitcoin.block_hash}`) return Response.json({ height: V.bitcoin.height, merkle_root: merkle, timestamp: V.bitcoin.block_time });
    if (u.host === 'horizon.stellar.org') return Response.json({ successful: true, memo_type: 'hash', memo, source_account: source });
    if (u.pathname === '/.well-known/pazair-receipts.json') return Response.json({ keys, anchors });
    if (u.pathname === '/v1/agents/ag_alpha/pass') return Response.json(doc);
    return new Response('no', { status: 404 });
  };
}

test('"May I see your Word Pass?": one URL, checked against the issuer key, the proof and Stellar', async () => {
  const ok = await checkWordPass('https://issuer.example/v1/agents/ag_alpha/pass', { fetch: web() });
  assert.equal(ok.trust, 'kept_its_word');
  assert.deepEqual(ok.checks, { signature: true, in_root: true, day: '2026-10-05', stellar: true, stellar_account_bound: true, bitcoin_ots: true, bitcoin: true, bitcoin_block: { height: V.bitcoin.height, hash: V.bitcoin.block_hash, time: new Date(V.bitcoin.block_time * 1000).toISOString() }, holder: null });
  assert.match(ok.say, /^Alpha .* Checked: signature of issuer\.example valid, in the Merkle root of 2026-10-05, found on Stellar from the issuer's anchor account, confirmed in Bitcoin block 915102 \(2026-10-05\)\. To be sure it is theirs/);
  // The same memo written from someone else's account is not the issuer's anchor.
  assert.equal((await checkWordPass('https://issuer.example/v1/agents/ag_alpha/pass', { fetch: web(undefined, undefined, { source: 'GOTHER' }) })).trust, 'invalid');

  assert.equal((await checkWordPass('https://issuer.example/v1/agents/ag_alpha/pass', { fetch: web(btoa('x'.repeat(32))) })).trust, 'invalid');
  const forged = { ...V.passes[0], as_seller: { ...V.passes[0].as_seller, delivered: 900 } };
  assert.equal((await checkWordPass('https://issuer.example/v1/agents/ag_alpha/pass', { fetch: web(undefined, forged) })).trust, 'invalid');
  assert.equal((await checkWordPass('http://issuer.example/v1/agents/ag_alpha/pass', { fetch: web() })).trust, 'unreachable');
  assert.equal((await checkWordPass('https://issuer.example/nothing', { fetch: web() })).trust, 'unreachable');
  assert.equal(await stellarHasRoot('ab'.repeat(32), V.tree.root, { fetch: async () => new Response('', { status: 404 }) }), null);
});

const signer = async () => {
  const priv = await crypto.subtle.importKey('jwk', { kty: 'OKP', crv: 'Ed25519', x: V.key.x, d: V.key.d_test_only }, { name: 'Ed25519' }, false, ['sign']);
  return async (body) => ({ ...body, sig: btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign({ name: 'Ed25519' }, priv, new TextEncoder().encode(canonical(body)))))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') });
};

test('holder proof: the published vector, then a copied URL with someone else\'s proof is rejected', async () => {
  const h = V.holder_proof;
  assert.deepEqual(await verifyHolderProof(h.object, { keys, agent: 'ag_alpha', nonce: h.object.nonce, now: Date.parse(h.valid_at) }), { ok: true, reason: 'ok' });
  assert.equal((await verifyHolderProof(h.object, { keys, agent: 'ag_alpha', nonce: h.object.nonce, now: Date.parse(h.expired_at) })).ok, false);
  assert.equal((await verifyHolderProof(h.object, { keys, agent: 'ag_beta', nonce: h.object.nonce, now: Date.parse(h.valid_at) })).ok, false);
  const sign = await signer(), nonce = 'n-' + crypto.randomUUID(), exp = new Date(Date.now() + 60000).toISOString();
  const mine = await sign({ v: 1, kind: 'word_pass_proof', issuer: 'example', kid: V.key.kid, agent: 'ag_alpha', nonce, aud: null, iat: new Date().toISOString(), exp });
  const theirs = await sign({ ...mine, sig: undefined, agent: 'ag_beta' }).then(({ sig, ...b }) => sign(b));
  const url = 'https://issuer.example/v1/agents/ag_alpha/pass';
  assert.equal((await checkWordPass(url, { fetch: web(), proof: mine, nonce })).checks.holder, true);
  assert.equal((await checkWordPass(url, { fetch: web(), proof: theirs, nonce })).trust, 'invalid');
  assert.equal((await checkWordPass(url, { fetch: web(), proof: mine, nonce: 'a-different-nonce' })).trust, 'invalid');
});

test('a revoked key signs nothing new; what was anchored before the revocation stays valid', async () => {
  const anchored = { pass: V.passes[0], proof: V.tree.proofs[0], root: { day: '2026-10-05', root: V.tree.root } };
  assert.equal((await verifyPass(anchored, { keys: [{ ...V.key, revoked_at: '2026-10-06T00:00:00Z' }] })).valid, true);
  assert.equal((await verifyPass(anchored, { keys: [{ ...V.key, revoked_at: '2026-10-05T12:00:00Z' }] })).valid, false, 'same day: not provably before');
  assert.equal((await verifyPass(V.passes[0], { keys: [{ ...V.key, revoked_at: '2026-10-06T00:00:00Z' }] })).valid, false, 'not anchored: could be backdated');
});

test('Bitcoin: the published .ots vector walks to the block\'s Merkle root; a proof for another root or block is invalid', async () => {
  const bytes = Uint8Array.from(atob(V.bitcoin.ots_base64), (c) => c.charCodeAt(0));
  const r = await readOts(bytes);
  assert.equal(r.digest, V.tree.root);
  assert.deepEqual(r.claims.map((c) => [c.height, c.msg.match(/../g).reverse().join('')]), [[V.bitcoin.height, V.bitcoin.block_merkle_root]]);
  const url = 'https://issuer.example/v1/agents/ag_alpha/pass';
  // A real proof, but for another root (here: a leaf instead of the root).
  const other = await checkWordPass(url, { fetch: web(undefined, undefined, { ots: V.bitcoin.ots_base64.replace('KBm0', 'KBm1') }) });
  assert.equal(other.trust, 'invalid');
  assert.equal(other.checks.bitcoin, false);
  // The block it names carries something else.
  const block = await checkWordPass(url, { fetch: web(undefined, undefined, { merkle: 'ee'.repeat(32) }) });
  assert.equal(block.trust, 'invalid');
  assert.match(block.say, /Bitcoin proof/);
  assert.equal((await checkWordPass(url, { fetch: web(undefined, undefined, { ots: 'AA==' }) })).trust, 'invalid');
  // No explorer answers: neutral, the rest of the pass still stands.
  assert.deepEqual(await bitcoinHasRoot(V.bitcoin.ots_base64, V.tree.root, { fetch: async () => new Response('', { status: 503 }) }), { ok: null, status: 'unverified' });
});
