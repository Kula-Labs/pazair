// Fingerprint (SPEC section 15): a print no other agent can carry, provably.
// seed = sha256(origin "\n" agent "\n" first_leaf); the first 10 bytes are the message of a Reed-Solomon code over
// GF(256) with n = 64, k = 10, so any two prints differ in at least d = n - k + 1 = 55 of 64 symbols. Each symbol is
// one sector of the drawing. The record is drawn over it and never changes the identity.
import { sha256hex } from './index.js';

const N = 64, K = 10, POLY = 0x11d;
const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
(() => { let x = 1; for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= POLY; } for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
const mul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);
/** Generator polynomial: product of (x - α^i) for i = 0 … n-k-1, lowest degree first. */
const GEN = (() => { let g = [1]; for (let i = 0; i < N - K; i++) { const r = EXP[i], ng = new Array(g.length + 1).fill(0); for (let j = 0; j < g.length; j++) { ng[j] ^= g[j]; ng[j + 1] ^= mul(g[j], r); } g = ng; } return g; })();

/** Systematic Reed-Solomon encoding: the first K bytes of `msg`, then N-K parity bytes. */
export function rsEncode(msg) {
  const buf = new Uint8Array(N); buf.set(msg.slice(0, K));
  for (let i = 0; i < K; i++) { const c = buf[i]; if (!c) continue; for (let j = 1; j < GEN.length; j++) buf[i + j] ^= mul(GEN[j], c); }
  const out = new Uint8Array(N); out.set(msg.slice(0, K)); out.set(buf.subarray(K), K); return out;
}

const hex = (u) => [...u].map((b) => b.toString(16).padStart(2, '0')).join('');
const unhex = (h) => Uint8Array.from(h.match(/../g), (x) => parseInt(x, 16));
export const FINGERPRINT = Object.freeze({ n: N, k: K, d: N - K + 1, field: 'GF(256), polynomial 0x11d', generator: 'roots α^0 … α^53' });

/**
 * The fingerprint of an agent: `origin` is the issuer's https origin (section 2), `agent` its id, `first_leaf` the
 * leaf of the agent's first anchored pass (the issuer serves it as `fingerprint.first_leaf`). Returns the seed and the
 * codeword as lowercase hex.
 */
export async function fingerprintOf({ origin, agent, first_leaf }) {
  for (const [k, v] of Object.entries({ origin, agent, first_leaf })) if (typeof v !== 'string' || !v) throw new TypeError(`fingerprintOf: ${k} must be a non-empty string`);
  const seed = await sha256hex(`${origin.replace(/\/+$/, '')}\n${agent}\n${first_leaf}`);
  return { seed, codeword: hex(rsEncode(unhex(seed))) };
}

/** How many of the 64 symbols differ. For two different seeds this is never below 55. */
export function fingerprintDistance(a, b) {
  const x = unhex(a.codeword ?? a), y = unhex(b.codeword ?? b);
  if (x.length !== N || y.length !== N) throw new TypeError('fingerprintDistance: a codeword has 64 bytes');
  let d = 0; for (let i = 0; i < N; i++) if (x[i] !== y[i]) d++; return d;
}

/** The record the drawing grows with, read from a pass (section 4). */
export const recordOf = (pass) => ({ delivered: Number(pass?.as_seller?.delivered ?? 0), buyers: Number(pass?.as_seller?.buyers ?? 0), badge: pass?.word?.badge ?? null, disputes_lost: Number(pass?.disputes_lost ?? 0) });
export const ridgesOf = (delivered) => Math.min(5 + Math.floor(Math.max(0, delivered) / 3), 26);

/**
 * The reference drawing as SVG: closed ridges around a core, like a finger. Sector j (symbol s): bits 0-4 say on which
 * ridge the sector's ridge ending sits, bits 5-7 how far the ridges bulge there (smoothed over the neighbours). Five
 * ridges to start, one more per three delivered orders; the two innermost form an open loop until five buyers; the badge
 * is the gold outermost ridge; a lost dispute is a scar across the ridges. Same drawing for the same input, byte for byte.
 */
