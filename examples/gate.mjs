#!/usr/bin/env node
// The gate (SPEC 17), start to evidence, offline: node examples/gate.mjs
//
// Gamma's principal allows translations up to CHF 10 per order, CHF 50 a month, from Alpha and Beta only, until the
// end of the year. Gamma asks a gateway to buy a CHF 5 translation from Alpha. The gateway asks the five questions
// before anything moves, allows, settles, and issues one evidence object. Nothing here needs PazAIr.
import { generateKey, keysDocument, signReceipt } from '../issuer/src/index.js';
import { decide, say, verifyEvidence, hashOf, runtimeProofBody, signAgentIdentity, signMandate, signEvidence, cardExtension } from '../a2a/src/index.js';
import { loadPolicy } from '../a2a/src/node.js';

const issuer = await generateKey();                       // the issuer that onboarded Gamma and saw its principal
const keys = keysDocument('example', [issuer]).keys;      // what the gateway trusts
const runtime = await generateKey();                      // Gamma's own runtime key
const policy = loadPolicy();                              // a2a/policy/gateway-policy.json
const chf = (minor) => `CHF ${(minor / 100).toFixed(2)}`;

// 1. Identity: who Gamma is, whom it belongs to, how it proves itself. The card carries it; the hash leaves it out.
const card = { protocolVersion: '1.0', name: 'Gamma', supportedInterfaces: [{ url: 'https://gamma.example/a2a', protocolBinding: 'JSONRPC', protocolVersion: '1.0' }], capabilities: { extensions: [] }, skills: [] };
const identity = await signAgentIdentity(issuer, 'example', { agent: 'ag_gamma', principal: 'customer-7', principal_kind: 'company', runtime: { kind: 'key', alg: 'Ed25519', x: runtime.x, kid: runtime.kid }, card: { url: 'https://gamma.example/.well-known/agent-card.json', card }, expires_at: Date.now() + 365 * 864e5 });
card.capabilities.extensions.push(cardExtension(identity));
console.log(`1. identity ${(await hashOf(identity)).slice(0, 12)}… for ${identity.agent}, principal ${identity.principal.slice(0, 12)}…`);

// 2. Mandate: the principal's limits as code.
const mandate = await signMandate(issuer, 'example', { id: 'md_1', agent: 'ag_gamma', principal: identity.principal, currency: 'chf', max_order_minor: 1000, monthly_minor: 5000, counterparties: ['ag_alpha', 'ag_beta'], purpose_codes: ['translation'], step_up_above_minor: 800, unattended: true, expires_at: '2026-12-31T23:59:59.000Z' });
console.log(`2. mandate ${mandate.id}: up to ${chf(mandate.scope.max_order_minor)} per order, ${chf(mandate.scope.monthly_minor)} a month, sellers ${mandate.scope.counterparties.join(', ')}`);

// 3. The gateway assembles the request: the deal it fetched and hashed, the task, its settlement plan, its ledger.
const listing = { id: 'ls_fr', seller: 'ag_alpha', price: { amount_minor: 500, currency: 'chf' }, output_schema: { type: 'object', required: ['text'] } };
const message = { messageId: 'msg_1', role: 'ROLE_USER', parts: [{ text: 'Translate "Grüezi" into French.' }] };
const request = {
  v: 1, kind: 'transfer_request', transfer: 'tr_1', at: new Date().toISOString(), tool: 'SendMessage', aud: 'gw_example', human_present: false,
  identity, task: { protocol: 'a2a', version: '1.0', task_id: 'task_1', agreed_sha256: await hashOf(message) },
  deal: { kind: 'listing', ref: listing.id, hash: await hashOf(listing), seller: 'ag_alpha', amount_minor: 500, currency: 'chf', purpose_code: 'translation', output_schema_sha256: await hashOf(listing.output_schema) },
  mandate, settlement: { rail: 'stripe', amount_minor: 500, currency: 'chf', fee_minor: 45 }, history: [],
};
// 4. Gamma proves it holds the runtime key, for this transfer and this deal.
request.runtime_proof = { kind: 'key', sig: (await runtime.sign(runtimeProofBody(request))).sig };

// 5. The gate.
const d = await decide(request, policy, { keys, now: new Date() });
console.log(`3. gate: ${d.decision}; answered ${JSON.stringify(d.answered)}; gaps ${d.gaps.join(', ') || 'none'}`);
console.log(`   ${say(d)}`);

// 6. What the gate refuses: a seller the principal did not allow, and an amount above the cap. One reason each.
const noMandateFor = await decide({ ...request, deal: { ...request.deal, seller: 'ag_delta' } }, policy, { keys });
console.log(`4. seller not allowed: ${noMandateFor.decision}, ${noMandateFor.reasons.join(', ')}`);
const tooMuch = { ...request, deal: { ...request.deal, amount_minor: 1200 }, settlement: { ...request.settlement, amount_minor: 1200 } };
tooMuch.runtime_proof = { kind: 'key', sig: (await runtime.sign(runtimeProofBody(tooMuch))).sig };
console.log(`5. over the cap: ${(await decide(tooMuch, policy, { keys })).reasons.join(', ')}`);

// 7. After delivery and capture: the receipt (SPEC 3) and the evidence (SPEC 17.4), one object that answers all five.
const receipt = await signReceipt(issuer, 'example', { order: 'or_1', listing: listing.id, seller: 'ag_alpha', buyer: 'ag_gamma', amount_minor: 500, currency: 'chf', delivered_at: new Date().toISOString(), delivery: { text: 'Bonjour' }, mandate });
const evidence = await signEvidence(issuer, 'example', { id: 'ev_1', transfer: 'tr_1', identity, agent: 'ag_gamma', principal: identity.principal, task: request.task, deal: request.deal, mandate, counterparty: { agent: 'ag_alpha', identity: null }, price: { amount_minor: 500, currency: 'chf' }, settlement: { rail: 'stripe', id: 'ch_1', amount_minor: 500, currency: 'chf', fee_minor: 45, finality: 'captured', reversible_by_rail: true, finalized_at: new Date().toISOString() }, result: { status: 'delivered', delivery_sha256: receipt.delivery_sha256, receipt }, gate: { policy: d.policy, decision: d.decision, decided_at: d.decided_at } });
const check = await verifyEvidence(evidence, { keys, identity, mandate, deal: request.deal, task: request.task, decision: d, receipt });
console.log(`6. evidence ${evidence.id}: valid ${check.valid}; ${check.covers.length} checks held`);

// 8. The next transfer on the same chain is refused until that evidence exists.
const next = { ...request, transfer: 'tr_2', history: [{ transfer: 'tr_1', at: request.at, amount_minor: 500, currency: 'chf', settlement_id: 'ch_1', evidence: null, chain: d.chain }] };
next.runtime_proof = { kind: 'key', sig: (await runtime.sign(runtimeProofBody(next))).sig };
console.log(`7. next transfer, settled but no evidence yet: ${(await decide(next, policy, { keys })).reasons.join(', ')}`);
next.history[0].evidence = await hashOf(evidence);
console.log(`8. with the evidence: ${(await decide(next, policy, { keys })).decision}`);
