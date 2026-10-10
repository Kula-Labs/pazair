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
export function verifyMandate(receipt: Record<string, unknown>, mandate: Record<string, unknown>, opts?: { keys?: Jwk[]; end?: Record<string, unknown> }): Promise<{ valid: boolean; covers: string[]; reasons: string[] }>;
export function verifyAward(receipt: Record<string, unknown>, tender: Record<string, unknown>, award: Record<string, unknown>, opts?: { keys?: Jwk[]; qa?: Record<string, unknown>[] }): Promise<{ valid: boolean; covers: string[]; reasons: string[] }>;
export function receiptHash(receipt: Record<string, unknown>): Promise<string>;
export function verifyReceiptChain(top: Record<string, unknown>, opts?: { receipts?: Record<string, unknown>[]; keys?: Jwk[]; maxDepth?: number }): Promise<{ valid: boolean; links: number; depth: number; total_minor: Record<string, number>; broken: string | null }>;
export function leafOf(pass: Record<string, unknown>): Promise<string>;
export function verifyProof(leaf: string, proof: Step[], root: string): Promise<boolean>;
export function verifyPass(anchored: Record<string, unknown>, opts?: { keys?: Jwk[]; pqKeys?: PqKey[]; anchoredBefore?: string }): Promise<{ valid: boolean; signature_valid: boolean; pq_signed: boolean; ml_dsa_65: boolean | null; word_consistent: boolean; in_root: boolean | null; word: unknown; anchors: { root: string; day: string; bitcoin_ots: string | null; stellar_tx: string | null } | null }>;
export type PassCheck = {
  trust: 'kept_its_word' | 'signed_unanchored' | 'no_badge_yet' | 'invalid' | 'unreachable';
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

// Fingerprint (SPEC section 15): a print no other agent can carry, provably.
export const FINGERPRINT: { n: 64; k: 10; d: 55; field: string; generator: string };
export function rsEncode(msg: Uint8Array): Uint8Array;
export type Fingerprint = { seed: string; codeword: string };
export function fingerprintOf(input: { origin: string; agent: string; first_leaf: string }): Promise<Fingerprint>;
/** Symbols that differ, 0 … 64; never below 55 for two different seeds. */
export function fingerprintDistance(a: Fingerprint | string, b: Fingerprint | string): number;
export type FingerprintRecord = { delivered: number; buyers: number; badge: string | null; disputes_lost: number };
export function recordOf(pass: Record<string, unknown>): FingerprintRecord;
export function ridgesOf(delivered: number): number;
/** The reference drawing, the same bytes for the same input. */
export function fingerprintSvg(codeword: Fingerprint | string, record?: FingerprintRecord, opts?: { size?: number; ink?: string; gold?: string; background?: string }): string;

// The second signature (SPEC section 16).
/** { signed: false } without pq_sig; valid true / false, or null when it cannot be checked here (library missing, key not published). */
export function verifyPqSignature(obj: Record<string, unknown>, pqKeys?: PqKey[], opts?: { anchoredBefore?: string }): Promise<{ signed: boolean; valid: boolean | null }>;
