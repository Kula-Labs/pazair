// Remember (SPEC section 14): the chain recomputed by the verifier, both signatures, the document, a kept head.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canonical, sha256hex } from '../src/index.js';
import { GENESIS, checkHead, checkRemember, headOf, loadMlDsa, pqKid, recomputeChain, verifyLink, verifyRememberDocument } from '../src/remember.js';

const b64u = (b) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const hex = (b) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
const enc = new TextEncoder();

/** An issuer with an Ed25519 key and, when @noble/post-quantum is installed, an ML-DSA-65 key. */
async function issuer() {
  const pair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  const kid = (await sha256hex(jwk.x)).slice(0, 16);
  const m = await loadMlDsa();
  const pq = m ? m.keygen(crypto.getRandomValues(new Uint8Array(32))) : null;
  const pqPub = pq ? b64u(pq.publicKey) : b64u(crypto.getRandomValues(new Uint8Array(1952)));
  const pq_kid = (await sha256hex(hex(Uint8Array.from(atob(pqPub.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((pqPub.length + 3) % 4)), (c) => c.charCodeAt(0))))).slice(0, 16);
  const signEd = async (bytes) => b64u(await crypto.subtle.sign({ name: 'Ed25519' }, pair.privateKey, bytes));
  const signPq = (bytes) => (pq ? b64u(m.sign(bytes, pq.secretKey)) : b64u(crypto.getRandomValues(new Uint8Array(3309))));
  return { keys: [{ kid, kty: 'OKP', crv: 'Ed25519', x: jwk.x }], kid, pq_kid, pqPub, signEd, signPq, pqAvailable: !!m };
}

async function world() {
  const I = await issuer();
  const roots = [await sha256hex('day one'), await sha256hex('day two'), await sha256hex('day three')];
  const days = ['2026-10-09', '2026-10-10', '2026-10-11'];
  let prev = GENESIS; const chain = [];
  for (let i = 0; i < 3; i++) {
    const head = await headOf(prev, roots[i]);
    const link = { day: days[i], prev, root: roots[i], head };
    const msg = enc.encode(canonical(link));
    chain.push({ ...link, stored_head: head, stored_matches: true, head_sig: { over: 'canonical JSON of {day, prev, root, head}', kid: I.kid, ed25519: await I.signEd(msg), pq_kid: I.pq_kid, ml_dsa_65: I.signPq(msg) }, bitcoin_ots: null, stellar_tx: null });
    prev = head;
  }
  const body = { v: 1, issuer: 'pazair', name: 'Remember', sentence: 'Forgets nothing. Holds nothing against you.', kid: I.kid, pq_kid: I.pq_kid, laws: [1, 2, 3, 4, 5], head: { day: days[2], head: prev, days: 3 }, keys: { ml_dsa_65: { public_key_b64url: I.pqPub } } };
  const msg = enc.encode(canonical(body));
  const doc = { ...body, sig: await I.signEd(msg), pq_sig: I.signPq(msg) };
  const chainDoc = { v: 1, genesis: GENESIS, head: prev, days: 3, broken_at: null, keys: { kid: I.kid, pq_kid: I.pq_kid, ml_dsa_65_public_key_b64url: I.pqPub }, chain };
  const f = async (url) => {
    const u = new URL(url);
    if (u.pathname === '/.well-known/pazair-remember.json') return new Response(JSON.stringify(doc));
    if (u.pathname === '/.well-known/pazair-receipts.json') return new Response(JSON.stringify({ keys: I.keys }));
    if (u.pathname === '/v1/remember/chain') return new Response(JSON.stringify(chainDoc));
    return new Response('{}', { status: 404 });
  };
  return { I, roots, days, chain, doc, chainDoc, f, head: prev };
}

test('the chain recomputes from genesis; a changed root changes every later head and names the first broken day', async () => {
  const { chain, head, roots } = await world();
  const re = await recomputeChain(chain);
  assert.equal(re.head, head); assert.equal(re.days, 3); assert.equal(re.broken_at, null);
  assert.equal(re.heads[0].prev, GENESIS);
  assert.equal(re.heads[0].head, await sha256hex(GENESIS + roots[0])); // by hand
  // Order does not matter to the verifier, dates do.
  assert.equal((await recomputeChain([...chain].reverse())).head, head);
  // Tampering: the issuer rewrites day two's root but leaves the published heads. Day two and three disagree.
  const t = chain.map((d, i) => (i === 1 ? { ...d, root: 'a'.repeat(64) } : d));
  const broken = await recomputeChain(t);
  assert.equal(broken.broken_at, '2026-10-10'); assert.notEqual(broken.head, head);
  assert.deepEqual(broken.heads.map((h) => h.published_matches), [true, false, false]);
  // Rewriting the published heads to match the new root hides nothing: the recomputed head differs from what witnesses kept.
  const re2 = await recomputeChain(t.map((d) => ({ ...d, head: undefined })));
  assert.notEqual(re2.head, head);
  assert.equal((await recomputeChain([])).head, GENESIS);
});

