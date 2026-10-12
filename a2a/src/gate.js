// The gate (SPEC section 17): policy before execution. A transfer between two agents is allowed only when the five
// questions are answered with checkable objects: 1 identity, 2 task, 3 deal, 4 mandate, 5 settlement with evidence.
// Missing an answer: reject, never guess. Zero dependencies, no file system: Node 20+, Deno, Bun, Workers, browsers.
//
// Trust model (SPEC 17.3): the issuer keys in `keys` are trusted; the gateway that calls decide() is trusted and is
// the only author of `at`, `tool`, `aud`, `human_present`, `runtime_proof.peer_id`, `deal`, `mandate_end` and
// `history`; the agent and the counterparty are not trusted: everything that comes from them is checked here.
import { canonical, sha256hex, verifySignature } from '../../verify/src/index.js';
import REASONS from './reasons.js';

export { REASONS };
export const GATE_EXTENSION_URI = 'https://pazair.kulalabs.ch/ext/gate/v1';
export const hashOf = (obj) => sha256hex(canonical(obj));
/** hashOf that never throws (a hostile object can be nested deeper than the stack): null matches no hash. */
export const safeHash = async (obj) => { try { return await hashOf(obj); } catch { return null; } };
const enc = new TextEncoder();
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/;
/** A time as the schemas define it (RFC 3339 with a zone), normalised to UTC; null for anything else. Never a guess. */
const iso = (t) => {
  if (typeof t !== 'string' || !TIME.test(t)) return null;
  // The Date parser rolls 2026-02-31 over to 3 March and 24:00 to the next day: an impossible time is unreadable.
  const [y, mo, da, h, mi, s] = t.slice(0, 19).split(/[-T:]/).map(Number);
  if (mo < 1 || mo > 12 || da < 1 || da > new Date(Date.UTC(y, mo, 0)).getUTCDate() || h > 23 || mi > 59 || s > 59) return null;
  const d = new Date(t); return Number.isNaN(d.getTime()) ? null : d.toISOString();
};
const isId = (s, prefix) => typeof s === 'string' && s.startsWith(prefix) && s.length > prefix.length;
const isHash = (h) => /^[0-9a-f]{64}$/.test(String(h));
const isMinor = (n) => Number.isInteger(n) && n >= 0;
const list = (x) => (Array.isArray(x) ? x : []);
/** Who a seller may be named by: a PazAIr agent id, a DID, an https URL (its agent card), or a CAIP-10 account. */
const SELLER = /^(ag_[A-Za-z0-9_-]+|did:[a-z0-9]+:[A-Za-z0-9._:%-]+|https:\/\/[^\s]+|[a-z0-9-]{3,8}:[A-Za-z0-9._-]{1,32}:[A-Za-z0-9]{1,64})$/;
/** a ≤ b (+ slack ms); false when either is not a time. */
const before = (a, b, slack = 0) => { const x = iso(a), y = iso(b); return !!x && !!y && new Date(x).getTime() <= new Date(y).getTime() + slack; };

/** Ed25519 over canonical(body) with a raw public key x (base64url): the agent's runtime key, the principal's key. */
async function verifyWithX(x, sig, body) {
  if (typeof x !== 'string' || typeof sig !== 'string') return false;
  try {
    const pub = await crypto.subtle.importKey('jwk', { kty: 'OKP', crv: 'Ed25519', x }, { name: 'Ed25519' }, false, ['verify']);
    return await crypto.subtle.verify({ name: 'Ed25519' }, pub, unb64u(sig), enc.encode(canonical(body)));
  } catch { return false; }
}

/** The chain a transfer belongs to: one mandate, one counterparty. The evidence rule of section 17.3 counts per chain. */
export const chainKey = async (mandateHash, counterparty) => sha256hex(`${mandateHash}:${counterparty}`);

