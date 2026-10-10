import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkWordPass, loadMlDsa, pqKid, verifyHolderProof, verifyPass, verifyPqSignature, verifyReceipt, verifySignature } from '../src/index.js';

const V = JSON.parse(readFileSync(new URL('../../vectors/word-pass-1.json', import.meta.url), 'utf8'));
const P = V.pq, keys = P.keys_document.keys, pqKeys = P.keys_document.pq_keys;
const pqHere = !!(await loadMlDsa());

test('section 16: the second signature verifies with the published ML-DSA-65 key; Ed25519 still verifies on its own', async () => {
  assert.equal(await pqKid(P.public_key_b64url), P.pq_kid);
  assert.equal(pqKeys[0].alg, 'ML-DSA-65');
  // Verifiers that know only Ed25519 (pazair-verify 1.8 and earlier) keep verifying: sig covers pq_kid and pq_sig.
  assert.equal(await verifySignature(P.pass, keys), true);
  assert.equal(await verifySignature(P.receipt, keys), true);
  const pass = await verifyPass(P.pass, { keys, pqKeys });
  assert.equal(pass.pq_signed, true);
  assert.equal(pass.ml_dsa_65, pqHere ? true : null);
  assert.equal(pass.valid, true);
  const receipt = await verifyReceipt(P.receipt, { keys, pqKeys, delivery: V.receipt.delivery });
  assert.deepEqual(receipt, { valid: true, signature_valid: true, pq_signed: true, ml_dsa_65: pqHere ? true : null, delivery_matches: true });
  const h = P.holder_proof;
  assert.deepEqual(await verifyHolderProof(h.object, { keys, pqKeys, agent: 'ag_alpha', nonce: h.nonce, now: Date.parse(h.valid_at) }), { ok: true, reason: 'ok' });
});

test('section 16: a changed object, an unknown or revoked pq key, a missing pq_sig', async () => {
  assert.deepEqual(await verifyPqSignature(P.tampered.pass, pqKeys), { signed: true, valid: pqHere ? false : null });
  if (pqHere) {
    assert.equal((await verifyPass(P.tampered.pass, { keys, pqKeys })).valid, false);
    assert.equal((await verifyHolderProof({ ...P.holder_proof.object, nonce: 'nonce-other12345' }, { keys, pqKeys, agent: 'ag_alpha', nonce: 'nonce-other12345', now: Date.parse(P.holder_proof.valid_at) })).ok, false);
  }
  // Without the key published, the second signature is unknown, not a failure.
  assert.deepEqual(await verifyPqSignature(P.pass, []), { signed: true, valid: null });
  // A pq_kid that does not hash from its own key is not the issuer's key.
  assert.deepEqual(await verifyPqSignature(P.pass, [{ ...pqKeys[0], pq_kid: P.pass.pq_kid, public_key_b64url: pqKeys[0].public_key_b64url.slice(0, -4) + 'AAAA' }]), { signed: true, valid: false });
  // A revoked pq key counts only for what a Bitcoin block proves older than the revocation.
  const revoked = [{ ...pqKeys[0], revoked_at: '2026-10-06T00:00:00Z' }];
  assert.deepEqual(await verifyPqSignature(P.pass, revoked), { signed: true, valid: false });
  assert.deepEqual(await verifyPqSignature(P.pass, revoked, { anchoredBefore: '2026-10-05' }), { signed: true, valid: pqHere ? true : null });
  // No pq_sig: not signed twice, not a failure.
  assert.deepEqual(await verifyPqSignature(V.passes[0], pqKeys), { signed: false, valid: null });
});

test('section 16: checkWordPass reports the second signature and refuses a broken one', async () => {
  const web = (pass) => async (url) => {
    const u = new URL(url);
    if (u.pathname === '/.well-known/pazair-receipts.json') return Response.json(P.keys_document);
    if (u.pathname === '/v1/agents/ag_alpha/pass') return Response.json({ current: pass });
    return new Response('no', { status: 404 });
  };
  const ok = await checkWordPass('https://issuer.example/v1/agents/ag_alpha/pass', { fetch: web(P.pass) });
  assert.equal(ok.trust, 'signed_unanchored');
  assert.equal(ok.checks.ml_dsa_65, pqHere ? true : null);
  if (pqHere) assert.match(ok.say, /valid \(Ed25519 and ML-DSA-65\)/);
  if (pqHere) {
    // Ed25519 re-signed by the issuer over a changed body, pq_sig left as it was: the second signature catches it.
    const bad = await checkWordPass('https://issuer.example/v1/agents/ag_alpha/pass', { fetch: web({ ...P.tampered.pass, sig: P.pass.sig }) });
    assert.equal(bad.trust, 'invalid');
  }
});
