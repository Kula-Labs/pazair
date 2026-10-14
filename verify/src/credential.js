// The Word Pass as a W3C Verifiable Credential 2.0 (SPEC section 18): the issuer as did:web, a Data Integrity proof
// (cryptosuite eddsa-jcs-2022) around the pass document of section 5. Zero dependencies, WebCrypto Ed25519.
// A VC verifier checks the proof without knowing Word Pass; this module checks the proof and the pass inside.
import { canonical, fetchKeysDocument, sayPass, verifyPass } from './index.js';

const enc = new TextEncoder();
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const b64u = (b) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const sha256 = async (s) => new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)));
const same = (a, b) => { try { return canonical(a) === canonical(b); } catch { return false; } };

/** Base58 with the Bitcoin alphabet, as multibase "z" writes it. */
export function base58btcEncode(bytes) {
  let n = 0n;
  for (const b of bytes) n = n * 256n + BigInt(b);
  let s = '';
  while (n > 0n) { s = B58[Number(n % 58n)] + s; n /= 58n; }
  for (const b of bytes) { if (b !== 0) break; s = '1' + s; }
  return s;
}

export function base58btcDecode(s) {
  let n = 0n;
  for (const c of String(s)) { const i = B58.indexOf(c); if (i < 0) throw new Error('not base58btc'); n = n * 58n + BigInt(i); }
  const out = [];
  while (n > 0n) { out.unshift(Number(n % 256n)); n /= 256n; }
  for (const c of String(s)) { if (c !== '1') break; out.unshift(0); }
  return Uint8Array.from(out);
}

/** An Ed25519 public key (JWK x) as a Multikey: "z" + base58btc(0xed 0x01 + the 32 key bytes). */
export function multikeyOf(x) {
  const raw = unb64u(x), b = new Uint8Array(2 + raw.length);
  b[0] = 0xed; b[1] = 0x01; b.set(raw, 2);
  return 'z' + base58btcEncode(b);
}

/** The Ed25519 key (JWK x) in a Multikey, or null when it is not one. */
export function multikeyToX(mb) {
  if (typeof mb !== 'string' || mb[0] !== 'z') return null;
  let b;
  try { b = base58btcDecode(mb.slice(1)); } catch { return null; }
  return b.length === 34 && b[0] === 0xed && b[1] === 0x01 ? b64u(b.slice(2)) : null;
}

