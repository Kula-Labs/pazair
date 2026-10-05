export type Jwk = { kid: string; kty?: string; crv?: string; x: string };
export type Step = { side: 'L' | 'R'; hash: string };
export function canonical(v: unknown): string;
export function sha256hex(s: string): Promise<string>;
export function fetchKeys(origin?: string, f?: typeof fetch): Promise<Jwk[]>;
export function verifySignature(obj: { sig?: string; kid?: string } & Record<string, unknown>, keys: Jwk[]): Promise<boolean>;
export function verifyReceipt(receipt: Record<string, unknown>, opts?: { keys?: Jwk[]; delivery?: unknown }): Promise<{ valid: boolean; signature_valid: boolean; delivery_matches: boolean | null }>;
export function leafOf(pass: Record<string, unknown>): Promise<string>;
export function verifyProof(leaf: string, proof: Step[], root: string): Promise<boolean>;
export function verifyPass(anchored: Record<string, unknown>, opts?: { keys?: Jwk[] }): Promise<{ valid: boolean; signature_valid: boolean; in_root: boolean | null; word: unknown; anchors: { root: string; day: string; bitcoin_ots: string | null; stellar_tx: string | null } | null }>;
export type PassCheck = {
  trust: 'kept_its_word' | 'no_badge_yet' | 'invalid' | 'unreachable';
  say: string; issuer: string | null;
  checks: { signature: boolean; in_root: boolean | null; day: string | null; stellar: boolean | null; bitcoin_ots: boolean } | null;
  pass: Record<string, unknown> | null;
};
export function stellarHasRoot(tx: string, root: string, opts?: { fetch?: typeof fetch; horizon?: string }): Promise<boolean | null>;
export function checkWordPass(url: string, opts?: { fetch?: typeof fetch; keys?: Jwk[] }): Promise<PassCheck>;
export function sayPass(pass: Record<string, unknown>): string;
