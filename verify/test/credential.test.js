// SPEC section 18: the Word Pass as a W3C Verifiable Credential 2.0. First the W3C's own test vector, reproduced byte for
// byte (Data Integrity EdDSA Cryptosuites v1.0, eddsa-jcs-2022), then ours, then hostile input: a verdict, never a crash.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { base58btcDecode, base58btcEncode, canonical, didWebUrl, multikeyOf, multikeyToX, sha256hex, signDataIntegrity, verifyCredential, verifyDataIntegrity } from '../src/index.js';

const C = JSON.parse(readFileSync(new URL('../../vectors/credential-1.json', import.meta.url), 'utf8'));
const V = JSON.parse(readFileSync(new URL('../../vectors/word-pass-1.json', import.meta.url), 'utf8'));
const b64u = (b) => btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const at = Date.parse('2026-10-14T00:00:00Z');
const given = { didDocument: C.did_document, keysDocument: C.keys_document, now: at };

test('the W3C Recommendation\'s own eddsa-jcs-2022 vector: same hashes, same proofValue, and it verifies', async () => {
  const pub = 'z6MkrJVnaZkeFzdQyMZu1cgjg7k1pZZ6pvBQ7XJPt4swbTQ2', secret = base58btcDecode('3u2en7t5LR2WtQH5PfFqMqwVHBeXouLzo6haApm8XHqvjxq');
  assert.deepEqual([secret[0], secret[1], secret.length], [0x80, 0x26, 34]); // ed25519-priv multicodec, then the 32-byte seed
  const priv = await crypto.subtle.importKey('jwk', { kty: 'OKP', crv: 'Ed25519', x: multikeyToX(pub), d: b64u(secret.slice(2)) }, { name: 'Ed25519' }, false, ['sign']);
  const credential = {
    '@context': ['https://www.w3.org/ns/credentials/v2', 'https://www.w3.org/ns/credentials/examples/v2'],
    id: 'urn:uuid:58172aac-d8ba-11ed-83dd-0b3aef56cc33', type: ['VerifiableCredential', 'AlumniCredential'], name: 'Alumni Credential',
    description: 'A minimum viable example of an Alumni Credential.', issuer: 'https://vc.example/issuers/5678', validFrom: '2023-01-01T00:00:00Z',
    credentialSubject: { id: 'did:example:abcdefgh', alumniOf: 'The School of Examples' },
  };
  assert.equal(await sha256hex(canonical(credential)), '59b7cb6251b8991add1ce0bc83107e3db9dbbab5bd2c28f687db1a03abc92f19');
  const vm = `did:key:${pub}#${pub}`;
  const signed = await signDataIntegrity(credential, priv, vm, new Date('2023-02-24T23:36:38Z'));
  const { proofValue, ...config } = signed.proof;
  assert.equal(await sha256hex(canonical(config)), '66ab154f5c2890a140cb8388a22a160454f80575f6eae09e5a097cabe539a1db');
  assert.equal(proofValue, 'z2HnFSSPPBzR36zdDgK8PbEHeXbR56YF24jwMpt3R1eHXQzJDMWS93FCzpvJpwTWd3GAVFuUfjoJdcnTMuVor51aX');
  const dd = { id: `did:key:${pub}`, verificationMethod: [{ id: vm, type: 'Multikey', controller: `did:key:${pub}`, publicKeyMultibase: pub }], assertionMethod: [vm] };
  assert.equal((await verifyDataIntegrity(signed, dd)).valid, true);
});

test('vectors/credential-1.json: base58btc, Multikey, did:web, the steps, the proof and the pass inside', async () => {
  for (const b of C.base58btc) {
    const bytes = Uint8Array.from(b.hex.match(/../g), (h) => parseInt(h, 16));
    assert.equal(base58btcEncode(bytes), b.base58btc);
    assert.deepEqual([...base58btcDecode(b.base58btc)], [...bytes]);
  }
  assert.equal(multikeyOf(V.key.x), C.key.multikey);
  assert.equal(multikeyToX(C.key.multikey), V.key.x);
  for (const d of C.did_web) assert.equal(didWebUrl(d.did), d.url);
  const { proof, ...doc } = C.credential, { proofValue, ...config } = proof;
  assert.equal(await sha256hex(canonical(config)), C.steps.proof_config_canonical_sha256);
  assert.equal(await sha256hex(canonical(doc)), C.steps.document_canonical_sha256);
  // Deterministic: the test key signs the same document to the same proofValue.
  const priv = await crypto.subtle.importKey('jwk', { kty: 'OKP', crv: 'Ed25519', x: V.key.x, d: V.key.d_test_only }, { name: 'Ed25519' }, false, ['sign']);
  assert.equal((await signDataIntegrity(doc, priv, proof.verificationMethod, new Date(proof.created))).proof.proofValue, proofValue);
  const r = await verifyCredential(C.credential, given);
  assert.equal(r.valid, true);
  assert.equal(r.trust, 'valid');
  assert.equal(r.same_key, true);
  assert.equal(r.pass.in_root, true);
  assert.equal(r.subject, 'https://issuer.example/v1/agents/ag_alpha/pass');
  assert.match(r.say, /^Alpha \(Word Pass by issuer\.example\): kept its word on 99 % or more; .* proof eddsa-jcs-2022 valid, pass signature valid, in the Merkle root of 2026-10-05\./);
  const f = await verifyCredential(C.forged.credential, given);
  assert.equal(f.valid, C.forged.valid);
});

