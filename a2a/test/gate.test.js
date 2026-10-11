import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { importKey, signReceipt } from '../../issuer/src/index.js';
import { verifyMandate } from '../../verify/src/index.js';
import { decide, verifyEvidence, hashOf, say, REASONS, principalSigned, signAgentIdentity, signMandate17, signStepUp, signEvidence, problems, loadSchemas } from '../src/index.js';

const V = JSON.parse(readFileSync(new URL('../../vectors/a2a-transfer-1.json', import.meta.url), 'utf8'));
const policy = JSON.parse(readFileSync(new URL('../policy/gateway-policy.json', import.meta.url), 'utf8'));
const keys = [{ kid: V.key.kid, kty: 'OKP', crv: 'Ed25519', x: V.key.x }];
const issuer = await importKey({ kty: 'OKP', crv: 'Ed25519', x: V.key.x, d: V.key.d_test_only });
const schemas = loadSchemas();
const check = (name, obj) => assert.deepEqual(problems(obj, schemas[name], schemas), [], name);

test('reproduces the published vector: every signature, hash and decision', async () => {
  const runtime = await importKey({ kty: 'OKP', crv: 'Ed25519', x: V.runtime_key.x, d: V.runtime_key.d_test_only });
  const principal = await importKey({ kty: 'OKP', crv: 'Ed25519', x: V.principal_key.x, d: V.principal_key.d_test_only });
  for (const o of [V.identity, V.step_up, V.receipt, V.evidence]) { const { sig, ...body } = o; assert.equal((await issuer.sign(body)).sig, sig); }
  const { sig, principal_sig, ...body } = V.mandate;
  assert.equal((await principal.sign(body)).sig, principal_sig.sig);
  assert.equal((await issuer.sign({ ...body, principal_sig })).sig, sig);
  assert.equal((await runtime.sign(JSON.parse(V.runtime_proof_over))).sig, V.request.runtime_proof.sig);
  assert.equal(await hashOf(V.identity), V.identity_hash);
  assert.equal(await hashOf(V.mandate), V.mandate_hash);
  assert.equal(await hashOf(policy), V.policy_hash);
  assert.equal(await hashOf(V.evidence), V.evidence_hash);
  assert.deepEqual(await decide(V.request, policy, { keys }), V.decision);
  assert.deepEqual(await verifyEvidence(V.evidence, { keys, identity: V.identity, mandate: V.mandate, deal: V.request.deal, decision: V.decision, receipt: V.receipt }), V.evidence_check);
  assert.equal(V.decision.decision, 'allow');
  assert.equal(V.evidence_check.valid, true);
});

test('every object of the vector conforms to its schema', () => {
  check('agent-identity.schema.json', V.identity);
  check('mandate.schema.json', V.mandate);
  check('transfer-request.schema.json', V.request);
  check('gateway-policy.schema.json', policy);
  check('evidence.schema.json', V.evidence);
  assert.ok(problems({ ...V.mandate, scope: { ...V.mandate.scope, counterparties: [] } }, schemas['mandate.schema.json'], schemas).length > 0, 'an empty allowlist is not a choice');
  assert.ok(problems({ ...V.evidence, settlement: { ...V.evidence.settlement, final: 'yes' } }, schemas['evidence.schema.json'], schemas).length > 0);
});

test('the five questions: each missing answer is named, never guessed', async () => {
  for (const [name, expected] of Object.entries(V.variants)) {
    assert.equal(expected.reasons.length > 0, expected.decision !== 'allow', name);
    for (const code of expected.reasons) assert.ok(REASONS[code], `${name}: ${code} is a known reason`);
  }
  const r = V.variants;
  assert.deepEqual(r.no_mandate.reasons, ['MANDATE_MISSING']);
  assert.deepEqual(r.no_identity.reasons, ['IDENTITY_MISSING']);
  assert.deepEqual(r.mandate_expired.reasons, ['MANDATE_EXPIRED']);
  assert.deepEqual(r.counterparty_not_allowed.reasons, ['MANDATE_COUNTERPARTY_NOT_ALLOWED']);
  assert.deepEqual(r.over_monthly_cap.reasons, ['MANDATE_OVER_MONTHLY_CAP']);
  assert.deepEqual(r.fee_eats_call.reasons, ['FEE_EATS_CALL']);
  assert.deepEqual(r.mcp_as_task.reasons, ['TASK_PROTOCOL_NOT_ALLOWED']);
  assert.deepEqual(r.free_text_deal.reasons, ['DEAL_NO_TERMS']);
  assert.deepEqual(r.prior_without_evidence.reasons, ['EVIDENCE_MISSING_PRIOR']);
  assert.deepEqual(r.wrong_runtime_key.reasons, ['RUNTIME_MISMATCH']);
  assert.deepEqual(r.tool_not_allowed.reasons, ['RBAC_DENIED']);
  assert.deepEqual(r.forged_mandate.reasons, ['MANDATE_SIGNATURE']);
  assert.equal(r.step_up.decision, 'step_up');
  assert.deepEqual(r.step_up.reasons, ['STEP_UP_AMOUNT']);
  assert.equal(r.step_up_confirmed.decision, 'allow');
  assert.equal(r.over_cap.decision, 'reject', 'a step-up never turns a reject into an allow');
});

