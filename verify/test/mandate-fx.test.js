// Section 3.2, other currencies: a purchase in a currency other than the mandate's counts only with the rates the mandate
// itself was signed with, while they are valid. The same rule the issuer applies when the order is placed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canonical, countUnderMandate, receiptHash, sha256hex, verifyMandate } from '../src/index.js';

const b64u = (b) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function issuer() {
  const pair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  const kid = (await sha256hex(jwk.x)).slice(0, 16);
  const sign = async (body) => ({ ...body, kid, sig: b64u(await crypto.subtle.sign({ name: 'Ed25519' }, pair.privateKey, new TextEncoder().encode(canonical({ ...body, kid })))) });
  return { keys: [{ kid, kty: 'OKP', crv: 'Ed25519', x: jwk.x }], sign };
}
const FX = { margin_bps: 500, as_of: '2026-10-23', source: 'ECB reference rates', valid_days: 60, per_chf: { chf: 1, usd: 1.2131, eur: 1.0838 } };

test('the counting rule: own currency as is, another with the signed rates plus the margin, rounded up', () => {
  const at = Date.parse('2026-10-24T10:00:00Z');
  assert.equal(countUnderMandate(FX, 500, 'usd', 'usd', at), 500);
  assert.equal(countUnderMandate(FX, 500, 'chf', 'usd', at), 637, '5.00 CHF = 6.0655 USD, 6.37 with 5 %');
  assert.equal(countUnderMandate(FX, 637, 'usd', 'chf', at), Math.ceil(637 * (1 / 1.2131) * 1.05));
});

test('it refuses what it cannot count: no rates, a missing currency, rates too old, bad numbers', () => {
  const at = Date.parse('2026-10-24T10:00:00Z');
  assert.equal(countUnderMandate(undefined, 500, 'chf', 'usd', at), null);
  assert.equal(countUnderMandate(FX, 500, 'cad', 'usd', at), null);
  assert.notEqual(countUnderMandate(FX, 500, 'chf', 'usd', Date.parse('2026-12-23T00:00:00Z')), null, '60 days and one day of grace is the last moment');
  assert.equal(countUnderMandate(FX, 500, 'chf', 'usd', Date.parse('2026-12-24T00:00:00Z')), null);
  assert.equal(countUnderMandate({ ...FX, margin_bps: -1 }, 500, 'chf', 'usd', at), null);
  assert.equal(countUnderMandate(FX, 5.5, 'chf', 'usd', at), null);
  assert.equal(countUnderMandate({ ...FX, per_chf: { chf: 1, usd: 0 } }, 500, 'chf', 'usd', at), null);
});

test('verifyMandate: a CHF receipt within a USD mandate holds, and every way around the rule is caught', async () => {
  const I = await issuer();
  const mandate = await I.sign({ v: 1, kind: 'mandate', issuer: 'pazair', id: 'md_1', agent: 'ag_b', principal: 'p', how: 'card_saved', scope: { currency: 'usd', max_order_minor: 700, monthly_minor: 5000, fx: FX }, purpose: null, issued_at: '2026-10-23T10:00:00.000Z' });
  const h = await receiptHash(mandate);
  const receipt = (over = {}) => I.sign({ v: 1, kind: 'receipt', issuer: 'pazair', order: 'or_1', buyer: 'ag_b', seller: 'ag_s', amount_minor: 500, currency: 'chf', delivered_at: '2026-10-24T09:00:00.000Z', mandate: h, ...over });
  const run = async (r, m = mandate) => verifyMandate(r, m, { keys: I.keys });
  const good = await run(await receipt());
  assert.equal(good.valid, true, JSON.stringify(good.reasons)); assert.ok(good.covers.includes("currency counted with the mandate's rates"));
  const over = await run(await receipt({ amount_minor: 600 }));
  assert.equal(over.valid, false); assert.match(over.reasons.join(), /counts as 765 usd, over the cap 700/);
  const late = await run(await receipt({ delivered_at: '2027-01-10T09:00:00.000Z' }));
  assert.equal(late.valid, false); assert.match(late.reasons.join(), /older than their validity/);
  const bare = await I.sign({ ...JSON.parse(JSON.stringify(mandate)), scope: { currency: 'usd', max_order_minor: 700, monthly_minor: 5000 }, sig: undefined, kid: undefined });
  const noRates = await run(await receipt({ mandate: await receiptHash(bare) }), bare);
  assert.equal(noRates.valid, false); assert.match(noRates.reasons.join(), /carries no rates/);
  // rates cannot be edited afterwards: the mandate is signed with them
  const edited = { ...mandate, scope: { ...mandate.scope, fx: { ...FX, margin_bps: 0 } } };
  assert.ok((await run(await receipt(), edited)).reasons.includes('mandate signature'));
  // a mandate in its own currency is unchanged
  const same = await run(await receipt({ currency: 'usd', amount_minor: 700 }));
  assert.equal(same.valid, true);
});
