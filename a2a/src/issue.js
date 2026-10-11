// Issuing the section 17 objects. For PazAIr and any other issuer; the same key as for receipts and passes.
import { sha256hex } from '../../verify/src/index.js';
import { hashOf, GATE_EXTENSION_URI } from './gate.js';

const time = (t) => new Date(t).toISOString();
const hashOrObj = async (x) => (typeof x === 'string' ? x : await hashOf(x));
const principalHash = async (p) => (/^[0-9a-f]{64}$/.test(String(p)) ? p : sha256hex(String(p)));

/**
 * The hash of an agent card for 17.1: the card as served, with the gate extension (the one that carries the identity)
 * removed from capabilities.extensions, so the identity can name the card without naming itself.
 */
export function cardWithoutIdentity(card) {
  const ext = card?.capabilities?.extensions;
  if (!Array.isArray(ext)) return card;
  return { ...card, capabilities: { ...card.capabilities, extensions: ext.filter((e) => !(typeof e?.uri === 'string' && e.uri.startsWith(GATE_EXTENSION_URI))) } };
}
export const cardHash = (card) => hashOf(cardWithoutIdentity(card));

/** The extension entry an agent puts into its A2A agent card (capabilities.extensions[]) to carry its identity. */
export const cardExtension = (identity) => ({ uri: GATE_EXTENSION_URI, description: 'Agent identity of Word Pass SPEC 17.1: agent, principal, runtime identity, signed by its issuer.', required: false, params: { identity } });

/**
 * An agent identity: who the agent is, whom it belongs to, how it proves itself at run time, which card it runs.
 * `card`: { url, sha256 } or { url, card } (the card object; hashed with cardHash). `principal_key`: the principal's
 * Ed25519 public key (base64url x) when the issuer attested it, else omitted (null).
 */
export async function signAgentIdentity(key, issuer, i) {
  if (!i?.card?.url) throw new Error('card.url is required');
  const sha256 = i.card.sha256 ?? (i.card.card ? await cardHash(i.card.card) : null);
  if (!sha256) throw new Error('card.sha256 or card.card is required');
  return key.sign({
    v: 1, kind: 'agent_identity', issuer, kid: key.kid, agent: i.agent, principal: await principalHash(i.principal),
    principal_kind: i.principal_kind, principal_key: i.principal_key ?? null, runtime: i.runtime,
    card: { url: i.card.url, sha256 }, pass: i.pass ?? null,
    issued_at: time(i.issued_at ?? Date.now()), expires_at: time(i.expires_at),
  });
}

/**
 * A mandate (SPEC 3.2 with the 17.2 fields): expiry, counterparties, purpose codes, step-up band, unattended.
 * With { principalKey } the principal signs the body first (principal_sig), then the issuer signs everything,
 * so the issuer's sig covers the principal's signature, as sig covers pq_sig in section 16.
 */
export async function signMandate(key, issuer, m, { principalKey } = {}) {
  const scope = {
    currency: m.currency, max_order_minor: m.max_order_minor, monthly_minor: m.monthly_minor ?? null,
    ...(m.counterparties ? { counterparties: m.counterparties } : {}), ...(m.purpose_codes ? { purpose_codes: m.purpose_codes } : {}),
    step_up_above_minor: m.step_up_above_minor ?? null, unattended: m.unattended === true,
  };
  const body = {
    v: 1, kind: 'mandate', issuer, kid: key.kid, id: m.id, agent: m.agent, principal: await principalHash(m.principal),
    how: m.how ?? 'card_saved', scope, purpose: m.purpose ?? null,
    issued_at: time(m.issued_at ?? Date.now()), ...(m.expires_at ? { expires_at: time(m.expires_at) } : {}),
  };
  if (!principalKey) return key.sign(body);
  const principal_sig = { kid: principalKey.kid, x: principalKey.x, sig: (await principalKey.sign(body)).sig };
  return key.sign({ ...body, principal_sig });
}
/** @deprecated name of the first draft; signMandate is the same function. */
export const signMandate17 = signMandate;

