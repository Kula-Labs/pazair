// The gate (SPEC section 17): policy before execution. A transfer between two agents is allowed only when the five
// questions are answered with checkable objects: 1 identity, 2 task, 3 deal, 4 mandate, 5 settlement with evidence.
// Missing an answer: reject, never guess. Zero dependencies; Node 20+, Deno, Bun, Workers, browsers.
import { canonical, sha256hex, verifySignature } from '../../verify/src/index.js';
import { readFileSync } from 'node:fs';

/** Every code the gate can answer with, its question (1 to 5), layer and one sentence in German and English. */
export const REASONS = JSON.parse(readFileSync(new URL('../policy/rejection-reasons.json', import.meta.url), 'utf8'));

export const hashOf = (obj) => sha256hex(canonical(obj));
const enc = new TextEncoder();
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const iso = (t) => { const d = new Date(t ?? NaN); return Number.isNaN(d.getTime()) ? null : d.toISOString(); };
const isId = (s, prefix) => typeof s === 'string' && s.startsWith(prefix) && s.length > prefix.length;

/** The chain a transfer belongs to: one mandate, one counterparty. Law 7 of the evidence layer counts per chain. */
export const chainKey = async (mandateHash, counterparty) => sha256hex(`${mandateHash}:${counterparty}`);

/** Ed25519 proof that the caller holds the runtime key named in its identity: sig over canonical({ transfer, agent, aud }). */
async function runtimeKeyProof(identity, proof, request) {
  const rt = identity.runtime;
  if (rt?.kind !== 'key' || typeof rt.x !== 'string' || typeof proof?.sig !== 'string') return false;
  try {
    const pub = await crypto.subtle.importKey('jwk', { kty: 'OKP', crv: 'Ed25519', x: rt.x }, { name: 'Ed25519' }, false, ['verify']);
    const msg = canonical({ transfer: request.transfer, agent: identity.agent, aud: request.aud ?? null });
    return await crypto.subtle.verify({ name: 'Ed25519' }, pub, unb64u(proof.sig), enc.encode(msg));
  } catch { return false; }
}

/**
 * Decide one transfer before anything moves. `request` is a transfer_request (schemas/transfer-request.schema.json),
 * `policy` a gateway_policy (schemas/gateway-policy.schema.json), `keys` the issuer keys the gateway trusts.
 * Returns { decision: 'allow' | 'step_up' | 'reject', reasons, answered, gaps, chain, policy, decided_at }.
 * Every reason is a code from policy/rejection-reasons.json; the text for a person is REASONS[code].
 */
