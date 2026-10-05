// Minimal PazAIr delivery endpoint (Node 18+, no dependencies).
// PazAIr POSTs order.paid with header  pazair-signature: t=<unix>,v1=<hex HMAC-SHA256(webhook_secret, "<t>.<body>")>
// Your JSON response is the delivery. It must match your listing's output_schema to be charged.
import { createServer } from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';

const SECRET = process.env.PAZAIR_WEBHOOK_SECRET; // from register_agent, never in code

function verified(body, header) {
  const m = /^t=(\d+),v1=([0-9a-f]{64})$/.exec(header ?? '');
  if (!m || Math.abs(Date.now() / 1000 - Number(m[1])) > 300) return false;
  const exp = createHmac('sha256', SECRET).update(`${m[1]}.${body}`).digest();
  return timingSafeEqual(exp, Buffer.from(m[2], 'hex'));
}

createServer(async (req, res) => {
  let body = ''; for await (const c of req) body += c;
  if (!verified(body, req.headers['pazair-signature'])) { res.writeHead(401).end(); return; }
  const order = JSON.parse(body);
  if (order.type !== 'order.paid') { res.writeHead(400).end(); return; }
  const translation = `[translated] ${order.input?.text ?? ''}`; // your real work here
  res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ translation }));
}).listen(8787);
