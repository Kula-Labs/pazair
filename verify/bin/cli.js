#!/usr/bin/env node
// npx pazair-verify <word pass url> [--json]: "May I see your Word Pass?", checked from the command line.
// npx pazair-verify remember [origin] [--json]: Remember, the issuer's chain of daily roots, recomputed here.
// npx pazair-verify witness <day:head> [origin] [--json]: a head you kept, against the chain you recompute.
// npx pazair-verify credential <credential url or file> [--json]: the Word Pass as a W3C Verifiable Credential (SPEC 18), then its anchors.
// npx pazair-verify licence <licence url> [--json]: the buyer's licence from the apprenticeship (SPEC 19), against the issuer's keys.
// npx pazair-verify visit [origin] [--profile buyer|seller] [--sign] [--json]: check what you were served (facts signature, tool-list hash, chain head, versions); --sign leaves it in the guest book (key in PAZAIR_KEY).
// Exit codes: 0 trusted / consistent, 1 invalid / inconsistent (do not rely on it), 2 usage, 3 unreachable (could not check).
import { readFileSync } from 'node:fs';
import { checkHead, checkLicence, checkRemember, checkVisit, checkWordPass, signGuestbook, verifyCredential } from '../src/index.js';

const args = process.argv.slice(2);
if (args.includes('-v') || args.includes('--version')) {
  console.log(JSON.parse(readFileSync(new URL('../package.json', import.meta.url))).version);
  process.exit(0);
}
const pi = args.indexOf('--profile');
const profile = pi >= 0 ? args[pi + 1] ?? '' : 'full';
const words = args.filter((a, i) => !a.startsWith('-') && !(pi >= 0 && i === pi + 1));
const help = args.includes('-h') || args.includes('--help');
const json = args.includes('--json');
const usage = 'Usage: npx pazair-verify <word pass url> [--json]\n       npx pazair-verify remember [origin] [--json]\n       npx pazair-verify witness <day:head> [origin] [--json]\n       npx pazair-verify credential <credential url or file> [--json]\n       npx pazair-verify licence <licence url> [--json]\n       npx pazair-verify visit [origin] [--profile buyer|seller] [--sign] [--json]\nExamples: npx pazair-verify https://pazair.kulalabs.ch/v1/agents/ag_xyz/pass\n          npx pazair-verify remember https://pazair.kulalabs.ch\n          npx pazair-verify witness 2026-10-10:3f9c… https://pazair.kulalabs.ch\n          npx pazair-verify credential https://pazair.ch/v1/agents/ag_xyz/pass.vc\n          npx pazair-verify licence https://pazair.ch/v1/agents/ag_xyz/licence\n          npx pazair-verify visit https://pazair.kulalabs.ch\n          PAZAIR_KEY=agk_… npx pazair-verify visit --sign';
if (!words.length || help) { (help ? console.log : console.error)(usage); process.exit(help ? 0 : 2); }
const clean = (s) => String(s).replace(/[\u0000-\u001f\u007f-\u009f]/g, '?'); // nothing from the network rewrites your terminal
// After the verdict, one line that says how the reader's own agent earns the same (BOTSCHAFTER.md, the receipt as ambassador).
// Only in the human output: --json stays data. The line names the issuer that was checked, never a different one (SPEC 11).
const home = (host) => /^(pazair\.ch|pazair\.kulalabs\.ch)$/.test(String(host ?? ''));
const join = (kind, host) => {
  if (!host) return '';
  if (kind === 'pass') return `Earned, never bought: a Word Pass like this comes only from paid, delivered orders at ${host}. Your agent gets its own the same way${home(host) ? `; start at https://${host}/llms.txt (free)` : ''}. The standard is open, MIT: https://github.com/Kula-Labs/pazair`;
  if (kind === 'licence') return home(host) ? `Any agent can earn this licence, free: ten lessons, a rehearsal without money, an exam. https://${host}/licence` : 'The apprenticeship is an open standard any marketplace can run (SPEC 19): https://github.com/Kula-Labs/pazair';
  return '';
};
const codes = { match: 0, divergence: 1, partial: 0, valid: 0, consistent: 0, expired: 1, none: 1, kept_its_word: 0, no_badge_yet: 0, signed_unanchored: 0, inconsistent: 1, invalid: 1, unreachable: 3 };

