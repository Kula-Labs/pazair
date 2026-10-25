// pazair-verify/guestbook: the guest book, the visitor's side (docs/BESUCHERBUCH.md in Kula-Labs/jobflow-a2a).
// A visitor checks what it can recompute itself, then (only if it says so) signs what it checked: closed fields, no text.
// Nothing here trusts the issuer: the facts are checked against the issuer's published key, the tool list against a hash
// computed here, the head of the chain against the chain recomputed here. Zero dependencies.
import { canonical, fetchKeys, sha256hex, verifySignature } from './index.js';
import { checkHead } from './remember.js';

export const PROFILES = ['full', 'buyer', 'seller'];

const get = async (f, url, init) => {
  const r = await f(url, { ...init, signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error(`HTTP ${r.status} at ${url}`);
  return r;
};
/** A JSON-RPC answer may come as plain JSON or as one server-sent event; both carry the same object. */
const rpc = (text) => {
  const t = String(text).trim();
  if (t.startsWith('{')) return JSON.parse(t);
  const data = t.split('\n').find((l) => l.startsWith('data:'));
  return JSON.parse(data ? data.slice(5) : t);
};
/** The version at the foot of /terms or /privacy ("Version 2026-10-23b"). */
export const versionOf = (page) => /Version (\d{4}-\d{2}-\d{2}[a-z])/.exec(String(page))?.[1] ?? null;

/**
 * Check what a visitor can recompute: the facts' signature, the hash of the tools array tools/list returns (sha256 over its
 * canonical JSON, as the facts state), the head of the daily chain (recomputed here), and the versions of terms and privacy.
 * Returns { verdict: 'match' | 'divergence' | 'partial' | 'unreachable', checks, saw, entry, say }.
 *   match       every check that ran passed, and the signed facts and the tool list were among them
 *   divergence  something the issuer states differs from what was served, or a signature or the chain fails: do not rely on it
 *   partial     nothing failed, but not enough could be checked (for example no pazair-head yet)
 * `entry` is the body for POST /v1/guestbook (null when there is no head to name); it carries only what was checked.
 */
export async function checkVisit(origin = 'https://pazair.kulalabs.ch', { fetch: f = fetch, profile = 'full' } = {}) {
  const o = origin.replace(/\/+$/, '');
  const base = { origin: o, profile, checks: {}, saw: null, entry: null };
  if (!PROFILES.includes(profile)) return { ...base, verdict: 'unreachable', say: `profile: ${PROFILES.join(', ')}.` };
  let keys, facts, tools, listed, terms, privacy;
  try {
    [keys, facts, tools, listed, terms, privacy] = await Promise.all([
      fetchKeys(o, f),
      get(f, `${o}/.well-known/pazair-facts.json`).then((r) => r.json()),
      get(f, `${o}/mcp${profile === 'full' ? '' : `?profile=${profile}`}`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) }).then(async (r) => rpc(await r.text())),
      get(f, `${o}/v1/listings?limit=1`, { headers: { accept: 'application/json' } }),
      get(f, `${o}/terms`).then((r) => r.text()),
      get(f, `${o}/privacy`).then((r) => r.text()),
    ]);
  } catch (e) {
    return { ...base, verdict: 'unreachable', say: `Could not read ${o} (${e.message}). Nothing was checked, and nothing should be signed.` };
  }
  const checks = {};
  checks.facts_signature = (await verifySignature(facts, keys)) ? 'pass' : 'fail';
  const list = tools?.result?.tools;
  const interface_sha256 = Array.isArray(list) ? await sha256hex(canonical(list)) : null;
  const expected = facts?.interface?.sha256?.[profile] ?? null;
  // A hash that the facts state is only worth comparing if the facts themselves are signed by the issuer's key.
  checks.interface_hash = !interface_sha256 ? 'fail' : checks.facts_signature !== 'pass' || !expected ? 'not_run' : interface_sha256 === expected ? 'pass' : 'fail';
  const kept = listed.headers.get('pazair-head');
  let chain = null;
  if (kept) { chain = await checkHead(kept, o, { fetch: f }); checks.chain_head = chain.verdict === 'consistent' ? 'pass' : chain.verdict === 'unreachable' ? 'not_run' : 'fail'; } else checks.chain_head = 'not_run';
  const saw = { interface_sha256, terms_version: versionOf(terms), privacy_version: versionOf(privacy) };
  const versions = checks.facts_signature === 'pass' ? { terms: saw.terms_version === facts?.versions?.terms, privacy: saw.privacy_version === facts?.versions?.privacy } : null;
  const m = /^(\d{4}-\d{2}-\d{2}):([0-9a-f]{64})$/.exec(String(kept ?? '').toLowerCase());
  const entry = m && interface_sha256 && saw.terms_version && saw.privacy_version
    ? { day: m[1], head: m[2], profile, saw, checks: Object.fromEntries(Object.entries(checks).filter(([, v]) => v !== 'not_run')) }
    : null;
  const failed = Object.entries(checks).filter(([, v]) => v === 'fail').map(([k]) => k);
  if (versions && !versions.terms) failed.push('terms_version');
  if (versions && !versions.privacy) failed.push('privacy_version');
  const enough = checks.facts_signature === 'pass' && checks.interface_hash === 'pass';
  const verdict = failed.length ? 'divergence' : enough ? 'match' : 'partial';
  const lines = [
    `facts signature:   ${checks.facts_signature}${checks.facts_signature === 'pass' ? ` (kid ${String(facts.kid).slice(0, 8)}…)` : ''}`,
    `tool list (${profile}): ${checks.interface_hash}${interface_sha256 ? ` (${interface_sha256.slice(0, 12)}…${expected ? ` against ${String(expected).slice(0, 12)}…` : ''})` : ''}`,
    `chain head:        ${checks.chain_head}${kept ? ` (${kept.slice(0, 24)}…)` : ' (no pazair-head yet)'}`,
    `terms / privacy:   ${saw.terms_version ?? '?'} / ${saw.privacy_version ?? '?'}${versions ? (versions.terms && versions.privacy ? ' (as the facts state)' : ' (DIFFERENT from the facts)') : ''}`,
  ];
  const say = verdict === 'match'
    ? `${o}: what you were served is what the signed facts say. This is what was checked here, not a promise that nothing can go wrong.\n${lines.join('\n')}`
    : verdict === 'divergence'
      ? `${o}: do not rely on what you were served until this is cleared. Differs: ${failed.join(', ')}.\n${lines.join('\n')}`
      : `${o}: nothing failed, but too little could be checked to call it a match.\n${lines.join('\n')}`;
  return { ...base, verdict, checks, saw, versions, chain: chain ? { verdict: chain.verdict, day: chain.day ?? null } : null, entry, failed, say };
}

/** Sign the guest book with a free agent key: POST /v1/guestbook. The key is sent as a bearer token and never returned or logged. */
export async function signGuestbook(origin, apiKey, entry, { fetch: f = fetch } = {}) {
  const o = origin.replace(/\/+$/, '');
  if (!entry) return { ok: false, status: 0, say: 'There is no entry to sign: no head to name yet.' };
  let r;
  try { r = await f(`${o}/v1/guestbook`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` }, body: JSON.stringify(entry), signal: AbortSignal.timeout(10000) }); } catch (e) { return { ok: false, status: 0, say: `Could not reach ${o} (${e.message}).` }; }
  const body = await r.json().catch(() => null);
  if (r.ok) return { ok: true, status: r.status, body, say: `Signed. ${o} recorded it as a ${body?.verdict ?? 'result'} and counted you as ${body?.counted_as ?? 'seen'}.` };
  return { ok: false, status: r.status, body, say: r.status === 429 ? 'You have already signed this hour: one entry per agent and hour.' : r.status === 401 ? 'The key was refused. A free key comes from register_agent.' : `Not recorded: ${body?.error?.message ?? `HTTP ${r.status}`}` };
}
