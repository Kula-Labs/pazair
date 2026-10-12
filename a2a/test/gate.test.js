import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { importKey, signReceipt } from '../../issuer/src/index.js';
import { verifyMandate } from '../../verify/src/index.js';
import { decide, verifyEvidence, verifyDispute, hashOf, say, REASONS, principalSigned, runtimeProofBody, signAgentIdentity, signMandate, signStepUp, signEvidence, signDispute, signDisputeDecision, cardHash, cardExtension, problems } from '../src/index.js';
import { loadSchemas, loadPolicy } from '../src/node.js';

const V = JSON.parse(readFileSync(new URL('../../vectors/a2a-transfer-1.json', import.meta.url), 'utf8'));
const policy = loadPolicy();
const keys = [{ kid: V.key.kid, kty: 'OKP', crv: 'Ed25519', x: V.key.x }];
const issuer = await importKey({ kty: 'OKP', crv: 'Ed25519', x: V.key.x, d: V.key.d_test_only });
const runtime = await importKey({ kty: 'OKP', crv: 'Ed25519', x: V.runtime_key.x, d: V.runtime_key.d_test_only });
const principal = await importKey({ kty: 'OKP', crv: 'Ed25519', x: V.principal_key.x, d: V.principal_key.d_test_only });
const schemas = loadSchemas();
const check = (name, obj) => assert.deepEqual(problems(obj, schemas[name], schemas), [], name);
const reprove = async (r) => ({ ...r, runtime_proof: { kind: 'key', sig: (await runtime.sign(runtimeProofBody(r))).sig } });
const at = new Date(V.request.at);

test('reproduces the published vector: every signature, hash and decision', async () => {
  for (const o of [V.identity, V.step_up, V.receipt, V.evidence, V.dispute.dispute, V.dispute.answer, V.dispute.decision]) { const { sig, ...body } = o; assert.equal((await issuer.sign(body)).sig, sig); }
  const { sig, principal_sig, ...body } = V.mandate;
  assert.equal((await principal.sign(body)).sig, principal_sig.sig);
  assert.equal((await issuer.sign({ ...body, principal_sig })).sig, sig);
  assert.equal((await runtime.sign(JSON.parse(V.runtime_proof_over))).sig, V.request.runtime_proof.sig);
  assert.equal(await cardHash(V.card), V.card_hash);
  assert.equal(V.identity.card.sha256, V.card_hash, 'the identity names the card that carries it, without itself');
  for (const [a, b] of [[V.identity, V.identity_hash], [V.mandate, V.mandate_hash], [policy, V.policy_hash], [V.evidence, V.evidence_hash], [V.dispute.dispute, V.dispute.dispute_hash], [V.transition.policy, V.transition.policy_hash]]) assert.equal(await hashOf(a), b);
  assert.deepEqual(await decide(V.request, policy, { keys }), V.decision);
  assert.deepEqual(await decide(V.request, policy, { keys, now: at }), V.decision, 'the gateway clock agrees with the request');
  assert.deepEqual(await verifyEvidence(V.evidence, { keys, identity: V.identity, mandate: V.mandate, deal: V.request.deal, task: V.request.task, decision: V.decision, receipt: V.receipt }), V.evidence_check);
  assert.deepEqual(await verifyDispute(V.dispute.dispute, { keys, decision: V.dispute.decision, receipt: V.receipt, answer: V.dispute.answer }), V.dispute.check);
  assert.equal(V.decision.decision, 'allow');
  assert.deepEqual([V.evidence_check.valid, V.dispute.check.valid], [true, true]);
  for (const [name, x] of Object.entries(V.variants)) {
    const r = structuredClone(V.request);
    if (name === 'time_skew') assert.deepEqual((await decide(r, policy, { keys, now: '2026-10-11T10:00:00.000Z' })).reasons, x.reasons);
  }
});