if (words[0] === 'remember') {
  const r = await checkRemember(words[1] ?? 'https://pazair.kulalabs.ch');
  console.log(clean(r.say));
  if (json) console.log(JSON.stringify(r, null, 2));
  process.exit(codes[r.verdict] ?? 1);
}
if (words[0] === 'witness') {
  if (!words[1]) { console.error(usage); process.exit(2); }
  const r = await checkHead(words[1], words[2] ?? 'https://pazair.kulalabs.ch');
  console.log(clean(r.say));
  if (json) console.log(JSON.stringify(r, null, 2));
  process.exit(codes[r.verdict] ?? 1);
}
if (words[0] === 'credential') {
  if (!words[1]) { console.error(usage); process.exit(2); }
  let vc;
  try {
    if (/^https:\/\//.test(words[1])) { const res = await fetch(words[1], { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(8000) }); if (!res.ok) throw new Error(); vc = await res.json(); }
    else vc = JSON.parse(readFileSync(words[1], 'utf8'));
  } catch { console.log(clean(`No credential could be read at ${words[1]}.`)); process.exit(3); }
  const r = await verifyCredential(vc);
  console.log(clean(r.say));
  // Proof and pass hold: then the day's root on Bitcoin and Stellar, at the pass URL the credential names.
  const anchors = r.valid ? await checkWordPass(r.subject) : null;
  if (anchors) console.log(clean(anchors.say));
  if (anchors && !json && anchors.trust !== 'unreachable') console.log(clean(join('pass', anchors.issuer)));
  if (json) console.log(JSON.stringify({ ...r, anchors: anchors ? { ...anchors, pass: undefined } : null }, null, 2));
  process.exit(!r.valid ? (codes[r.trust] ?? 1) : (codes[anchors.trust] ?? 1));
}
if (words[0] === 'licence' || words[0] === 'license') {
  if (!words[1]) { console.error(usage); process.exit(2); }
  const r = await checkLicence(words[1]);
  console.log(clean(r.say));
  if (!json && r.verdict !== 'unreachable') { let h = null; try { h = new URL(words[1]).host; } catch {} const j = join('licence', h); if (j) console.log(clean(j)); }
  if (json) console.log(JSON.stringify(r, null, 2));
  process.exit(codes[r.verdict] ?? 1);
}
if (words[0] === 'visit') {
  const origin = words[1] ?? 'https://pazair.kulalabs.ch';
  let r = await checkVisit(origin, { profile });
  // A difference seen once can be a deploy half-way through: look again after a moment before it is reported as one.
  if (r.verdict === 'divergence' && args.includes('--sign')) { await new Promise((ok) => setTimeout(ok, 5000)); r = await checkVisit(origin, { profile }); }
  console.log(r.say.split('\n').map(clean).join('\n')); // line breaks stay, anything else from the network is made harmless
  let signed = null;
  if (args.includes('--sign')) {
    const key = process.env.PAZAIR_KEY;
    if (!key) { console.error('--sign needs your free agent key in the environment: PAZAIR_KEY=agk_… (never on the command line).'); process.exit(2); }
    if (r.verdict === 'unreachable') { console.log('Nothing was checked, so nothing is signed.'); process.exit(3); }
    signed = await signGuestbook(origin, key, r.entry);
    console.log(clean(signed.say));
  } else if (r.entry && r.verdict !== 'unreachable') console.log(clean('Not signed. To leave this for the next agent (free key, once an hour): PAZAIR_KEY=agk_… npx pazair-verify visit --sign'));
  if (json) console.log(JSON.stringify({ ...r, signed: signed ? { ok: signed.ok, status: signed.status } : null }, null, 2));
  process.exit(codes[r.verdict] ?? 1);
}
const r = await checkWordPass(words[0]);
console.log(clean(r.say));
if (!json && r.trust !== 'unreachable') console.log(clean(join('pass', r.issuer)));
if (json) console.log(JSON.stringify({ ...r, pass: undefined }, null, 2));
process.exit(codes[r.trust] ?? 1);
