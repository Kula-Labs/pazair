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
  const signature_valid = typeof receipt?.issuer === 'string' && (await verifySignature(receipt, keys));
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

/**
 * Is the root in this Stellar transaction's hash memo (public network)? true / false when the transaction
 * carries something else / null when nobody can say (not found, Horizon unreachable).
 */
export async function stellarHasRoot(tx, root, { fetch: f = fetch, horizon = 'https://horizon.stellar.org' } = {}) {
  if (!/^[0-9a-f]{64}$/i.test(tx ?? '')) return false;
  try {
    const r = await f(`${horizon}/transactions/${tx.toLowerCase()}`);
    if (!r.ok) return null;
    const t = await r.json();
    if (t.memo_type !== 'hash' || typeof t.memo !== 'string' || t.successful !== true) return false;
    return [...atob(t.memo)].map((c) => c.charCodeAt(0).toString(16).padStart(2, '0')).join('') === root.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * "May I see your Word Pass?" The other agent answers with a URL; this checks it, from any issuer:
 * the pass at the URL, the issuer's keys at <origin>/.well-known/pazair-receipts.json, the Merkle proof,
 * and the root on Stellar. Returns a verdict and one sentence to act on.
 */
export async function checkWordPass(url, { fetch: f = fetch, keys } = {}) {
  const none = (say) => ({ trust: 'unreachable', say, issuer: null, checks: null, pass: null });
  let u;
  try { u = new URL(url); } catch { return none('That is not a URL.'); }
  if (u.protocol !== 'https:') return none('A Word Pass is shown at a public https URL.');
  let doc;
  try { const r = await f(u.href, { headers: { accept: 'application/json' } }); if (!r.ok) throw new Error(); doc = await r.json(); } catch { return none(`No Word Pass could be read at ${u.href}.`); }
  const anchored = doc?.anchored?.pass ? doc.anchored : doc?.pass?.kind === 'word_pass' ? doc : null;
  const pass = anchored?.pass ?? (doc?.current?.kind === 'word_pass' ? doc.current : doc?.kind === 'word_pass' ? doc : null);
  if (!pass) return none(`The document at ${u.href} is not a Word Pass.`);
  try { keys ??= await fetchKeys(u.origin, f); } catch { return none(`${u.host} publishes no keys at /.well-known/pazair-receipts.json.`); }
  const v = await verifyPass(anchored ?? pass, { keys });
  const stellar = v.in_root && anchored.root.stellar_tx ? await stellarHasRoot(anchored.root.stellar_tx, anchored.root.root, { fetch: f }) : null;
  const checks = { signature: v.signature_valid, in_root: v.in_root, day: v.anchors?.day ?? null, stellar, bitcoin_ots: !!(v.in_root && anchored.root.bitcoin_ots) };
  const issuer = u.host;
  if (!checks.signature) return { trust: 'invalid', issuer, checks, pass, say: `Do not rely on this pass: its signature does not match ${issuer}'s published key.` };
  if (checks.in_root === false) return { trust: 'invalid', issuer, checks, pass, say: `Do not rely on this pass: its Merkle proof does not lead to the root of ${checks.day}.` };
  if (stellar === false) return { trust: 'invalid', issuer, checks, pass, say: `Do not rely on this pass: the Stellar transaction it names does not carry the root of ${checks.day}.` };
  return { trust: pass.word?.badge ? 'kept_its_word' : 'no_badge_yet', issuer, checks, pass, say: `${sayPass(pass)} Checked: signature of ${issuer} valid, ${checks.in_root ? `in the Merkle root of ${checks.day}${stellar ? ', found on Stellar' : ''}${checks.bitcoin_ots ? ', stamped in Bitcoin' : ''}` : 'not anchored yet'}.` };
}

/** One plain sentence about a pass. */
export function sayPass(p) {
  const s = p.as_seller ?? {}, w = p.word ?? {}, n = (x, one, many = one + 's') => `${x} ${x === 1 ? one : many}`;
  const record = s.delivered ? `${n(s.delivered, 'paid order')} delivered to ${n(s.buyers, 'buyer')}, ${n(p.disputes_lost ?? 0, 'dispute')} lost` : `no sales yet, ${n(p.as_buyer?.paid_orders ?? 0, 'paid purchase')}`;
  const head = w.badge === 'word_kept_99' ? 'kept its word on 99 % or more' : w.badge === 'word_kept_95' ? 'kept its word on 95 % or more' : w.kept_pct != null ? `kept its word on ${w.kept_pct} % (no badge yet)` : 'new, no record yet';
  return `${p.name} (Word Pass by ${p.issuer}): ${head}; ${record}.`;
}
