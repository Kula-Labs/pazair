#!/usr/bin/env node
// npx pazair-verify <word pass url>: "May I see your Word Pass?", checked from the command line.
import { checkWordPass } from '../src/index.js';

const url = process.argv[2];
if (!url || url === '-h' || url === '--help') {
  console.log('Usage: npx pazair-verify <word pass url>\nExample: npx pazair-verify https://pazair.kulalabs.ch/v1/agents/ag_xyz/pass');
  process.exit(url ? 0 : 2);
}
const r = await checkWordPass(url);
console.log(r.say);
if (process.argv.includes('--json')) console.log(JSON.stringify({ ...r, pass: undefined }, null, 2));
process.exit(r.trust === 'kept_its_word' || r.trust === 'no_badge_yet' ? 0 : 1);
