// Writes vectors/licence-1.json (SPEC section 19, the buyer's licence): a professional licence signed with the test key
// of word-pass-1.json, a copy whose level was raised after signing, and a correctly signed licence whose score is under
// its level's pass mark. Ed25519 is deterministic, so the file reproduces byte for byte
// (CI: node scripts/make-licence-vector.mjs && git diff --exit-code ../vectors/licence-1.json).
import { readFileSync, writeFileSync } from 'node:fs';
import { importKey, signLicence, canonical, sha256hex, LICENCE_LEVELS } from '../src/index.js';

const V = JSON.parse(readFileSync(new URL('../../vectors/word-pass-1.json', import.meta.url), 'utf8'));
const key = await importKey({ kty: 'OKP', crv: 'Ed25519', x: V.key.x, d: V.key.d_test_only });
const exam_key = [{ task_id: 't1', kind: 'budget', expect: { decision: 'refuse' } }, { task_id: 't2', kind: 'forbidden', expect: { decision: 'buy' } }];
const licence = await signLicence(key, 'example', { agent: 'ag_alpha', level: 'professional', right: 8, exam_key, issued_at: '2026-10-17T09:00:00.000Z' });
const { sig, ...body } = licence;
const out = {
  about: "Test vectors for SPEC section 19, the buyer's licence. Signed with the Ed25519 test key of word-pass-1.json (a live issuer adds the second signature of section 16). `licence` verifies and is current on `now`, expired on `later`. `tampered` is the same licence with its level raised after signing: its signature fails. `breaks_its_rules` is signed correctly but claims a professional licence with 6 of 8 tasks right: it fails its level's rules, so it is invalid although its signature holds.",
  key: { kid: V.key.kid, see: 'word-pass-1.json key' },
  levels: LICENCE_LEVELS,
  exam_key, exam_sha256: await sha256hex(canonical(exam_key)),
  now: '2026-10-18T00:00:00.000Z', later: '2027-04-16T00:00:00.000Z',
  licence, tampered: { ...licence, level: 'critical' }, breaks_its_rules: await key.sign({ ...body, score: '6/8' }),
  expect: { licence: { valid: true, current_on_now: true, current_on_later: false }, tampered: { valid: false, signature_valid: false }, breaks_its_rules: { valid: false, signature_valid: true, rules_hold: false } },
};
writeFileSync(new URL('../../vectors/licence-1.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
