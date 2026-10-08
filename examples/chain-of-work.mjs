#!/usr/bin/env node
// A chain of work (SPEC 3.1), start to proof, offline: node examples/chain-of-work.mjs
//
// Gamma asks for a web page in Swiss German. Beta takes the order, buys the translation from Alpha,
// delivers, and gets paid. What is left at the end: two signed receipts that anyone can walk,
// showing who did which part and who paid whom. Nothing here needs PazAIr; any issuer works the same way.
import { generateKey, keysDocument, signReceipt } from '../issuer/src/index.js';
import { receiptHash, verifyReceipt, verifyReceiptChain } from '../verify/src/index.js';

const issuer = await generateKey();
const keys = keysDocument('example', [issuer]).keys;
const chf = (minor) => `CHF ${(minor / 100).toFixed(2)}`;

// 1. Gamma orders from Beta: order or_page, CHF 5.00. Beta does not translate itself, so it buys.
// 2. Beta orders from Alpha, naming the order it buys for. Alpha delivers; the issuer signs.
const translation = { text: 'Grüezi mitenand' };
const sub = await signReceipt(issuer, 'example', {
  order: 'or_translate', listing: 'ls_translate_gsw', seller: 'ag_alpha', buyer: 'ag_beta',
  amount_minor: 200, currency: 'chf', delivered_at: '2026-10-08T09:00:00.000Z', delivery: translation,
  parent_order: 'or_page',
});
console.log(`1. ag_alpha delivered or_translate to ag_beta, ${chf(sub.amount_minor)}, receipt ${(await receiptHash(sub)).slice(0, 12)}…`);

// 3. Beta builds the page on the translation and delivers. Its receipt signs what it was built on.
const page = { html: `<h1>${translation.text}</h1>` };
const top = await signReceipt(issuer, 'example', {
  order: 'or_page', listing: 'ls_page_gsw', seller: 'ag_beta', buyer: 'ag_gamma',
  amount_minor: 500, currency: 'chf', delivered_at: '2026-10-08T09:05:00.000Z', delivery: page,
  inputs: [sub],
});
console.log(`2. ag_beta delivered or_page to ag_gamma, ${chf(top.amount_minor)}, built on ${top.inputs.length} receipt`);

// 4. Gamma, or anyone later, checks: the delivery it holds, and the whole chain behind it.
const own = await verifyReceipt(top, { keys, delivery: page });
const chain = await verifyReceiptChain(top, { receipts: [sub], keys });
console.log(`3. delivery matches: ${own.delivery_matches}; chain valid: ${chain.valid}, ${chain.links} link, ${chf(chain.total_minor.chf)} passed on`);

// 5. What does not work: claiming a part nobody bought, or changing a part after the fact.
const forged = { ...sub, amount_minor: 50 };
console.log(`4. a changed sub-receipt: ${(await verifyReceiptChain(top, { receipts: [forged], keys })).broken}`);
const someoneElses = await signReceipt(issuer, 'example', { ...sub, order: 'or_other', buyer: 'ag_delta', delivery: translation });
const claims = await signReceipt(issuer, 'example', { ...top, delivery: page, inputs: [someoneElses] });
console.log(`5. someone else's purchase: ${(await verifyReceiptChain(claims, { receipts: [someoneElses], keys })).broken}`);
