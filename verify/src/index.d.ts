export type Jwk = { kid: string; kty?: string; crv?: string; x: string; revoked_at?: string };
/** Section 16: an ML-DSA-65 public key as the keys document lists it under pq_keys. */
export type PqKey = { pq_kid: string; alg?: 'ML-DSA-65'; public_key_b64url: string; revoked_at?: string };
export type Step = { side: 'L' | 'R'; hash: string };
export function canonical(v: unknown): string;
export function sha256hex(s: string): Promise<string>;
export function fetchKeys(origin?: string, f?: typeof fetch): Promise<Jwk[]>;
export function verifySignature(obj: { sig?: string; kid?: string } & Record<string, unknown>, keys: Jwk[], opts?: { anchoredBefore?: string }): Promise<boolean>;
export function fetchKeysDocument(origin?: string, f?: typeof fetch): Promise<{ keys: Jwk[]; pq_keys?: PqKey[]; anchors?: { stellar?: { account: string; network: string } } }>;
export function verifyHolderProof(proof: unknown, opts: { keys?: Jwk[]; pqKeys?: PqKey[]; agent: string; nonce: string; aud?: string; now?: number }): Promise<{ ok: boolean; reason: string }>;
export function verifyReceipt(receipt: Record<string, unknown>, opts?: { keys?: Jwk[]; pqKeys?: PqKey[]; delivery?: unknown }): Promise<{ valid: boolean; signature_valid: boolean; pq_signed: boolean; ml_dsa_65: boolean | null; delivery_matches: boolean | null }>;
export function wordOf(pass: Record<string, unknown>): { kept_pct: number | null; badge: 'word_kept_99' | 'word_kept_95' | null };
/** SPEC section 4, the buyer's word: from as_buyer (paid orders, chargebacks); pays_99 / pays_95 from 10 paid orders and 5 sellers. */
export function buyerWordOf(pass: Record<string, unknown>): { kept_pct: number | null; badge: 'pays_99' | 'pays_95' | null };
export function verifyMandate(receipt: Record<string, unknown>, mandate: Record<string, unknown>, opts?: { keys?: Jwk[]; end?: Record<string, unknown> }): Promise<{ valid: boolean; covers: string[]; reasons: string[] }>;
export function verifyAward(receipt: Record<string, unknown>, tender: Record<string, unknown>, award: Record<string, unknown>, opts?: { keys?: Jwk[]; qa?: Record<string, unknown>[] }): Promise<{ valid: boolean; covers: string[]; reasons: string[] }>;
export function receiptHash(receipt: Record<string, unknown>): Promise<string>;
export function verifyReceiptChain(top: Record<string, unknown>, opts?: { receipts?: Record<string, unknown>[]; keys?: Jwk[]; maxDepth?: number }): Promise<{ valid: boolean; links: number; depth: number; total_minor: Record<string, number>; broken: string | null }>;
export function leafOf(pass: Record<string, unknown>): Promise<string>;
export function verifyProof(leaf: string, proof: Step[], root: string): Promise<boolean>;
export function verifyPass(anchored: Record<string, unknown>, opts?: { keys?: Jwk[]; pqKeys?: PqKey[]; anchoredBefore?: string }): Promise<{ valid: boolean; signature_valid: boolean; pq_signed: boolean; ml_dsa_65: boolean | null; word_consistent: boolean; in_root: boolean | null; word: unknown; anchors: { root: string; day: string; bitcoin_ots: string | null; stellar_tx: string | null } | null }>;
export type PassCheck = {
  trust: 'kept_its_word' | 'signed_unanchored' | 'no_badge_yet' | 'invalid' | 'unreachable';
  /** The buyer's word (SPEC 4), for whoever sells to this agent; absent when the pass is invalid or unreachable. */
  buyer_trust?: 'pays_its_way' | 'signed_unanchored' | 'no_buyer_badge_yet';
  say: string; issuer: string | null;
  checks: { signature: boolean; ml_dsa_65: boolean | null; in_root: boolean | null; day: string | null; stellar: boolean | null; stellar_account_bound: boolean; bitcoin_ots: boolean; bitcoin: boolean | null; bitcoin_block?: BitcoinBlock; holder: boolean | null; word: boolean } | null;
  pass: Record<string, unknown> | null;
};
export type BitcoinBlock = { height: number; hash: string; time: string };
export function readOts(bytes: Uint8Array): Promise<{ digest: string; claims: { height: number; msg: string }[] }>;
export function bitcoinHasRoot(otsBase64: string, root: string, opts?: { fetch?: typeof fetch; explorers?: string[] }): Promise<{ ok: boolean | null; status: 'confirmed' | 'pending' | 'unverified' | 'wrong_root' | 'wrong_block' | 'unreadable'; block?: BitcoinBlock }>;
export function stellarHasRoot(tx: string, root: string, opts?: { fetch?: typeof fetch; horizon?: string; account?: string }): Promise<boolean | null>;
export function checkWordPass(url: string, opts?: { fetch?: typeof fetch; keys?: Jwk[]; proof?: unknown; nonce?: string; aud?: string }): Promise<PassCheck>;
export function sayPass(pass: Record<string, unknown>, by?: string): string;