/** What a key runtime proof signs (17.1): the transfer, the agent, the gateway, and the deal it is for. */
export const runtimeProofBody = (request) => ({ transfer: request?.transfer ?? null, agent: request?.identity?.agent ?? null, aud: request?.aud ?? null, deal: request?.deal?.hash ?? null, amount_minor: request?.deal?.amount_minor ?? null, currency: request?.deal?.currency ?? null });

/** An agent_identity that holds at `at`: the right kind, signed, with a principal, issued, not expired. */
async function identityHolds(id, keys, at, skew) {
  return id?.kind === 'agent_identity' && (await verifySignature(id, keys)) && isHash(id.principal)
    && before(id.issued_at, at, skew) && before(at, id.expires_at, skew);
}

const cleanKeys = (keys) => list(keys).filter((k) => k && typeof k === 'object');

/**
 * Decide one transfer before anything moves. `request` is a transfer_request (schemas/transfer-request.schema.json),
 * `policy` a gateway_policy (schemas/gateway-policy.schema.json), `keys` the issuer keys the gateway trusts.
 * `now`: the gateway's own clock; when given, `request.at` must be within clock_skew_seconds of it.
 * Returns a gate_decision (schemas/gate-decision.schema.json): { v, kind, transfer, decision: 'allow' | 'step_up' | 'reject',
 * reasons, answered, gaps, chain, policy, decided_at }. Every reason is a code of policy/rejection-reasons.json
 * (REASONS[code]: question, layer, actor, retry, de, en). Never throws on malformed input: it rejects.
 */
