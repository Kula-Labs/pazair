# pazair-a2a: the gate and the evidence of an agent-to-agent transfer

Reference implementation of [SPEC 17](../SPEC.md#17-the-gate-five-questions-one-transfer). Zero dependencies, no
file system at run time (Node 20+, Deno, Bun, Workers, browsers). German version with the USPs and innovations:
[`README.de.md`](README.de.md). Where it comes from: [`PRUEFUNG-A2A.md`](../PRUEFUNG-A2A.md) (German).

A transfer is valid when five questions are answered with one checkable object each. A missing answer is a
rejection with a reason, never a guess.

| # | Question | Object | Before or after |
|---|---|---|---|
| 1 | Who is the agent, and whom does it belong to? | `agent_identity` + a runtime proof | before |
| 2 | Which task was agreed? | `task` (A2A task, `agreed_sha256`) | before |
| 3 | What exactly is traded, at which price? | `deal` (listing, award, UCP, ACP, x402; by hash) | before |
| 4 | May this agent spend this amount? | `mandate` (SPEC 3.2 + 17.2), `step_up` | before |
| 5 | Did the value arrive, and is there a receipt? | `evidence` | after |

Between them stands the gate: a `gateway_policy` and `decide()`, run before anything moves, with RBAC on agent
identity and tool name.

**Status.** Not published to npm yet: it imports `pazair-verify` from this repository by path. Use it from a
checkout (`node examples/gate.mjs`), or copy `a2a/` next to `verify/`. The objects, hashes and decisions are fixed
by the test vector, so any other implementation can be checked against it.

## Files

| File | What |
|---|---|
| `schemas/agent-identity.schema.json` | 17.1: agent, principal hash, principal key, runtime identity (SPIFFE or key), agent card hash, expiry |
| `schemas/mandate.schema.json` | 17.2: SPEC 3.2 plus expiry, counterparties, purpose codes, step-up band, `unattended`, `principal_sig` |
| `schemas/step-up.schema.json` | 17.2: the principal confirmed one transfer, one deal, for minutes |
| `schemas/transfer-request.schema.json` | 17.3: what the gateway holds when it decides one transfer |
| `schemas/gateway-policy.schema.json`, `policy/gateway-policy.json` | 17.3: policy before execution; the reference policy |
| `policy/gateway-policy-transition.json` | the same, accepting today's PazAIr order as the task; every decision then carries the gap `task_not_a2a` |
| `schemas/gate-decision.schema.json` | 17.3: what `decide()` returns |
| `policy/rejection-reasons.json` | every reason: question, layer, who can act, whether a retry helps, one sentence in German and English |
| `schemas/evidence.schema.json` | 17.4: one object per transfer, all five answers by hash, the rail's id and finality |
| `schemas/dispute.schema.json` | 17.5: `dispute`, `dispute_answer`, `dispute_decision` with the liability path and the refund |
| `src/gate.js` | `decide()`, `verifyEvidence()`, `verifyDispute()`, `say()`, `runtimeProofBody()` |
| `src/issue.js` | `signAgentIdentity`, `signMandate`, `signStepUp`, `signEvidence`, `signDispute*`, `cardHash`, `cardExtension` |
| `src/schema.js`, `src/node.js` | a small JSON Schema checker (`problems`), and the Node-only loaders (`loadSchemas`, `loadPolicy`) |
| `src/index.d.ts` | TypeScript types for everything above |
| `../vectors/a2a-transfer-1.json` | one transfer from identity to evidence, 26 variants with one reason each, the transition policy, a dispute with 5 variants |
| `../examples/gate.mjs` | the whole flow, offline, in 60 lines: `node examples/gate.mjs` |

```sh
cd a2a && npm test              # 13 tests
node scripts/make-vector.mjs    # regenerates the vector, byte for byte (CI checks it)
node scripts/build-reasons.mjs  # regenerates src/reasons.js from policy/rejection-reasons.json (CI checks it)
```

## Wiring the gate into a gateway

```js
import { decide, say, verifyEvidence, runtimeProofBody } from 'pazair-a2a';
import { loadPolicy } from 'pazair-a2a/node';
import { fetchKeys } from 'pazair-verify';

const policy = loadPolicy();                                   // or your own gateway_policy
const keys = await fetchKeys('https://pazair.kulalabs.ch');    // the issuers you trust: [{ kid, kty, crv, x }], concatenate for several

const d = await decide(request, policy, { keys, now: new Date() });
d.decision   // 'allow' | 'step_up' | 'reject'
d.reasons    // e.g. ['MANDATE_COUNTERPARTY_NOT_ALLOWED']; REASONS[code] has question, layer, actor, retry, de, en
d.answered   // { identity, task, deal, mandate: true | false, settlement: 'after_evidence' }
d.gaps       // law 8: what the request does not carry, e.g. ['counterparty_identity']
say(d)       // one sentence; say(d, { lang: 'de' }) in German
```

**Who sets what.** The gateway is trusted and is the only author of `transfer`, `at`, `tool`, `aud`,
`human_present`, `runtime_proof.peer_id`, `deal`, `settlement`, `mandate_end` and `history`. The agent supplies its
identity (from its agent card), the runtime proof signature and a step-up; the counterparty its identity. Everything
from the agent or the counterparty is checked against the issuer keys in `keys`; with `keys = []` every signature
fails (`IDENTITY_SIGNATURE`, `MANDATE_SIGNATURE`): that is not a forgery, it is a missing key.

**Assembling a request**, in order:

1. The gateway mints `transfer` (`tr_…`, one per attempt, never reused) and tells the agent `{ transfer, aud }`.
2. The agent answers with `runtime_proof`: with a key runtime, `sig` over `runtimeProofBody(request)`, which is
   `{ transfer, agent, aud, deal, amount_minor, currency }`; the agent knows the deal because it chose it. With a
   SPIFFE runtime the gateway fills `peer_id` from the mTLS peer certificate's single URI SAN, validated against the
   SPIFFE trust bundle of that trust domain.
3. The gateway takes `identity` from the agent card's gate extension (`capabilities.extensions[]` with `uri`
   `https://pazair.kulalabs.ch/ext/gate/v1`, `params.identity`), the `mandate` from its own store (plus a
   `mandate_end` if it holds one), fetches the deal (the listing, award, UCP checkout, ACP checkout session or x402
   requirements) and hashes it as served (`hashOf`), takes `task.agreed_sha256` as the hash of the agreed A2A message
   as sent (`messageId` included), and writes its settlement plan (`rail`, `amount_minor`, `currency`, `fee_minor`;
   with `asset`, `network` and `fx` when it settles in another asset than the deal's currency).
4. `history` is the gateway's own ledger for this mandate: every transfer it allowed (a reservation) or settled, as
   `{ transfer, at, amount_minor, currency, settlement_id, evidence, chain }`. The monthly cap counts every entry of
   the month in the mandate's currency. The evidence rule looks at settled entries (`settlement_id` set) of this
   chain (`chain === decision.chain`, which is `chainKey(await hashOf(mandate), deal.seller)`); an entry without
   `chain` counts for both. Serialise `decide()` and the ledger write per mandate, or two concurrent calls both pass
   the cap.
5. `at` is the gateway's clock. Pass the same clock as `now`; a request whose `at` drifts further than
   `clock_skew_seconds` is rejected (`REQUEST_TIME_SKEW`). Every time check runs against `at`.

Validate inbound requests with `problems(request, schemas['transfer-request.schema.json'], schemas)` before
`decide()` if you want field-level messages; `decide()` itself never throws and rejects malformed input with a code.

**After settlement**, issue the evidence (`signEvidence`) or receive it from the issuer, and check it:

```js
(await verifyEvidence(evidence, { keys, identity, mandate, deal, task, decision: d, receipt })).valid
```

**What `decide()` checks**, in order: policy valid; request time readable and within skew; ledger valid; RBAC (agent
× tool, no match is deny); identity signed, with a principal, issued, not expired, runtime proof matches; task with
an allowed protocol and an agreed hash; deal fixed by hash, with machine-readable terms, a seller that is not the
buyer, a price; mandate signed, for this agent and the same principal as the identity, issued, not expired, not
ended, currency, cap per order, monthly cap from the ledger, counterparty on the allowlist, purpose code allowed,
step-up band, `unattended`, principal signature (and its key, when the identity attests one); settlement on an
allowed rail, same price or a bound rate, fee at most 25 % of the amount; no settled transfer of the chain without
evidence. A step-up counts only with a fresh signed confirmation for exactly this transfer, deal, seller and at
least this amount. A reject is never "fixable with a step-up": step-up codes appear only on a `step_up` decision.

## A mandate now says

```json
"scope": { "currency": "chf", "max_order_minor": 1000, "monthly_minor": 5000,
           "counterparties": ["ag_alpha", "ag_beta"], "purpose_codes": ["translation"],
           "step_up_above_minor": 800, "unattended": true },
"expires_at": "2026-12-31T23:59:59.000Z",
"principal_sig": { "kid": "…", "x": "…", "sig": "…" }
```

Fields are only added: `verifyMandate` from `pazair-verify` keeps verifying these mandates and checks what SPEC 3.2
defines; the gate enforces the rest. `unattended` absent means no: a human must be present, or the transfer is a
step-up. The free-text `purpose` stays for people; no gate reads it. The mandate is AP2-shaped (who may spend, how
much, with whom, until when); it is not an AP2 credential. `principal_sig` proves that the holder of a key signed;
that the key is the principal's is attested by `principal_key` in the agent identity, else it is the gap
`principal_key_unattested`.

## Rails and assets

A deal is priced in a currency (`chf`). A settlement may run in another asset (USDC on Base over x402, RLUSD on
XRPL): then the plan names `asset`, `network` and a bound rate `fx: { rate, quoted_at }` with
`settlement.amount_minor = round(deal.amount_minor × rate)` within 1, else `DEAL_FX_MISSING`. Evidence records the
rail's own id and its finality (`captured` for a card, `confirmed` or `finalized` on a chain, `validated` on XRPL or
Stellar, `booked` at a bank) and whether the rail can still reverse it; a reversal later is a `dispute_decision`
with `bears: "rail"`. Settlement adapters (parsing x402 or MPP headers, Stripe webhooks) are not part of this
package; the gateway brings them.

## Reasons for agents

Every code in `policy/rejection-reasons.json` carries `actor` (who can change the outcome: agent, principal,
issuer, counterparty, gateway) and `retry` (`never`, `with_step_up`, `after_evidence`, `new_request`,
`fix_policy`), so an agent can decide what to do without reading the sentence. `gaps` lists layers the request does
not carry: `counterparty_identity`, `counterparty_not_onboarded` (the seller is a DID, URL or chain account, not an
issuer-onboarded agent), `task_not_a2a`, `principal_signature`, `principal_key_unattested`.