test('every object of the vector conforms to its schema', () => {
  check('agent-identity.schema.json', V.identity);
  check('mandate.schema.json', V.mandate);
  check('transfer-request.schema.json', V.request);
  check('gateway-policy.schema.json', policy);
  check('gateway-policy.schema.json', V.transition.policy);
  check('step-up.schema.json', V.step_up);
  check('gate-decision.schema.json', V.decision);
  check('gate-decision.schema.json', V.transition.decision);
  check('evidence.schema.json', V.evidence);
  for (const o of [V.dispute.dispute, V.dispute.answer, V.dispute.decision]) check('dispute.schema.json', o);
  assert.ok(problems({ ...V.mandate, scope: { ...V.mandate.scope, counterparties: [] } }, schemas['mandate.schema.json'], schemas).length > 0, 'an empty allowlist is not a choice');
  assert.ok(problems({ ...V.evidence, settlement: { ...V.evidence.settlement, finality: 'pending' } }, schemas['evidence.schema.json'], schemas).length > 0);
  const { expires_at, ...spec32 } = V.mandate;
  assert.deepEqual(problems({ ...spec32, scope: { currency: 'chf', max_order_minor: 1, monthly_minor: null } }, schemas['mandate.schema.json'], schemas), [], 'a SPEC 3.2 mandate conforms: fields are only added');
  assert.match(problems({}, { $ref: 'nowhere.json#/x' }, schemas)[0], /schema error/, 'a broken schema is reported, not thrown');
});

test('the five questions: each missing answer is named, never guessed; step-up codes never ride a reject', async () => {
  for (const [name, x] of Object.entries(V.variants)) {
    assert.equal(x.reasons.length > 0, x.decision !== 'allow', name);
    for (const code of x.reasons) { assert.ok(REASONS[code], `${name}: ${code} is a known reason`); assert.equal(REASONS[code].retry === 'with_step_up', x.decision === 'step_up', `${name}: ${code}`); }
  }
  const r = V.variants;
  const only = (name, codes) => assert.deepEqual(r[name].reasons, codes, name);
  only('no_mandate', ['MANDATE_MISSING']); only('no_identity', ['IDENTITY_MISSING']); only('mandate_expired', ['MANDATE_EXPIRED']);
  only('counterparty_not_allowed', ['MANDATE_COUNTERPARTY_NOT_ALLOWED']); only('over_cap', ['MANDATE_OVER_ORDER_CAP']);
  only('over_monthly_cap', ['MANDATE_OVER_MONTHLY_CAP']); only('reserved_counts', ['MANDATE_OVER_MONTHLY_CAP']);
  only('fee_eats_call', ['FEE_EATS_CALL']); only('mcp_as_task', ['TASK_PROTOCOL_NOT_ALLOWED']); only('free_text_deal', ['DEAL_NO_TERMS']);
  only('prior_without_evidence', ['EVIDENCE_MISSING_PRIOR']); only('wrong_runtime_key', ['RUNTIME_MISMATCH']); only('proof_for_other_deal', ['RUNTIME_MISMATCH']);
  only('tool_not_allowed', ['RBAC_DENIED']); only('forged_mandate', ['MANDATE_SIGNATURE']); only('time_unreadable', ['REQUEST_TIME_INVALID']);
  only('time_skew', ['REQUEST_TIME_SKEW']); only('history_invalid', ['REQUEST_HISTORY_INVALID']); only('x402_usdc_without_fx', ['DEAL_FX_MISSING']);
  assert.equal(r.other_chain_without_evidence.decision, 'allow', 'the evidence rule is per chain');
  assert.equal(r.x402_usdc_with_fx.decision, 'allow', 'a CHF deal settles in USDC with a bound rate');
  assert.ok(r.x402_payee_not_onboarded.gaps.includes('counterparty_not_onboarded'), 'law 8: a payee that is no PazAIr agent is a marked gap');
  assert.deepEqual([r.step_up.decision, r.step_up.reasons], ['step_up', ['STEP_UP_AMOUNT']]);
  assert.equal(r.step_up_confirmed.decision, 'allow');
  assert.equal(r.step_up_other_deal.decision, 'step_up', 'a step-up is bound to its deal and seller');
});

