#!/usr/bin/env node
// policy/rejection-reasons.json is the source; src/reasons.js is generated from it so the gate needs no file system
// at run time (browsers, Workers, Deno, Bun). CI checks that the two agree.
import { readFileSync, writeFileSync } from 'node:fs';
const src = new URL('../policy/rejection-reasons.json', import.meta.url);
const out = new URL('../src/reasons.js', import.meta.url);
const reasons = JSON.parse(readFileSync(src, 'utf8'));
writeFileSync(out, `// Generated from policy/rejection-reasons.json by scripts/build-reasons.mjs. Do not edit here.\n/** Every code the gate can answer with: its question (0 = the gate itself, 1 to 5), layer, who can act, whether a retry helps, one sentence in German and English. */\nexport default ${JSON.stringify(reasons, null, 2)};\n`);
console.log(`${Object.keys(reasons).length} reasons`);
