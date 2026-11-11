'use strict';
/* ============================================================
   run.js — the daily collector.
   node ingest/run.js            fetch all sources, write data/
   node ingest/run.js --dry      fetch and report, write nothing
   Output: data/jobs.json (the site reads it), data/seen.json
   (first-seen dates), data/digest.txt (WhatsApp-ready post).
   ============================================================ */
const fs = require('node:fs');
const path = require('node:path');
const { ADAPTERS } = require('./sources.js');
const { normalizeJob, dedupe, mergeSeen } = require('./normalize.js');
const { collectCampus } = require('./campus.js');

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const DRY = process.argv.includes('--dry');
const CONCURRENCY = 6;

const readJson = (f, fallback) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return fallback; } };

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const k = i; i += 1; out[k] = await fn(items[k]); }
  });
  await Promise.all(workers);
  return out;
}

function digestText(jobs, today) {
  const fresh = jobs.filter(j => j.firstSeen === today);
  const pick = (fresh.length ? fresh : jobs).slice(0, 20);
  const head = fresh.length ? `*${fresh.length} new openings today* (${today})` : `*Open roles this week* (${today})`;
  const lines = pick.map(j => `• ${j.type === 'Internship' ? '[Intern] ' : ''}${j.title} — ${j.org}, ${j.city}\n  ${j.applyUrl}`);
  return `HITAM Opportunities\n${head}\nHyderabad + India-remote, internships and 0–2 years only.\n\n${lines.join('\n')}\n\nFull list, match scores and resume help: open the HITAM Opportunities app.`;
}

async function main() {
  const companies = readJson(path.join(__dirname, 'companies.json'), []);
  if (!companies.length) throw new Error('ingest/companies.json is empty or missing');
  const today = new Date().toISOString().slice(0, 10);
  const reasons = {};

  const results = await pool(companies, CONCURRENCY, async c => {
    const adapter = ADAPTERS[c.ats];
    if (!adapter) return { c, ok: false, error: `unknown ats ${c.ats}`, raw: [] };
    try { return { c, ok: true, raw: await adapter(c) }; } catch (err) { return { c, ok: false, error: String(err.message || err), raw: [] }; }
  });

  const kept = [];
  const sources = results.map(({ c, ok, error, raw }) => {
    let n = 0;
    raw.forEach(r => {
      const { job, reason } = normalizeJob(r);
      reasons[reason] = (reasons[reason] || 0) + 1;
      if (job) { kept.push(job); n += 1; }
    });
    return { name: c.name, ats: c.ats, ok, fetched: raw.length, kept: n, error: error || undefined };
  });

  const jobs = dedupe(kept);
  const seenFile = path.join(DATA, 'seen.json');
  const seen = mergeSeen(readJson(seenFile, {}), jobs, today);
  const withSeen = jobs.map(j => ({ ...j, firstSeen: seen[j.id] }))
    .sort((a, b) => (b.firstSeen || '').localeCompare(a.firstSeen || '') || String(b.postedAt || '').localeCompare(String(a.postedAt || '')));

  const out = {
    generatedAt: new Date().toISOString(),
    counts: {
      total: withSeen.length,
      hyderabad: withSeen.filter(j => j.city === 'Hyderabad').length,
      internships: withSeen.filter(j => j.type === 'Internship').length,
      newToday: withSeen.filter(j => j.firstSeen === today).length,
      companies: new Set(withSeen.map(j => j.org)).size
    },
    sources,
    jobs: withSeen
  };

  console.log(`Sources: ${sources.filter(s => s.ok).length}/${sources.length} ok`);
  sources.filter(s => !s.ok).forEach(s => console.log(`  FAILED ${s.name} (${s.ats}): ${s.error}`));
  console.log(`Raw jobs: ${Object.values(reasons).reduce((a, b) => a + b, 0)}  kept: ${out.counts.total}  filter reasons: ${JSON.stringify(reasons)}`);
  console.log(`Hyderabad: ${out.counts.hyderabad}  internships: ${out.counts.internships}  new today: ${out.counts.newToday}  companies: ${out.counts.companies}`);
  let campus = null;
  try { campus = await collectCampus(); console.log(`Campus: ${campus.news.length} official posts, ${campus.placements.stats.offers} placement offers`); } catch (err) { console.log(`Campus collection FAILED: ${err.message}`); }
  if (DRY) return;
  if (campus) { fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(path.join(DATA, 'campus.json'), JSON.stringify(campus)); }
  fs.mkdirSync(DATA, { recursive: true });
  fs.writeFileSync(path.join(DATA, 'jobs.json'), JSON.stringify(out));
  fs.writeFileSync(seenFile, JSON.stringify(seen));
  fs.writeFileSync(path.join(DATA, 'digest.txt'), digestText(withSeen, today));
  console.log('Wrote data/jobs.json, data/seen.json, data/digest.txt');
}

main().catch(err => { console.error(err); process.exit(1); });