test('a mandate of section 17 still verifies with verifyMandate of SPEC 3.2 (fields are only added)', async () => {
  const m = await verifyMandate(V.receipt, V.mandate, { keys });
  assert.equal(m.valid, true, m.reasons.join('; '));
  assert.equal(await principalSigned(V.mandate), true);
  assert.equal(await principalSigned({ ...V.mandate, principal_sig: { ...V.mandate.principal_sig, sig: V.mandate.principal_sig.sig.slice(0, -4) + 'AAAA' } }), false);
  assert.equal(await principalSigned({ ...V.mandate, pq_kid: 'a'.repeat(16), pq_sig: 'AAAA' }), true, 'the second signature of section 16 does not break the principal signature');
});

test('policy toggles: principal signature, counterparty identity, allowlist, purpose codes; gaps are marked', async () => {
  const strict = { ...policy, require: { ...policy.require, principal_signature: true, counterparty_identity: true, counterparty_allowlist: true, purpose_codes: true } };
  assert.deepEqual((await decide(V.request, strict, { keys })).reasons, ['COUNTERPARTY_IDENTITY_MISSING']);
  const bareSpec = { id: 'md_u', agent: 'ag_gamma', principal: V.identity.principal, currency: 'chf', max_order_minor: 1000, unattended: true, issued_at: V.mandate.issued_at, expires_at: V.mandate.expires_at };
  const bare = await signMandate(issuer, 'example', bareSpec);
  const d = await decide({ ...V.request, mandate: bare }, strict, { keys });
  assert.deepEqual(d.reasons, ['MANDATE_NO_COUNTERPARTIES', 'MANDATE_NO_PURPOSE_CODES', 'MANDATE_PRINCIPAL_SIGNATURE_REQUIRED', 'COUNTERPARTY_IDENTITY_MISSING']);
  const lax = await decide({ ...V.request, mandate: bare }, policy, { keys });
  assert.deepEqual([lax.decision, lax.gaps], ['allow', ['counterparty_identity', 'principal_signature']]);
  const otherKey = await importKey(JSON.parse(JSON.stringify({ kty: 'OKP', crv: 'Ed25519', x: V.runtime_key.x, d: V.runtime_key.d_test_only })));
  const wrongKey = await signMandate(issuer, 'example', { ...bareSpec, id: 'md_w' }, { principalKey: otherKey });
  assert.deepEqual((await decide({ ...V.request, mandate: wrongKey }, policy, { keys })).reasons, ['MANDATE_PRINCIPAL_KEY_MISMATCH'], 'the principal key is the one the identity attests');
  const noKeyId = await signAgentIdentity(issuer, 'example', { ...V.identity, principal_key: null, card: V.identity.card });
  const unattested = await decide(await reprove({ ...V.request, identity: noKeyId }), policy, { keys });
  assert.deepEqual([unattested.decision, unattested.gaps.includes('principal_key_unattested')], ['allow', true]);
});

test('identity: another principal, a SPIFFE runtime, an expired identity, an identity with the card that carries it', async () => {
  const other = await signAgentIdentity(issuer, 'example', { ...V.identity, principal: 'someone-else', card: V.identity.card, runtime: { kind: 'spiffe', id: 'spiffe://gamma.example/agent/ag_gamma' } });
  const d = await decide({ ...V.request, identity: other, runtime_proof: { kind: 'spiffe', peer_id: 'spiffe://gamma.example/agent/ag_gamma' } }, policy, { keys });
  assert.deepEqual(d.reasons, ['MANDATE_PRINCIPAL_MISMATCH']);
  assert.ok((await decide({ ...V.request, identity: other, runtime_proof: { kind: 'spiffe', peer_id: 'spiffe://gamma.example/agent/ag_other' } }, policy, { keys })).reasons.includes('RUNTIME_MISMATCH'));
  const expired = await signAgentIdentity(issuer, 'example', { ...V.identity, card: V.identity.card, expires_at: '2026-10-11T08:30:00.000Z' });
  const d3 = await decide({ ...V.request, identity: expired }, policy, { keys });
  assert.deepEqual([d3.reasons.includes('IDENTITY_EXPIRED'), d3.answered.identity], [true, false]);
  const otherExt = { uri: 'https://other.example/ext', required: false };
  const withExt = { ...V.card, capabilities: { extensions: [cardExtension(V.identity), otherExt] } };
  assert.equal(await cardHash(withExt), await hashOf({ ...V.card, capabilities: { extensions: [otherExt] } }), 'only the gate extension is removed before hashing');
  await assert.rejects(signAgentIdentity(issuer, 'example', { ...V.identity, card: { url: 'https://x.example/card' } }), /card.sha256 or card.card/);
});

