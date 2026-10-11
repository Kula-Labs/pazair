// pazair-a2a: the gate and the evidence of an agent-to-agent transfer (Word Pass SPEC section 17).
import type { Jwk } from '../../verify/src/index.js';

export type Hash = string; // 64 lowercase hex
export type IsoTime = string; // RFC 3339 with a zone
export type Decision = 'allow' | 'step_up' | 'reject';
export type Gap = 'counterparty_identity' | 'counterparty_not_onboarded' | 'task_not_a2a' | 'principal_signature' | 'principal_key_unattested';
export type Finality = 'captured' | 'confirmed' | 'finalized' | 'validated' | 'booked';
export type Rail = 'stripe' | 'x402' | 'mpp' | 'xrpl' | 'stellar' | 'sepa';
export type DealKind = 'listing' | 'award' | 'ucp_checkout' | 'acp_checkout_session' | 'x402_requirements';
export type TaskProtocol = 'a2a' | 'pazair_order';
export type PurposeCode = 'translation' | 'content' | 'data' | 'compute' | 'research' | 'software' | 'design' | 'communication' | 'verification' | 'other';

export type Signed = { v: 1; issuer: string; kid: string; sig: string; pq_sig?: string; pq_kid?: string };
export type Runtime = { kind: 'spiffe'; id: string } | { kind: 'key'; alg: 'Ed25519'; x: string; kid: string };
export type AgentIdentity = Signed & { kind: 'agent_identity'; agent: string; principal: Hash; principal_kind: 'person' | 'company'; principal_key: string | null; runtime: Runtime; card: { url: string; sha256: Hash }; pass: string | null; issued_at: IsoTime; expires_at: IsoTime };
export type MandateScope = { currency: string; max_order_minor: number; monthly_minor: number | null; counterparties?: string[]; purpose_codes?: PurposeCode[]; step_up_above_minor?: number | null; unattended?: boolean };
export type Mandate = Signed & { kind: 'mandate'; id: string; agent: string; principal: Hash; how: 'card_saved' | 'ap2_mandate' | 'passkey' | 'signed_statement'; scope: MandateScope; purpose: string | null; issued_at: IsoTime; expires_at?: IsoTime; principal_sig?: { kid: string; x: string; sig: string } };
export type MandateEnd = Signed & { kind: 'mandate_end'; mandate: Hash; at: IsoTime };
export type StepUp = Signed & { kind: 'step_up'; transfer: string; agent: string; mandate: Hash; deal: Hash; seller: string; amount_minor: number; how: 'passkey' | 'pay_url' | 'signed_statement'; iat: IsoTime; exp: IsoTime };
export type Task = { protocol: TaskProtocol; version?: string; task_id: string; context_id?: string | null; agreed_sha256: Hash };
export type Deal = { kind: DealKind; ref: string; hash: Hash; seller: string; amount_minor: number; currency: string; purpose_code: PurposeCode; output_schema_sha256?: Hash; terms_sha256?: Hash };
export type Fx = { rate: number; quoted_at: IsoTime };
export type SettlementPlan = { rail: Rail; amount_minor: number; currency: string; fee_minor: number; asset?: string; network?: string; method?: string; fx?: Fx };
export type HistoryEntry = { transfer: string; at: IsoTime; amount_minor: number; currency: string; settlement_id: string | null; evidence: Hash | null; chain?: Hash };
export type RuntimeProof = { kind: 'spiffe'; peer_id: string } | { kind: 'key'; sig: string };
export type TransferRequest = { v: 1; kind: 'transfer_request'; transfer: string; at: IsoTime; tool: string; aud: string; human_present?: boolean; identity: AgentIdentity; runtime_proof: RuntimeProof; task: Task; deal: Deal; mandate: Mandate; mandate_end?: MandateEnd | null; step_up?: StepUp | null; counterparty_identity?: AgentIdentity | null; settlement: SettlementPlan; history: HistoryEntry[] };
export type GatewayPolicy = { v: 1; kind: 'gateway_policy'; id: string; issuer?: string; about?: string; require: { runtime_proof?: boolean; mandate_expiry?: boolean; counterparty_allowlist?: boolean; purpose_codes?: boolean; principal_signature?: boolean; counterparty_identity?: boolean; evidence_before_next?: boolean }; tasks: { protocols: TaskProtocol[] }; deals: { kinds: DealKind[] }; rails: { allowed: Rail[]; max_fee_ratio: number }; rbac: { agent: string; tools: string[]; effect: 'allow' | 'deny' }[]; clock_skew_seconds?: number };
export type Reason = { question: 0 | 1 | 2 | 3 | 4 | 5; layer: string; actor: 'agent' | 'principal' | 'issuer' | 'counterparty' | 'gateway'; retry: 'never' | 'with_step_up' | 'after_evidence' | 'new_request' | 'fix_policy'; de: string; en: string };
export declare const REASONS: Record<string, Reason>;
export type ReasonCode = keyof typeof REASONS;
export type GateDecision = { v: 1; kind: 'gate_decision'; transfer: string | null; decision: Decision; reasons: string[]; answered: { identity: boolean; task: boolean; deal: boolean; mandate: boolean; settlement: 'after_evidence' }; gaps: Gap[]; chain: Hash | null; policy: Hash | null; decided_at: IsoTime };
export type Evidence = Signed & { kind: 'evidence'; id: string; transfer: string; identity: Hash; agent: string; principal: Hash; task: Task; deal: { kind: DealKind; ref: string; hash: Hash; order_ref?: string }; mandate: Hash; counterparty: { agent: string; identity: Hash | null }; price: { amount_minor: number; currency: string }; settlement: { rail: Rail; id: string; amount_minor: number; currency: string; fee_minor: number; asset?: string; network?: string; method?: string; fx?: Fx; finality: Finality; reversible_by_rail: boolean; finalized_at: IsoTime }; result: { status: 'delivered' | 'not_delivered' | 'refunded' | 'disputed'; delivery_sha256: Hash | null; receipt: Hash | null }; gate: { policy: Hash; decision: 'allow'; decided_at: IsoTime }; issued_at: IsoTime };
export type Dispute = Signed & { kind: 'dispute'; id: string; order: string; receipt: Hash; evidence: Hash | null; opened_by: string; against: string; reason_code: 'not_as_promised' | 'not_delivered' | 'late' | 'charged_without_delivery' | 'other'; claim_sha256: Hash; opened_at: IsoTime };
export type DisputeAnswer = Signed & { kind: 'dispute_answer'; dispute: Hash; by: string; answer_sha256: Hash; at: IsoTime };
export type DisputeDecision = Signed & { kind: 'dispute_decision'; dispute: Hash; answer: Hash | null; outcome: 'for_buyer' | 'for_seller'; bears: 'principal' | 'agent' | 'counterparty' | 'rail'; decided_by: 'person' | 'rule'; refund: { rail: Rail; id: string; amount_minor: number; currency: string } | null; decided_at: IsoTime };
export type Check = { valid: boolean; covers: string[]; reasons: string[] };

