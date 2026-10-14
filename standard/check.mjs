#!/usr/bin/env node
// The visual standard of PazAIr (MASSSTAB.md), measured, not judged. Every page a person sees from this repository is
// rendered in a real browser at 390 and 1440 px, light and dark, and held to the same bars the audit of 14 October
// 2026 used. A bar that fails stops CI: the standard can rise, it cannot quietly fall back.
//
//   node check.mjs              # every examples/*.html, offline (the network is cut, pages must stand on their own)
//   node check.mjs --live       # the same bars against the live site, a report for the owner, not a CI gate
//   node check.mjs --json       # one JSON document on stdout
//
// Browser: CHROME_PATH, else the Chromium of this playwright-core (npx playwright-core install chromium), else the
// Chrome of the machine. No telemetry.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const ROOT = new URL('../', import.meta.url);
const args = new Set(process.argv.slice(2));
const LIVE = process.env.STANDARD_BASE || 'https://pazair.kulalabs.ch'; // a preview of the server can be measured the same way
const LIVE_PAGES = ['/', '/ask', '/muse', '/connect', '/sell', '/sell/konto', '/market', '/passes', '/fingerprint', '/remember', '/transparency', '/terms', '/privacy', '/gibt-es-nicht'];

/** The bars. Each one is a number a third party can re-measure, never a taste. */
const BARS = {
  contrastText: 4.5, // WCAG AA, normal text
  contrastLarge: 3, // WCAG AA, 24 px and up, or 18.66 px bold
  contrastGraphic: 3, // WCAG AA, marks and icons (brand SVGs)
  target: 44, // px on a phone, every control a finger has to hit; links inside running text are exempt (WCAG 2.5.8)
  targetPointer: 24, // px with a mouse, at 1440 (WCAG 2.2 AA, 2.5.8)
  minText: 12, // px, nothing a person has to read is smaller
};
const VIEWPORTS = [{ name: '390', width: 390, height: 844 }, { name: '1440', width: 1440, height: 900 }];
const THEMES = ['light', 'dark'];

// ---- colour arithmetic (WCAG 2.x relative luminance) ----
const hex = (h) => { const x = h.replace('#', ''); const f = x.length === 3 ? [...x].map((c) => c + c).join('') : x; return { r: parseInt(f.slice(0, 2), 16), g: parseInt(f.slice(2, 4), 16), b: parseInt(f.slice(4, 6), 16) }; };
const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

// ---- the brand marks: static, no browser needed ----
function checkBrand() {
  const out = [];
  const dir = new URL('brand/', ROOT);
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.svg'))) {
    const svg = readFileSync(new URL(f, dir), 'utf8');
    if (!/role="img"/.test(svg) || !/aria-label="[^"]{3,}"/.test(svg)) out.push({ page: `brand/${f}`, bar: 'name', detail: 'needs role="img" and an aria-label' });
    const bg = svg.match(/<rect[^>]*fill="(#[0-9a-fA-F]{3,6})"/)?.[1];
    if (!bg) continue; // transparent marks take the page colour (currentColor); the pages are measured below
    for (const c of new Set([...svg.matchAll(/stroke="(#[0-9a-fA-F]{3,6})"/g)].map((m) => m[1]))) {
      const r = ratio(hex(c), hex(bg));
      if (r < BARS.contrastGraphic) out.push({ page: `brand/${f}`, bar: 'contrast', detail: `${c} on ${bg} is ${r.toFixed(2)}:1, needs ${BARS.contrastGraphic}:1` });
    }
  }
  return out;
}

