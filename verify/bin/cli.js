#!/usr/bin/env node
// npx pazair-verify <word pass url> [--json]: "May I see your Word Pass?", checked from the command line.
// npx pazair-verify remember [origin] [--json]: Remember, the issuer's chain of daily roots, recomputed here.
// npx pazair-verify witness <day:head> [origin] [--json]: a head you kept, against the chain you recompute.
// npx pazair-verify credential <credential url or file> [--json]: the Word Pass as a W3C Verifiable Credential (SPEC 18), then its anchors.
// Exit codes: 0 trusted / consistent, 1 invalid / inconsistent (do not rely on it), 2 usage, 3 unreachable (could not check).
import { readFileSync } from 'node:fs';
import { checkHead, checkRemember, checkWordPass, verifyCredential } from '../src/index.js';

const args = process.argv.slice(2);
if (args.includes('-v') || args.includes('--version')) {
  console.log(JSON.parse(readFileSync(new URL('../package.json', import.meta.url))).version);
  process.exit(0);
}
const words = args.filter((a) => !a.startsWith('-'));
const help = args.includes('-h') || args.includes('--help');
const json = args.includes('--json');
const usage = 'Usage: npx pazair-verify <word pass url> [--json]\n       npx pazair-verify remember [origin] [--json]\n       npx pazair-verify witness <day:head> [origin] [--json]\n       npx pazair-verify credential <credential url or file> [--json]\nExamples: npx pazair-verify https://pazair.kulalabs.ch/v1/agents/ag_xyz/pass\n          npx pazair-verify remember https://pazair.kulalabs.ch\n          npx pazair-verify witness 2026-10-10:3f9c… https://pazair.kulalabs.ch\n          npx pazair-verify credential https://pazair.ch/v1/agents/ag_xyz/pass.vc';
if (!words.length || help) { (help ? console.log : console.error)(usage); process.exit(help ? 0 : 2); }
const clean = (s) => String(s).replace(/[\u0000-\u001f\u007f-\u009f]/g, '?'); // nothing from the network rewrites your terminal
const codes = { valid: 0, consistent: 0, kept_its_word: 0, no_badge_yet: 0, signed_unanchored: 0, inconsistent: 1, invalid: 1, unreachable: 3 };

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
  if (json) console.log(JSON.stringify({ ...r, anchors: anchors ? { ...anchors, pass: undefined } : null }, null, 2));
  process.exit(!r.valid ? (codes[r.trust] ?? 1) : (codes[anchors.trust] ?? 1));
}
const r = await checkWordPass(words[0]);
console.log(clean(r.say));
if (json) console.log(JSON.stringify({ ...r, pass: undefined }, null, 2));
process.exit(codes[r.trust] ?? 1);
