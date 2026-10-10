// pazair-verify/remember: Remember ("Forgets nothing. Holds nothing against you."), checked without the issuer.
// SPEC section 14. The daily roots form one chain: head_d = sha256hex(head_{d-1} + root_d), head_0 = 64 zeros.
// Every link and the public document carry two signatures: Ed25519 (the receipt key) and ML-DSA-65 (FIPS 204).
// Ed25519 and SHA-256 come from WebCrypto (zero dependencies). ML-DSA-65 is checked when the optional package
// @noble/post-quantum is installed next to this one; otherwise it is reported as not checked, never as valid.
import { canonical, fetchKeysDocument, sha256hex, verifySignature } from './index.js';

export const GENESIS = '0'.repeat(64);
const enc = new TextEncoder();
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

/** One link of the chain. */
export const headOf = (prev, root) => sha256hex(prev + root);

/**
 * Recompute the chain from the days as the issuer publishes them (`/v1/remember/chain`, or any list of
 * { day, root, head? }). Returns the head, and the first day whose published head disagrees with the recomputation.
 */
export async function recomputeChain(days) {
  const sorted = [...days].filter((d) => d && typeof d.day === 'string' && /^[0-9a-f]{64}$/.test(String(d.root))).sort((a, b) => a.day.localeCompare(b.day));
  let head = GENESIS, broken_at = null;
  const heads = [];
  for (const d of sorted) {
    const prev = head; head = await headOf(prev, d.root);
    const published = typeof d.head === 'string' ? d.head : null, ok = published == null ? null : published === head;
    if (ok === false && !broken_at) broken_at = d.day;
    heads.push({ day: d.day, root: d.root, prev, head, published_head: published, published_matches: ok });
  }
  return { head, days: sorted.length, last_day: sorted.length ? sorted[sorted.length - 1].day : null, broken_at, heads };
}

export { loadMlDsa, verifyMlDsa, pqKid } from './pq.js';
import { loadMlDsa, verifyMlDsa, pqKid } from './pq.js';

async function ed25519(jwk, sigB64u, msgBytes) {
  if (!jwk || typeof jwk.x !== 'string') return false;
  if ((await sha256hex(jwk.x)).slice(0, 16) !== jwk.kid) return false;
  try {
    const pub = await crypto.subtle.importKey('jwk', { kty: 'OKP', crv: 'Ed25519', x: jwk.x }, { name: 'Ed25519' }, false, ['verify']);
    return await crypto.subtle.verify({ name: 'Ed25519' }, pub, unb64u(sigB64u), msgBytes);
  } catch { return false; }
}

/**
 * Both signatures of one link { day, prev, root, head } (`head_sig`): Ed25519 with the issuer's published key named
 * by `kid`, ML-DSA-65 with the public key the issuer publishes next to the chain (`pqPublicKey`, base64url).
 */
export async function verifyLink(link, sig, { keys = [], pqPublicKey } = {}) {
  if (!sig || typeof sig !== 'object') return { ed25519: false, ml_dsa_65: false, pq_kid_matches: false };
  const msg = enc.encode(canonical({ day: link.day, prev: link.prev, root: link.root, head: link.head }));
  const kidOk = pqPublicKey ? (await pqKid(pqPublicKey)) === sig.pq_kid : false;
  return {
    ed25519: typeof sig.ed25519 === 'string' ? await ed25519(keys.find((k) => k.kid === sig.kid), sig.ed25519, msg) : false,
    ml_dsa_65: kidOk && typeof sig.ml_dsa_65 === 'string' ? await verifyMlDsa(sig.ml_dsa_65, msg, pqPublicKey) : false,
    pq_kid_matches: kidOk,
  };
}

/**
 * The public document (/.well-known/pazair-remember.json): `sig` is Ed25519 over the canonical JSON without "sig" and
 * "pq_sig"; `pq_sig` is ML-DSA-65 over the same bytes with the key the document itself carries, whose kid must be `pq_kid`.
 */
export async function verifyRememberDocument(doc, { keys = [] } = {}) {
  if (!doc || typeof doc !== 'object') return { ed25519: false, ml_dsa_65: false, pq_kid_matches: false };
  const { pq_sig, ...rest } = doc;
  const { sig, ...body } = rest;
  const pub = doc.keys?.ml_dsa_65?.public_key_b64url;
  const kidOk = typeof pub === 'string' && (await pqKid(pub)) === doc.pq_kid;
  return {
    ed25519: await verifySignature({ ...body, sig }, keys),
    ml_dsa_65: kidOk && typeof pq_sig === 'string' ? await verifyMlDsa(pq_sig, enc.encode(canonical(body)), pub) : false,
    pq_kid_matches: kidOk,
  };
}

const get = async (f, url) => { const r = await f(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10000) }); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); };

/**
 * The whole check, without trusting the issuer: the document's two signatures against the issuer's published keys,
 * the chain recomputed from genesis, the document's head against the recomputation, every link's two signatures.
 * Verdicts: consistent, inconsistent, unreachable.
 */