test('resolving did:web: the DID document and the keys document come from the same origin', async () => {
  const seen = [];
  const fetchStub = async (url) => {
    seen.push(String(url));
    if (url === 'https://issuer.example/.well-known/did.json') return Response.json(C.did_document);
    if (url === 'https://issuer.example/.well-known/pazair-receipts.json') return Response.json(C.keys_document);
    return new Response('no', { status: 404 });
  };
  assert.equal((await verifyCredential(C.credential, { fetch: fetchStub, now: at })).valid, true);
  assert.deepEqual(seen, ['https://issuer.example/.well-known/did.json', 'https://issuer.example/.well-known/pazair-receipts.json']);
  // A DID document that names another DID is not this issuer's.
  const other = async (url) => Response.json({ ...C.did_document, id: 'did:web:evil.example' });
  assert.equal((await verifyCredential(C.credential, { fetch: other, now: at })).trust, 'unreachable');
  assert.equal((await verifyCredential(C.credential, { fetch: async () => new Response('', { status: 500 }), now: at })).trust, 'unreachable');
});

test('hostile credentials: a verdict with a reason, never valid, never a crash', async () => {
  const vc = C.credential;
  const with_ = (patch) => ({ ...structuredClone(vc), ...patch });
  const proof = (patch) => with_({ proof: { ...vc.proof, ...patch } });
  const cases = [
    [proof({ cryptosuite: 'eddsa-rdfc-2022' }), /not an eddsa-jcs-2022/],
    [proof({ proofPurpose: 'authentication' }), /assertionMethod/],
    [proof({ verificationMethod: 'did:web:evil.example#a1171dbbeb4c3fc2' }), /not one of the DID document/],
    [proof({ verificationMethod: 'did:web:issuer.example#other' }), /no Ed25519 assertion key/],
    [proof({ '@context': ['https://www.w3.org/ns/credentials/v2', 'https://evil.example/ctx'] }), /@context/],
    [proof({ '@context': [1e400] }), /@context/],
    [proof({ proofValue: 'zzzz0OIl' }), /base58btc/],
    [proof({ proofValue: 'z' + base58btcEncode(new Uint8Array(64)) }), /signature does not match/],
    [proof({ created: 'yesterday' }), /created/],
    [with_({ proof: [vc.proof] }), /one Data Integrity proof/],
    [with_({ validFrom: '2020-01-01T00:00:00Z' }), /signature does not match/],
    [with_({ issuer: 'https://issuer.example' }), /did:web/],
    [with_({ type: ['VerifiableCredential'] }), /not a Word Pass credential/],
    [with_({ '@context': ['https://www.w3.org/2018/credentials/v1'] }), /not a Verifiable Credential 2\.0/],
    [null, /not a Verifiable Credential 2\.0/],
  ];
  for (const [bad, why] of cases) {
    const r = await verifyCredential(bad, given);
    assert.equal(r.valid, false, String(why));
    assert.match(r.say, why);
  }
  // A proof that holds, around a subject on another origin, or a pass that does not hold: still invalid.
  const priv = await crypto.subtle.importKey('jwk', { kty: 'OKP', crv: 'Ed25519', x: V.key.x, d: V.key.d_test_only }, { name: 'Ed25519' }, false, ['sign']);
  const { proof: _p, ...doc } = vc;
  const resign = async (d) => signDataIntegrity(d, priv, vc.proof.verificationMethod, new Date('2026-10-14T00:00:00Z'));
  const elsewhere = await resign({ ...doc, credentialSubject: { ...doc.credentialSubject, id: 'https://evil.example/v1/agents/ag_alpha/pass' } });
  assert.match((await verifyCredential(elsewhere, given)).say, /not a pass URL on https:\/\/issuer\.example/);
  const inflated = structuredClone(doc); inflated.credentialSubject.wordPass.pass.as_seller.delivered = 900;
  assert.match((await verifyCredential(await resign(inflated), given)).say, /the Word Pass inside does not verify \(signature\)/);
  const expired = await resign({ ...doc, validUntil: '2026-10-13T00:00:00Z' });
  assert.match((await verifyCredential(expired, given)).say, /expired/);
  // did:web that tries to leave its host.
  for (const d of ['did:web:evil.example%2F..', 'did:web:issuer.example:..:x', 'did:web:', 'did:key:z6Mk', 'did:web:a.example%40b.example']) assert.throws(() => didWebUrl(d));
});