export declare const GATE_EXTENSION_URI: string;
export declare function hashOf(obj: unknown): Promise<Hash>;
export declare function safeHash(obj: unknown): Promise<Hash | null>;
export declare function chainKey(mandateHash: Hash, counterparty: string): Promise<Hash>;
export declare function runtimeProofBody(request: Partial<TransferRequest>): { transfer: string | null; agent: string | null; aud: string | null; deal: Hash | null; amount_minor: number | null; currency: string | null };
/** Never throws: malformed input rejects with a reason. `now` is the gateway's clock; when given, request.at must be within clock_skew_seconds of it. */
export declare function decide(request: unknown, policy: unknown, opts?: { keys?: Jwk[]; now?: Date | IsoTime }): Promise<GateDecision>;
export declare function principalSigned(mandate: unknown): Promise<boolean>;
export declare function verifyEvidence(evidence: unknown, opts?: { keys?: Jwk[]; identity?: AgentIdentity; mandate?: Mandate; deal?: Deal; task?: Task; decision?: GateDecision; receipt?: Record<string, unknown> }): Promise<Check>;
export declare function verifyDispute(dispute: unknown, opts?: { keys?: Jwk[]; decision?: DisputeDecision | null; receipt?: Record<string, unknown>; answer?: DisputeAnswer | null }): Promise<Check>;
export declare function say(decision: GateDecision | undefined, opts?: { lang?: 'en' | 'de' }): string;

export type IssuerKey = { kid: string; x: string; sign<T extends object>(body: T): Promise<T & { sig: string }> };
export declare function cardWithoutIdentity<T>(card: T): T;
export declare function cardHash(card: unknown): Promise<Hash>;
export declare function cardExtension(identity: AgentIdentity): { uri: string; description: string; required: false; params: { identity: AgentIdentity } };
export declare function signAgentIdentity(key: IssuerKey, issuer: string, i: { agent: string; principal: string; principal_kind: 'person' | 'company'; principal_key?: string | null; runtime: Runtime; card: { url: string; sha256?: Hash; card?: unknown }; pass?: string | null; issued_at?: IsoTime | number; expires_at: IsoTime | number }): Promise<AgentIdentity>;
export declare function signMandate(key: IssuerKey, issuer: string, m: { id: string; agent: string; principal: string; currency: string; max_order_minor: number; monthly_minor?: number | null; counterparties?: string[]; purpose_codes?: PurposeCode[]; step_up_above_minor?: number | null; unattended?: boolean; how?: Mandate['how']; purpose?: string | null; issued_at?: IsoTime | number; expires_at?: IsoTime | number }, opts?: { principalKey?: IssuerKey }): Promise<Mandate>;
/** @deprecated use signMandate */
export declare const signMandate17: typeof signMandate;
export declare function signStepUp(key: IssuerKey, issuer: string, s: { transfer: string; agent: string; mandate: Mandate | Hash; deal: Hash; seller: string; amount_minor: number; how?: StepUp['how'] }, opts?: { now?: Date; seconds?: number }): Promise<StepUp>;
export declare function signEvidence(key: IssuerKey, issuer: string, e: Record<string, unknown>): Promise<Evidence>;
export declare function signDispute(key: IssuerKey, issuer: string, d: Record<string, unknown>): Promise<Dispute>;
export declare function signDisputeAnswer(key: IssuerKey, issuer: string, a: Record<string, unknown>): Promise<DisputeAnswer>;
export declare function signDisputeDecision(key: IssuerKey, issuer: string, d: Record<string, unknown>): Promise<DisputeDecision>;

/** JSON Schema (draft 2020-12 subset) problems as "<path>: <what>"; empty when the value conforms. Never throws. */
export declare function problems(value: unknown, schema: unknown, registry?: Record<string, unknown>): string[];
export declare function conforms(value: unknown, schema: unknown, registry?: Record<string, unknown>): boolean;
