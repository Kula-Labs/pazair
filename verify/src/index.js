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

/** The issuer's keys document: GET <origin>/.well-known/pazair-receipts.json ({ keys, anchors?, ... }). */
export async function fetchKeysDocument(origin = 'https://pazair.kulalabs.ch', f = fetch) {
  const r = await f(`${origin.replace(/\/+$/, '')}/.well-known/pazair-receipts.json`);
  if (!r.ok) throw new Error(`keys: HTTP ${r.status}`);
  return r.json();
}

/** The issuer's public keys (section 2). */
export async function fetchKeys(origin = 'https://pazair.kulalabs.ch', f = fetch) {
  return (await fetchKeysDocument(origin, f)).keys;
}

/**
 * Ed25519 signature over canonical(object without "sig"), with the key whose kid the object names.
 * A revoked key (revoked_at) signs nothing new: only what { anchoredBefore } proves older than the revocation counts.
 */
export async function verifySignature(obj, keys, { anchoredBefore } = {}) {
  if (!obj || typeof obj.sig !== 'string' || typeof obj.kid !== 'string') return false;
  const jwk = keys.find((k) => k.kid === obj.kid);
  if (!jwk) return false;
  if (jwk.revoked_at && !(anchoredBefore && anchoredBefore < String(jwk.revoked_at).slice(0, 10))) return false;
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
  const in_root = anchored?.proof && anchored?.root?.root ? await verifyProof(await leafOf(pass), anchored.proof, anchored.root.root) : null;
  const signature_valid = pass?.kind === 'word_pass' && (await verifySignature(pass, keys, { anchoredBefore: in_root ? anchored.root.day : undefined }));
  return {
    valid: signature_valid && in_root !== false,
    signature_valid,
    in_root,
    word: pass?.word ?? null,
    anchors: anchored?.root ? { root: anchored.root.root, day: anchored.root.day, bitcoin_ots: anchored.root.bitcoin_ots ?? null, stellar_tx: anchored.root.stellar_tx ?? null } : null,
  };
}

/**
 * Is the root in this Stellar transaction's hash memo (public network)? Anyone can write a memo, so pass the
 * issuer's declared anchor account: then only its transactions count. true / false (another memo or account) /
 * null when nobody can say (not found, Horizon unreachable).
 */
