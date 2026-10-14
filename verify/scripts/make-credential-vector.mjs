// Writes vectors/credential-1.json (SPEC section 18): the Word Pass of word-pass-1.json as a W3C Verifiable Credential,
// signed with the same test key. Ed25519 is deterministic and `created` is fixed, so the file reproduces byte for byte
// (CI: node scripts/make-credential-vector.mjs && git diff --exit-code ../vectors/credential-1.json).
import { readFileSync, writeFileSync } from 'node:fs';
import { base58btcEncode, canonical, didWebUrl, multikeyOf, sha256hex, signDataIntegrity } from '../src/index.js';

const V = JSON.parse(readFileSync(new URL('../../vectors/word-pass-1.json', import.meta.url), 'utf8'));
const origin = 'https://issuer.example', did = 'did:web:issuer.example', vm = `${did}#${V.key.kid}`;
const priv = await crypto.subtle.importKey('jwk', { kty: 'OKP', crv: 'Ed25519', x: V.key.x, d: V.key.d_test_only }, { name: 'Ed25519' }, false, ['sign']);

const didDocument = {
  '@context': ['https://www.w3.org/ns/did/v1', 'https://w3id.org/security/multikey/v1'],
  id: did,
  alsoKnownAs: [origin],
  verificationMethod: [{ id: vm, type: 'Multikey', controller: did, publicKeyMultibase: multikeyOf(V.key.x) }],
  assertionMethod: [vm],
  service: [{ id: `${did}#word-pass-keys`, type: 'WordPassIssuerKeys', serviceEndpoint: `${origin}/.well-known/pazair-receipts.json` }],
};
const keysDocument = { issuer: 'example', alg: 'Ed25519', canonical: 'JSON with sorted keys, without "sig"', keys: [{ kid: V.key.kid, kty: 'OKP', crv: 'Ed25519', x: V.key.x }], did };
const wordPass = { pass: V.passes[0], leaf: V.leaves[0], proof: V.tree.proofs[0], root: { day: '2026-10-05', root: V.tree.root, bitcoin_ots: V.bitcoin.ots_base64, stellar_tx: 'ab'.repeat(32) } };
const unsigned = {
  '@context': ['https://www.w3.org/ns/credentials/v2'],
  type: ['VerifiableCredential', 'WordPassCredential'],
  issuer: did,
  validFrom: V.passes[0].issued_at,
  credentialSubject: { id: `${origin}/v1/agents/${V.passes[0].agent}/pass`, wordPass },
};
const credential = await signDataIntegrity(unsigned, priv, vm, new Date('2026-10-14T00:00:00Z'));
const { proofValue, ...proofConfig } = credential.proof;
const forged = structuredClone(credential); forged.credentialSubject.wordPass.pass.as_seller.delivered = 900;
const hex = (b) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');

const vector = {
  about: 'Test vectors for SPEC section 18: the Word Pass as a W3C Verifiable Credential 2.0, Data Integrity proof eddsa-jcs-2022, issuer did:web. The key is the test key of word-pass-1.json (private half there, for tests only). Ed25519 is deterministic: the same proof config and document give the same proofValue.',
  key: { kid: V.key.kid, x: V.key.x, multikey: multikeyOf(V.key.x) },
  base58btc: [
    { hex: hex(new TextEncoder().encode('Hello World!')), base58btc: base58btcEncode(new TextEncoder().encode('Hello World!')) },
    { hex: '000001', base58btc: base58btcEncode(Uint8Array.from([0, 0, 1])) },
  ],
  did_web: [
    { did, url: didWebUrl(did) },
    { did: 'did:web:localhost%3A8799', url: didWebUrl('did:web:localhost%3A8799') },
    { did: 'did:web:issuer.example:markets:one', url: didWebUrl('did:web:issuer.example:markets:one') },
  ],
  did_document: didDocument,
  keys_document: keysDocument,
  credential,
  steps: {
    proof_config_canonical_sha256: await sha256hex(canonical(proofConfig)),
    document_canonical_sha256: await sha256hex(canonical(unsigned)),
    signed_bytes: 'sha256(canonical(proof config)) || sha256(canonical(document without proof)), 64 bytes',
  },
  forged: { change: 'credentialSubject.wordPass.pass.as_seller.delivered = 900', credential: forged, valid: false },
};
writeFileSync(new URL('../../vectors/credential-1.json', import.meta.url), JSON.stringify(vector, null, 2) + '\n');
console.log('vectors/credential-1.json written');
