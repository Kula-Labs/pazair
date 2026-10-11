// Issuing the section 17 objects. For PazAIr and any other issuer; the same key as for receipts and passes.
import { canonical, sha256hex } from '../../verify/src/index.js';

const hashOf = (o) => sha256hex(canonical(o));
const time = (t) => new Date(t).toISOString();

/** An agent identity: who the agent is, whom it belongs to, how it proves itself at run time, which card it runs. */
export async function signAgentIdentity(key, issuer, i) {
  return key.sign({
    v: 1, kind: 'agent_identity', issuer, kid: key.kid, agent: i.agent,
    principal: /^[0-9a-f]{64}$/.test(String(i.principal)) ? i.principal : await sha256hex(String(i.principal)),
    principal_kind: i.principal_kind, runtime: i.runtime,
    card: { url: i.card.url, sha256: i.card.sha256 ?? await hashOf(i.card.card) },
    pass: i.pass ?? null, issued_at: time(i.issued_at ?? Date.now()), expires_at: time(i.expires_at),
  });
}

/**
 * A mandate with the section 17 fields: expiry, counterparties, purpose codes, step-up band, unattended.
 * With { principalKey } the principal signs the body first (principal_sig), then the issuer signs everything,
 * so the issuer's sig covers the principal's signature, as sig covers pq_sig in section 16.
 */
export async function signMandate17(key, issuer, m, { principalKey } = {}) {
  const scope = {
    currency: m.currency, max_order_minor: m.max_order_minor, monthly_minor: m.monthly_minor ?? null,
    counterparties: m.counterparties, purpose_codes: m.purpose_codes,
    step_up_above_minor: m.step_up_above_minor ?? null, unattended: m.unattended ?? false,
  };
  const body = {
    v: 1, kind: 'mandate', issuer, kid: key.kid, id: m.id, agent: m.agent,
    principal: /^[0-9a-f]{64}$/.test(String(m.principal)) ? m.principal : await sha256hex(String(m.principal)),
    how: m.how ?? 'card_saved', scope, purpose: m.purpose ?? null,
    issued_at: time(m.issued_at ?? Date.now()), expires_at: time(m.expires_at),
  };
  if (!principalKey) return key.sign(body);
  const principal_sig = { kid: principalKey.kid, x: principalKey.x, sig: (await principalKey.sign(body)).sig };
  return key.sign({ ...body, principal_sig });
}

/** A step-up confirmation for one transfer: the principal confirmed it, the issuer signs that, valid for minutes. */
export async function signStepUp(key, issuer, s, { now = new Date(), seconds = 300 } = {}) {
  return key.sign({
    v: 1, kind: 'step_up', issuer, kid: key.kid, transfer: s.transfer, agent: s.agent,
    mandate: typeof s.mandate === 'string' ? s.mandate : await hashOf(s.mandate), amount_minor: s.amount_minor,
    how: s.how ?? 'passkey', iat: time(now), exp: time(now.getTime() + seconds * 1000),
  });
}

/** The evidence of one transfer: one object that answers all five questions, after the value arrived. */
export async function signEvidence(key, issuer, e) {
  const h = async (x) => (typeof x === 'string' ? x : await hashOf(x));
  return key.sign({
    v: 1, kind: 'evidence', issuer, kid: key.kid, id: e.id, transfer: e.transfer,
    identity: await h(e.identity), agent: e.agent, principal: e.principal,
    task: { protocol: e.task.protocol, task_id: e.task.task_id, agreed_sha256: e.task.agreed_sha256 },
    deal: { kind: e.deal.kind, ref: e.deal.ref, hash: e.deal.hash },
    mandate: await h(e.mandate),
    counterparty: { agent: e.counterparty.agent, identity: e.counterparty.identity ? await h(e.counterparty.identity) : null },
    price: { amount_minor: e.price.amount_minor, currency: e.price.currency },
    settlement: { rail: e.settlement.rail, id: e.settlement.id, amount_minor: e.settlement.amount_minor, currency: e.settlement.currency, fee_minor: e.settlement.fee_minor ?? 0, final: e.settlement.final === true, finalized_at: time(e.settlement.finalized_at) },
    result: { status: e.result.status, delivery_sha256: e.result.delivery_sha256 ?? null, receipt: e.result.receipt ? await h(e.result.receipt) : null },
    gate: { policy: e.gate.policy, decision: e.gate.decision, decided_at: e.gate.decided_at },
    issued_at: time(e.issued_at ?? Date.now()),
  });
}
