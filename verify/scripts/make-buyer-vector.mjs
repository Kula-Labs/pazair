// Writes vectors/buyer-word-1.json (SPEC section 4, the buyer's word): a buyer's pass signed with the test key of
// word-pass-1.json, the badge table, the sentence, and a forged badge that must fail. Ed25519 is deterministic, so the
// file reproduces byte for byte (CI: node scripts/make-buyer-vector.mjs && git diff --exit-code ../vectors/buyer-word-1.json).
import { readFileSync, writeFileSync } from 'node:fs';
import { buyerWordOf, canonical, sayPass } from '../src/index.js';

const V = JSON.parse(readFileSync(new URL('../../vectors/word-pass-1.json', import.meta.url), 'utf8'));
const priv = await crypto.subtle.importKey('jwk', { kty: 'OKP', crv: 'Ed25519', x: V.key.x, d: V.key.d_test_only }, { name: 'Ed25519' }, false, ['sign']);
const b64u = (b) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const sign = async (body) => ({ ...body, sig: b64u(await crypto.subtle.sign({ name: 'Ed25519' }, priv, new TextEncoder().encode(canonical(body)))) });

const cases = [
  { paid_orders: 0, sellers: 0, chargebacks: 0 },
  { paid_orders: 10, sellers: 5, chargebacks: 0 },
  { paid_orders: 10, sellers: 4, chargebacks: 0 },
  { paid_orders: 19, sellers: 5, chargebacks: 1 },
  { paid_orders: 9, sellers: 5, chargebacks: 1 },
  { paid_orders: 12, sellers: 6, chargebacks: 1 },
  { paid_orders: 0, sellers: 0, chargebacks: 2 },
].map((as_buyer) => ({ as_buyer, buyer_word: buyerWordOf({ as_buyer }) }));

const noSales = { delivered: 0, not_delivered: 0, success_rate: null, median_delivery_ms: null, buyers: 0, first_sale: null, last_sale: null };
// An assistant that buys: 12 paid orders from 6 sellers, one honest dispute it lost, no chargeback.
const as_buyer = { paid_orders: 12, sellers: 6, chargebacks: 0, disputes_opened: 1, disputes_upheld_for_seller: 1 };
const body = { v: 1, issuer: 'example', kind: 'word_pass', kid: V.key.kid, agent: 'ag_muse', name: 'Muse', verified_name: null, since: '2026-10-01T00:00:00.000Z',
  as_seller: noSales, as_buyer, disputes_lost: 0, word: { kept_pct: null, badge: null }, buyer_word: buyerWordOf({ as_buyer }), day: '2026-10-14', issued_at: '2026-10-14T03:17:00.000Z' };
const pass = await sign(body);
const forged = await sign({ ...body, as_buyer: { ...as_buyer, paid_orders: 9 } }); // signed, but the badge does not follow from its counts

const vector = {
  about: "Test vectors for SPEC section 4, the buyer's word: buyer_word follows from as_buyer (paid_orders, sellers, chargebacks). Only a chargeback on a delivered order breaks it; an honest dispute, won or lost, does not. Signed with the test key of word-pass-1.json.",
  cases,
  pass,
  say: sayPass(pass),
  forged: { change: 'as_buyer.paid_orders = 9, buyer_word still pays_99, signed again', pass: forged, word_consistent: false },
};
writeFileSync(new URL('../../vectors/buyer-word-1.json', import.meta.url), JSON.stringify(vector, null, 2) + '\n');
console.log('vectors/buyer-word-1.json written');