export async function decide(request, policy, { keys = [], now = new Date() } = {}) {
  const reject = [], stepUp = [], gaps = [];
  const answered = { identity: false, task: false, deal: false, mandate: false, settlement: 'after_evidence' };
  const at = iso(request?.at) ?? iso(now);
  const skew = (policy?.clock_skew_seconds ?? 0) * 1000;
  const before = (a, b, slack = 0) => a && b && new Date(a).getTime() <= new Date(b).getTime() + slack;
  const req = policy?.require ?? {};
  const policyHash = await hashOf(policy ?? {});
  if (!policy || policy.kind !== 'gateway_policy') reject.push('POLICY_INVALID');

  // Gate: RBAC on the agent's identity and the tool name, never on an address.
  const agent = request?.identity?.agent;
  const rule = (policy?.rbac ?? []).find((r) => (r.agent === '*' || r.agent === agent) && (r.tools.includes('*') || r.tools.includes(request?.tool)));
  if (!rule || rule.effect !== 'allow') reject.push('RBAC_DENIED');

  // 1. Who is the agent, and whom does it belong to?
  const id = request?.identity;
  if (!id || id.kind !== 'agent_identity') reject.push('IDENTITY_MISSING');
  else {
    if (!(await verifySignature(id, keys))) reject.push('IDENTITY_SIGNATURE');
    if (!/^[0-9a-f]{64}$/.test(String(id.principal))) reject.push('PRINCIPAL_MISSING');
    if (!iso(id.expires_at) || !before(at, id.expires_at, skew)) reject.push('IDENTITY_EXPIRED');
    if (iso(id.issued_at) && !before(id.issued_at, at, skew)) reject.push('IDENTITY_NOT_YET_VALID');
    const proof = request.runtime_proof;
    if (req.runtime_proof !== false) {
      if (!proof) reject.push('RUNTIME_PROOF_MISSING');
      else if (id.runtime?.kind === 'spiffe') { if (proof.kind !== 'spiffe' || proof.peer_id !== id.runtime.id) reject.push('RUNTIME_MISMATCH'); }
      else if (id.runtime?.kind === 'key') { if (proof.kind !== 'key' || !(await runtimeKeyProof(id, proof, request))) reject.push('RUNTIME_MISMATCH'); }
      else reject.push('RUNTIME_MISMATCH');
    }
    answered.identity = !reject.some((c) => REASONS[c]?.question === 1);
  }

  // 2. Which task was agreed?
  const task = request?.task;
  if (!task) reject.push('TASK_MISSING');
  else {
    if (!(policy?.tasks?.protocols ?? []).includes(task.protocol)) reject.push('TASK_PROTOCOL_NOT_ALLOWED');
    if (!/^[0-9a-f]{64}$/.test(String(task.agreed_sha256)) || typeof task.task_id !== 'string') reject.push('TASK_NOT_AGREED');
    answered.task = !reject.some((c) => REASONS[c]?.question === 2);
  }

  // 3. What exactly is traded, at which price?
  const deal = request?.deal, st = request?.settlement;
  if (!deal) reject.push('DEAL_MISSING');
  else {
    if (!(policy?.deals?.kinds ?? []).includes(deal.kind)) reject.push('DEAL_KIND_NOT_ALLOWED');
    if (!/^[0-9a-f]{64}$/.test(String(deal.hash))) reject.push('DEAL_NOT_FIXED');
    if (![deal.output_schema_sha256, deal.terms_sha256].some((h) => /^[0-9a-f]{64}$/.test(String(h)))) reject.push('DEAL_NO_TERMS');
    if (!isId(deal.seller, 'ag_') || deal.seller === agent) reject.push('DEAL_COUNTERPARTY_MISSING');
    if (!Number.isInteger(deal.amount_minor) || deal.amount_minor < 0 || typeof deal.currency !== 'string') reject.push('DEAL_PRICE_MISSING');
    answered.deal = !reject.some((c) => REASONS[c]?.question === 3);
  }

  // 4. May this agent spend this amount? Limits are code: cap, month, expiry, counterparties, purpose, step-up.
  const m = request?.mandate;
  let mandateHash = null;
  if (!m || m.kind !== 'mandate') reject.push('MANDATE_MISSING');
  else {
    mandateHash = await hashOf(m);
    if (!(await verifySignature(m, keys))) reject.push('MANDATE_SIGNATURE');
    if (id && m.agent !== id.agent) reject.push('MANDATE_AGENT_MISMATCH');
    if (id && m.principal !== id.principal) reject.push('MANDATE_PRINCIPAL_MISMATCH');
    if (!before(m.issued_at, at, skew)) reject.push('MANDATE_NOT_YET_VALID');
    if (!iso(m.expires_at)) { if (req.mandate_expiry !== false) reject.push('MANDATE_NO_EXPIRY'); }
    else if (!before(at, m.expires_at, skew)) reject.push('MANDATE_EXPIRED');
    const end = request.mandate_end;
    if (end) {
      if (end.kind !== 'mandate_end' || end.mandate !== mandateHash || !(await verifySignature(end, keys))) reject.push('MANDATE_END_INVALID');
      else if (!before(at, end.at)) reject.push('MANDATE_ENDED');
    }
    const sc = m.scope ?? {};
    if (deal) {
      if (deal.currency !== sc.currency) reject.push('MANDATE_CURRENCY');
      if (!(Number.isInteger(sc.max_order_minor) && deal.amount_minor <= sc.max_order_minor)) reject.push('MANDATE_OVER_ORDER_CAP');
      if (Number.isInteger(sc.monthly_minor)) {
        const month = at.slice(0, 7);
        const spent = (request.history ?? []).filter((h) => h.currency === sc.currency && String(h.at).slice(0, 7) === month && h.settlement_id).reduce((s, h) => s + (h.amount_minor ?? 0), 0);
        if (spent + deal.amount_minor > sc.monthly_minor) reject.push('MANDATE_OVER_MONTHLY_CAP');
      }
      if (Array.isArray(sc.counterparties)) { if (!sc.counterparties.includes('*') && !sc.counterparties.includes(deal.seller)) reject.push('MANDATE_COUNTERPARTY_NOT_ALLOWED'); }
      else if (req.counterparty_allowlist) reject.push('MANDATE_NO_COUNTERPARTIES');
      if (Array.isArray(sc.purpose_codes) && !sc.purpose_codes.includes(deal.purpose_code)) reject.push('MANDATE_PURPOSE_MISMATCH');
      if (Number.isInteger(sc.step_up_above_minor) && deal.amount_minor > sc.step_up_above_minor) stepUp.push('STEP_UP_AMOUNT');
    }
    if (sc.unattended === false && request.human_present !== true) stepUp.push('STEP_UP_HUMAN_REQUIRED');
    if (req.principal_signature && !(await principalSigned(m))) reject.push('MANDATE_PRINCIPAL_SIGNATURE_REQUIRED');
    answered.mandate = !reject.some((c) => REASONS[c]?.question === 4);
  }

  // Step-up: a fresh, signed confirmation for exactly this transfer satisfies it.
  if (stepUp.length) {
    const s = request?.step_up;
    const ok = s && s.kind === 'step_up' && s.transfer === request.transfer && s.mandate === mandateHash && s.agent === agent
      && Number.isInteger(s.amount_minor) && deal && s.amount_minor >= deal.amount_minor && before(at, s.exp) && (await verifySignature(s, keys));
    if (ok) stepUp.length = 0;
  }

  // 5. Settlement plan: an allowed rail, a fee that does not eat the call, the same price as the deal, and evidence for
  //    everything settled before on this chain. The answer itself ("value arrived, receipt exists") comes with the evidence.
  if (!st) reject.push('SETTLEMENT_MISSING');
  else {
    if (!(policy?.rails?.allowed ?? []).includes(st.rail)) reject.push('RAIL_NOT_ALLOWED');
    if (deal && (st.amount_minor !== deal.amount_minor || st.currency !== deal.currency)) reject.push('DEAL_PRICE_MISMATCH');
    const fee = st.fee_minor ?? 0, ratio = policy?.rails?.max_fee_ratio;
    if (typeof ratio === 'number' && Number.isInteger(st.amount_minor) && fee > st.amount_minor * ratio) reject.push('FEE_EATS_CALL');
  }
  if (req.evidence_before_next !== false && (request?.history ?? []).some((h) => h.settlement_id && !h.evidence)) reject.push('EVIDENCE_MISSING_PRIOR');

  // Law 8: a counterparty that speaks only some layers is a marked gap, never a silent one.
  if (!request?.counterparty_identity) { if (req.counterparty_identity) reject.push('COUNTERPARTY_IDENTITY_MISSING'); else gaps.push('counterparty_identity'); }
  else if (request.counterparty_identity.agent !== deal?.seller || !(await verifySignature(request.counterparty_identity, keys))) reject.push('COUNTERPARTY_IDENTITY_INVALID');
  if (task && task.protocol !== 'a2a') gaps.push('task_not_a2a');
  if (m && !(await principalSigned(m))) gaps.push('principal_signature');

  const reasons = [...new Set([...reject, ...stepUp])];
  return {
    v: 1, kind: 'gate_decision', transfer: request?.transfer ?? null, decision: reject.length ? 'reject' : stepUp.length ? 'step_up' : 'allow',
    reasons, answered, gaps, chain: mandateHash && deal?.seller ? await chainKey(mandateHash, deal.seller) : null, policy: policyHash, decided_at: at,
  };
}