export async function decide(request, policy, { keys = [], now } = {}) {
  keys = cleanKeys(keys);
  const reject = [], stepUp = [], gaps = [];
  const at = iso(request?.at);
  if (!at) reject.push('REQUEST_TIME_INVALID');
  const skewS = policy?.clock_skew_seconds ?? 0;
  const skew = Number.isInteger(skewS) && skewS >= 0 ? skewS * 1000 : 0;
  const nowIso = now === undefined ? null : iso(now instanceof Date ? now.toISOString() : now);
  if (at && nowIso && Math.abs(new Date(at).getTime() - new Date(nowIso).getTime()) > skew) reject.push('REQUEST_TIME_SKEW');
  const req = policy?.require && typeof policy.require === 'object' ? policy.require : {};
  const policyHash = await safeHash(policy ?? {});
  if (!policy || policy.kind !== 'gateway_policy' || !Array.isArray(policy.rbac) || !Number.isInteger(skewS) || skewS < 0 || !policyHash) reject.push('POLICY_INVALID');
  const validEntry = (h) => h && typeof h === 'object' && isMinor(h.amount_minor) && typeof h.currency === 'string' && !!iso(h.at) && (h.evidence === null || isHash(h.evidence));
  const history = Array.isArray(request?.history) && request.history.every(validEntry) ? request.history : null;
  if (!history) reject.push('REQUEST_HISTORY_INVALID');

  // Gate: RBAC on the agent's identity and the tool name, never on an address. A malformed rule matches nothing.
  const agent = request?.identity?.agent;
  const rule = list(policy?.rbac).find((r) => r && (r.agent === '*' || r.agent === agent) && Array.isArray(r.tools) && (r.tools.includes('*') || r.tools.includes(request?.tool)));
  if (!rule || rule.effect !== 'allow') reject.push('RBAC_DENIED');

  // 1. Who is the agent, and whom does it belong to?
  const id = request?.identity && typeof request.identity === 'object' ? request.identity : null;
  if (!id || id.kind !== 'agent_identity') reject.push('IDENTITY_MISSING');
  else {
    if (!(await verifySignature(id, keys))) reject.push('IDENTITY_SIGNATURE');
    if (!isHash(id.principal)) reject.push('PRINCIPAL_MISSING');
    if (at && !before(at, id.expires_at, skew)) reject.push('IDENTITY_EXPIRED');
    if (at && !before(id.issued_at, at, skew)) reject.push('IDENTITY_NOT_YET_VALID');
    const proof = request.runtime_proof;
    if (req.runtime_proof !== false) {
      if (!proof) reject.push('RUNTIME_PROOF_MISSING');
      else if (id.runtime?.kind === 'spiffe') { if (proof.kind !== 'spiffe' || typeof proof.peer_id !== 'string' || proof.peer_id !== id.runtime.id) reject.push('RUNTIME_MISMATCH'); }
      else if (id.runtime?.kind === 'key') { if (proof.kind !== 'key' || typeof request.aud !== 'string' || !(await verifyWithX(id.runtime.x, proof.sig, runtimeProofBody(request)))) reject.push('RUNTIME_MISMATCH'); }
      else reject.push('RUNTIME_MISMATCH');
    }
  }

  // 2. Which task was agreed?
  const task = request?.task && typeof request.task === 'object' ? request.task : null;
  if (!task) reject.push('TASK_MISSING');
  else {
    if (!list(policy?.tasks?.protocols).includes(task.protocol)) reject.push('TASK_PROTOCOL_NOT_ALLOWED');
    if (!isHash(task.agreed_sha256) || typeof task.task_id !== 'string' || task.task_id.length === 0) reject.push('TASK_NOT_AGREED');
  }

  // 3. What exactly is traded, at which price?
  const deal = request?.deal && typeof request.deal === 'object' ? request.deal : null;
  const st = request?.settlement && typeof request.settlement === 'object' ? request.settlement : null;
  if (!deal) reject.push('DEAL_MISSING');
  else {
    if (!list(policy?.deals?.kinds).includes(deal.kind)) reject.push('DEAL_KIND_NOT_ALLOWED');
    if (!isHash(deal.hash) || typeof deal.ref !== 'string' || deal.ref.length === 0) reject.push('DEAL_NOT_FIXED');
    if (![deal.output_schema_sha256, deal.terms_sha256].some(isHash)) reject.push('DEAL_NO_TERMS');
    if (typeof deal.seller !== 'string' || !SELLER.test(deal.seller) || deal.seller === agent) reject.push('DEAL_COUNTERPARTY_MISSING');
    if (!isMinor(deal.amount_minor) || typeof deal.currency !== 'string') reject.push('DEAL_PRICE_MISSING');
  }

  // 4. May this agent spend this amount? Limits are code: cap, month, expiry, counterparties, purpose, step-up.
  const m = request?.mandate && typeof request.mandate === 'object' ? request.mandate : null;
  const mandateHash = m ? await safeHash(m) : null;
  const pSigned = m ? await principalSigned(m) : false;
  if (!m || m.kind !== 'mandate') reject.push('MANDATE_MISSING');
  else {
    if (!mandateHash || !(await verifySignature(m, keys))) reject.push('MANDATE_SIGNATURE');
    if (id && m.agent !== id.agent) reject.push('MANDATE_AGENT_MISMATCH');
    if (id && m.principal !== id.principal) reject.push('MANDATE_PRINCIPAL_MISMATCH');
    if (at && !before(m.issued_at, at, skew)) reject.push('MANDATE_NOT_YET_VALID');
    if (!iso(m.expires_at)) { if (req.mandate_expiry !== false) reject.push('MANDATE_NO_EXPIRY'); }
    else if (at && !before(at, m.expires_at, skew)) reject.push('MANDATE_EXPIRED');
    const end = request.mandate_end;
    if (end) {
      if (end.kind !== 'mandate_end' || end.mandate !== mandateHash || !(await verifySignature(end, keys))) reject.push('MANDATE_END_INVALID');
      else if (at && !before(at, end.at, skew)) reject.push('MANDATE_ENDED');
    }
    const sc = m.scope && typeof m.scope === 'object' ? m.scope : {};
    if (deal) {
      if (deal.currency !== sc.currency) reject.push('MANDATE_CURRENCY');
      if (!(isMinor(sc.max_order_minor) && deal.amount_minor <= sc.max_order_minor)) reject.push('MANDATE_OVER_ORDER_CAP');
      // A cap that is there but not a whole amount ("20000", 1.5) is never read as no cap.
      if (sc.monthly_minor != null && !isMinor(sc.monthly_minor)) reject.push('MANDATE_OVER_MONTHLY_CAP');
      else if (Number.isInteger(sc.monthly_minor) && at && history) {
        // Every entry of the month counts, settled or not: an allow the gateway recorded is a reservation.
        const month = at.slice(0, 7);
        const spent = history.filter((h) => h.currency === sc.currency && iso(h.at)?.slice(0, 7) === month).reduce((s, h) => s + h.amount_minor, 0);
        if (spent + deal.amount_minor > sc.monthly_minor) reject.push('MANDATE_OVER_MONTHLY_CAP');
      }
      if (Array.isArray(sc.counterparties)) { if (!sc.counterparties.includes('*') && !sc.counterparties.includes(deal.seller)) reject.push('MANDATE_COUNTERPARTY_NOT_ALLOWED'); }
      else if (req.counterparty_allowlist) reject.push('MANDATE_NO_COUNTERPARTIES');
      if (Array.isArray(sc.purpose_codes)) { if (!sc.purpose_codes.includes(deal.purpose_code)) reject.push('MANDATE_PURPOSE_MISMATCH'); }
      else if (req.purpose_codes) reject.push('MANDATE_NO_PURPOSE_CODES');
      if (sc.step_up_above_minor != null && !isMinor(sc.step_up_above_minor)) stepUp.push('STEP_UP_AMOUNT');
      else if (Number.isInteger(sc.step_up_above_minor) && deal.amount_minor > sc.step_up_above_minor) stepUp.push('STEP_UP_AMOUNT');
    }
    // Unattended spending is the principal's explicit choice; absent means no. human_present is asserted by the gateway.
    if (sc.unattended !== true && request.human_present !== true) stepUp.push('STEP_UP_HUMAN_REQUIRED');
    if (req.principal_signature && !pSigned) reject.push('MANDATE_PRINCIPAL_SIGNATURE_REQUIRED');
    if (pSigned && id?.principal_key && id.principal_key !== m.principal_sig?.x) reject.push('MANDATE_PRINCIPAL_KEY_MISMATCH');
  }

  // Step-up: a fresh, signed confirmation for exactly this transfer and deal satisfies it: issued before, not expired.
  if (stepUp.length) {
    const s = request?.step_up;
    const ok = s && typeof s === 'object' && s.kind === 'step_up' && s.transfer === request.transfer && s.mandate === mandateHash && s.agent === agent
      && deal && s.deal === deal.hash && s.seller === deal.seller && isMinor(s.amount_minor) && s.amount_minor >= deal.amount_minor
      && before(s.iat, at, skew) && before(at, s.exp, skew) && (await verifySignature(s, keys));
    if (ok) stepUp.length = 0;
  }

  // 5. Settlement plan: an allowed rail, a fee that does not eat the call, the deal's price (or a bound rate into another
  //    asset), and evidence for everything settled before on this chain. The answer itself comes with the evidence.
  if (!st) reject.push('SETTLEMENT_MISSING');
  else {
    if (!list(policy?.rails?.allowed).includes(st.rail)) reject.push('RAIL_NOT_ALLOWED');
    if (!isMinor(st.amount_minor) || typeof st.currency !== 'string') reject.push('DEAL_PRICE_MISMATCH');
    else if (deal && isMinor(deal.amount_minor)) {
      if (st.currency === deal.currency) { if (st.amount_minor !== deal.amount_minor) reject.push('DEAL_PRICE_MISMATCH'); }
      else {
        const fx = st.fx && typeof st.fx === 'object' ? st.fx : null;
        if (!fx || !(typeof fx.rate === 'number' && fx.rate > 0) || !iso(fx.quoted_at) || typeof st.asset !== 'string') reject.push('DEAL_FX_MISSING');
        else if (Math.abs(st.amount_minor - Math.round(deal.amount_minor * fx.rate)) > 1) reject.push('DEAL_PRICE_MISMATCH');
      }
    }
    const fee = st.fee_minor ?? 0, ratio = policy?.rails?.max_fee_ratio;
    if (!isMinor(fee) || (typeof ratio === 'number' && isMinor(st.amount_minor) && fee > st.amount_minor * ratio)) reject.push('FEE_EATS_CALL');
  }
  const chain = mandateHash && typeof deal?.seller === 'string' ? await chainKey(mandateHash, deal.seller) : null;
  if (req.evidence_before_next !== false && history && history.some((h) => h.settlement_id && !h.evidence && (!h.chain || h.chain === chain))) reject.push('EVIDENCE_MISSING_PRIOR');

  // Law 8: a layer the request does not carry is a marked gap, never a silent one.
  const cp = request?.counterparty_identity;
  if (!cp) { if (req.counterparty_identity) reject.push('COUNTERPARTY_IDENTITY_MISSING'); else gaps.push('counterparty_identity'); }
  else if (typeof cp !== 'object' || cp.agent !== deal?.seller || !(await identityHolds(cp, keys, at, skew))) reject.push('COUNTERPARTY_IDENTITY_INVALID');
  if (deal && typeof deal.seller === 'string' && !isId(deal.seller, 'ag_')) gaps.push('counterparty_not_onboarded');
  if (task && task.protocol !== 'a2a') gaps.push('task_not_a2a');
  if (m && !pSigned) gaps.push('principal_signature');
  if (m && pSigned && !id?.principal_key) gaps.push('principal_key_unattested');

  // Step-up codes are shown only when nothing rejects: a reject is never "fixable with a step-up".
  const reasons = reject.length ? [...new Set(reject)] : [...new Set(stepUp)];
  // A question is answered when no reason of that question stands. Computed last, so every check counts.
  const q = (n) => !reasons.some((c) => REASONS[c]?.question === n);
  const answered = { identity: !!id && q(1), task: !!task && q(2), deal: !!deal && q(3), mandate: !!m && q(4), settlement: 'after_evidence' };
  return {
    v: 1, kind: 'gate_decision', transfer: typeof request?.transfer === 'string' ? request.transfer : null,
    decision: reject.length ? 'reject' : stepUp.length ? 'step_up' : 'allow',
    reasons, answered, gaps, chain, policy: policyHash, decided_at: at ?? nowIso ?? new Date().toISOString(),
  };
}