// Remember (SPEC section 14): the chain of daily roots and its two signatures, checked without the issuer.
export const GENESIS: string;
export function headOf(prev: string, root: string): Promise<string>;
export type ChainHead = { day: string; root: string; prev: string; head: string; published_head: string | null; published_matches: boolean | null };
export function recomputeChain(days: { day: string; root: string; head?: string | null }[]): Promise<{ head: string; days: number; last_day: string | null; broken_at: string | null; heads: ChainHead[] }>;
export type HeadSig = { kid: string; ed25519: string; pq_kid: string; ml_dsa_65: string; over?: string };
/** ml_dsa_65 is null when @noble/post-quantum is not installed next to pazair-verify: not checked, never trusted. */
export function verifyLink(link: { day: string; prev: string; root: string; head: string }, sig: HeadSig | null, opts?: { keys?: Jwk[]; pqPublicKey?: string }): Promise<{ ed25519: boolean; ml_dsa_65: boolean | null; pq_kid_matches: boolean }>;
export function verifyRememberDocument(doc: Record<string, unknown>, opts?: { keys?: Jwk[] }): Promise<{ ed25519: boolean; ml_dsa_65: boolean | null; pq_kid_matches: boolean }>;
export function loadMlDsa(): Promise<unknown | null>;
export function verifyMlDsa(sigB64u: string, msg: Uint8Array, publicKeyB64u: string): Promise<boolean | null>;
export function pqKid(publicKeyB64u: string): Promise<string>;
export type RememberCheck = { verdict: 'consistent' | 'inconsistent' | 'unreachable'; origin: string; say: string; checks: { document: { ed25519: boolean; ml_dsa_65: boolean | null; pq_kid_matches: boolean; kid_in_issuer_keys: boolean }; chain: { days: number; recomputed_head: string; document_head: string | null; head_matches: boolean; broken_at: string | null; published_heads_match: boolean }; links: { with_signature: number; ed25519_valid: number; ml_dsa_65_valid: number | null; failures: string[] }; ml_dsa_65_checked: boolean } | null };
export function checkRemember(origin?: string, opts?: { fetch?: typeof fetch }): Promise<RememberCheck>;
export function checkHead(kept: string, origin?: string, opts?: { fetch?: typeof fetch }): Promise<{ verdict: 'consistent' | 'inconsistent' | 'unreachable'; day?: string; kept?: string; recomputed?: string | null; published?: string | null; days_since?: number; say: string }>;

