import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canonical, leafOf, sha256hex, verifyPass, verifyProof, verifyReceipt } from '../src/index.js';

const b64u = (b) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function issuer() {
  const pair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  const kid = (await sha256hex(jwk.x)).slice(0, 16);
  const sign = async (body) => ({ ...body, sig: b64u(await crypto.subtle.sign({ name: 'Ed25519' }, pair.privateKey, new TextEncoder().encode(canonical(body)))) });
  return { keys: [{ kid, kty: 'OKP', crv: 'Ed25519', x: jwk.x }], kid, sign };
}

// The tree as the issuer builds it: hex leaves, an odd node paired with itself.
async function tree(leaves, index) {
  const proof = []; let level = leaves, i = index;
  while (level.length > 1) {
    const sib = i % 2 ? i - 1 : i + 1;
    proof.push({ side: i % 2 ? 'L' : 'R', hash: level[sib] ?? level[i] });
    const next = [];
    for (let k = 0; k < level.length; k += 2) next.push(await sha256hex(level[k] + (level[k + 1] ?? level[k])));
    level = next; i = Math.floor(i / 2);
  }
  return { root: level[0], proof };
}

test('canonical JSON sorts keys at every level', () => {
  assert.equal(canonical({ b: 1, a: { d: [2, { z: 1, y: 2 }], c: null } }), '{"a":{"c":null,"d":[2,{"y":2,"z":1}]},"b":1}');
});

test('a receipt verifies; a changed amount or a foreign delivery does not', async () => {
  const k = await issuer();
  const delivery = { result: 'translated text' };
  const r = await k.sign({ v: 1, issuer: 'pazair', kid: k.kid, order: 'or_1', listing: 'ls_1', seller: 'ag_s', buyer: 'ag_b', amount_minor: 500, currency: 'chf', delivered_at: '2026-10-05T10:00:00Z', delivery_sha256: await sha256hex(JSON.stringify(delivery)) });
  assert.deepEqual(await verifyReceipt(r, { keys: k.keys, delivery }), { valid: true, signature_valid: true, delivery_matches: true });
  assert.equal((await verifyReceipt({ ...r, amount_minor: 5 }, { keys: k.keys })).valid, false);
  assert.equal((await verifyReceipt(r, { keys: k.keys, delivery: { result: 'other' } })).valid, false);
  assert.equal((await verifyReceipt(r, { keys: (await issuer()).keys })).valid, false, 'another issuer\'s key');
});

test('a Word Pass verifies into the day\'s root for trees of any size; a better record than earned fails', async () => {
  const k = await issuer();
  for (const n of [1, 2, 3, 5, 8, 13]) {
    const passes = await Promise.all(Array.from({ length: n }, (_, i) => k.sign({ v: 1, issuer: 'pazair', kind: 'word_pass', kid: k.kid, agent: `ag_${i}`, as_seller: { delivered: i }, day: '2026-10-05' })));
    const leaves = await Promise.all(passes.map(leafOf));
    for (let i = 0; i < n; i++) {
      const { root, proof } = await tree(leaves, i);
      assert.ok(await verifyProof(leaves[i], proof, root));
      const ok = await verifyPass({ pass: passes[i], proof, root: { root, day: '2026-10-05', stellar_tx: 'ab' } }, { keys: k.keys });
      assert.deepEqual([ok.valid, ok.signature_valid, ok.in_root, ok.anchors.stellar_tx], [true, true, true, 'ab']);
      const forged = { ...passes[i], as_seller: { delivered: 999 } };
      assert.equal((await verifyPass({ pass: forged, proof, root: { root } }, { keys: k.keys })).valid, false);
    }
  }
});