/** A step-up confirmation for one transfer and one deal: the principal confirmed it, the issuer signs that, valid for minutes. */
export async function signStepUp(key, issuer, s, { now = new Date(), seconds = 300 } = {}) {
  return key.sign({
    v: 1, kind: 'step_up', issuer, kid: key.kid, transfer: s.transfer, agent: s.agent, mandate: await hashOrObj(s.mandate),
    deal: s.deal, seller: s.seller, amount_minor: s.amount_minor, how: s.how ?? 'passkey', iat: time(now), exp: time(now.getTime() + seconds * 1000),
  });
}

/** The evidence of one transfer: one object that answers all five questions, after the value arrived. */
export async function signEvidence(key, issuer, e) {
  const st = e.settlement;
  return key.sign({
    v: 1, kind: 'evidence', issuer, kid: key.kid, id: e.id, transfer: e.transfer,
    identity: await hashOrObj(e.identity), agent: e.agent, principal: e.principal,
    task: { protocol: e.task.protocol, task_id: e.task.task_id, agreed_sha256: e.task.agreed_sha256 },
    deal: { kind: e.deal.kind, ref: e.deal.ref, hash: e.deal.hash, ...(e.deal.order_ref ? { order_ref: e.deal.order_ref } : {}) },
    mandate: await hashOrObj(e.mandate),
    counterparty: { agent: e.counterparty.agent, identity: e.counterparty.identity ? await hashOrObj(e.counterparty.identity) : null },
    price: { amount_minor: e.price.amount_minor, currency: e.price.currency },
    settlement: {
      rail: st.rail, id: st.id, amount_minor: st.amount_minor, currency: st.currency, fee_minor: st.fee_minor ?? 0,
      ...(st.asset ? { asset: st.asset } : {}), ...(st.network ? { network: st.network } : {}), ...(st.method ? { method: st.method } : {}), ...(st.fx ? { fx: { rate: st.fx.rate, quoted_at: time(st.fx.quoted_at) } } : {}),
      finality: st.finality, reversible_by_rail: st.reversible_by_rail === true, finalized_at: time(st.finalized_at),
    },
    result: { status: e.result.status, delivery_sha256: e.result.delivery_sha256 ?? null, receipt: e.result.receipt ? await hashOrObj(e.result.receipt) : null },
    gate: { policy: e.gate.policy, decision: e.gate.decision, decided_at: e.gate.decided_at },
    issued_at: time(e.issued_at ?? Date.now()),
  });
}

/** Law 6, section 17.5: the buyer opens a dispute on a receipt. The claim is a hash, the reason a code. */
export async function signDispute(key, issuer, d) {
  return key.sign({
    v: 1, kind: 'dispute', issuer, kid: key.kid, id: d.id, order: d.order, receipt: await hashOrObj(d.receipt),
    evidence: d.evidence ? await hashOrObj(d.evidence) : null, opened_by: d.opened_by, against: d.against,
    reason_code: d.reason_code, claim_sha256: d.claim_sha256 ?? await sha256hex(String(d.claim)), opened_at: time(d.opened_at ?? Date.now()),
  });
}

/** The seller answers; the person deciding sees exactly this. */
export async function signDisputeAnswer(key, issuer, a) {
  return key.sign({
    v: 1, kind: 'dispute_answer', issuer, kid: key.kid, dispute: await hashOrObj(a.dispute),
    by: a.by, answer_sha256: a.answer_sha256 ?? await sha256hex(String(a.answer)), at: time(a.at ?? Date.now()),
  });
}

/** The decision: for the buyer (with the refund and its rail id) or for the seller; who bears it, on the liability path. */
export async function signDisputeDecision(key, issuer, d) {
  return key.sign({
    v: 1, kind: 'dispute_decision', issuer, kid: key.kid, dispute: await hashOrObj(d.dispute), answer: d.answer == null ? null : await hashOrObj(d.answer),
    outcome: d.outcome, bears: d.bears, decided_by: d.decided_by ?? 'person',
    refund: d.refund ? { rail: d.refund.rail, id: d.refund.id, amount_minor: d.refund.amount_minor, currency: d.refund.currency } : null,
    decided_at: time(d.decided_at ?? Date.now()),
  });
}