// Fingerprint (SPEC section 15): two different prints differ in at least 55 of 64 symbols, provably.
export const FINGERPRINT: { n: 64; k: 10; d: 55; field: string; generator: string };
export function rsEncode(msg: Uint8Array): Uint8Array;
export type Fingerprint = { seed: string; codeword: string };
export function fingerprintOf(input: { origin: string; agent: string; first_leaf: string }): Promise<Fingerprint>;
/** Symbols that differ, 0 … 64: 0 for the same message (the first 10 bytes of the seed), otherwise at least 55. */
export function fingerprintDistance(a: Fingerprint | string, b: Fingerprint | string): number;
export type FingerprintRecord = { delivered: number; buyers: number; badge: string | null; disputes_lost: number };
export function recordOf(pass: Record<string, unknown>): FingerprintRecord;
export function ridgesOf(delivered: number): number;
/** The reference drawing, the same bytes for the same input. */
export function fingerprintSvg(codeword: Fingerprint | string, record?: FingerprintRecord, opts?: { size?: number; ink?: string; gold?: string; background?: string }): string;

// The second signature (SPEC section 16).
/** { signed: false } without pq_sig; valid true / false, or null when it cannot be checked here (library missing, key not published). */
export function verifyPqSignature(obj: Record<string, unknown>, pqKeys?: PqKey[], opts?: { anchoredBefore?: string }): Promise<{ signed: boolean; valid: boolean | null }>;

// The Word Pass as a W3C Verifiable Credential 2.0 (SPEC section 18).
export type DidDocument = { id: string; verificationMethod?: Record<string, unknown>[]; assertionMethod?: (string | Record<string, unknown>)[]; [k: string]: unknown };
export function base58btcEncode(bytes: Uint8Array): string;
export function base58btcDecode(s: string): Uint8Array;
/** An Ed25519 public key (JWK x) as a Multikey ("z6Mk…"). */
export function multikeyOf(x: string): string;
/** The Ed25519 key (JWK x) in a Multikey, or null. */
export function multikeyToX(multibase: string): string | null;
/** did:web → the https URL of its DID document; throws for anything that is not a did:web or leaves its host. */
export function didWebUrl(did: string): string;
export function resolveDidWeb(did: string, f?: typeof fetch): Promise<DidDocument>;
/** A Data Integrity proof with cryptosuite eddsa-jcs-2022, against a DID document. */
export function verifyDataIntegrity(doc: Record<string, unknown>, didDocument: DidDocument): Promise<{ valid: boolean; reason: string; verificationMethod: string | null }>;
/** Sign a document with eddsa-jcs-2022 (the proof carries the document's @context). */
export function signDataIntegrity<T extends Record<string, unknown>>(doc: T, privateKey: CryptoKey, verificationMethod: string, created?: Date): Promise<T & { proof: Record<string, unknown> }>;
export type CredentialCheck = {
  valid: boolean; trust: 'valid' | 'invalid' | 'unreachable'; say: string; issuer: string | null; subject: string | null;
  proof: { valid: boolean; reason: string; verificationMethod: string | null } | null;
  pass: Awaited<ReturnType<typeof verifyPass>> | null; same_key: boolean | null;
};
export function verifyCredential(vc: unknown, opts?: { fetch?: typeof fetch; didDocument?: DidDocument; keysDocument?: { keys: Jwk[]; pq_keys?: PqKey[] }; now?: number }): Promise<CredentialCheck>;

// The buyer's licence (SPEC section 19, the apprenticeship).
export const LICENCE_LEVELS: Record<'basic' | 'professional' | 'critical', { tasks: number; need: number; valid_days: number }>;
export type LicenceCheck = { valid: boolean; current: boolean; signature_valid: boolean; pq_signed: boolean; ml_dsa_65: boolean | null; rules_hold: boolean; level: string | null; agent: string | null; valid_until: string | null };
/** Section 19: both signatures and the rules of its level; `current` says whether it has expired. */
export function verifyLicence(licence: unknown, opts?: { keys?: Jwk[]; pqKeys?: PqKey[]; now?: Date }): Promise<LicenceCheck>;
/** Section 19: a licence URL checked against the issuer's own keys. */
export function checkLicence(url: string, opts?: { fetch?: typeof fetch; now?: Date }): Promise<{ verdict: 'valid' | 'expired' | 'none' | 'invalid' | 'unreachable'; agent?: string | null; level?: string; say: string; licences: LicenceCheck[] }>;