export function fingerprintSvg(codeword, record = { delivered: 0, buyers: 0, badge: null, disputes_lost: 0 }, { size = 360, ink = 'currentColor', gold = '#d1a04a', background = 'none' } = {}) {
  const cw = unhex(codeword.codeword ?? codeword);
  if (cw.length !== N) throw new TypeError('fingerprintSvg: a codeword has 64 bytes');
  const W = 360, cx = W / 2, cy = W * 0.52, total = ridgesOf(record.delivered), gap = (W * 0.40) / (total + 1), r0 = W * 0.06;
  const raw = [...cw].map((s) => ((s >> 5) - 3.5) / 3.5), sm = raw.map((_, j) => (raw[(j + N - 1) % N] + 2 * raw[j] + raw[(j + 1) % N]) / 4);
  const bulgeAt = (th) => { const u = ((th / (Math.PI * 2)) * N + N) % N, j = Math.floor(u), f = (1 - Math.cos((u - j) * Math.PI)) / 2; return sm[j] * (1 - f) + sm[(j + 1) % N] * f; };
  const p1 = (cw[0] / 255) * Math.PI * 2, p2 = (cw[1] / 255) * Math.PI * 2, e1 = 0.06 + (cw[2] / 255) * 0.08, e2 = 0.04 + (cw[3] / 255) * 0.06;
  const radiusAt = (i, th) => (r0 + i * gap) * (1 + e1 * Math.cos(th - p1) * (i / total) + e2 * Math.cos(2 * th - p2)) * (1 + 0.06 * bulgeAt(th) * Math.min(1, i / 3));
  const f1 = (x) => (Math.floor(x * 10 + 0.5) / 10).toFixed(1); // identical rounding in every implementation
  const paths = [];
  for (let i = 0; i < total; i++) {
    const last = i === total - 1 && record.badge, closedCore = i < 2 ? record.buyers >= 5 : true;
    const width = last ? 2.8 : 1.6 + ((cw[i % N] >> 6) & 3) * 0.2;
    let d = '', pen = false;
    for (let k = 0; k <= 256; k++) {
      const th = (k / 256) * Math.PI * 2 - Math.PI / 2, sector = Math.floor((((th / (Math.PI * 2)) * N) + N) % N), s = cw[sector];
      const ending = (s & 31) % total === i, openGap = !closedCore && th > Math.PI * 0.12 && th < Math.PI * 0.5;
      const r = radiusAt(i, th), x = cx + Math.cos(th) * r * 0.84, y = cy + Math.sin(th) * r;
      if (ending || openGap) { pen = false; continue; }
      d += `${pen ? 'L' : 'M'}${f1(x)} ${f1(y)}`; pen = true;
    }
    paths.push(`<path d="${d}" stroke="${last ? gold : ink}" stroke-width="${f1(width)}"/>`);
  }
  // A lost dispute is a scar: a cut masked out of the ridges, so it shows on any background.
  let scars = '';
  for (let d = 0; d < record.disputes_lost; d++) {
    const th = ((cw[(d * 11) % N] / 255) * Math.PI * 2) - Math.PI / 2, ra = r0 + gap * 2.5, rb = r0 + gap * Math.min(total - 0.5, 7.5);
    scars += `<path d="M${f1(cx + Math.cos(th) * ra * 0.84)} ${f1(cy + Math.sin(th) * ra)}L${f1(cx + Math.cos(th + 0.08) * rb * 0.84)} ${f1(cy + Math.sin(th + 0.08) * rb)}" stroke="#000" stroke-width="7.2" stroke-linecap="round"/>`;
  }
  const mask = scars ? `<mask id="scars"><rect width="${W}" height="${W}" fill="#fff"/>${scars}</mask>` : '';
  const desc = `Word Pass fingerprint: ${total} ridges from ${record.delivered} delivered orders; core ${record.buyers >= 5 ? 'closed' : 'open'} (${record.buyers} buyers); ${record.disputes_lost} disputes lost; ${record.badge ? 'badge ' + record.badge : 'no badge yet'}. Codeword ${hex(cw)}.`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${W}" width="${size}" height="${size}" role="img" aria-label="Word Pass fingerprint"><title>Word Pass fingerprint</title><desc>${desc}</desc>${background === 'none' ? '' : `<rect width="${W}" height="${W}" fill="${background}"/>`}${mask}<g fill="none" stroke-linecap="round" stroke-linejoin="round"${scars ? ' mask="url(#scars)"' : ''}>${paths.join('')}</g></svg>`;
}