test('a mandate of section 17 still verifies with verifyMandate of SPEC 3.2 (fields are only added)', async () => {
  const m = await verifyMandate(V.receipt, V.mandate, { keys });
  assert.equal(m.valid, true, m.reasons.join('; '));
  assert.equal(await principalSigned(V.mandate), true);
  assert.equal(await principalSigned({ ...V.mandate, principal_sig: { ...V.mandate.principal_sig, sig: V.mandate.principal_sig.sig.slice(0, -4) + 'AAAA' } }), false);
});

test('a policy that requires more rejects more: principal signature, counterparty identity, allowlist', async () => {
  const strict = { ...policy, require: { ...policy.require, principal_signature: true, counterparty_identity: true, counterparty_allowlist: true } };
  const d = await decide(V.request, strict, { keys });
  assert.deepEqual(d.reasons, ['COUNTERPARTY_IDENTITY_MISSING']);
  const unsigned = await signMandate17(issuer, 'example', { id: 'md_u', agent: 'ag_gamma', principal: V.identity.principal, currency: 'chf', max_order_minor: 1000, counterparties: ['*'], purpose_codes: ['translation'], unattended: true, issued_at: V.mandate.issued_at, expires_at: V.mandate.expires_at });
  const d2 = await decide({ ...V.request, mandate: unsigned }, { ...policy, require: { ...policy.require, principal_signature: true } }, { keys });
  assert.deepEqual(d2.reasons, ['MANDATE_PRINCIPAL_SIGNATURE_REQUIRED']);
  const d3 = await decide({ ...V.request, mandate: unsigned }, policy, { keys });
  assert.equal(d3.decision, 'allow');
  assert.ok(d3.gaps.includes('principal_signature'), 'law 8: a missing layer is marked, not hidden');
});

test('identity: another principal, a SPIFFE runtime, an expired identity', async () => {
  const other = await signAgentIdentity(issuer, 'example', { ...V.identity, principal: 'someone-else', card: { url: V.identity.card.url, sha256: V.identity.card.sha256 }, runtime: { kind: 'spiffe', id: 'spiffe://gamma.example/agent/ag_gamma' } });
  const d = await decide({ ...V.request, identity: other, runtime_proof: { kind: 'spiffe', peer_id: 'spiffe://gamma.example/agent/ag_gamma' } }, policy, { keys });
  assert.deepEqual(d.reasons, ['MANDATE_PRINCIPAL_MISMATCH'], 'the mandate must come from the principal the identity names');
  const d2 = await decide({ ...V.request, identity: other, runtime_proof: { kind: 'spiffe', peer_id: 'spiffe://gamma.example/agent/ag_other' } }, policy, { keys });
  assert.ok(d2.reasons.includes('RUNTIME_MISMATCH'));
  const expired = await signAgentIdentity(issuer, 'example', { ...V.identity, card: { url: V.identity.card.url, sha256: V.identity.card.sha256 }, expires_at: '2026-10-11T08:30:00.000Z' });
  const d3 = await decide({ ...V.request, identity: expired }, policy, { keys });
  assert.ok(d3.reasons.includes('IDENTITY_EXPIRED'));
  assert.equal(d3.answered.identity, false);
});

test('step-up: a confirmation for another transfer, a smaller amount or an expired one does not count', async () => {
  const big = { ...V.request, deal: { ...V.request.deal, amount_minor: 900 }, settlement: { ...V.request.settlement, amount_minor: 900 } };
  const at = new Date(V.request.at);
  const wrongTransfer = await signStepUp(issuer, 'example', { transfer: 'tr_other', agent: 'ag_gamma', mandate: V.mandate, amount_minor: 900 }, { now: at });
  const tooSmall = await signStepUp(issuer, 'example', { transfer: 'tr_1', agent: 'ag_gamma', mandate: V.mandate, amount_minor: 850 }, { now: at });
  const expired = await signStepUp(issuer, 'example', { transfer: 'tr_1', agent: 'ag_gamma', mandate: V.mandate, amount_minor: 900 }, { now: new Date(at.getTime() - 600_000) });
  for (const s of [wrongTransfer, tooSmall, expired]) assert.equal((await decide({ ...big, step_up: s }, policy, { keys })).decision, 'step_up');
  assert.equal((await decide({ ...big, step_up: V.step_up }, policy, { keys })).decision, 'allow');
});

