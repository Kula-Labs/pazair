#!/usr/bin/env node
// npx pazair-verify <word pass url> [--json]: "May I see your Word Pass?", checked from the command line.
// Exit codes: 0 trusted, 1 invalid (do not rely on it), 2 usage, 3 unreachable (could not check).
import { readFileSync } from 'node:fs';
import { checkWordPass } from '../src/index.js';

const args = process.argv.slice(2);
if (args.includes('-v') || args.includes('--version')) {
  console.log(JSON.parse(readFileSync(new URL('../package.json', import.meta.url))).version);
  process.exit(0);
}
const url = args.find((a) => !a.startsWith('-'));
const help = args.includes('-h') || args.includes('--help');
if (!url || help) {
  (help ? console.log : console.error)('Usage: npx pazair-verify <word pass url> [--json]\nExample: npx pazair-verify https://pazair.kulalabs.ch/v1/agents/ag_xyz/pass');
  process.exit(help ? 0 : 2);
}
const r = await checkWordPass(url);
const clean = (s) => s.replace(/[\u0000-\u001f\u007f-\u009f]/g, '?'); // a pass name cannot rewrite your terminal
console.log(clean(r.say));
if (args.includes('--json')) console.log(JSON.stringify({ ...r, pass: undefined }, null, 2));
process.exit({ kept_its_word: 0, no_badge_yet: 0, signed_unanchored: 0, invalid: 1, unreachable: 3 }[r.trust] ?? 1);