test('step-up: another transfer, a smaller amount, expired, from the future, or for another deal does not count', async () => {
  const big = await reprove({ ...V.request, deal: { ...V.request.deal, amount_minor: 900 }, settlement: { ...V.request.settlement, amount_minor: 900 } });
  const s = (p, now = at) => signStepUp(issuer, 'example', { transfer: 'tr_1', agent: 'ag_gamma', mandate: V.mandate, deal: V.request.deal.hash, seller: 'ag_alpha', amount_minor: 900, ...p }, { now });
  for (const bad of [await s({ transfer: 'tr_other' }), await s({ amount_minor: 850 }), await s({}, new Date(at.getTime() - 600_000)), await s({}, new Date(at.getTime() + 3_600_000)), await s({ deal: 'c'.repeat(64) }), await s({ seller: 'ag_beta' })]) {
    assert.equal((await decide({ ...big, step_up: bad }, policy, { keys })).decision, 'step_up');
  }
  assert.equal((await decide({ ...big, step_up: V.step_up }, policy, { keys })).decision, 'allow');
});

test('unattended: absent or false means a human must be present, asserted by the gateway', async () => {
  const attended = await signMandate(issuer, 'example', { id: 'md_a', agent: 'ag_gamma', principal: V.identity.principal, currency: 'chf', max_order_minor: 1000, counterparties: ['ag_alpha'], purpose_codes: ['translation'], issued_at: V.mandate.issued_at, expires_at: V.mandate.expires_at });
  assert.equal(attended.scope.unattended, false);
  const d = await decide({ ...V.request, mandate: attended }, policy, { keys });
  assert.deepEqual([d.decision, d.reasons], ['step_up', ['STEP_UP_HUMAN_REQUIRED']]);
  assert.equal((await decide({ ...V.request, mandate: attended, human_present: true }, policy, { keys })).decision, 'allow');
  const { unattended, ...scope } = attended.scope; void unattended;
  const legacy = await issuer.sign({ ...(({ sig, ...b }) => b)(attended), scope });
  assert.equal((await decide({ ...V.request, mandate: legacy }, policy, { keys })).decision, 'step_up', 'a SPEC 3.2 mandate without the field is not unattended');
});

