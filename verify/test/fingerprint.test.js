import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { FINGERPRINT, fingerprintDistance, fingerprintOf, fingerprintSvg, recordOf, ridgesOf, rsEncode, sha256hex } from '../src/index.js';

const V = JSON.parse(readFileSync(new URL('../../vectors/word-pass-1.json', import.meta.url), 'utf8'));
const F = V.fingerprint;

test('the fingerprint vector holds: seed, codeword, distance, the reference drawing byte for byte', async () => {
  const a = await fingerprintOf({ origin: F.origin, agent: F.agent, first_leaf: F.first_leaf });
  assert.deepEqual(a, { seed: F.seed, codeword: F.codeword });
  const b = await fingerprintOf({ origin: F.origin, agent: F.other.agent, first_leaf: F.other.first_leaf });
  assert.equal(fingerprintDistance(a, b), F.other.distance);
  const svg = fingerprintSvg(a, F.record);
  assert.equal(await sha256hex(svg), F.svg_sha256);
  assert.equal(createHash('sha256').update(svg).digest('hex'), F.svg_sha256);
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.equal((svg.match(/<path /g) || []).length, ridgesOf(F.record.delivered) + F.record.disputes_lost);
  // A trailing slash on the origin, as a verifier might write it, is the same origin.
  assert.deepEqual(await fingerprintOf({ origin: F.origin + '/', agent: F.agent, first_leaf: F.first_leaf }), a);
});

test('the theorem: codewords of different seeds differ in at least d = 55 of 64 symbols', () => {
  assert.deepEqual([FINGERPRINT.n, FINGERPRINT.k, FINGERPRINT.d], [64, 10, 55]);
  let min = 64;
  for (let t = 0; t < 3000; t++) {
    const m = randomBytes(32), m2 = Buffer.from(m); m2[t % 10] ^= 1 << (t % 8); // one bit of the message
    const x = rsEncode(m), y = rsEncode(m2);
    let d = 0; for (let i = 0; i < 64; i++) if (x[i] !== y[i]) d++;
    min = Math.min(min, d);
  }
  assert.ok(min >= 55, `observed ${min}`);
  assert.equal(fingerprintDistance(F.codeword, F.codeword), 0);
  assert.throws(() => fingerprintDistance('ab', F.codeword), TypeError);
});

test('the record grows the print and never changes the identity', () => {
  assert.equal(ridgesOf(0), 5); assert.equal(ridgesOf(3), 6); assert.equal(ridgesOf(1000), 26);
  assert.deepEqual(recordOf(V.passes[0]), { delivered: 12, buyers: 6, badge: 'word_kept_99', disputes_lost: 0 });
  const young = fingerprintSvg(F.codeword, { delivered: 0, buyers: 0, badge: null, disputes_lost: 0 });
  const old = fingerprintSvg(F.codeword, { delivered: 60, buyers: 9, badge: 'word_kept_95', disputes_lost: 2 });
  assert.equal((young.match(/<path /g) || []).length, 5);
  assert.equal((old.match(/<path /g) || []).length, 25 + 2);
  assert.ok(old.includes('<mask id="scars">') && !young.includes('<mask'));
  assert.ok(old.includes('stroke="#d1a04a"') && !young.includes('stroke="#d1a04a"'));
  for (const s of [young, old]) assert.ok(s.includes(`Codeword ${F.codeword}.`));
  assert.rejects(fingerprintOf({ origin: '', agent: 'ag_x', first_leaf: 'ab' }), TypeError);
});