test('both signatures of a link and of the document; tampering fails; without the optional package ML-DSA is "not checked", never valid', async () => {
  const { I, chain, doc } = await world();
  const d = chain[1];
  const r = await verifyLink({ day: d.day, prev: d.prev, root: d.root, head: d.head }, d.head_sig, { keys: I.keys, pqPublicKey: I.pqPub });
  assert.equal(r.ed25519, true); assert.equal(r.pq_kid_matches, true);
  assert.equal(r.ml_dsa_65, I.pqAvailable ? true : null);
  const bad = await verifyLink({ day: d.day, prev: d.prev, root: d.root, head: 'f'.repeat(64) }, d.head_sig, { keys: I.keys, pqPublicKey: I.pqPub });
  assert.equal(bad.ed25519, false); assert.equal(bad.ml_dsa_65, I.pqAvailable ? false : null);
  assert.equal((await verifyLink(d, d.head_sig, { keys: [], pqPublicKey: I.pqPub })).ed25519, false); // unknown kid
  assert.equal((await verifyLink(d, { ...d.head_sig, pq_kid: '0000000000000000' }, { keys: I.keys, pqPublicKey: I.pqPub })).ml_dsa_65, false); // wrong pq kid: never trusted
  assert.equal((await verifyLink(d, null, { keys: I.keys })).ed25519, false);
  const v = await verifyRememberDocument(doc, { keys: I.keys });
  assert.equal(v.ed25519, true); assert.equal(v.pq_kid_matches, true); assert.equal(v.ml_dsa_65, I.pqAvailable ? true : null);
  const v2 = await verifyRememberDocument({ ...doc, sentence: 'Forgets everything.' }, { keys: I.keys });
  assert.equal(v2.ed25519, false); assert.equal(v2.ml_dsa_65, I.pqAvailable ? false : null);
  assert.equal(await pqKid(I.pqPub), I.pq_kid);
});

test('checkRemember: consistent against the issuer\'s own endpoints; inconsistent when the past was rewritten; unreachable without them', async () => {
  const w = await world();
  const ok = await checkRemember('https://pazair.test', { fetch: w.f });
  assert.equal(ok.verdict, 'consistent');
  assert.equal(ok.checks.chain.days, 3); assert.equal(ok.checks.chain.head_matches, true); assert.equal(ok.checks.document.ed25519, true); assert.equal(ok.checks.document.kid_in_issuer_keys, true);
  assert.equal(ok.checks.links.ed25519_valid, 3); assert.equal(ok.checks.links.ml_dsa_65_valid, w.I.pqAvailable ? 3 : null);
  assert.match(ok.say, /Remember holds\. 3 days recomputed from genesis/);
  if (!w.I.pqAvailable) assert.match(ok.say, /ML-DSA-65 not checked here/);
  // The issuer rewrites day one's root and recomputes its own heads and signatures, but the document still names the old head: caught.
  const rewritten = { ...w.chainDoc, chain: w.chainDoc.chain.map((d, i) => (i === 0 ? { ...d, root: 'b'.repeat(64) } : d)) };
  const f2 = async (url) => (new URL(url).pathname === '/v1/remember/chain' ? new Response(JSON.stringify(rewritten)) : w.f(url));
  const bad = await checkRemember('https://pazair.test', { fetch: f2 });
  assert.equal(bad.verdict, 'inconsistent'); assert.match(bad.say, /chain recomputes to/); assert.equal(bad.checks.chain.broken_at, '2026-10-09');
  // A forged document from someone who does not hold the issuer's key.
  const forged = { ...w.doc, sig: w.doc.sig.replace(/^./, (c) => (c === 'A' ? 'B' : 'A')) };
  const f3 = async (url) => (new URL(url).pathname === '/.well-known/pazair-remember.json' ? new Response(JSON.stringify(forged)) : w.f(url));
  assert.equal((await checkRemember('https://pazair.test', { fetch: f3 })).verdict, 'inconsistent');
  // Nothing published yet: honest genesis.
  const empty = { ...w.doc, head: { day: null, head: GENESIS, days: 0 } };
  const f4 = async (url) => { const p = new URL(url).pathname; return p === '/.well-known/pazair-remember.json' ? new Response(JSON.stringify(empty)) : p === '/v1/remember/chain' ? new Response(JSON.stringify({ ...w.chainDoc, chain: [], head: GENESIS, days: 0 })) : w.f(url); };
  const e = await checkRemember('https://pazair.test', { fetch: f4 });
  assert.equal(e.checks.chain.days, 0); assert.equal(e.checks.chain.head_matches, true); // but the forged-signature document fails, as it must
  assert.equal((await checkRemember('https://nowhere.test', { fetch: async () => new Response('', { status: 404 }) })).verdict, 'unreachable');
});

test('checkHead: a kept pazair-head is checked against the chain the verifier recomputes, not against the issuer', async () => {
  const w = await world();
  const kept = `2026-10-10:${w.chain[1].head}`;
  const ok = await checkHead(kept, 'https://pazair.test', { fetch: w.f });
  assert.equal(ok.verdict, 'consistent'); assert.equal(ok.days_since, 1); assert.match(ok.say, /1 day\(s\) anchored since/);
  const changed = await checkHead(`2026-10-10:${'c'.repeat(64)}`, 'https://pazair.test', { fetch: w.f });
  assert.equal(changed.verdict, 'inconsistent'); assert.match(changed.say, /the past was changed, or you were served by someone else/);
  const gone = await checkHead(`2026-10-12:${'c'.repeat(64)}`, 'https://pazair.test', { fetch: w.f });
  assert.equal(gone.verdict, 'inconsistent'); assert.match(gone.say, /no day 2026-10-12/);
  assert.equal((await checkHead('nonsense', 'https://pazair.test', { fetch: w.f })).verdict, 'unreachable');
});
