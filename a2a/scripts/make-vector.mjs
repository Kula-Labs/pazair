#!/usr/bin/env node
// Writes ../../vectors/a2a-transfer-1.json: one transfer through the gate, start to evidence, with the test key of
// vectors/word-pass-1.json. Deterministic: Ed25519 signatures are deterministic, every time is fixed.
import { readFileSync, writeFileSync } from 'node:fs';
import { importKey, signReceipt } from '../../issuer/src/index.js';
import { canonical } from '../../verify/src/index.js';
import { decide, verifyEvidence, verifyDispute, hashOf, say, runtimeProofBody } from '../src/gate.js';
import { signAgentIdentity, signMandate, signStepUp, signEvidence, signDispute, signDisputeAnswer, signDisputeDecision, cardHash, cardExtension } from '../src/issue.js';
import { loadPolicy } from '../src/node.js';

const W = JSON.parse(readFileSync(new URL('../../vectors/word-pass-1.json', import.meta.url), 'utf8'));
const policy = loadPolicy('gateway-policy');
const transition = loadPolicy('gateway-policy-transition');
const issuer = await importKey({ kty: 'OKP', crv: 'Ed25519', x: W.key.x, d: W.key.d_test_only });
const keys = [{ kid: issuer.kid, kty: 'OKP', crv: 'Ed25519', x: issuer.x }];

// Fixed Ed25519 test pairs (test only): the agent's runtime key and the principal's key.
const RUNTIME = { kty: 'OKP', crv: 'Ed25519', x: 'MNKcmD0FGTuC-0QRZwPVmDRg-xPgUuoljiNCUmYZIXA', d: 'l-w2OsfuETTHJWNQIUdVjfutKQyaBk5FLlH4WRWOKV0' };
const PRINCIPAL = { kty: 'OKP', crv: 'Ed25519', x: '1cH91LU1oWuA8Vaq5Ws5bSmenXQCSBqklp0E2yEWHME', d: 'V9ytQ2JBcrAdas3OjhZ_UCEzjCQit5cXd-LyrVu96lg' };
const runtime = await importKey(RUNTIME);
const principalKey = await importKey(PRINCIPAL);

const T = { identity: '2026-10-11T08:00:00.000Z', mandate: '2026-10-11T08:05:00.000Z', at: '2026-10-11T09:00:00.000Z', settled: '2026-10-11T09:00:04.000Z', evidence: '2026-10-11T09:00:05.000Z' };

// The agent card (A2A 1.0 shape) carries the identity in its gate extension; the identity names the card without it.
const cardBase = { protocolVersion: '1.0', name: 'Gamma', description: 'Buys translations for a shop.', supportedInterfaces: [{ url: 'https://gamma.example/a2a', protocolBinding: 'JSONRPC', protocolVersion: '1.0' }], capabilities: { extensions: [] }, skills: [{ id: 'translate', name: 'Translate' }] };
const identity = await signAgentIdentity(issuer, 'example', {
  agent: 'ag_gamma', principal: 'principal-ref-7', principal_kind: 'company', principal_key: principalKey.x,
  runtime: { kind: 'key', alg: 'Ed25519', x: runtime.x, kid: runtime.kid },
  card: { url: 'https://gamma.example/.well-known/agent-card.json', card: cardBase }, pass: 'https://example.test/v1/agents/ag_gamma/pass',
  issued_at: T.identity, expires_at: '2027-10-11T08:00:00.000Z',
});
const card = { ...cardBase, capabilities: { extensions: [cardExtension(identity)] } };
const mandate = await signMandate(issuer, 'example', {
  id: 'md_17', agent: 'ag_gamma', principal: identity.principal, currency: 'chf', max_order_minor: 1000, monthly_minor: 5000,
  counterparties: ['ag_alpha', 'ag_beta'], purpose_codes: ['translation'], step_up_above_minor: 800, unattended: true, how: 'card_saved',
  purpose: 'translations for our shop', issued_at: T.mandate, expires_at: '2026-12-31T23:59:59.000Z',
}, { principalKey });

