// Writes vectors/motive-1.json (SPEC section 20, the why): a motive signed with the test key of word-pass-1.json, the
// receipt that names it, a second motive for the same goal and the goal_end naming both; then a motive stated after
// its delivery, a receipt that names another motive, and a motive bought after the goal ended. Ed25519 is
// deterministic, so the file reproduces byte for byte
// (CI: node scripts/make-motive-vector.mjs && git diff --exit-code ../vectors/motive-1.json).
import { readFileSync, writeFileSync } from 'node:fs';
import { importKey, signGoalEnd, signMotive, signReceipt, sha256hex, canonical } from '../src/index.js';

const V = JSON.parse(readFileSync(new URL('../../vectors/word-pass-1.json', import.meta.url), 'utf8'));
const key = await importKey({ kty: 'OKP', crv: 'Ed25519', x: V.key.x, d: V.key.d_test_only });
const goal = 'Translate our shop into French by Friday';
const base = { agent: 'ag_buyer', goal, gap: 'cannot', considered: ['ls_alpha', 'ls_beta'], chose_for: ['word_pass', 'contract'], enough: { orders: 3, spend_minor: 3000, currency: 'chf' } };
const motive = await signMotive(key, 'example', { ...base, order: 'or_one', listing: 'ls_alpha', step: { n: 1, of: 2 }, stated_at: '2026-10-17T10:00:00.000Z' });
const receipt = await signReceipt(key, 'example', { order: 'or_one', listing: 'ls_alpha', seller: 'ag_seller', buyer: 'ag_buyer', amount_minor: 1200, currency: 'chf', delivered_at: '2026-10-17T10:00:05.000Z', delivery: '{"text":"Bonjour"}', motive });
const second = await signMotive(key, 'example', { ...base, order: 'or_two', listing: 'ls_gamma', gap: 'second_opinion', chose_for: ['price'], considered: [], step: { n: 2, of: 2 }, stated_at: '2026-10-17T11:00:00.000Z' });
const end = await signGoalEnd(key, 'example', { agent: 'ag_buyer', goal, outcome: 'reached', motives: [motive, second], at: '2026-10-17T12:00:00.000Z' });
const late = await signMotive(key, 'example', { ...base, order: 'or_one', listing: 'ls_alpha', stated_at: '2026-10-17T10:00:06.000Z' });
const afterEnd = await signMotive(key, 'example', { ...base, order: 'or_three', listing: 'ls_alpha', stated_at: '2026-10-17T13:00:00.000Z' });
const out = {
  about: "Test vectors for SPEC section 20, the why. Signed with the Ed25519 test key of word-pass-1.json (a live issuer adds the second signature of section 16). `motive` is the reason for or_one; `receipt` names it by hash and verifies with it, also against the principal's own `goal` text. `second` is the second purchase for the same goal, and `goal_end` names both. `stated_late` is a motive for or_one stated after its delivery: it fails with the receipt (the receipt also names another motive). `after_end` is a motive for the goal stated after the goal ended: the end does not name it and it fails with the end.",
  key: { kid: V.key.kid, see: 'word-pass-1.json key' },
  goal, goal_sha256: await sha256hex(goal),
  motive, motive_sha256: await sha256hex(canonical(motive)), receipt, second, goal_end: end, stated_late: late, after_end: afterEnd,
  expect: { receipt_with_motive: { valid: true }, receipt_with_stated_late: { valid: false }, goal_end_with_both: { valid: true, named: 2, missing: 0 }, goal_end_with_after_end: { valid: false } },
};
writeFileSync(new URL('../../vectors/motive-1.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