/** True when the mandate also carries the principal's own signature (AP2-style verifiable intent). */
export async function principalSigned(m) {
  const ps = m?.principal_sig;
  if (!ps || typeof ps.x !== 'string' || typeof ps.sig !== 'string') return false;
  if ((await sha256hex(ps.x)).slice(0, 16) !== ps.kid) return false;
  const { sig, principal_sig, ...body } = m;
  try {
    const pub = await crypto.subtle.importKey('jwk', { kty: 'OKP', crv: 'Ed25519', x: ps.x }, { name: 'Ed25519' }, false, ['verify']);
    return await crypto.subtle.verify({ name: 'Ed25519' }, pub, unb64u(ps.sig), enc.encode(canonical(body)));
  } catch { return false; }
}

/**
 * Evidence (law 2: receipt before success). Checks the issuer's signature, that the settlement is final, that the price
 * is what was settled, and, for every object you hold, that the evidence names exactly it.
 * Returns { valid, covers, reasons }; reasons are codes from rejection-reasons.json.
 */
export async function verifyEvidence(ev, { keys = [], identity, mandate, deal, decision, receipt } = {}) {
  const reasons = [], covers = [];
  const ok = (cond, yes, no) => (cond ? covers.push(yes) : reasons.push(no));
  ok(ev?.kind === 'evidence' && (await verifySignature(ev, keys)), 'evidence signed', 'EVIDENCE_SIGNATURE');
  ok(ev?.settlement?.final === true && typeof ev.settlement.id === 'string' && ev.settlement.id.length > 0 && !!iso(ev.settlement.finalized_at), 'settlement final with an id', 'EVIDENCE_NOT_FINAL');
  ok(ev?.price?.amount_minor === ev?.settlement?.amount_minor && ev?.price?.currency === ev?.settlement?.currency, 'settled what was priced', 'EVIDENCE_PRICE_MISMATCH');
  ok(['delivered', 'not_delivered', 'refunded', 'disputed'].includes(ev?.result?.status), 'result stated', 'EVIDENCE_NO_RESULT');
  ok(/^[0-9a-f]{64}$/.test(String(ev?.identity)) && /^[0-9a-f]{64}$/.test(String(ev?.mandate)) && /^[0-9a-f]{64}$/.test(String(ev?.deal?.hash)), 'identity, mandate and deal named by hash', 'EVIDENCE_INCOMPLETE');
  if (identity) ok((await hashOf(identity)) === ev?.identity && identity.agent === ev?.agent, 'names this identity', 'EVIDENCE_NAMES_OTHER_IDENTITY');
  if (mandate) ok((await hashOf(mandate)) === ev?.mandate, 'names this mandate', 'EVIDENCE_NAMES_OTHER_MANDATE');
  if (deal) ok(deal.hash === ev?.deal?.hash && deal.seller === ev?.counterparty?.agent, 'names this deal and counterparty', 'EVIDENCE_NAMES_OTHER_DEAL');
  if (decision) ok(decision.decision === 'allow' && decision.transfer === ev?.transfer && decision.policy === ev?.gate?.policy, 'follows an allow of this gate', 'EVIDENCE_WITHOUT_ALLOW');
  if (receipt) ok((await hashOf(receipt)) === ev?.result?.receipt, 'names this receipt', 'EVIDENCE_NAMES_OTHER_RECEIPT');
  return { valid: reasons.length === 0, covers, reasons };
}

/** The sentence a gateway logs or an agent tells its principal, in English; REASONS[code].de has the German one. */
export function say(decision) {
  if (decision.decision === 'allow') return `Allowed: all four questions answered; the fifth comes with the evidence.`;
  const what = decision.reasons.map((c) => REASONS[c]?.en ?? c).join('; ');
  return decision.decision === 'step_up' ? `Step-up needed: ${what}.` : `Rejected: ${what}.`;
}