test('nothing is guessed and nothing throws: hostile and malformed input rejects with a reason', async () => {
  const deep = (n) => { let x = 1; for (let i = 0; i < n; i++) x = [x]; return x; };
  const hostile = await decide({ ...V.request, mandate: { ...V.mandate, scope: deep(100_000) } }, policy, { keys });
  assert.deepEqual([hostile.decision, hostile.reasons.includes('MANDATE_SIGNATURE')], ['reject', true]);
  for (const bad of [null, undefined, 'x', 42, [], {}, { history: 'x' }, { history: [null] }, { ...V.request, identity: 'str', keys: null }]) assert.equal((await decide(bad, policy, { keys })).decision, 'reject');
  for (const badKeys of [null, 'x', [null]]) assert.equal((await decide(V.request, policy, { keys: badKeys })).decision, 'reject');
  assert.ok((await decide(V.request, { ...policy, rbac: 'all' }, { keys })).reasons.includes('POLICY_INVALID'));
  assert.ok((await decide(V.request, { ...policy, clock_skew_seconds: 'abc' }, { keys })).reasons.includes('POLICY_INVALID'));
  assert.deepEqual((await decide(V.request, { ...policy, rbac: [{ agent: '*', effect: 'allow' }] }, { keys })).reasons, ['RBAC_DENIED']);
  assert.deepEqual((await decide({ ...V.request, at: 1791795600000 }, policy, { keys })).reasons, ['REQUEST_TIME_INVALID'], 'a number is not a time');
  assert.deepEqual((await decide({ ...V.request, at: '2026-10-11T09:00:00' }, policy, { keys })).reasons, ['REQUEST_TIME_INVALID'], 'a time without a zone is not a time');
  const priced = await decide({ ...V.request, settlement: { ...V.request.settlement, amount_minor: 499 } }, policy, { keys });
  assert.deepEqual([priced.reasons, priced.answered.deal], [['DEAL_PRICE_MISMATCH'], false]);
  assert.deepEqual((await decide({ ...V.request, settlement: { ...V.request.settlement, fee_minor: -5 } }, policy, { keys })).reasons, ['FEE_EATS_CALL']);
  assert.deepEqual((await decide({ ...V.request, history: [{ ...V.request.history[0], at: '2026-11-01T00:30:00+02:00', amount_minor: 4600 }] }, policy, { keys })).reasons, ['MANDATE_OVER_MONTHLY_CAP'], 'history times are normalised to UTC');
  assert.equal(say(undefined), 'Rejected: .');
  assert.match(say(V.decision, { lang: 'de' }), /^Erlaubt: .*Lücken: counterparty_identity\.$/);
  const strict = { ...policy, require: { ...policy.require, counterparty_identity: true } };
  assert.deepEqual((await decide({ ...V.request, counterparty_identity: { ...V.mandate, agent: 'ag_alpha' } }, strict, { keys })).reasons, ['COUNTERPARTY_IDENTITY_INVALID']);
  const fresh = await signAgentIdentity(issuer, 'example', { ...V.identity, agent: 'ag_alpha', card: V.identity.card });
  const withCp = await decide({ ...V.request, counterparty_identity: fresh }, strict, { keys });
  assert.deepEqual([withCp.decision, withCp.gaps.includes('counterparty_identity')], ['allow', false]);
});

