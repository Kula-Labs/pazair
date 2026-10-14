// The checker's own test: it must accept a small target whose equivalent is real, and refuse every other case.
// Run after check.mjs in CI. A checker that stops finding what it should is worse than none.
import { execFileSync } from 'node:child_process';
let out;
try { out = execFileSync(process.execPath, ['check.mjs', '--dir=standard/fixtures', '--json'], { encoding: 'utf8', maxBuffer: 1 << 26 }); } catch (e) { out = e.stdout; }
const findings = JSON.parse(out).findings.flatMap((f) => (f.views ?? [f.view]).map((view) => ({ ...f, view })));
const views = [...new Set(findings.map((f) => f.view))];
const fail = (m) => { console.error(`selftest: ${m}`); process.exit(1); };
if (views.length !== 4) fail(`expected findings in 4 views, got ${views.join(', ') || 'none'}`);
for (const v of views) {
  const t = findings.filter((f) => f.view === v && f.bar === 'target').map((f) => f.detail);
  for (const want of ['equivalent #nowhere is missing', 'equivalent #small-c is 12×12 px itself', 'equivalent #big-d leads elsewhere'])
    if (!t.some((d) => d.includes(want))) fail(`${v}: no finding "${want}"`);
  if (t.some((d) => d.includes('#big-a'))) fail(`${v}: the link with a real equivalent was reported`);
  const other = findings.filter((f) => f.view === v && f.bar !== 'target');
  if (other.length) fail(`${v}: unexpected ${other.map((f) => `${f.bar}: ${f.detail}`).join('; ')}`);
}
console.log(`✓ selftest: the equivalent rule holds in ${views.length} views (1 accepted, 3 refused each)`);
