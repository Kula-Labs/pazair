// pazair-verify: check PazAIr receipts, Word Passes and Merkle proofs without trusting PazAIr.
// Zero dependencies. WebCrypto Ed25519 + SHA-256: Node 20+, Deno, Bun, Cloudflare Workers, modern browsers.
// Remember (SPEC section 14: the chain of daily roots, two signatures) lives in ./remember.js and is exported below.
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
  if (!jwk || typeof jwk.x !== 'string') return false;
  if ((await sha256hex(jwk.x)).slice(0, 16) !== jwk.kid) return false; // SPEC §1: kid = sha256(x)[0:16]
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
export async function verifyReceipt(receipt, { keys, pqKeys, delivery } = {}) {
  keys ??= await fetchKeys();
  const signature_valid = typeof receipt?.issuer === 'string' && (await verifySignature(receipt, keys));
  const pq = await verifyPqSignature(receipt, pqKeys);
  const delivery_matches = delivery === undefined ? null : (await sha256hex(typeof delivery === 'string' ? delivery : JSON.stringify(delivery))) === receipt?.delivery_sha256;
  return { valid: signature_valid && pq.valid !== false && delivery_matches !== false, signature_valid, pq_signed: pq.signed, ml_dsa_65: pq.valid, delivery_matches };
}

/** SPEC section 4: kept_pct and badge as they follow from the pass's own counts. */
export function wordOf(pass) {
  const s = pass?.as_seller ?? {}, lost = Number(pass?.disputes_lost ?? 0), d = Number(s.delivered ?? 0);
  const closed = d + Number(s.not_delivered ?? 0) + lost;
  if (!closed) return { kept_pct: null, badge: null };
  const kept = Math.floor(((d - Math.min(lost, d)) / closed) * 1000) / 10, enough = d >= 10 && Number(s.buyers ?? 0) >= 5;
  return { kept_pct: kept, badge: enough && kept >= 99 ? 'word_kept_99' : enough && kept >= 95 ? 'word_kept_95' : null };
}

/** Section 3.1: the hash a parent receipt names in `inputs`, the child receipt with its signature. */
export const receiptHash = (receipt) => sha256hex(canonical(receipt));

/**
 * Section 3.1: a chain of work. `top` is the receipt the buyer got; `receipts` are the receipts of the orders its
 * seller placed to deliver it (and theirs, down the chain). Every input must be present, signed, placed by the
 * parent's seller for the parent's order, and delivered no later than the parent. Returns the first broken link.
 */
export async function verifyReceiptChain(top, { receipts = [], keys, maxDepth = 8 } = {}) {
  keys ??= await fetchKeys();
  const byHash = new Map(await Promise.all(receipts.map(async (r) => [await receiptHash(r), r])));
  let links = 0, depth = 0, total_minor = {};
  const walk = async (p, d) => {
    if (!(await verifySignature(p, keys))) return `${p?.order}: signature`;
    if (p.inputs === undefined) return null;
    if (!Array.isArray(p.inputs)) return `${p.order}: inputs`;
    if (p.inputs.length && d >= maxDepth) return `${p.order}: deeper than ${maxDepth}`;
    for (const h of p.inputs) {
      const c = byHash.get(h);
      if (!c) return `${p.order}: input ${String(h).slice(0, 12)}… missing`;
      if (c.parent_order !== p.order) return `${c.order}: parent_order is not ${p.order}`;
      if (c.buyer !== p.seller) return `${c.order}: bought by ${c.buyer}, not by ${p.seller}`;
      if (!(String(c.delivered_at) <= String(p.delivered_at))) return `${c.order}: delivered after ${p.order}`;
      links++; depth = Math.max(depth, d + 1);
      total_minor[c.currency] = (total_minor[c.currency] ?? 0) + c.amount_minor;
      const bad = await walk(c, d + 1);
      if (bad) return bad;
    }
    return null;
  };
  const broken = await walk(top, 0);
  return { valid: broken === null, links, depth, total_minor, broken };
}

/**
 * Section 3.2: was this receipt bought within this mandate? `end` is an optional signed mandate_end.
 * Returns { valid, covers, reasons }: covers lists what held, reasons what did not.
 */