test('evidence: pending is not success; a changed price, another mandate, task or receipt, or no allow fail', async () => {
  const base = { id: 'ev_t', transfer: 'tr_1', identity: V.identity, agent: 'ag_gamma', principal: V.identity.principal, task: V.request.task, deal: V.request.deal, mandate: V.mandate, counterparty: { agent: 'ag_alpha', identity: null }, price: { amount_minor: 500, currency: 'chf' }, settlement: { rail: 'stripe', id: 'ch_t', amount_minor: 500, currency: 'chf', fee_minor: 45, finality: 'captured', reversible_by_rail: true, finalized_at: V.evidence.settlement.finalized_at }, result: { status: 'delivered', delivery_sha256: V.receipt.delivery_sha256, receipt: V.receipt }, gate: V.evidence.gate, issued_at: V.evidence.issued_at };
  const good = await signEvidence(issuer, 'example', base);
  const all = { keys, identity: V.identity, mandate: V.mandate, deal: V.request.deal, task: V.request.task, decision: V.decision, receipt: V.receipt };
  assert.equal((await verifyEvidence(good, all)).valid, true);
  assert.deepEqual((await verifyEvidence(await signEvidence(issuer, 'example', { ...base, settlement: { ...base.settlement, finality: 'pending' } }), { keys })).reasons, ['EVIDENCE_NOT_FINAL']);
  assert.deepEqual((await verifyEvidence(await signEvidence(issuer, 'example', { ...base, settlement: { ...base.settlement, amount_minor: 450 } }), { keys })).reasons, ['EVIDENCE_PRICE_MISMATCH']);
  const usdc = await signEvidence(issuer, 'example', { ...base, settlement: { ...base.settlement, rail: 'x402', id: '0x' + 'ab'.repeat(32), amount_minor: 626, currency: 'usdc', asset: 'eip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', network: 'eip155:8453', fee_minor: 0, fx: { rate: 1.2524, quoted_at: V.request.at }, finality: 'confirmed', reversible_by_rail: false } });
  assert.equal((await verifyEvidence(usdc, all)).valid, true, 'settled in USDC with the bound rate');
  const otherMandate = await signMandate(issuer, 'example', { id: 'md_o', agent: 'ag_gamma', principal: V.identity.principal, currency: 'chf', max_order_minor: 1000, unattended: true, issued_at: V.mandate.issued_at, expires_at: V.mandate.expires_at });
  assert.deepEqual((await verifyEvidence(good, { keys, mandate: otherMandate })).reasons, ['EVIDENCE_NAMES_OTHER_MANDATE']);
  assert.deepEqual((await verifyEvidence(good, { keys, task: { ...V.request.task, task_id: 'task_2' } })).reasons, ['EVIDENCE_NAMES_OTHER_TASK']);
  assert.deepEqual((await verifyEvidence(good, { keys, decision: { ...V.decision, decision: 'reject' } })).reasons, ['EVIDENCE_WITHOUT_ALLOW']);
  const { sig, ...refused } = { ...V.evidence, gate: { ...V.evidence.gate, decision: 'reject' } }; void sig;
  assert.deepEqual((await verifyEvidence(await issuer.sign(refused), { keys })).reasons, ['EVIDENCE_WITHOUT_ALLOW'], 'with or without the decision object');
  assert.ok((await verifyEvidence({ ...good, result: { ...good.result, status: 'refunded' } }, { keys })).reasons.includes('EVIDENCE_SIGNATURE'));
  assert.deepEqual((await verifyEvidence(good, { keys, receipt: await signReceipt(issuer, 'example', { ...V.receipt, order: 'or_x', delivery: { text: 'x' } }) })).reasons, ['EVIDENCE_NAMES_OTHER_RECEIPT']);
  assert.deepEqual((await verifyEvidence(good, { keys, deal: { ...V.request.deal, amount_minor: 1 } })).reasons, ['EVIDENCE_NAMES_OTHER_DEAL'], 'the price is part of the deal');
  assert.equal((await verifyEvidence(null, { keys })).valid, false);
});

test('law 6: a dispute is an object; the decision names the dispute, the answer it saw, and a refund within what was paid', async () => {
  const D = V.dispute, at14 = '2026-10-14T09:00:00.000Z';
  const only = (name, codes) => assert.deepEqual(D.variants[name].reasons, codes, name);
  only('refund_over_paid', ['DISPUTE_REFUND_OVER_PAID']); only('for_seller_with_refund', ['DISPUTE_REFUND_UNEXPECTED']); only('for_seller', []);
  only('answer_hidden_from_decision', ['DISPUTE_ANSWER_MISMATCH']); only('decided_before_opened', ['DISPUTE_DECIDED_BEFORE_OPENED', 'DISPUTE_ANSWER_OUT_OF_ORDER']);
  const bySeller = await signDispute(issuer, 'example', { ...D.dispute, receipt: V.receipt, opened_by: 'ag_alpha', against: 'ag_gamma', claim_sha256: D.dispute.claim_sha256 });
  const dec = await signDisputeDecision(issuer, 'example', { dispute: bySeller, answer: null, outcome: 'for_seller', bears: 'principal', refund: null, decided_at: at14 });
  assert.deepEqual((await verifyDispute(bySeller, { keys, decision: dec, receipt: V.receipt })).reasons, ['DISPUTE_WRONG_PARTIES']);
  assert.ok((await verifyDispute(D.dispute, { keys, receipt: { ...V.receipt, order: 'or_other' } })).reasons.includes('DISPUTE_NAMES_OTHER_RECEIPT'));
  assert.ok((await verifyDispute(D.dispute, { keys, decision: { ...D.decision, outcome: 'for_seller', refund: null } })).reasons.includes('DISPUTE_DECISION_SIGNATURE'));
  const badCode = await signDispute(issuer, 'example', { ...D.dispute, receipt: V.receipt, reason_code: 'whatever', claim_sha256: D.dispute.claim_sha256 });
  assert.deepEqual((await verifyDispute(badCode, { keys })).reasons, ['DISPUTE_NO_CLAIM']);
  const negative = await signDisputeDecision(issuer, 'example', { dispute: D.dispute, answer: D.answer, outcome: 'for_buyer', bears: 'counterparty', refund: { rail: 'stripe', id: 're_n', amount_minor: -1, currency: 'chf' }, decided_at: at14 });
  assert.deepEqual((await verifyDispute(D.dispute, { keys, decision: negative })).reasons, ['DISPUTE_REFUND_MISSING']);
  assert.equal((await verifyDispute(null, { keys, decision: null })).valid, false);
});