// ---- what runs inside each page ----
function measure([BARS, phone]) {
  const target = phone ? BARS.target : BARS.targetPointer;
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
  // Inside a closed <details> only the summary is on screen; Chrome still gives the rest a box, so it is skipped here.
  const folded = (el) => { const d = el.closest('details:not([open])'); return !!d && !el.closest('summary'); };
  const shown = (el) => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && Number(s.opacity) > 0.05 && !folded(el); };
  const where = (el) => { const p = []; for (let n = el; n && n.nodeType === 1 && p.length < 3; n = n.parentElement) p.unshift(n.tagName.toLowerCase() + (n.id ? `#${n.id}` : n.classList[0] ? `.${n.classList[0]}` : '')); return p.join('>'); };
  // The colour a text sits on: the stack of its ancestors' backgrounds. A gradient or image on an element (not on the
  // page itself, where PazAIr draws a faint dot grid) makes the backdrop unknowable from styles alone: skipped, not guessed.
  const backdrop = (el) => {
    const stack = [];
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.backgroundImage !== 'none' && n !== document.body && n !== document.documentElement) return null;
      const c = parse(s.backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a >= 1) break; }
    }
    let bg = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = stack.length - 1; i >= 0; i--) bg = over(stack[i], bg);
    return bg;
  };
  const scrollsX = (el) => { for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) { const s = getComputedStyle(n); if (/(auto|scroll)/.test(s.overflowX) && n.scrollWidth > n.clientWidth) return true; } return false; };
  const found = []; const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const el = t.parentElement; const text = t.textContent.trim();
    if (!text || !el || seen.has(el) || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|OPTION)$/.test(el.tagName) || !shown(el)) continue;
    seen.add(el);
    const s = getComputedStyle(el); const size = parseFloat(s.fontSize); const fg = parse(s.color);
    const bg = backdrop(el);
    if (fg && bg) {
      const large = size >= 24 || (Number(s.fontWeight) >= 700 && size >= 18.66);
      const need = large ? BARS.contrastLarge : BARS.contrastText;
      const r = ratio(over({ ...fg, a: fg.a * Number(s.opacity) }, bg), bg);
      if (r < need - 0.005) found.push({ bar: 'contrast', detail: `"${text.slice(0, 40)}" ${r.toFixed(2)}:1, needs ${need}:1`, at: where(el) });
    }
    if (size < BARS.minText - 0.01) found.push({ bar: 'text size', detail: `"${text.slice(0, 40)}" ${size.toFixed(1)} px, needs ${BARS.minText}`, at: where(el) });
    const r = el.getBoundingClientRect();
    if ((r.right > innerWidth + 1 || r.left < -1) && !scrollsX(el)) found.push({ bar: 'cut off', detail: `"${text.slice(0, 40)}" reaches ${Math.round(r.right)} px of ${innerWidth}`, at: where(el) });
  }
  if (document.documentElement.scrollWidth > innerWidth + 1) found.push({ bar: 'cut off', detail: `the page is ${document.documentElement.scrollWidth} px wide at ${innerWidth}`, at: 'html' });
  for (const el of document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button]')) {
    if (!shown(el)) continue;
    const inText = el.tagName === 'A' && getComputedStyle(el).display === 'inline' && (el.parentElement?.innerText || '').trim().length > (el.innerText || '').trim().length + 10;
    if (inText || el.type === 'checkbox' || el.type === 'radio') continue; // the label around them is the target
    const r = el.getBoundingClientRect();
    if (r.width < target - 0.5 || r.height < target - 0.5) found.push({ bar: 'target', detail: `"${(el.innerText || el.value || el.getAttribute('aria-label') || el.type || '').trim().slice(0, 30)}" ${Math.round(r.width)}×${Math.round(r.height)} px, needs ${target}×${target}`, at: where(el) });
  }
  for (const el of document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]),select,textarea')) {
    if (!el.labels?.length && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby') && !el.title) found.push({ bar: 'name', detail: `form field "${el.id || el.name || el.type}" has no label`, at: where(el) });
  }
  if (!document.documentElement.lang) found.push({ bar: 'structure', detail: '<html> has no lang', at: 'html' });
  if (!document.title.trim()) found.push({ bar: 'structure', detail: 'no <title>', at: 'head' });
  if (!document.querySelector('meta[name=viewport]')) found.push({ bar: 'structure', detail: 'no viewport meta', at: 'head' });
  if (document.querySelectorAll('main').length !== 1) found.push({ bar: 'structure', detail: `${document.querySelectorAll('main').length} <main>, needs exactly 1`, at: 'body' });
  if (document.querySelectorAll('h1').length !== 1) found.push({ bar: 'structure', detail: `${document.querySelectorAll('h1').length} <h1>, needs exactly 1`, at: 'body' });
  return found;
}