const listing = { id: 'ls_translate', seller: 'ag_alpha', price: { amount_minor: 500, currency: 'chf' }, output_schema: { type: 'object', required: ['text'] } };
const deal = { kind: 'listing', ref: listing.id, hash: await hashOf(listing), seller: 'ag_alpha', amount_minor: 500, currency: 'chf', purpose_code: 'translation', output_schema_sha256: await hashOf(listing.output_schema) };
const taskMessage = { messageId: 'msg_1', role: 'ROLE_USER', parts: [{ text: 'Translate "Grüezi mitenand" into French.' }] };
const task = { protocol: 'a2a', version: '1.0', task_id: 'task_1', context_id: null, agreed_sha256: await hashOf(taskMessage) };
const transfer = 'tr_1', aud = 'gw_example';
const base = { v: 1, kind: 'transfer_request', transfer, at: T.at, tool: 'buy', aud, human_present: false, identity, task, deal, mandate, mandate_end: null, step_up: null, counterparty_identity: null,
  settlement: { rail: 'stripe', amount_minor: 500, currency: 'chf', fee_minor: 45 },
  history: [{ transfer: 'tr_0', at: '2026-10-11T08:30:00.000Z', amount_minor: 300, currency: 'chf', settlement_id: 'pi_0', evidence: 'a'.repeat(64), chain: null }] };
const chain0 = (await decide({ ...base, runtime_proof: { kind: 'spiffe', peer_id: 'x' } }, policy, { keys })).chain;
base.history[0].chain = chain0;
const runtimeProof = { kind: 'key', sig: (await runtime.sign(runtimeProofBody(base))).sig };
const request = { ...base, runtime_proof: runtimeProof };
const decision = await decide(request, policy, { keys });

const delivery = { text: 'Bonjour à tous' };
const receipt = await signReceipt(issuer, 'example', { order: 'or_17', listing: listing.id, seller: 'ag_alpha', buyer: 'ag_gamma', amount_minor: 500, currency: 'chf', delivered_at: T.settled, delivery, mandate });
const evidence = await signEvidence(issuer, 'example', {
  id: 'ev_1', transfer, identity, agent: 'ag_gamma', principal: identity.principal, task, deal, mandate,
  counterparty: { agent: 'ag_alpha', identity: null }, price: { amount_minor: 500, currency: 'chf' },
  settlement: { rail: 'stripe', id: 'ch_17', amount_minor: 500, currency: 'chf', fee_minor: 45, finality: 'captured', reversible_by_rail: true, finalized_at: T.settled },
  result: { status: 'delivered', delivery_sha256: receipt.delivery_sha256, receipt }, gate: { policy: decision.policy, decision: decision.decision, decided_at: decision.decided_at },
  issued_at: T.evidence,
});
const evidenceCheck = await verifyEvidence(evidence, { keys, identity, mandate, deal, task, decision, receipt });