export async function verifyMandate(receipt, mandate, { keys, end } = {}) {
  keys ??= await fetchKeys();
  const reasons = [], covers = [];
  const ok = (cond, yes, no) => (cond ? covers.push(yes) : reasons.push(no));
  ok(mandate?.kind === 'mandate' && (await verifySignature(mandate, keys)), 'mandate signed', 'mandate signature');
  ok(await verifySignature(receipt, keys), 'receipt signed', 'receipt signature');
  ok(receipt?.mandate === (await receiptHash(mandate)), 'receipt names this mandate', 'receipt names another mandate');
  ok(receipt?.buyer === mandate?.agent, 'bought by the mandated agent', `bought by ${receipt?.buyer}, not by ${mandate?.agent}`);
  const sc = mandate?.scope ?? {};
  ok(receipt?.currency === sc.currency, 'currency within the mandate', `currency ${receipt?.currency}, mandate ${sc.currency}`);
  ok(Number.isInteger(receipt?.amount_minor) && receipt.amount_minor <= sc.max_order_minor, 'amount within the cap per order', `amount ${receipt?.amount_minor} over the cap ${sc.max_order_minor}`);
  ok(String(mandate?.issued_at) <= String(receipt?.delivered_at), 'mandate older than the delivery', 'delivered before the mandate existed');
  if (end !== undefined) {
    ok(end?.kind === 'mandate_end' && end.mandate === receipt?.mandate && (await verifySignature(end, keys)), 'end statement signed', 'end statement');
    ok(String(receipt?.delivered_at) <= String(end?.at), 'delivered before the mandate ended', 'delivered after the mandate ended');
  }
  return { valid: reasons.length === 0, covers, reasons };
}

/**
 * Section 3.3: was this receipt paid under this award, for this tender? `qa` are the signed questions, if held.
 * Returns { valid, covers, reasons }: covers lists what held, reasons what did not.
 */
export async function verifyAward(receipt, tender, award, { keys, qa } = {}) {
  keys ??= await fetchKeys();
  const reasons = [], covers = [];
  const ok = (cond, yes, no) => (cond ? covers.push(yes) : reasons.push(no));
  const tenderHash = await receiptHash(tender);
  ok(tender?.kind === 'tender' && (await verifySignature(tender, keys)), 'tender signed', 'tender signature');
  ok(award?.kind === 'award' && (await verifySignature(award, keys)), 'award signed', 'award signature');
  ok(await verifySignature(receipt, keys), 'receipt signed', 'receipt signature');
  ok(award?.tender === tenderHash, 'award names this tender', 'award names another tender');
  ok(receipt?.award === (await receiptHash(award)), 'receipt names this award', 'receipt names another award');
  ok(receipt?.buyer === tender?.buyer, 'paid by the tendering agent', `paid by ${receipt?.buyer}, not by ${tender?.buyer}`);
  ok(receipt?.seller === award?.seller && award?.seller !== tender?.buyer, 'delivered by the awarded seller', `delivered by ${receipt?.seller}, awarded to ${award?.seller}`);
  ok(receipt?.currency === tender?.currency, 'currency of the tender', `currency ${receipt?.currency}, tender ${tender?.currency}`);
  ok(Number.isInteger(award?.price_minor) && award.price_minor <= tender?.budget_max_minor, 'price within the budget', `price ${award?.price_minor} over the budget ${tender?.budget_max_minor}`);
  const ms = receipt?.milestone === undefined ? null : tender?.milestones?.[receipt.milestone];
  const cap = receipt?.milestone === undefined ? award?.price_minor : ms?.max_minor;
  ok(Number.isInteger(receipt?.amount_minor) && Number.isInteger(cap) && receipt.amount_minor <= cap,
    ms ? `amount within milestone ${receipt.milestone}` : 'amount within the price', `amount ${receipt?.amount_minor} over ${cap}`);
  ok(String(tender?.issued_at) <= String(award?.at) && String(award?.at) <= String(receipt?.delivered_at), 'tender, award, delivery in order', 'out of order in time');
  if (tender?.deadline != null) ok(String(receipt?.delivered_at) <= String(tender.deadline), 'delivered by the deadline', 'delivered after the deadline');
  if (qa !== undefined) {
    const held = new Map();
    for (const q of qa) held.set(await receiptHash(q), q);
    for (const h of award?.qa ?? []) {
      const q = held.get(h);
      ok(q?.kind === 'tender_qa' && q.tender === tenderHash && String(q.at) <= String(award.at) && (await verifySignature(q, keys)),
        `question ${h.slice(0, 8)} published before the award`, `question ${h.slice(0, 8)} missing or invalid`);
    }
  }
  return { valid: reasons.length === 0, covers, reasons };
}