export async function stellarHasRoot(tx, root, { fetch: f = fetch, horizon = 'https://horizon.stellar.org', account } = {}) {
  if (!/^[0-9a-f]{64}$/i.test(tx ?? '')) return false;
  try {
    const r = await f(`${horizon}/transactions/${tx.toLowerCase()}`);
    if (!r.ok) return null;
    const t = await r.json();
    if (t.memo_type !== 'hash' || typeof t.memo !== 'string' || t.successful !== true) return false;
    if (account && t.source_account !== account) return false;
    return [...atob(t.memo)].map((c) => c.charCodeAt(0).toString(16).padStart(2, '0')).join('') === root.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * A holder proof (section 9): the issuer signed { agent, nonce } for the agent showing the pass. Proves the pass
 * is theirs and not a copied URL. Check it against the nonce you gave and the pass's agent.
 */
export async function verifyHolderProof(proof, { keys, agent, nonce, now = Date.now() } = {}) {
  if (proof?.kind !== 'word_pass_proof') return { ok: false, reason: 'not a holder proof' };
  if (!(await verifySignature(proof, keys))) return { ok: false, reason: "signature does not match the issuer's key" };
  if (proof.agent !== agent) return { ok: false, reason: 'the proof is for another agent' };
  if (typeof nonce !== 'string' || nonce.length < 8 || proof.nonce !== nonce) return { ok: false, reason: 'the proof is not for the nonce you gave' };
  if (!(Date.parse(proof.exp) >= now)) return { ok: false, reason: 'the proof has expired' };
  return { ok: true, reason: 'ok' };
}

/**
 * "May I see your Word Pass?" The other agent answers with a URL; this checks it, from any issuer:
 * the pass at the URL, the issuer's keys at <origin>/.well-known/pazair-receipts.json, the Merkle proof,
 * the root on Stellar from the issuer's anchor account and, given { proof, nonce }, that the pass is theirs.
 * Returns a verdict and one sentence to act on.
 */
export async function checkWordPass(url, { fetch: f = fetch, keys, proof, nonce } = {}) {
  const none = (say) => ({ trust: 'unreachable', say, issuer: null, checks: null, pass: null });
  let u;
  try { u = new URL(url); } catch { return none('That is not a URL.'); }
  if (u.protocol !== 'https:') return none('A Word Pass is shown at a public https URL.');
  let doc, kd;
  try { const r = await f(u.href, { headers: { accept: 'application/json' } }); if (!r.ok) throw new Error(); doc = await r.json(); } catch { return none(`No Word Pass could be read at ${u.href}.`); }
  const anchored = doc?.anchored?.pass ? doc.anchored : doc?.pass?.kind === 'word_pass' ? doc : null;
  const pass = anchored?.pass ?? (doc?.current?.kind === 'word_pass' ? doc.current : doc?.kind === 'word_pass' ? doc : null);
  if (!pass) return none(`The document at ${u.href} is not a Word Pass.`);
  try { kd = keys ? { keys } : await fetchKeysDocument(u.origin, f); } catch { return none(`${u.host} publishes no keys at /.well-known/pazair-receipts.json.`); }
  const v = await verifyPass(anchored ?? pass, { keys: kd.keys });
  const a = kd.anchors?.stellar, account = a?.network === 'mainnet' && typeof a.account === 'string' ? a.account : undefined;
  const stellar = v.in_root && anchored.root.stellar_tx ? await stellarHasRoot(anchored.root.stellar_tx, anchored.root.root, { fetch: f, account }) : null;
  const held = proof != null ? await verifyHolderProof(proof, { keys: kd.keys, agent: pass.agent, nonce }) : null;
  const checks = { signature: v.signature_valid, in_root: v.in_root, day: v.anchors?.day ?? null, stellar, stellar_account_bound: !!(stellar && account), bitcoin_ots: !!(v.in_root && anchored.root.bitcoin_ots), holder: held ? held.ok : null };
  const issuer = u.host;
  if (!checks.signature) return { trust: 'invalid', issuer, checks, pass, say: `Do not rely on this pass: its signature does not match ${issuer}'s published key.` };
  if (checks.in_root === false) return { trust: 'invalid', issuer, checks, pass, say: `Do not rely on this pass: its Merkle proof does not lead to the root of ${checks.day}.` };
  if (stellar === false) return { trust: 'invalid', issuer, checks, pass, say: `Do not rely on this pass: the Stellar transaction it names does not carry the root of ${checks.day} from ${issuer}'s anchor account.` };
  if (held && !held.ok) return { trust: 'invalid', issuer, checks, pass, say: `Do not rely on this pass: the agent showing it could not prove it is ${pass.name} (${held.reason}). It may be someone else's pass.` };
  const where = checks.in_root ? `in the Merkle root of ${checks.day}${stellar ? (account ? ", found on Stellar from the issuer's anchor account" : ', found on Stellar') : ''}${checks.bitcoin_ots ? ', stamped in Bitcoin' : ''}` : 'not anchored yet';
  const whose = held?.ok ? ' The agent showing it proved it is this agent.' : ' To be sure it is theirs, give them a fresh nonce and ask for a holder proof (prove_word_pass).';
  return { trust: pass.word?.badge ? 'kept_its_word' : 'no_badge_yet', issuer, checks, pass, say: `${sayPass(pass)} Checked: signature of ${issuer} valid, ${where}.${whose}` };
}

/** One plain sentence about a pass. */
export function sayPass(p) {
  const s = p.as_seller ?? {}, w = p.word ?? {}, n = (x, one, many = one + 's') => `${x} ${x === 1 ? one : many}`;
  const record = s.delivered ? `${n(s.delivered, 'paid order')} delivered to ${n(s.buyers, 'buyer')}, ${n(p.disputes_lost ?? 0, 'dispute')} lost` : `no sales yet, ${n(p.as_buyer?.paid_orders ?? 0, 'paid purchase')}`;
  const head = w.badge === 'word_kept_99' ? 'kept its word on 99 % or more' : w.badge === 'word_kept_95' ? 'kept its word on 95 % or more' : w.kept_pct != null ? `kept its word on ${w.kept_pct} % (no badge yet)` : 'new, no record yet';
  return `${p.name} (Word Pass by ${p.issuer}): ${head}; ${record}.`;
}
