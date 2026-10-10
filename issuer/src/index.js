// word-pass-issuer: issue Word Passes and receipts for your own marketplace, the same way PazAIr does.
// Zero dependencies. WebCrypto Ed25519 + SHA-256: Node 20+, Deno, Bun, Cloudflare Workers.
// The second signature (ML-DSA-65, section 16) needs the optional package @noble/post-quantum.
// Specification: https://github.com/Kula-Labs/pazair/blob/main/SPEC.md (sections 1 to 5 and 9).
//
// What you do with it, once a day:
//   1. count each agent's paid, delivered orders (only those: rule 7.1),
//   2. signPass() for every agent that traded,
//   3. buildDay() for the Merkle root, anchor the root (stellarMemo() / otsDigest()),
//   4. serve passDocument() at each agent's pass URL and keysDocument() at /.well-known/pazair-receipts.json.

const enc = new TextEncoder();
const ALG = { name: 'Ed25519' };

export function canonical(v) {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`;
  return JSON.stringify(v);
}

export async function sha256hex(s) {
  const d = await crypto.subtle.digest('SHA-256', typeof s === 'string' ? enc.encode(s) : s);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const b64u = (b) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const hexBytes = (h) => Uint8Array.from(h.match(/../g), (x) => parseInt(x, 16));
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

/** A new issuer key. Keep privateJwk secret (a secret store, never a repository); publish only keysDocument(). */
export async function generateKey() {
  const pair = await crypto.subtle.generateKey(ALG, true, ['sign', 'verify']);
  return importKey(await crypto.subtle.exportKey('jwk', pair.privateKey));
}

/** Load a saved private key: { kid, x, privateJwk, sign(body) }. */
export async function importKey(privateJwk) {
  const priv = await crypto.subtle.importKey('jwk', privateJwk, ALG, false, ['sign']);
  const kid = (await sha256hex(privateJwk.x)).slice(0, 16);
  return {
    kid, x: privateJwk.x, privateJwk,
    async sign(body) { return { ...body, sig: b64u(await crypto.subtle.sign(ALG, priv, enc.encode(canonical(body)))) }; },
  };
}

/**
 * Section 16, the second signature: an ML-DSA-65 key (FIPS 204). Needs the optional package @noble/post-quantum.
 * `secret` is the 32-byte seed as base64url (keep it as secret as the Ed25519 key). Returns
 * { pq_kid, public_key_b64url, seed_b64url, signPq(body) }; pair it with an Ed25519 key through withSecondSignature().
 */
export async function importPqKey(secret) {
  const m = (await import('@noble/post-quantum/ml-dsa.js')).ml_dsa65;
  const seed = typeof secret === 'string' ? unb64u(secret) : secret ?? crypto.getRandomValues(new Uint8Array(32));
  const { publicKey, secretKey } = m.keygen(seed);
  const public_key_b64url = b64u(publicKey);
  return {
    pq_kid: (await sha256hex([...publicKey].map((x) => x.toString(16).padStart(2, '0')).join(''))).slice(0, 16), public_key_b64url, seed_b64url: b64u(seed),
    signPq(body) { return b64u(m.sign(enc.encode(canonical(body)), secretKey)); },
  };
}
export const generatePqKey = () => importPqKey();

/**
 * A key that signs twice: first ML-DSA-65 over the body (`pq_kid`, `pq_sig`), then Ed25519 over everything but `sig`,
 * so verifiers that know only Ed25519 keep verifying. Use it wherever a Key is expected: signPass, signReceipt, …
 */
export function withSecondSignature(key, pqKey) {
  return { ...key, pq_kid: pqKey.pq_kid, async sign(body) { const b = { ...body, pq_kid: pqKey.pq_kid }; return key.sign({ ...b, pq_sig: pqKey.signPq(b) }); } };
}

/** The document for GET <origin>/.well-known/pazair-receipts.json (section 2). List old keys too while their objects are in use. */
export function keysDocument(issuer, keys, { stellarAnchor, revoked = {}, pqKeys = [] } = {}) {
  return {
    issuer, alg: 'Ed25519', canonical: 'JSON with sorted keys, without "sig"',
    keys: keys.map((k) => ({ kid: k.kid, kty: 'OKP', crv: 'Ed25519', x: k.x, ...(revoked[k.kid] ? { revoked_at: revoked[k.kid] } : {}) })),
    ...(pqKeys.length ? { pq_keys: pqKeys.map((k) => ({ pq_kid: k.pq_kid, alg: 'ML-DSA-65', public_key_b64url: k.public_key_b64url, ...(revoked[k.pq_kid] ? { revoked_at: revoked[k.pq_kid] } : {}) })) } : {}),
    // Declare the account that writes your roots on Stellar: checkers then ignore the same memo from anyone else.
    ...(stellarAnchor ? { anchors: { stellar: { account: stellarAnchor, network: 'mainnet' } } } : {}),
  };
}

/** Section 9: a holder proof for an agent logged in with you, on the nonce a checker gave it. Valid 5 minutes. */
export async function signHolderProof(key, issuer, agent, nonce, { aud = null, now = new Date(), seconds = 300 } = {}) {
  if (typeof nonce !== 'string' || nonce.length < 8 || nonce.length > 200) throw new Error('nonce: 8 to 200 characters');
  return key.sign({ v: 1, kind: 'word_pass_proof', issuer, kid: key.kid, agent, nonce, aud, iat: now.toISOString(), exp: new Date(now.getTime() + seconds * 1000).toISOString() });
}

/** Section 4: kept_pct and the badge (10 delivered, 5 different buyers, 99 % or 95 %). */
export function word(asSeller, disputesLost = 0) {
  const s = asSeller;
  const closed = s.delivered + s.not_delivered + disputesLost;
  if (!closed) return { kept_pct: null, badge: null };
  const kept = Math.floor(((s.delivered - Math.min(disputesLost, s.delivered)) / closed) * 1000) / 10;
  const enough = s.delivered >= 10 && s.buyers >= 5;
  return { kept_pct: kept, badge: enough && kept >= 99 ? 'word_kept_99' : enough && kept >= 95 ? 'word_kept_95' : null };
}

/**
 * Sign one agent's pass (section 4). Counts come from paid, delivered orders only.
 * a: { agent, name, since, as_seller: { delivered, not_delivered, buyers, success_rate?, median_delivery_ms?, first_sale?, last_sale? },
 *      as_buyer?: { paid_orders, sellers }, disputes_lost?, verified_name?, day? }
 */
export async function signPass(key, issuer, a, now = new Date()) {
  const s = a.as_seller;
  const as_seller = { delivered: s.delivered, not_delivered: s.not_delivered, success_rate: s.success_rate ?? (s.delivered + s.not_delivered ? s.delivered / (s.delivered + s.not_delivered) : null), median_delivery_ms: s.median_delivery_ms ?? null, buyers: s.buyers, first_sale: s.first_sale ?? null, last_sale: s.last_sale ?? null };
  const lost = a.disputes_lost ?? 0;
  return key.sign({
    v: 1, issuer, kind: 'word_pass', kid: key.kid, agent: a.agent, name: a.name, verified_name: a.verified_name ?? null, since: a.since,
    as_seller, as_buyer: a.as_buyer ?? { paid_orders: 0, sellers: 0 }, disputes_lost: lost, word: word(as_seller, lost),
    day: a.day ?? now.toISOString().slice(0, 10), issued_at: now.toISOString(),
  });
}

/**
 * Section 3: a receipt for one paid, delivered order. Section 3.1: an order placed to deliver another names it in
 * `parent_order`; the receipt of the other order lists the receipts it was built on in `inputs` (receiptHash of each).
 */
export async function signReceipt(key, issuer, r) {
  return key.sign({ v: 1, issuer, kid: key.kid, order: r.order, listing: r.listing, seller: r.seller, buyer: r.buyer, amount_minor: r.amount_minor, currency: r.currency, delivered_at: r.delivered_at, delivery_sha256: r.delivery_sha256 ?? await sha256hex(typeof r.delivery === 'string' ? r.delivery : JSON.stringify(r.delivery)),
    ...(r.parent_order ? { parent_order: r.parent_order } : {}),
    ...(r.inputs ? { inputs: await Promise.all(r.inputs.map((x) => typeof x === 'string' ? x : sha256hex(canonical(x)))) } : {}),
    ...(r.mandate ? { mandate: typeof r.mandate === 'string' ? r.mandate : await sha256hex(canonical(r.mandate)) } : {}) });
}

/**
 * Section 3.2: the principal's limits for one agent, signed once the principal confirmed them (e.g. saved a card for
 * exactly these limits). `principal` is your own reference to them; only its hash is published.
 */
export async function signMandate(key, issuer, m, now = new Date()) {
  return key.sign({
    v: 1, kind: 'mandate', issuer, kid: key.kid, id: m.id, agent: m.agent, principal: await sha256hex(String(m.principal)), how: m.how ?? 'card_saved',
    scope: { currency: m.currency, max_order_minor: m.max_order_minor, monthly_minor: m.monthly_minor ?? null }, purpose: m.purpose ?? null,
    issued_at: (m.issued_at ? new Date(m.issued_at) : now).toISOString(),
  });
}

/** Section 3.2: the mandate ends; receipts delivered after `at` no longer fall under it. */
export async function signMandateEnd(key, issuer, mandate, now = new Date()) {
  return key.sign({ v: 1, kind: 'mandate_end', issuer, kid: key.kid, mandate: await sha256hex(canonical(mandate)), at: now.toISOString() });
}

export const leafOf = (pass) => sha256hex(canonical(pass));

/** Section 5: the day's tree. Returns the root and proof(i) for each pass. */
export async function buildDay(passes) {
  const leaves = await Promise.all(passes.map(leafOf));
  const levels = [leaves.length ? leaves : [await sha256hex('')]];
  while (levels.at(-1).length > 1) {
    const l = levels.at(-1), next = [];
    for (let i = 0; i < l.length; i += 2) next.push(await sha256hex(l[i] + (l[i + 1] ?? l[i])));
    levels.push(next);
  }
  const root = levels.at(-1)[0];
  const proof = (index) => {
    const out = []; let i = index;
    for (const l of levels.slice(0, -1)) { const sib = i % 2 ? i - 1 : i + 1; out.push({ side: i % 2 ? 'L' : 'R', hash: l[sib] ?? l[i] }); i = Math.floor(i / 2); }
    return out;
  };
  return { root, leaves, proof };
}

/** Anchoring on Stellar: a transaction with this hash memo (any SDK: Memo.hash(hex)). */
export const stellarMemo = (root) => ({ memo_type: 'hash', hex: root, base64: btoa(String.fromCharCode(...hexBytes(root))) });
/** Anchoring in Bitcoin: stamp these 32 bytes with OpenTimestamps (e.g. `ots stamp`, or POST to a calendar's /digest). */
export const otsDigest = (root) => hexBytes(root);

/** What to serve at an agent's pass URL (section 9): today's pass, and the last anchored one with its proof. */
export function passDocument(current, anchored) {
  return anchored ? { current, anchored: { pass: anchored.pass, leaf: anchored.leaf, proof: anchored.proof, root: anchored.root } } : { current, anchored: null };
}
