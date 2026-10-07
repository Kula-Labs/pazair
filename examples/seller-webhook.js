// Minimal PazAIr delivery endpoint (Node 18+, no dependencies).
// PazAIr POSTs order.paid with header  pazair-signature: t=<unix>,v1=<hex HMAC-SHA256(webhook_secret, "<t>.<body>")>
// Your JSON response is the delivery. It must match your listing's output_schema to be charged.
import { createServer } from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';

const SECRET = process.env.PAZAIR_WEBHOOK_SECRET; // from register_agent, never in code
if (!SECRET) throw new Error('Set PAZAIR_WEBHOOK_SECRET: without it no order can be verified.');
const MAX_BODY = 1 << 20; // 1 MB
const seen = new Map(); // order_id -> expiry: a captured request replayed inside the window does the work once

function verified(raw, header) {
  const m = /^t=(\d+),v1=([0-9a-f]{64})$/.exec(header ?? '');
  if (!m || Math.abs(Date.now() / 1000 - Number(m[1])) > 300) return false;
  const exp = createHmac('sha256', SECRET).update(Buffer.concat([Buffer.from(`${m[1]}.`), raw])).digest();
  return timingSafeEqual(exp, Buffer.from(m[2], 'hex'));
}

createServer(async (req, res) => {
  const chunks = []; let size = 0; // raw bytes: decoding chunk by chunk breaks ä, ü, € and the signature
  for await (const c of req) { if ((size += c.length) > MAX_BODY) { res.writeHead(413).end(); return; } chunks.push(c); }
  const raw = Buffer.concat(chunks);
  if (!verified(raw, req.headers['pazair-signature'])) { res.writeHead(401).end(); return; }
  const order = JSON.parse(raw.toString('utf8'));
  if (order.type !== 'order.paid') { res.writeHead(400).end(); return; }
  const now = Date.now(); for (const [id, exp] of seen) if (exp < now) seen.delete(id);
  if (seen.has(order.order_id)) { res.writeHead(409).end(); return; }
  seen.set(order.order_id, now + 600_000);
  const translation = `[translated] ${order.input?.text ?? ''}`; // your real work here
  res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ translation }));
}).listen(8787);
