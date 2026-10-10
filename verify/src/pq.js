// ML-DSA-65 (FIPS 204), the second signature. Checked when the optional package @noble/post-quantum is installed
// next to pazair-verify; otherwise reported as not checked (null), never as valid. Used by Remember (section 14)
// and by the second signature on passes, receipts and holder proofs (section 16).
import { canonical, sha256hex } from './index.js';

const enc = new TextEncoder();
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const hex = (b) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');

let mlDsa; // the optional ML-DSA-65 implementation, loaded once
/** ML-DSA-65 when @noble/post-quantum is installed; null otherwise. */
export async function loadMlDsa() {
  if (mlDsa !== undefined) return mlDsa;
  try { mlDsa = (await import('@noble/post-quantum/ml-dsa.js')).ml_dsa65 ?? null; } catch { mlDsa = null; }
  return mlDsa;
}

/** true / false, or null when ML-DSA-65 cannot be checked here. */
export async function verifyMlDsa(sigB64u, msgBytes, publicKeyB64u) {
  const m = await loadMlDsa(); if (!m) return null;
  try { return m.verify(unb64u(sigB64u), msgBytes, unb64u(publicKeyB64u)); } catch { return false; }
}

/** kid of an ML-DSA key: sha256hex(hex(public key))[0:16], like the Ed25519 kid is built from x. */
export const pqKid = async (publicKeyB64u) => (await sha256hex(hex(unb64u(publicKeyB64u)))).slice(0, 16);

/**
 * Section 16: the second signature of an object. `pq_sig` is ML-DSA-65 over canonical(object without "sig" and
 * "pq_sig") with the issuer's key named by `pq_kid` (`pq_keys` in the keys document). Returns
 * { signed, valid }: signed false when the object carries no pq_sig; valid true / false, or null when it cannot be
 * checked here (no library, or the key is not published). A revoked pq key signs nothing valid.
 */
export async function verifyPqSignature(obj, pqKeys = [], { anchoredBefore } = {}) {
  if (!obj || typeof obj.pq_sig !== 'string') return { signed: false, valid: null };
  if (typeof obj.pq_kid !== 'string') return { signed: true, valid: false };
  const key = (pqKeys ?? []).find((k) => k?.pq_kid === obj.pq_kid);
  if (!key || typeof key.public_key_b64url !== 'string') return { signed: true, valid: null };
  if ((await pqKid(key.public_key_b64url)) !== key.pq_kid) return { signed: true, valid: false };
  if (key.revoked_at && !(anchoredBefore && anchoredBefore < String(key.revoked_at).slice(0, 10))) return { signed: true, valid: false };
  const { sig, pq_sig, ...body } = obj;
  return { signed: true, valid: await verifyMlDsa(pq_sig, enc.encode(canonical(body)), key.public_key_b64url) };
}