test('transition policy: the PazAIr order of today passes as the task, and the gap stays visible', async () => {
  const d = await decide({ ...V.request, task: { ...V.request.task, protocol: 'pazair_order' } }, V.transition.policy, { keys });
  assert.deepEqual(d, V.transition.decision);
  assert.deepEqual([d.decision, d.gaps.includes('task_not_a2a')], ['allow', true]);
  assert.notEqual(d.policy, V.decision.policy, 'another policy, another hash in every decision');
});

test('reasons: a closed catalogue, each with question, layer, actor, retry and two sentences; generated module agrees', () => {
  const json = JSON.parse(readFileSync(new URL('../policy/rejection-reasons.json', import.meta.url), 'utf8'));
  assert.deepEqual(REASONS, json);
  const src = readFileSync(new URL('../src/gate.js', import.meta.url), 'utf8');
  for (const [code, r] of Object.entries(REASONS)) {
    assert.ok(r.de && r.en && [0, 1, 2, 3, 4, 5].includes(r.question), code);
    assert.ok(['agent', 'principal', 'issuer', 'counterparty', 'gateway'].includes(r.actor) && ['never', 'with_step_up', 'after_evidence', 'new_request', 'fix_policy'].includes(r.retry), code);
    assert.ok(src.includes(`'${code}'`), `${code} is emitted by the gate`);
  }
  for (const code of src.match(/'[A-Z][A-Z_]+'/g).map((s) => s.slice(1, -1))) if (/^[A-Z_]+$/.test(code) && code.length > 3) assert.ok(REASONS[code], `${code} is catalogued`);
});

test('an impossible time is unreadable, and a cap that is there but not a whole amount is never read as no cap', async () => {
  for (const t of ['2026-02-31T09:00:00Z', '2026-10-11T24:00:00Z', '2026-13-01T09:00:00Z', '2026-10-11T09:60:00Z']) assert.deepEqual((await decide({ ...V.request, at: t }, policy, { keys })).reasons, ['REQUEST_TIME_INVALID'], t);
  const resign = (scope) => issuer.sign({ ...(({ sig, ...b }) => b)(V.mandate), scope: { ...V.mandate.scope, ...scope } });
  const capText = await decide({ ...V.request, mandate: await resign({ monthly_minor: '20000' }) }, policy, { keys });
  assert.ok(capText.reasons.includes('MANDATE_OVER_MONTHLY_CAP'), JSON.stringify(capText.reasons));
  const stepText = await decide({ ...V.request, mandate: await resign({ step_up_above_minor: 1.5 }) }, policy, { keys });
  assert.ok([...stepText.reasons].includes('STEP_UP_AMOUNT') || stepText.decision !== 'allow', JSON.stringify(stepText));
  const noCap = await decide({ ...V.request, mandate: await resign({ monthly_minor: null }) }, policy, { keys });
  assert.ok(!noCap.reasons.includes('MANDATE_OVER_MONTHLY_CAP'), 'null still means no monthly cap');
});