test('unattended false: a human must be present, or every transfer is a step-up', async () => {
  const attended = await signMandate17(issuer, 'example', { id: 'md_a', agent: 'ag_gamma', principal: V.identity.principal, currency: 'chf', max_order_minor: 1000, counterparties: ['ag_alpha'], purpose_codes: ['translation'], unattended: false, issued_at: V.mandate.issued_at, expires_at: V.mandate.expires_at });
  const d = await decide({ ...V.request, mandate: attended }, policy, { keys });
  assert.deepEqual([d.decision, d.reasons], ['step_up', ['STEP_UP_HUMAN_REQUIRED']]);
  const d2 = await decide({ ...V.request, mandate: attended, human_present: true }, policy, { keys });
  assert.equal(d2.decision, 'allow');
});

test('evidence: not final is not success; a changed price, another mandate or no preceding allow fail', async () => {
  const base = { id: 'ev_t', transfer: 'tr_1', identity: V.identity, agent: 'ag_gamma', principal: V.identity.principal, task: V.request.task, deal: V.request.deal, mandate: V.mandate, counterparty: { agent: 'ag_alpha', identity: null }, price: { amount_minor: 500, currency: 'chf' }, settlement: { rail: 'stripe', id: 'pi_t', amount_minor: 500, currency: 'chf', fee_minor: 45, final: true, finalized_at: V.evidence.settlement.finalized_at }, result: { status: 'delivered', delivery_sha256: V.receipt.delivery_sha256, receipt: V.receipt }, gate: V.evidence.gate, issued_at: V.evidence.issued_at };
  const good = await signEvidence(issuer, 'example', base);
  assert.equal((await verifyEvidence(good, { keys, identity: V.identity, mandate: V.mandate, deal: V.request.deal, decision: V.decision, receipt: V.receipt })).valid, true);
  const pending = await signEvidence(issuer, 'example', { ...base, settlement: { ...base.settlement, final: false } });
  assert.deepEqual((await verifyEvidence(pending, { keys })).reasons, ['EVIDENCE_NOT_FINAL']);
  const skimmed = await signEvidence(issuer, 'example', { ...base, settlement: { ...base.settlement, amount_minor: 450 } });
  assert.deepEqual((await verifyEvidence(skimmed, { keys })).reasons, ['EVIDENCE_PRICE_MISMATCH']);
  const otherMandate = await signMandate17(issuer, 'example', { id: 'md_o', agent: 'ag_gamma', principal: V.identity.principal, currency: 'chf', max_order_minor: 1000, counterparties: ['*'], purpose_codes: ['translation'], unattended: true, issued_at: V.mandate.issued_at, expires_at: V.mandate.expires_at });
  assert.deepEqual((await verifyEvidence(good, { keys, mandate: otherMandate })).reasons, ['EVIDENCE_NAMES_OTHER_MANDATE']);
  assert.deepEqual((await verifyEvidence(good, { keys, decision: { ...V.decision, decision: 'reject' } })).reasons, ['EVIDENCE_WITHOUT_ALLOW']);
  const tampered = { ...good, result: { ...good.result, status: 'refunded' } };
  assert.ok((await verifyEvidence(tampered, { keys })).reasons.includes('EVIDENCE_SIGNATURE'));
  const otherReceipt = await signReceipt(issuer, 'example', { ...V.receipt, order: 'or_x', delivery: { text: 'x' } });
  assert.deepEqual((await verifyEvidence(good, { keys, receipt: otherReceipt })).reasons, ['EVIDENCE_NAMES_OTHER_RECEIPT']);
});

test('say: one sentence per decision, in English; REASONS carries the German one', () => {
  assert.equal(say(V.decision), 'Allowed: all four questions answered; the fifth comes with the evidence.');
  assert.match(say({ decision: 'reject', reasons: ['MANDATE_MISSING'] }), /^Rejected: no mandate/);
  assert.match(say({ decision: 'step_up', reasons: ['STEP_UP_AMOUNT'] }), /^Step-up needed/);
  for (const [code, r] of Object.entries(REASONS)) assert.ok(r.de && r.en && [0, 1, 2, 3, 4, 5].includes(r.question), code);
});