/** did:web:<host>[:path] → the https URL of its DID document (did:web method, read operation). */
export function didWebUrl(did) {
  const m = /^did:web:([^:#?/]+)((?::[^:#?/]+)*)$/.exec(String(did));
  if (!m) throw new Error('not a did:web');
  const host = decodeURIComponent(m[1]);
  if (!/^[a-z0-9.-]+(:\d{1,5})?$/i.test(host)) throw new Error('did:web: not a host');
  const segs = m[2] ? m[2].slice(1).split(':').map(decodeURIComponent) : ['.well-known'];
  if (segs.some((x) => !x || x === '.' || x === '..' || /[/\\?#]/.test(x))) throw new Error('did:web: not a path');
  return `https://${host}/${segs.join('/')}/did.json`;
}

/** Fetch a did:web document; it must name the DID it was fetched for. */
export async function resolveDidWeb(did, f = fetch) {
  const r = await f(didWebUrl(did), { headers: { accept: 'application/did+json, application/json' }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`did: HTTP ${r.status}`);
  const doc = await r.json();
  if (doc?.id !== did) throw new Error('did: the document is for another DID');
  return doc;
}

/** The Ed25519 key (JWK x) a DID document lists for assertions under this id, or null. */
function assertionKey(didDocument, vmId) {
  const listed = (didDocument?.assertionMethod ?? []).map((m) => (typeof m === 'string' ? m : m?.id));
  if (!listed.includes(vmId)) return null;
  const vm = [...(didDocument.verificationMethod ?? []), ...(didDocument.assertionMethod ?? []).filter((m) => typeof m === 'object')].find((m) => m?.id === vmId);
  if (!vm || (vm.controller !== undefined && vm.controller !== didDocument.id)) return null;
  if (vm.publicKeyMultibase) return multikeyToX(vm.publicKeyMultibase);
  const j = vm.publicKeyJwk;
  return j?.kty === 'OKP' && j.crv === 'Ed25519' && typeof j.x === 'string' && !j.d ? j.x : null;
}

/**
 * A Data Integrity proof with cryptosuite eddsa-jcs-2022 (W3C Recommendation), checked against a DID document:
 * Ed25519 over sha256(JCS(proof without proofValue)) || sha256(JCS(document without proof)). The canonical JSON of
 * section 1 is JCS for these documents. Returns { valid, reason, verificationMethod }.
 */
export async function verifyDataIntegrity(doc, didDocument) {
  const no = (reason) => ({ valid: false, reason, verificationMethod: doc?.proof?.verificationMethod ?? null });
  const proof = doc?.proof;
  if (!proof || typeof proof !== 'object' || Array.isArray(proof)) return no('no proof (one Data Integrity proof is expected)');
  const { proofValue, ...config } = proof;
  if (config.type !== 'DataIntegrityProof' || config.cryptosuite !== 'eddsa-jcs-2022') return no('not an eddsa-jcs-2022 Data Integrity proof');
  if (config.proofPurpose !== 'assertionMethod') return no('the proof is not for assertionMethod');
  if (config.created !== undefined && !(Date.parse(config.created) > 0)) return no('created is not a date');
  if (typeof proofValue !== 'string' || proofValue[0] !== 'z') return no('proofValue is not multibase base58btc');
  const { proof: _proof, ...unsecured } = doc;
  if (config['@context'] !== undefined) {
    // The proof's context must be where the document's context starts, in the same order; it then stands for it.
    const dc = [].concat(unsecured['@context'] ?? []), pc = [].concat(config['@context']);
    if (pc.length > dc.length || pc.some((c, i) => !same(c, dc[i]))) return no('the proof @context is not the document @context');
    unsecured['@context'] = config['@context'];
  }
  const vmId = String(config.verificationMethod ?? '');
  if (!didDocument?.id || !vmId.startsWith(`${didDocument.id}#`)) return no('the key is not one of the DID document');
  const x = assertionKey(didDocument, vmId);
  if (!x) return no('the DID document lists no Ed25519 assertion key under that id');
  let sig;
  try { sig = base58btcDecode(proofValue.slice(1)); } catch { return no('proofValue is not base58btc'); }
  if (sig.length !== 64) return no('proofValue is not an Ed25519 signature');
  try {
    const data = new Uint8Array(64);
    data.set(await sha256(canonical(config)), 0);
    data.set(await sha256(canonical(unsecured)), 32);
    const key = await crypto.subtle.importKey('jwk', { kty: 'OKP', crv: 'Ed25519', x }, { name: 'Ed25519' }, false, ['verify']);
    const ok = await crypto.subtle.verify({ name: 'Ed25519' }, key, sig, data);
    return ok ? { valid: true, reason: 'ok', verificationMethod: vmId } : no('the signature does not match the key');
  } catch {
    return no('the document cannot be checked (not canonical JSON)');
  }
}

/**
 * A Word Pass credential (SPEC 18): the Data Integrity proof against the issuer's did:web document, the subject a
 * pass URL on the issuer's own origin, and the pass inside checked as section 5 says (signature, Merkle proof,
 * word), with the keys document of the same origin. The anchors on Bitcoin and Stellar are checkWordPass's job:
 * call it with `subject`. Returns { valid, trust, say, issuer, subject, proof, pass, same_key }.
 */
export async function verifyCredential(vc, { fetch: f = fetch, didDocument, keysDocument, now = Date.now() } = {}) {
  const out = (trust, say, extra = {}) => ({ valid: trust === 'valid', trust, say, issuer: typeof vc?.issuer === 'string' ? vc.issuer : null, subject: vc?.credentialSubject?.id ?? null, proof: null, pass: null, same_key: null, ...extra });
  if (!vc || typeof vc !== 'object' || [].concat(vc['@context'] ?? [])[0] !== 'https://www.w3.org/ns/credentials/v2') return out('invalid', 'This is not a Verifiable Credential 2.0.');
  if (!Array.isArray(vc.type) || !vc.type.includes('VerifiableCredential') || !vc.type.includes('WordPassCredential')) return out('invalid', 'This credential is not a Word Pass credential.');
  const issuer = vc.issuer;
  let origin;
  try { origin = new URL(didWebUrl(issuer)).origin; } catch { return out('invalid', 'The issuer of a Word Pass credential is a did:web.'); }
  let dd = didDocument, kd = keysDocument;
  try { dd ??= await resolveDidWeb(issuer, f); } catch { return out('unreachable', `The DID document of ${issuer} could not be read.`); }
  const proof = await verifyDataIntegrity(vc, dd);
  if (!proof.valid) return out('invalid', `Do not rely on this credential: ${proof.reason}.`, { proof });
  const { id: subject, wordPass } = vc.credentialSubject ?? {};
  const pass = wordPass?.pass;
  let u;
  try { u = new URL(subject); } catch { u = null; }
  if (!u || u.protocol !== 'https:' || u.origin !== origin) return out('invalid', `Do not rely on this credential: its subject is not a pass URL on ${origin}.`, { proof });
  if (pass?.kind !== 'word_pass') return out('invalid', 'Do not rely on this credential: it carries no Word Pass.', { proof });
  if (vc.validUntil !== undefined && !(Date.parse(vc.validUntil) >= now)) return out('invalid', 'Do not rely on this credential: it has expired (validUntil).', { proof });
  if (vc.validFrom !== undefined && !(Date.parse(vc.validFrom) <= now + 300_000)) return out('invalid', 'Do not rely on this credential: it is not valid yet (validFrom).', { proof });
  try { kd ??= await fetchKeysDocument(origin, f); } catch { return out('unreachable', `${u.host} publishes no keys at /.well-known/pazair-receipts.json.`, { proof }); }
  const v = await verifyPass(wordPass, { keys: kd.keys ?? [], pqKeys: kd.pq_keys });
  const passKey = (kd.keys ?? []).find((k) => k.kid === pass.kid);
  const same_key = !!passKey && passKey.x === assertionKey(dd, proof.verificationMethod);
  if (!v.valid) return out('invalid', `Do not rely on this credential: the Word Pass inside does not verify (${!v.signature_valid ? 'signature' : v.ml_dsa_65 === false ? 'second signature' : v.in_root === false ? 'Merkle proof' : 'badge'}).`, { proof, pass: v, same_key });
  const where = v.in_root ? `in the Merkle root of ${v.anchors.day}` : 'signed today, not anchored yet';
  return out('valid', `${sayPass(pass, u.host)} Credential by ${issuer}: proof eddsa-jcs-2022 valid, pass signature valid${v.ml_dsa_65 ? ' (Ed25519 and ML-DSA-65)' : ''}, ${where}. Anchors on Bitcoin and Stellar: checkWordPass(${subject}).`, { proof, pass: v, same_key });
}

/** For issuers (and the test vector): sign a document with eddsa-jcs-2022. `priv` is an Ed25519 CryptoKey. */
export async function signDataIntegrity(doc, priv, verificationMethod, created = new Date()) {
  const proof = { ...(doc['@context'] !== undefined ? { '@context': doc['@context'] } : {}), type: 'DataIntegrityProof', cryptosuite: 'eddsa-jcs-2022', created: created.toISOString().replace(/\.\d{3}Z$/, 'Z'), verificationMethod, proofPurpose: 'assertionMethod' };
  const data = new Uint8Array(64);
  data.set(await sha256(canonical(proof)), 0);
  data.set(await sha256(canonical(doc)), 32);
  return { ...doc, proof: { ...proof, proofValue: 'z' + base58btcEncode(new Uint8Array(await crypto.subtle.sign({ name: 'Ed25519' }, priv, data))) } };
}