/** True when the mandate also carries the principal's own signature over the body without sig, principal_sig, pq_sig, pq_kid. */
export async function principalSigned(m) {
  const ps = m?.principal_sig;
  if (!ps || typeof ps !== 'object' || typeof ps.x !== 'string') return false;
  if ((await sha256hex(ps.x)).slice(0, 16) !== ps.kid) return false;
  const { sig, principal_sig, pq_sig, pq_kid, ...body } = m;
  return verifyWithX(ps.x, ps.sig, body);
}

const FINALITY = ['captured', 'confirmed', 'finalized', 'validated', 'booked'];

/**
 * Evidence (law 2: receipt before success). Checks the issuer's signature, that the settlement reached a finality the
 * rail knows (never 'pending'), that what was settled is what was priced, and, for every object you hold, that the
 * evidence names exactly it. Returns { valid, covers, reasons }; reasons are codes from rejection-reasons.json.
 */
export async function verifyEvidence(ev, { keys = [], identity, mandate, deal, task, decision, receipt } = {}) {
  keys = cleanKeys(keys);
  const reasons = [], covers = [];
  const ok = (cond, yes, no) => (cond ? covers.push(yes) : reasons.push(no));
  const s = ev?.settlement && typeof ev.settlement === 'object' ? ev.settlement : null;
  ok(ev?.kind === 'evidence' && (await verifySignature(ev, keys)), 'evidence signed', 'EVIDENCE_SIGNATURE');
  ok(!!s && FINALITY.includes(s.finality) && typeof s.id === 'string' && s.id.length > 0 && !!iso(s.finalized_at), 'settlement final with the rail\'s id', 'EVIDENCE_NOT_FINAL');
  const p = ev?.price && typeof ev.price === 'object' ? ev.price : null;
  const priced = !!p && !!s && isMinor(p.amount_minor) && typeof p.currency === 'string' && isMinor(s.amount_minor)
    && (s.currency === p.currency ? s.amount_minor === p.amount_minor : typeof s.fx?.rate === 'number' && s.fx.rate > 0 && Math.abs(s.amount_minor - Math.round(p.amount_minor * s.fx.rate)) <= 1);
  ok(priced, 'settled what was priced', 'EVIDENCE_PRICE_MISMATCH');
  ok(['delivered', 'not_delivered', 'refunded', 'disputed'].includes(ev?.result?.status), 'result stated', 'EVIDENCE_NO_RESULT');
  ok(isHash(ev?.identity) && isHash(ev?.mandate) && isHash(ev?.deal?.hash) && isHash(ev?.principal) && isHash(ev?.task?.agreed_sha256), 'identity, principal, task, mandate and deal named by hash', 'EVIDENCE_INCOMPLETE');
  ok(ev?.gate?.decision === 'allow' && isHash(ev?.gate?.policy) && (!decision || (decision.decision === 'allow' && decision.transfer === ev?.transfer && decision.policy === ev?.gate?.policy && decision.decided_at === ev?.gate?.decided_at)), 'follows an allow of this gate', 'EVIDENCE_WITHOUT_ALLOW');
  if (identity) ok((await safeHash(identity)) === ev?.identity && identity.agent === ev?.agent && identity.principal === ev?.principal, 'names this identity and principal', 'EVIDENCE_NAMES_OTHER_IDENTITY');
  if (mandate) ok((await safeHash(mandate)) === ev?.mandate, 'names this mandate', 'EVIDENCE_NAMES_OTHER_MANDATE');
  if (task) ok(task.protocol === ev?.task?.protocol && task.task_id === ev?.task?.task_id && task.agreed_sha256 === ev?.task?.agreed_sha256, 'names this task', 'EVIDENCE_NAMES_OTHER_TASK');
  if (deal) ok(deal.hash === ev?.deal?.hash && deal.kind === ev?.deal?.kind && deal.ref === ev?.deal?.ref && deal.seller === ev?.counterparty?.agent
    && deal.amount_minor === ev?.price?.amount_minor && deal.currency === ev?.price?.currency, 'names this deal, counterparty and price', 'EVIDENCE_NAMES_OTHER_DEAL');
  if (receipt) ok((await safeHash(receipt)) === ev?.result?.receipt, 'names this receipt', 'EVIDENCE_NAMES_OTHER_RECEIPT');
  return { valid: reasons.length === 0, covers, reasons };
}