/** The Merkle leaf of a Word Pass: sha256 of its canonical JSON, signature included. */
export const leafOf = (pass) => sha256hex(canonical(pass));

/** Hash up the path: L means the step is the left sibling (sha256(step + h)), R the right one (sha256(h + step)); hex strings, concatenated as text. */
export async function verifyProof(leaf, proof, root) {
  if (!Array.isArray(proof) || !proof.every((s) => (s?.side === 'L' || s?.side === 'R') && /^[0-9a-f]{64}$/.test(s.hash))) return false;
  let h = leaf;
  for (const s of proof) h = s.side === 'L' ? await sha256hex(s.hash + h) : await sha256hex(h + s.hash);
  return h === root;
}

/**
 * A Word Pass as an agent shows it (GET /v1/agents/<id>/pass, "anchored"): signature, leaf in the day's root,
 * and where to check the root on Bitcoin (OpenTimestamps) and Stellar (memo hash of the transaction).
 * A revoked key counts only with { anchoredBefore }: a day you proved yourself (a Bitcoin block time), never the
 * root.day the document claims, which whoever holds the stolen key can write.
 */
export async function verifyPass(anchored, { keys, pqKeys, anchoredBefore } = {}) {
  keys ??= await fetchKeys();
  const pass = anchored?.pass ?? anchored;
  const in_root = anchored?.proof && anchored?.root?.root ? await verifyProof(await leafOf(pass), anchored.proof, anchored.root.root) : null;
  const signature_valid = pass?.kind === 'word_pass' && (await verifySignature(pass, keys, { anchoredBefore: in_root ? anchoredBefore : undefined }));
  const pq = await verifyPqSignature(pass, pqKeys, { anchoredBefore: in_root ? anchoredBefore : undefined });
  const w = wordOf(pass), word_consistent = pass?.word == null || ((pass.word.kept_pct ?? null) === w.kept_pct && (pass.word.badge ?? null) === w.badge); // no word, no claim
  return {
    valid: signature_valid && pq.valid !== false && in_root !== false && word_consistent,
    signature_valid,
    pq_signed: pq.signed,
    ml_dsa_65: pq.valid,
    word_consistent,
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

const OTS_MAGIC = '004f70656e54696d657374616d7073000050726f6f6600bf89e2e884e89294';
const TAG_BITCOIN = '0588960d73d71901';
const hexOf = (b) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
const cat = (a, b) => { const o = new Uint8Array(a.length + b.length); o.set(a); o.set(b, a.length); return o; };

/**
 * Read an OpenTimestamps proof (.ots bytes) and walk it from its digest: the digest (hex) and every Bitcoin
 * attestation with the commitment it attests (hex, raw byte order; for Bitcoin that is the block's Merkle root).
 * Paths through ripemd160 or keccak256 are skipped (never on today's Bitcoin path). Throws on a malformed file.
 */
export async function readOts(bytes) {
  let i = 0;
  const byte = () => { if (i >= bytes.length) throw new Error('ots: unexpected end'); return bytes[i++]; };
  const take = (n) => { if (i + n > bytes.length) throw new Error('ots: unexpected end'); const o = bytes.slice(i, i + n); i += n; return o; };
  const uint = (next) => { let v = 0, s = 0; for (;;) { const b = next(); v += (b & 0x7f) * 2 ** s; if (!(b & 0x80)) return v; s += 7; if (s > 49) throw new Error('ots: varuint too large'); } };
  const varbytes = (max) => { const n = uint(byte); if (n > max) throw new Error('ots: too long'); return take(n); };
  if (hexOf(take(31)) !== OTS_MAGIC) throw new Error('ots: not an .ots file');
  if (uint(byte) !== 1) throw new Error('ots: version');
  if (byte() !== 0x08) throw new Error('ots: only sha256 files');
  const digest = take(32);
  const claims = [];
  const apply = async (tag, arg, m) => {
    if (tag === 0x08) return new Uint8Array(await crypto.subtle.digest('SHA-256', m));
    if (tag === 0x02) return new Uint8Array(await crypto.subtle.digest('SHA-1', m));
    if (tag === 0xf0) return cat(m, arg);
    if (tag === 0xf1) return cat(arg, m);
    if (tag === 0xf2) return Uint8Array.from(m).reverse();
    if (tag === 0xf3) return enc.encode(hexOf(m));
    return null;
  };
  const walk = async (m, depth) => {
    if (depth > 256) throw new Error('ots: too deep');
    const item = async (tag) => {
      if (tag === 0x00) {
        const t = hexOf(take(8)), payload = varbytes(8192);
        if (t === TAG_BITCOIN && m) { let j = 0; claims.push({ height: uint(() => { if (j >= payload.length) throw new Error('ots: payload'); return payload[j++]; }), msg: hexOf(m) }); }
        return;
      }
      let arg = null;
      if (tag === 0xf0 || tag === 0xf1) arg = varbytes(4096);
      else if (![0x08, 0x02, 0x03, 0x67, 0xf2, 0xf3].includes(tag)) throw new Error(`ots: unknown op 0x${tag.toString(16)}`);
      await walk(m && (await apply(tag, arg, m)), depth + 1);
    };
    let tag = byte();
    while (tag === 0xff) { await item(byte()); tag = byte(); }
    await item(tag);
  };
  await walk(digest, 0);
  if (i !== bytes.length) throw new Error('ots: trailing bytes');
  return { digest: hexOf(digest), claims: claims.sort((a, b) => a.height - b.height) };
}

/**
 * Is the root in Bitcoin (section 5)? The .ots proof must be for exactly this root, and one of its Bitcoin
 * attestations must end in the Merkle root of that block, asked from public block explorers (Esplora API).
 * { ok: true, status: 'confirmed', block } / { ok: false, status: 'unreadable' | 'wrong_root' | 'wrong_block' } (do
 * not rely on it) / { ok: null, status: 'pending' | 'unverified' } (no block yet, or no explorer answered).
 */
export async function bitcoinHasRoot(otsBase64, root, { fetch: f = fetch, explorers = ['https://blockstream.info/api', 'https://mempool.space/api'] } = {}) {
  let ots;
  try { ots = await readOts(Uint8Array.from(atob(otsBase64), (c) => c.charCodeAt(0))); } catch { return { ok: false, status: 'unreadable' }; }
  if (ots.digest !== String(root).toLowerCase()) return { ok: false, status: 'wrong_root' };
  if (!ots.claims.length) return { ok: null, status: 'pending' };
  let wrong = 0;
  for (const c of ots.claims) {
    if (c.msg.length !== 64) { wrong++; continue; }
    const want = c.msg.match(/../g).reverse().join('');
    for (const base of explorers) {
      try {
        const h = await f(`${base}/block-height/${c.height}`);
        if (!h.ok) continue;
        const hash = (await h.text()).trim();
        if (!/^[0-9a-f]{64}$/.test(hash)) continue;
        const b = await f(`${base}/block/${hash}`);
        if (!b.ok) continue;
        const blk = await b.json();
        if (typeof blk.merkle_root !== 'string' || typeof blk.timestamp !== 'number' || blk.height !== c.height) continue;
        if (blk.merkle_root.toLowerCase() !== want) { wrong++; break; }
        return { ok: true, status: 'confirmed', block: { height: c.height, hash, time: new Date(blk.timestamp * 1000).toISOString() } };
      } catch { /* next explorer */ }
    }
  }
  return wrong === ots.claims.length ? { ok: false, status: 'wrong_block' } : { ok: null, status: 'unverified' };
}

/**
 * A holder proof (section 9): the issuer signed { agent, nonce } for the agent showing the pass. Proves the pass
 * is theirs and not a copied URL. Check it against the nonce you gave and the pass's agent.
 */
export async function verifyHolderProof(proof, { keys, pqKeys, agent, nonce, aud, now = Date.now() } = {}) {
  keys ??= await fetchKeys();
  if (proof?.kind !== 'word_pass_proof') return { ok: false, reason: 'not a holder proof' };
  if (!(await verifySignature(proof, keys))) return { ok: false, reason: "signature does not match the issuer's key" };
  if ((await verifyPqSignature(proof, pqKeys)).valid === false) return { ok: false, reason: "second signature (ML-DSA-65) does not match the issuer's key" };
  if (proof.agent !== agent) return { ok: false, reason: 'the proof is for another agent' };
  if (typeof nonce !== 'string' || nonce.length < 8 || proof.nonce !== nonce) return { ok: false, reason: 'the proof is not for the nonce you gave' };
  if (aud != null && proof.aud !== aud) return { ok: false, reason: 'the proof was made for another checker' };
  if (!(Date.parse(proof.exp) >= now)) return { ok: false, reason: 'the proof has expired' };
  return { ok: true, reason: 'ok' };
}

/**
 * "May I see your Word Pass?" The other agent answers with a URL; this checks it, from any issuer:
 * the pass at the URL, the issuer's keys at <origin>/.well-known/pazair-receipts.json, the Merkle proof,
 * the root on Stellar from the issuer's anchor account, the root in its Bitcoin block and, given { proof, nonce }, that the pass is theirs.
 * Returns a verdict and one sentence to act on.
 */
export async function checkWordPass(url, { fetch: f = fetch, keys, proof, nonce, aud } = {}) {
  const none = (say) => ({ trust: 'unreachable', say, issuer: null, checks: null, pass: null });
  let u;
  try { u = new URL(url); } catch { return none('That is not a URL.'); }
  if (u.protocol !== 'https:') return none('A Word Pass is shown at a public https URL.');
  let doc, kd;
  try { const r = await f(u.href, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(8000) }); if (!r.ok) throw new Error(); if (Number(r.headers?.get?.('content-length')) > 200_000) throw new Error(); doc = await r.json(); } catch { return none(`No Word Pass could be read at ${u.href}.`); }
  const anchored = doc?.anchored?.pass ? doc.anchored : doc?.pass?.kind === 'word_pass' ? doc : null;
  const pass = anchored?.pass ?? (doc?.current?.kind === 'word_pass' ? doc.current : doc?.kind === 'word_pass' ? doc : null);
  if (!pass) return none(`The document at ${u.href} is not a Word Pass.`);
  try { kd = keys ? { keys } : await fetchKeysDocument(u.origin, f); } catch { return none(`${u.host} publishes no keys at /.well-known/pazair-receipts.json.`); }
  let v = await verifyPass(anchored ?? pass, { keys: kd.keys, pqKeys: kd.pq_keys });
  const a = kd.anchors?.stellar, account = a?.network === 'mainnet' && typeof a.account === 'string' ? a.account : undefined;
  const stellar = v.in_root && anchored.root.stellar_tx && account ? await stellarHasRoot(anchored.root.stellar_tx, anchored.root.root, { fetch: f, account }) : null;
  const btc = v.in_root && anchored.root.bitcoin_ots ? await bitcoinHasRoot(anchored.root.bitcoin_ots, anchored.root.root, { fetch: f }) : null;
  // Revoked key: only a Bitcoin block older than the revocation proves the pass was signed before the theft.
  if ((!v.signature_valid || v.ml_dsa_65 === false) && btc?.ok && btc.block?.time) v = await verifyPass(anchored, { keys: kd.keys, pqKeys: kd.pq_keys, anchoredBefore: btc.block.time.slice(0, 10) });
  const held = proof != null ? await verifyHolderProof(proof, { keys: kd.keys, pqKeys: kd.pq_keys, agent: pass.agent, nonce, aud }) : null;
  const checks = { signature: v.signature_valid, ml_dsa_65: v.pq_signed ? v.ml_dsa_65 : null, in_root: v.in_root, day: v.anchors?.day ?? null, stellar, stellar_account_bound: !!(stellar && account), bitcoin_ots: !!(v.in_root && anchored.root.bitcoin_ots), bitcoin: btc ? btc.ok : null, ...(btc?.block ? { bitcoin_block: btc.block } : {}), holder: held ? held.ok : null, word: v.word_consistent };
  const issuer = u.host;
  if (!checks.signature) return { trust: 'invalid', issuer, checks, pass, say: `Do not rely on this pass: its signature does not match ${issuer}'s published key.` };
  if (checks.ml_dsa_65 === false) return { trust: 'invalid', issuer, checks, pass, say: `Do not rely on this pass: its second signature (ML-DSA-65) does not match ${issuer}'s published key.` };
  if (checks.in_root === false) return { trust: 'invalid', issuer, checks, pass, say: `Do not rely on this pass: its Merkle proof does not lead to the root of ${checks.day}.` };
  if (stellar === false) return { trust: 'invalid', issuer, checks, pass, say: `Do not rely on this pass: the Stellar transaction it names does not carry the root of ${checks.day} from ${issuer}'s anchor account.` };
  if (btc?.ok === false) return { trust: 'invalid', issuer, checks, pass, say: `Do not rely on this pass: the Bitcoin proof it names for the root of ${checks.day} is not for that root or not in the block it claims.` };
  if (!v.word_consistent) return { trust: 'invalid', issuer, checks, pass, say: `Do not rely on this pass: its badge does not follow from its own counts (SPEC section 4).` };
  if (held && !held.ok) return { trust: 'invalid', issuer, checks, pass, say: `Do not rely on this pass: the agent showing it could not prove it is ${pass.name} (${held.reason}). It may be someone else's pass.` };
  const where = checks.in_root ? `in the Merkle root of ${checks.day}${stellar ? (account ? ", found on Stellar from the issuer's anchor account" : ', found on Stellar') : ''}${btc?.block ? `, confirmed in Bitcoin block ${btc.block.height} (${btc.block.time.slice(0, 10)})` : checks.bitcoin_ots ? ', stamped in Bitcoin (block confirmation pending)' : ''}` : 'not anchored yet';
  const whose = held?.ok ? ' The agent showing it proved it is this agent.' : ' To be sure it is theirs, give them a fresh nonce and ask for a holder proof (prove_word_pass).';
  const anchored_ok = stellar === true || btc?.ok === true;
  return { trust: !pass.word?.badge ? 'no_badge_yet' : anchored_ok ? 'kept_its_word' : 'signed_unanchored', issuer, checks, pass, say: `${sayPass(pass, issuer)} Checked: signature of ${issuer} valid${checks.ml_dsa_65 ? ' (Ed25519 and ML-DSA-65)' : ''}, ${where}.${whose}` };
}

/** One plain sentence about a pass. */
export function sayPass(p, by = p.issuer) {
  const s = p.as_seller ?? {}, w = p.word ?? {}, n = (x, one, many = one + 's') => `${x} ${x === 1 ? one : many}`;
  const record = s.delivered ? `${n(s.delivered, 'paid order')} delivered to ${n(s.buyers, 'buyer')}, ${n(p.disputes_lost ?? 0, 'dispute')} lost` : `no sales yet, ${n(p.as_buyer?.paid_orders ?? 0, 'paid purchase')}`;
  const head = w.badge === 'word_kept_99' ? 'kept its word on 99 % or more' : w.badge === 'word_kept_95' ? 'kept its word on 95 % or more' : w.kept_pct != null ? `kept its word on ${w.kept_pct} % (no badge yet)` : 'new, no record yet';
  return `${p.name} (Word Pass by ${by}): ${head}; ${record}.`;
}

// Remember: the chain of daily roots, checked without the issuer (SPEC section 14).
export { GENESIS, headOf, recomputeChain, verifyLink, verifyRememberDocument, checkRemember, checkHead } from './remember.js';

// The second signature (SPEC section 16): ML-DSA-65 on passes, receipts and holder proofs; checked when @noble/post-quantum is installed.
export { loadMlDsa, verifyMlDsa, pqKid, verifyPqSignature } from './pq.js';
import { verifyPqSignature } from './pq.js';

// Fingerprint (SPEC section 15): a print no other agent can carry, provably; the reference drawing.
export { FINGERPRINT, rsEncode, fingerprintOf, fingerprintDistance, fingerprintSvg, recordOf, ridgesOf } from './fingerprint.js';