function findChrome() {
  // First the Chromium that belongs to this playwright-core (npx playwright-core install chromium, as in CI), so a
  // result never depends on which Chrome a machine happens to have; then the usual places.
  let bundled = null; try { bundled = chromium.executablePath(); } catch { /* not installed */ }
  const candidates = [process.env.CHROME_PATH, bundled, '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    ...(existsSync('/opt/pw-browsers') ? readdirSync('/opt/pw-browsers').filter((d) => /^chromium-\d+$/.test(d)).map((d) => `/opt/pw-browsers/${d}/chrome-linux/chrome`) : []),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
  const hit = candidates.find((p) => p && existsSync(p));
  if (!hit) { console.error('No Chrome found. Set CHROME_PATH to a Chrome or Chromium binary.'); process.exit(2); }
  return hit;
}

const targets = args.has('--live')
  ? LIVE_PAGES.map((p) => ({ name: p, url: LIVE + p }))
  : readdirSync(new URL('examples/', ROOT)).filter((f) => f.endsWith('.html')).map((f) => ({ name: `examples/${f}`, url: new URL(`examples/${f}`, ROOT).href }));

const findings = args.has('--live') ? [] : checkBrand();
const browser = await chromium.launch({ executablePath: findChrome() });
for (const theme of THEMES) for (const vp of VIEWPORTS) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, colorScheme: theme, reducedMotion: 'reduce' });
  // Offline: a page from this repository must stand without the network (the viewer falls back to its snapshot).
  // Every request that leaves the file is recorded; one to a third party (a font host, a tracker) is a finding.
  const asked = new Set();
  if (!args.has('--live')) await context.route(/^https?:/, (route) => { asked.add(new URL(route.request().url()).host); return route.abort(); });
  for (const t of targets) {
    const page = await context.newPage();
    try {
      await page.goto(t.url, { waitUntil: args.has('--live') ? 'networkidle' : 'load', timeout: 45000 });
      await page.waitForTimeout(400);
      for (const f of await page.evaluate(measure, [BARS, vp.width < 800])) findings.push({ page: t.name, view: `${vp.name} ${theme}`, ...f });
    } catch (e) { findings.push({ page: t.name, view: `${vp.name} ${theme}`, bar: 'load', detail: String(e.message || e).split('\n')[0] }); }
    await page.close();
  }
  for (const host of asked) if (!/(^|\.)pazair\.(kulalabs\.)?ch$/.test(host)) findings.push({ page: 'examples', view: `${vp.name} ${theme}`, bar: 'third party', detail: `a request to ${host}` });
  await context.close();
}
await browser.close();

// One line per finding, the same finding in four views counted once with its views.
const merged = new Map();
for (const f of findings) { const k = `${f.page}|${f.bar}|${f.detail}|${f.at ?? ''}`; const m = merged.get(k); if (m) m.views.push(f.view); else merged.set(k, { ...f, views: f.view ? [f.view] : [] }); }
const list = [...merged.values()].map(({ view, ...f }) => f);
if (args.has('--json')) console.log(JSON.stringify({ bars: BARS, pages: targets.map((t) => t.name), findings: list }, null, 2));
else {
  for (const f of list) console.log(`✗ ${f.page} · ${f.bar} · ${f.detail}${f.at ? ` · ${f.at}` : ''}${f.views.length ? ` · ${f.views.join(', ')}` : ''}`);
  const counts = list.reduce((a, f) => ((a[f.bar] = (a[f.bar] || 0) + 1), a), {});
  console.log(list.length ? `\n${list.length} findings: ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ')}` : `✓ ${targets.length} pages${args.has('--live') ? '' : ' and the brand marks'} hold every bar in ${VIEWPORTS.length * THEMES.length} views.`);
}
process.exit(list.length && !args.has('--live') ? 1 : 0);