const REASON_CODES = ['not_as_promised', 'not_delivered', 'late', 'charged_without_delivery', 'other'];

/**
 * Law 6: a dispute is an object, not a ticket. `dispute` is the buyer's statement; `decision` the dispute_decision,
 * `receipt` the receipt the dispute is about, `answer` the seller's dispute_answer (null: none was given).
 * Checks signatures, that each object names the previous one, who may open (the buyer) against whom (the seller),
 * the order in time, and that a refund never exceeds what was paid. Returns { valid, covers, reasons }.
 */
export async function verifyDispute(dispute, { keys = [], decision, receipt, answer } = {}) {
  keys = cleanKeys(keys);
  const reasons = [], covers = [];
  const ok = (cond, yes, no) => (cond ? covers.push(yes) : reasons.push(no));
  const disputeHash = await safeHash(dispute);
  ok(dispute?.kind === 'dispute' && !!disputeHash && (await verifySignature(dispute, keys)), 'dispute signed', 'DISPUTE_SIGNATURE');
  ok(isHash(dispute?.claim_sha256) && REASON_CODES.includes(dispute?.reason_code), 'claim fixed by hash and reason code', 'DISPUTE_NO_CLAIM');
  if (receipt) {
    ok(dispute?.receipt === (await safeHash(receipt)) && dispute?.order === receipt?.order, 'dispute names this receipt', 'DISPUTE_NAMES_OTHER_RECEIPT');
    ok(dispute?.opened_by === receipt?.buyer && dispute?.against === receipt?.seller, 'opened by the buyer against the seller', 'DISPUTE_WRONG_PARTIES');
    ok(before(receipt?.delivered_at, dispute?.opened_at), 'opened after the delivery', 'DISPUTE_OPENED_BEFORE_DELIVERY');
  }
  if (decision !== undefined) {
    const d = decision && typeof decision === 'object' ? decision : null;
    ok(d?.kind === 'dispute_decision' && (await verifySignature(d, keys)), 'decision signed', 'DISPUTE_DECISION_SIGNATURE');
    ok(!!d && d.dispute === disputeHash, 'decision names this dispute', 'DISPUTE_DECISION_NAMES_OTHER');
    ok(before(dispute?.opened_at, d?.decided_at), 'decided after it was opened', 'DISPUTE_DECIDED_BEFORE_OPENED');
    ok(['for_buyer', 'for_seller'].includes(d?.outcome) && ['principal', 'agent', 'counterparty', 'rail'].includes(d?.bears), 'outcome and who bears it stated', 'DISPUTE_NO_OUTCOME');
    const r = d?.refund && typeof d.refund === 'object' ? d.refund : null;
    if (d?.outcome === 'for_buyer') ok(!!r && isMinor(r.amount_minor) && typeof r.currency === 'string' && typeof r.id === 'string' && r.id.length > 0, 'refund with the rail\'s id', 'DISPUTE_REFUND_MISSING');
    if (d?.outcome === 'for_seller') ok(d?.refund === null, 'no refund when decided for the seller', 'DISPUTE_REFUND_UNEXPECTED');
    if (receipt && r) ok(r.currency === receipt?.currency && isMinor(r.amount_minor) && r.amount_minor <= receipt?.amount_minor, 'refund within what was paid', 'DISPUTE_REFUND_OVER_PAID');
    if (answer !== undefined) {
      const h = answer ? await safeHash(answer) : null;
      ok(answer === null ? d?.answer === null : answer?.kind === 'dispute_answer' && answer.dispute === disputeHash && answer.by === dispute?.against && (await verifySignature(answer, keys)) && d?.answer === h, 'the answer the decision saw', 'DISPUTE_ANSWER_MISMATCH');
      if (answer) ok(before(dispute?.opened_at, answer.at) && before(answer.at, d?.decided_at), 'answered between opening and decision', 'DISPUTE_ANSWER_OUT_OF_ORDER');
    }
  }
  return { valid: reasons.length === 0, covers, reasons };
}

/** The sentence a gateway logs or an agent tells its principal. `lang`: 'en' (default) or 'de'. Gaps are named. */
export function say(decision, { lang = 'en' } = {}) {
  const gaps = list(decision?.gaps);
  const tail = gaps.length ? (lang === 'de' ? ` Lücken: ${gaps.join(', ')}.` : ` Gaps: ${gaps.join(', ')}.`) : '';
  if (decision?.decision === 'allow') return (lang === 'de' ? 'Erlaubt: vier Fragen beantwortet, die fünfte kommt mit dem Beleg.' : 'Allowed: four questions answered, the fifth comes with the evidence.') + tail;
  const what = list(decision?.reasons).map((c) => REASONS[c]?.[lang] ?? REASONS[c]?.en ?? String(c)).join('; ');
  if (decision?.decision === 'step_up') return (lang === 'de' ? `Step-up nötig: ${what}.` : `Step-up needed: ${what}.`) + tail;
  return (lang === 'de' ? `Abgelehnt: ${what}.` : `Rejected: ${what}.`) + tail;
}
