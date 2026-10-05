// pazair-verify: check PazAIr receipts, Word Passes and Merkle proofs without trusting PazAIr.
// Zero dependencies. WebCrypto Ed25519 + SHA-256: Node 20+, Deno, Bun, Cloudflare Workers, modern browsers.
// Specification: https://github.com/Kula-Labs/pazair/blob/main/SPEC.md

const enc = new TextEncoder();

/** Canonical JSON: object keys sorted, no whitespace. The exact bytes that are signed. */
export function canonical(v) {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`;
  return JSON.stringify(v);
}

export async function sha256hex(s) {
  const d = await crypto.subtle.digest('SHA-256', enc.encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

/** The issuer's public keys: GET <origin>/.well-known/pazair-receipts.json. */
export async function fetchKeys(origin = 'https://pazair.kulalabs.ch', f = fetch) {
  const r = await f(`${origin.replace(/\/+$/, '')}/.well-known/pazair-receipts.json`);
  if (!r.ok) throw new Error(`keys: HTTP ${r.status}`);
  return (await r.json()).keys;
}

/** Ed25519 signature over canonical(object without "sig"), with the key whose kid the object names. */
export async function verifySignature(obj, keys) {
  if (!obj || typeof obj.sig !== 'string' || typeof obj.kid !== 'string') return false;
  const jwk = keys.find((k) => k.kid === obj.kid);
  if (!jwk) return false;
  const { sig, ...body } = obj;
  try {
    const pub = await crypto.subtle.importKey('jwk', { kty: 'OKP', crv: 'Ed25519', x: jwk.x }, { name: 'Ed25519' }, false, ['verify']);
    return await crypto.subtle.verify({ name: 'Ed25519' }, pub, unb64u(sig), enc.encode(canonical(body)));
  } catch {
    return false;
  }
}

/** A delivery receipt: signed by the issuer; optionally, the delivery you hold is the one that was signed. */
export async function verifyReceipt(receipt, { keys, delivery } = {}) {
  keys ??= await fetchKeys();
  const signature_valid = receipt?.issuer === 'pazair' && (await verifySignature(receipt, keys));
  const delivery_matches = delivery === undefined ? null : (await sha256hex(typeof delivery === 'string' ? delivery : JSON.stringify(delivery))) === receipt?.delivery_sha256;
  return { valid: signature_valid && delivery_matches !== false, signature_valid, delivery_matches };
}

/** The Merkle leaf of a Word Pass: sha256 of its canonical JSON, signature included. */
export const leafOf = (pass) => sha256hex(canonical(pass));

/** Hash up the path: L means the step is the left sibling (sha256(step + h)), R the right one (sha256(h + step)); hex strings, concatenated as text. */
export async function verifyProof(leaf, proof, root) {
  let h = leaf;
  for (const s of proof) h = s.side === 'L' ? await sha256hex(s.hash + h) : await sha256hex(h + s.hash);
  return h === root;
}

/**
 * A Word Pass as an agent shows it (GET /v1/agents/<id>/pass, "anchored"): signature, leaf in the day's root,
 * and where to check the root on Bitcoin (OpenTimestamps) and Stellar (memo hash of the transaction).
 */
export async function verifyPass(anchored, { keys } = {}) {
  keys ??= await fetchKeys();
  const pass = anchored?.pass ?? anchored;
  const signature_valid = pass?.kind === 'word_pass' && (await verifySignature(pass, keys));
  const in_root = anchored?.proof && anchored?.root?.root ? await verifyProof(await leafOf(pass), anchored.proof, anchored.root.root) : null;
  return {
    valid: signature_valid && in_root !== false,
    signature_valid,
    in_root,
    word: pass?.word ?? null,
    anchors: anchored?.root ? { root: anchored.root.root, day: anchored.root.day, bitcoin_ots: anchored.root.bitcoin_ots ?? null, stellar_tx: anchored.root.stellar_tx ?? null } : null,
  };
}