// Variants: the same request, one thing wrong each (or one thing different). The gate names it.
const variants = {};
const v = async (name, patch, opts = {}) => { const r = patch(structuredClone(request)); const d = await decide(r, policy, { keys, ...opts }); variants[name] = { decision: d.decision, reasons: d.reasons, gaps: d.gaps, say: say(d) }; };
const reprove = async (r) => ({ ...r, runtime_proof: { kind: 'key', sig: (await runtime.sign(runtimeProofBody(r))).sig } });
await v('no_mandate', (r) => ({ ...r, mandate: null }));
await v('no_identity', (r) => ({ ...r, identity: null }));
await v('mandate_expired', (r) => ({ ...r, at: '2027-01-02T00:00:00.000Z' }));
await v('counterparty_not_allowed', (r) => ({ ...r, deal: { ...r.deal, seller: 'ag_delta' } }));
await v('over_monthly_cap', (r) => ({ ...r, history: [{ transfer: 'tr_0', at: '2026-10-02T08:30:00.000Z', amount_minor: 4600, currency: 'chf', settlement_id: 'pi_0', evidence: 'a'.repeat(64), chain: chain0 }] }));
await v('reserved_counts', (r) => ({ ...r, history: [{ transfer: 'tr_0', at: '2026-10-02T08:30:00.000Z', amount_minor: 4600, currency: 'chf', settlement_id: null, evidence: null, chain: chain0 }] }));
const overCap = await reprove({ ...request, deal: { ...deal, amount_minor: 1200 }, settlement: { ...request.settlement, amount_minor: 1200 } });
const bigDeal = { ...deal, amount_minor: 900 };
const bigReq = await reprove({ ...request, deal: bigDeal, settlement: { ...request.settlement, amount_minor: 900 } });
await v('over_cap', () => overCap);
await v('step_up', () => bigReq);
const stepUp = await signStepUp(issuer, 'example', { transfer, agent: 'ag_gamma', mandate, deal: deal.hash, seller: 'ag_alpha', amount_minor: 900 }, { now: new Date(T.at) });
await v('step_up_confirmed', () => ({ ...bigReq, step_up: stepUp }));
await v('step_up_other_deal', () => ({ ...bigReq, step_up: stepUp, deal: { ...bigDeal, seller: 'ag_beta' } }));
await v('fee_eats_call', (r) => ({ ...r, settlement: { ...r.settlement, fee_minor: 200 } }));
await v('mcp_as_task', (r) => ({ ...r, task: { ...r.task, protocol: 'pazair_order' } }));
await v('free_text_deal', (r) => { const d = { ...r.deal }; delete d.output_schema_sha256; return { ...r, deal: d }; });
await v('prior_without_evidence', (r) => ({ ...r, history: [{ transfer: 'tr_0', at: '2026-10-11T08:30:00.000Z', amount_minor: 300, currency: 'chf', settlement_id: 'pi_0', evidence: null, chain: chain0 }] }));
await v('other_chain_without_evidence', (r) => ({ ...r, history: [{ transfer: 'tr_0', at: '2026-10-11T08:30:00.000Z', amount_minor: 300, currency: 'chf', settlement_id: 'pi_0', evidence: null, chain: 'b'.repeat(64) }] }));
await v('wrong_runtime_key', (r) => ({ ...r, runtime_proof: { kind: 'key', sig: runtimeProof.sig.slice(0, -4) + 'AAAA' } }));
await v('proof_for_other_deal', (r) => ({ ...r, deal: { ...r.deal, amount_minor: 400 }, settlement: { ...r.settlement, amount_minor: 400 } }));
await v('tool_not_allowed', (r) => ({ ...r, tool: 'export_my_data' }));
await v('forged_mandate', (r) => ({ ...r, mandate: { ...r.mandate, scope: { ...r.mandate.scope, max_order_minor: 100000 } } }));
await v('time_unreadable', (r) => ({ ...r, at: '2026-10-11 09:00' }));
await v('time_skew', (r) => r, { now: '2026-10-11T10:00:00.000Z' });
await v('history_invalid', (r) => ({ ...r, history: [{ transfer: 'tr_0', at: '2026-10-11T08:30:00.000Z', amount_minor: -300, currency: 'chf', settlement_id: 'pi_0', evidence: null }] }));
const usdc = await reprove({ ...request, settlement: { rail: 'x402', amount_minor: 626, currency: 'usdc', asset: 'eip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', network: 'eip155:8453', fee_minor: 0, fx: { rate: 1.2524, quoted_at: '2026-10-11T08:59:00.000Z' } } });
await v('x402_usdc_with_fx', () => usdc);
await v('x402_usdc_without_fx', () => { const s = { ...usdc.settlement }; delete s.fx; return { ...usdc, settlement: s }; });
await v('x402_payee_not_onboarded', () => ({ ...request, deal: { ...request.deal, seller: 'eip155:8453:0x1234567890abcdef1234567890abcdef12345678' } }));

const transitionDecision = await decide({ ...request, task: { ...request.task, protocol: 'pazair_order' } }, transition, { keys });