export async function checkRemember(origin = 'https://pazair.kulalabs.ch', { fetch: f = fetch } = {}) {
  const o = origin.replace(/\/+$/, '');
  const none = (say) => ({ verdict: 'unreachable', origin: o, say, checks: null });
  let doc, chain, kd;
  try { doc = await get(f, `${o}/.well-known/pazair-remember.json`); } catch (e) { return none(`No Remember document at ${o}/.well-known/pazair-remember.json (${e.message}).`); }
  try { kd = await fetchKeysDocument(o, f); } catch { return none(`${o} publishes no keys at /.well-known/pazair-receipts.json.`); }
  try { chain = await get(f, `${o}/v1/remember/chain`); } catch (e) { return none(`No chain at ${o}/v1/remember/chain (${e.message}).`); }
  const docSig = await verifyRememberDocument(doc, { keys: kd.keys });
  const re = await recomputeChain(chain.chain ?? []);
  const pub = chain.keys?.ml_dsa_65_public_key_b64url ?? doc.keys?.ml_dsa_65?.public_key_b64url;
  let linksEd = 0, linksPq = 0, linksChecked = 0, linkFailures = [];
  for (const d of chain.chain ?? []) {
    if (!d.head_sig) continue;
    linksChecked++;
    const r = await verifyLink({ day: d.day, prev: d.prev, root: d.root, head: d.head }, d.head_sig, { keys: kd.keys, pqPublicKey: pub });
    if (r.ed25519) linksEd++; else linkFailures.push(`${d.day}: Ed25519`);
    if (r.ml_dsa_65 === true) linksPq++; else if (r.ml_dsa_65 === false && await loadMlDsa()) linkFailures.push(`${d.day}: ML-DSA-65`);
  }
  const pqAvailable = !!(await loadMlDsa());
  const headMatches = re.days === 0 ? (doc.head?.head === GENESIS || doc.head?.day == null) : doc.head?.head === re.head;
  const checks = {
    document: { ed25519: docSig.ed25519, ml_dsa_65: pqAvailable ? docSig.ml_dsa_65 : null, pq_kid_matches: docSig.pq_kid_matches, kid_in_issuer_keys: kd.keys.some((k) => k.kid === doc.kid) },
    chain: { days: re.days, recomputed_head: re.head, document_head: doc.head?.head ?? null, head_matches: headMatches, broken_at: re.broken_at, published_heads_match: re.heads.every((h) => h.published_matches !== false) },
    links: { with_signature: linksChecked, ed25519_valid: linksEd, ml_dsa_65_valid: pqAvailable ? linksPq : null, failures: linkFailures },
    ml_dsa_65_checked: pqAvailable,
  };
  const bad = [];
  if (!checks.document.ed25519) bad.push('the document\'s Ed25519 signature does not match the issuer\'s published key');
  if (pqAvailable && !docSig.ml_dsa_65) bad.push('the document\'s ML-DSA-65 signature does not verify');
  if (!headMatches) bad.push(`the document names head ${String(doc.head?.head).slice(0, 12)}… but the chain recomputes to ${re.head.slice(0, 12)}…`);
  if (re.broken_at) bad.push(`published heads disagree with the recomputed chain from ${re.broken_at} on`);
  if (linkFailures.length) bad.push(`link signatures fail: ${linkFailures.join(', ')}`);
  const pqNote = pqAvailable ? '' : ' ML-DSA-65 not checked here (npm install @noble/post-quantum to check it too).';
  if (bad.length) return { verdict: 'inconsistent', origin: o, checks, say: `Do not rely on ${o}'s memory: ${bad.join('; ')}.${pqNote}` };
  return { verdict: 'consistent', origin: o, checks, say: `${o}: Remember holds. ${re.days} day${re.days === 1 ? '' : 's'} recomputed from genesis to head ${re.head.slice(0, 16)}…, document signed by the issuer's key${pqAvailable ? ' and by ML-DSA-65' : ''}, ${linksEd}/${linksChecked} links signed${pqAvailable ? ` (${linksPq} post-quantum)` : ''}.${pqNote}` };
}

/**
 * A head you kept ("<day>:<head>", the pazair-head header of an earlier answer), checked against the chain you
 * recompute yourself, not against the issuer's witness tool.
 */
export async function checkHead(kept, origin = 'https://pazair.kulalabs.ch', { fetch: f = fetch } = {}) {
  const o = origin.replace(/\/+$/, '');
  const m = /^(\d{4}-\d{2}-\d{2}):([0-9a-f]{64})$/.exec(String(kept).trim().toLowerCase());
  if (!m) return { verdict: 'unreachable', say: 'A kept head looks like <day>:<64 hex>, e.g. the pazair-head header of an earlier answer.' };
  const [, day, head] = m;
  let chain;
  try { chain = await get(f, `${o}/v1/remember/chain`); } catch (e) { return { verdict: 'unreachable', say: `No chain at ${o}/v1/remember/chain (${e.message}).` }; }
  const re = await recomputeChain(chain.chain ?? []);
  const d = re.heads.find((h) => h.day === day);
  if (!d) return { verdict: 'inconsistent', day, kept: head, recomputed: null, say: `The chain at ${o} has no day ${day}. Your head is evidence that this day was published and is now gone.` };
  const ok = d.head === head;
  return { verdict: ok ? 'consistent' : 'inconsistent', day, kept: head, recomputed: d.head, published: d.published_head, days_since: re.heads.length - 1 - re.heads.indexOf(d), say: ok ? `Your head of ${day} is what the chain recomputes to today; ${re.heads.length - 1 - re.heads.indexOf(d)} day(s) anchored since.` : `The chain at ${o} recomputes ${day} to ${d.head.slice(0, 8)}…${d.head.slice(-8)}, not to your ${head.slice(0, 8)}…${head.slice(-8)}: the past was changed, or you were served by someone else. Keep your copy; it is evidence.` };
}