// Law 6: the buyer disputes the delivery, the seller answers, a person decides for the buyer; the refund has the rail's id.
const dispute = await signDispute(issuer, 'example', { id: 'dp_1', order: 'or_17', receipt, evidence, opened_by: 'ag_gamma', against: 'ag_alpha', reason_code: 'not_as_promised', claim: 'The translation is in Italian, not French.', opened_at: '2026-10-12T10:00:00.000Z' });
const answer = await signDisputeAnswer(issuer, 'example', { dispute, by: 'ag_alpha', answer: 'Delivered what the model gave; no second pass was ordered.', at: '2026-10-13T10:00:00.000Z' });
const refund = { rail: 'stripe', id: 're_17', amount_minor: 500, currency: 'chf' };
const disputeDecision = await signDisputeDecision(issuer, 'example', { dispute, answer, outcome: 'for_buyer', bears: 'counterparty', decided_by: 'person', refund, decided_at: '2026-10-14T09:00:00.000Z' });
const disputeCheck = await verifyDispute(dispute, { keys, decision: disputeDecision, receipt, answer });
const disputeVariants = {};
const dv = async (name, d, opts = {}) => { const r = await verifyDispute(dispute, { keys, receipt, decision: d, answer, ...opts }); disputeVariants[name] = { valid: r.valid, reasons: r.reasons }; };
const at14 = '2026-10-14T09:00:00.000Z';
await dv('refund_over_paid', await signDisputeDecision(issuer, 'example', { dispute, answer, outcome: 'for_buyer', bears: 'counterparty', refund: { ...refund, amount_minor: 600 }, decided_at: at14 }));
await dv('for_seller_with_refund', await signDisputeDecision(issuer, 'example', { dispute, answer, outcome: 'for_seller', bears: 'principal', refund, decided_at: at14 }));
await dv('for_seller', await signDisputeDecision(issuer, 'example', { dispute, answer, outcome: 'for_seller', bears: 'principal', refund: null, decided_at: at14 }));
await dv('answer_hidden_from_decision', await signDisputeDecision(issuer, 'example', { dispute, answer: null, outcome: 'for_buyer', bears: 'counterparty', refund, decided_at: at14 }));
await dv('decided_before_opened', await signDisputeDecision(issuer, 'example', { dispute, answer, outcome: 'for_buyer', bears: 'counterparty', refund, decided_at: '2026-10-11T09:00:00.000Z' }));

const out = {
  about: 'SPEC section 17: one agent-to-agent transfer through the gate, start to evidence, then a dispute. Keys: the Ed25519 test key of word-pass-1.json signs as the issuer; runtime_key and principal_key are test-only pairs. An implementation is conformant when it reproduces every signature, hash and decision here.',
  issuer: 'example', key: W.key, runtime_key: { ...RUNTIME, d_test_only: RUNTIME.d, d: undefined }, principal_key: { ...PRINCIPAL, d_test_only: PRINCIPAL.d, d: undefined },
  policy, policy_hash: decision.policy,
  card, card_hash: await cardHash(card), identity, identity_hash: await hashOf(identity), mandate, mandate_hash: await hashOf(mandate),
  listing, task_message: taskMessage, runtime_proof_over: canonical(runtimeProofBody(request)),
  request, decision, say: say(decision), say_de: say(decision, { lang: 'de' }), step_up: stepUp, receipt, evidence, evidence_hash: await hashOf(evidence), evidence_check: evidenceCheck, variants,
  transition: { policy: transition, policy_hash: await hashOf(transition), decision: transitionDecision },
  dispute: { dispute, dispute_hash: await hashOf(dispute), answer, answer_hash: await hashOf(answer), decision: disputeDecision, check: disputeCheck, variants: disputeVariants },
};
const clean = JSON.parse(JSON.stringify(out));
writeFileSync(new URL('../../vectors/a2a-transfer-1.json', import.meta.url), JSON.stringify(clean, null, 2) + '\n');
console.log(`decision: ${decision.decision} ${JSON.stringify(decision.reasons)} gaps ${JSON.stringify(decision.gaps)}; evidence ${evidenceCheck.valid} ${JSON.stringify(evidenceCheck.reasons)}; transition ${transitionDecision.decision} ${JSON.stringify(transitionDecision.gaps)}; dispute ${disputeCheck.valid}`);
for (const [k, x] of Object.entries(variants)) console.log(`  ${k}: ${x.decision} ${x.reasons.join(',')} ${x.gaps.join(',')}`);
for (const [k, x] of Object.entries(disputeVariants)) console.log(`  dispute/${k}: ${x.valid} ${x.reasons.join(',')}`);
