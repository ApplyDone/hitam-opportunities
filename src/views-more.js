/* ============================================================
   views-more.js — Insights and the Design-Thinking case file
   ============================================================ */
'use strict';

/* ---------- Charts (hand-built SVG) ---------- */
function radarSVG(axes) {
  const cx = 190; const cy = 150; const R = 104;
  const pt = (i, v) => { const a = (Math.PI * 2 * i) / axes.length - Math.PI / 2; return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v]; };
  const ring = f => axes.map((_, i) => pt(i, f).join(',')).join(' ');
  const poly = key => axes.map((x, i) => pt(i, x[key]).join(',')).join(' ');
  const labels = axes.map((x, i) => { const [px, py] = pt(i, 1.2); const anchor = px < cx - 8 ? 'end' : px > cx + 8 ? 'start' : 'middle'; return `<text class="lab" x="${px.toFixed(1)}" y="${(py + 3).toFixed(1)}" text-anchor="${anchor}">${esc(x.label)}</text>`; }).join('');
  const dots = axes.map((x, i) => { const [px, py] = pt(i, x.you); return `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3.4" fill="var(--acc)"/>`; }).join('');
  return `<svg viewBox="0 0 380 300" role="img" aria-label="Radar chart of your skill coverage against what your top matches demand">
  ${[0.25, 0.5, 0.75, 1].map(f => `<polygon points="${ring(f)}" fill="none" stroke="var(--line-2)" stroke-width="1"/>`).join('')}
  ${axes.map((_, i) => { const [x, y] = pt(i, 1); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--line)"/>`; }).join('')}
  <polygon points="${poly('demand')}" fill="color-mix(in srgb, var(--ink) 10%, transparent)" stroke="var(--ink)" stroke-width="1.4" stroke-dasharray="4 3"/>
  <polygon points="${poly('you')}" fill="color-mix(in srgb, var(--acc) 26%, transparent)" stroke="var(--acc)" stroke-width="2"/>${dots}${labels}</svg>`;
}

function densitySVG(counts) {
  const W = 420; const H = 130; const bw = (W - 20) / counts.length; const max = Math.max(1, ...counts);
  const bars = counts.map((c, i) => { const h = (c / max) * (H - 34); const x = 10 + i * bw; return `<rect x="${x.toFixed(1)}" y="${(H - 22 - h).toFixed(1)}" width="${(bw - 3).toFixed(1)}" height="${Math.max(h, c ? 2 : 0).toFixed(1)}" rx="1.5" fill="${i === 0 ? 'var(--acc)' : i < 7 ? 'var(--ink)' : 'var(--line-2)'}"><title>${c} closing ${i === 0 ? 'today' : 'in ' + i + ' days'}</title></rect>`; }).join('');
  const ticks = [0, 7, 14, 21, 28].map(i => `<text x="${(10 + i * bw).toFixed(1)}" y="${H - 6}">${i === 0 ? 'today' : '+' + i + 'd'}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Eligible listings closing per day over the next 30 days"><line x1="10" x2="${W - 10}" y1="${H - 22}" y2="${H - 22}" stroke="var(--line-2)"/>${bars}${ticks}</svg>`;
}

function histogramSVG(buckets) {
  const W = 420; const H = 130; const bw = (W - 20) / buckets.length; const max = Math.max(1, ...buckets.map(b => b.n));
  const bars = buckets.map((b, i) => { const h = (b.n / max) * (H - 40); const x = 10 + i * bw; return `<rect x="${(x + 4).toFixed(1)}" y="${(H - 22 - h).toFixed(1)}" width="${(bw - 8).toFixed(1)}" height="${Math.max(h, b.n ? 2 : 0).toFixed(1)}" fill="${i >= 3.5 ? 'var(--ok)' : i >= 2.5 ? 'var(--gold)' : 'var(--line-2)'}"><title>${b.n} listings scoring ${b.label}</title></rect><text x="${(x + bw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${b.label}</text><text x="${(x + bw / 2).toFixed(1)}" y="${(H - 26 - h).toFixed(1)}" text-anchor="middle" style="fill:var(--ink)">${b.n || ''}</text>`; }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Distribution of match scores">${bars}<line x1="10" x2="${W - 10}" y1="${H - 22}" y2="${H - 22}" stroke="var(--line-2)"/></svg>`;
}

function viewInsights() {
  const rk = rankNow().filter(x => !x.r.closed);
  const mine = rk.filter(x => x.r.elig.ok);
  const strong = mine.filter(x => x.r.score >= 70).length;
  const top = mine.slice(0, 12);
  const axes = SKILL_GROUPS.map(g => {
    let demand = 0; let met = 0;
    top.forEach(({ o }) => o.skills.forEach(s => { if (g.skills.includes(s)) { demand += 1; met += Math.min(1, (S.profile.skills[s] || 0) / o.lvl); } }));
    return { label: g.name, demandRaw: demand, you: demand ? met / demand : 0 };
  });
  const maxD = Math.max(1, ...axes.map(a => a.demandRaw));
  axes.forEach(a => { a.demand = a.demandRaw / maxD; });
  const weakest = [...axes].filter(a => a.demandRaw > 0).sort((a, b) => a.you - b.you)[0];
  const strongest = [...axes].filter(a => a.demandRaw > 0).sort((a, b) => b.you - a.you)[0];

  const density = Array.from({ length: 30 }, (_, i) => mine.filter(x => x.r.dl === i).length);
  const buckets = [0, 20, 40, 60, 80].map((lo, i) => ({ label: i === 4 ? '80+' : `${lo}–${lo + 19}`, n: mine.filter(x => x.r.score >= lo && (i === 4 || x.r.score < lo + 20)).length }));
  const mix = TYPES.map(t => ({ t, all: rk.filter(x => x.o.type === t).length, ok: mine.filter(x => x.o.type === t).length }));
  const maxMix = Math.max(1, ...mix.map(m => m.all));
  const ids = Object.keys(S.apps);
  const applied = ids.filter(i => ['Applied', 'Interview', 'Offer', 'Rejected'].includes(S.apps[i].st)).length;

  return `
<header class="page-head">
  <div class="eyebrow"><b>Insights</b> · What the data says about you</div>
  <h1 class="h1">Your position, <em>at a glance.</em></h1>
  <p class="story">Of <b>${rk.length}</b> open listings, <b>${mine.length}</b> are open to you and <b>${strong}</b> are strong matches. ${strongest && weakest ? `You are strongest in <b>${strongest.label.toLowerCase()}</b> and furthest from the bar in <b>${weakest.label.toLowerCase()}</b>.` : 'Rate some skills to see where you stand.'} ${ids.length ? `You are tracking <b>${ids.length}</b>, and <b>${applied}</b> ${applied === 1 ? 'has' : 'have'} been submitted.` : 'You are not tracking anything yet.'}</p>
</header>
<div class="charts">
  <section class="panel chart-box">${sectionHead('Skill coverage', 'vs your top 12 matches')}${radarSVG(axes)}
    <div class="legend"><span><i style="background:var(--acc)"></i>You</span><span><i style="border-style:dashed;border-color:var(--ink)"></i>What your top matches ask for</span></div></section>
  <section class="panel chart-box">${sectionHead('Deadline density', 'next 30 days, eligible only')}${densitySVG(density)}
    <p class="small muted">${density.slice(0, 7).reduce((a, b) => a + b, 0)} eligible listings close in the next 7 days. Dark bars are this week.</p></section>
  <section class="panel chart-box">${sectionHead('Match distribution', 'eligible listings')}${histogramSVG(buckets)}
    <p class="small muted">Green is strong (70+). Gold is worth a look. Raise a skill and bars shift right.</p></section>
  <section class="panel chart-box">${sectionHead('Mix by type', 'open vs open to you')}
    ${mix.map(m => `<div class="hbar" data-type="${m.t}"><span>${m.t}</span><div class="bar" style="position:relative;background:var(--paper-2)"><i style="width:${(m.all / maxMix) * 100}%;opacity:.28;position:absolute;inset:0 auto 0 0"></i><i style="width:${(m.ok / maxMix) * 100}%;position:absolute;inset:0 auto 0 0"></i></div><b class="mono">${m.ok}/${m.all}</b></div>`).join('')}</section>
  <section class="panel chart-box">${sectionHead('Pipeline', `${ids.length} tracked`)}${ids.length ? pipelineFunnel() : '<p class="muted small">Track a listing to see your funnel.</p>'}</section>
  <section class="panel chart-box">${sectionHead('Skill roadmap', 'biggest lifts')}<div>${roadmapHTML()}</div></section>
</div>`;
}

/* ---------- Case file ---------- */
const CF_STEPS = [['01', 'Empathize'], ['02', 'Define'], ['03', 'Ideate'], ['04', 'Prototype'], ['05', 'Test']];
const EVIDENCE_KINDS = ['Interview', 'Survey', 'Observation'];

function susResultsHTML() {
  const rows = S.sus;
  if (!rows.length) return '<p class="muted small">No responses yet. Ask a classmate to complete the form, one person at a time.</p>';
  const scores = rows.map(r => susScore(r.a));
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  return `<div class="row" style="gap:28px;align-items:end"><div><div class="big-num" style="color:var(--acc)">${mean.toFixed(1)}</div><div class="eyebrow">Mean SUS · ${susGrade(mean)}</div></div><div><div class="big-num">${rows.length}</div><div class="eyebrow">Participant${rows.length === 1 ? '' : 's'}</div></div><div><div class="big-num">${Math.min(...scores).toFixed(0)}–${Math.max(...scores).toFixed(0)}</div><div class="eyebrow">Range</div></div></div>
  <p class="small muted" style="margin:12px 0">68 is the commonly cited average. With very few participants, treat the score as a conversation starter, not a verdict.</p>
  <div class="ledger">${rows.map((r, i) => `<div class="lrow" style="grid-template-columns:1fr 90px 60px"><span>${esc(r.who || 'Participant ' + (i + 1))}</span><b class="mono">${susScore(r.a).toFixed(1)}</b><button class="btn sm ghost" data-act="sus-del" data-i="${i}" aria-label="Delete response">${icon('trash')}</button></div>`).join('')}</div>
  <div class="row" style="margin-top:14px"><button class="btn sm ghost" data-act="sus-csv">${icon('download')}Export CSV</button><button class="btn sm ghost" data-act="sus-clear">Clear all</button></div>`;
}

function evidenceHTML() {
  return S.evidence.length ? S.evidence.slice().reverse().map(e => `<div style="padding:14px 0;border-bottom:1px solid var(--line)"><div class="quote">${esc(e.text)}</div><div class="row between" style="margin-top:8px"><span class="eyebrow">${esc(e.kind)}${e.who ? ' · ' + esc(e.who) : ''}</span><button class="btn sm ghost" data-act="ev-del" data-id="${e.id}" aria-label="Delete note">${icon('trash')}</button></div></div>`).join('') : '<p class="muted small">Nothing logged yet. Add what students actually said.</p>';
}

function viewCase() {
  const w = S.weights; const total = Object.values(w).reduce((a, b) => a + b, 0) || 1;
  return `
<header class="page-head">
  <div class="eyebrow"><b>Case file</b> · Design Thinking Lab</div>
  <h1 class="h1">From a campus problem to a <em>working prototype.</em></h1>
  <p class="lede">The five stages behind this product, with space to log real evidence and measure usability. Team: Ananya, Afreen, Akash and Joseph Kiran. Guide: Mr. Siddhartha, MECH Dept.</p>
  <div class="cf-nav">${CF_STEPS.map(([n, l]) => `<a class="chip" href="#/case" data-act="cf-jump" data-id="cf-${l.toLowerCase()}">${n} ${l}</a>`).join('')}<a class="btn sm acc" href="#/report">${icon('file')}One-page report</a></div>
</header>

<section class="cf-sec" id="cf-empathize"><div class="step">01<small>Empathize</small></div><div class="stack" style="--g:26px">
  <div><h2 class="h2">Who we are designing for</h2><p class="lede" style="margin-top:10px">First- and second-year engineering students who know that internships, hackathons and placements matter, but cannot tell which ones are meant for them.</p></div>
  <div class="cols eq">
    <div class="panel"><div class="eyebrow">Working persona · hypothesis to validate</div><div class="h2" style="margin:8px 0">Ananya, 1st-year CSE</div><p class="small">Wants an internship at a product-based company. Knows some Python and basic web. Does not know where to start, what her skills are worth, or which deadlines are real.</p><ul class="todo" style="color:var(--ink-2)"><li>Hears about opportunities late, through group chats</li><li>Unsure whether she is eligible before reading the whole notice</li><li>Does not know what a good application looks like</li><li>Loses track of deadlines she has already seen</li></ul></div>
    <div class="panel"><div class="eyebrow">Evidence log</div><p class="small muted" style="margin:6px 0 12px">Record real quotes and observations from interviews, surveys and shadowing. This is stored in your browser and exported with your backup.</p>
      <form id="ev-form" class="stack" style="--g:10px"><div class="field"><label class="lbl" for="ev-text">What did you hear or see?</label><textarea id="ev-text" name="text" required maxlength="400" style="min-height:70px"></textarea></div><div class="form-grid"><div class="field"><label class="lbl" for="ev-kind">Source</label><select id="ev-kind" name="kind">${EVIDENCE_KINDS.map(k => `<option>${k}</option>`).join('')}</select></div><div class="field"><label class="lbl" for="ev-who">Who (optional)</label><input id="ev-who" name="who" maxlength="40" placeholder="e.g. Year 2 ECE student"></div></div><div><button class="btn sm" type="submit">${icon('plus')}Add to log</button></div></form>
      <div id="ev-list" style="margin-top:12px">${evidenceHTML()}</div></div>
  </div></div></section>

<section class="cf-sec" id="cf-define"><div class="step">02<small>Define</small></div><div class="stack" style="--g:22px">
  <h2 class="h2">The problem, in one sentence</h2>
  <p class="story" style="max-width:34ch">${esc(PROBLEM_STATEMENT).replace('find, judge and track', '<b>find, judge and track</b>')}</p>
  <div><div class="eyebrow" style="margin-bottom:6px">How might we…</div>${HMW_LIST.map(h => `<div class="hmw">${h}</div>`).join('')}</div></div></section>

<section class="cf-sec" id="cf-ideate"><div class="step">03<small>Ideate</small></div><div class="stack" style="--g:22px">
  <div><h2 class="h2">The journey, and what answers each pain</h2><p class="small muted" style="margin-top:6px">Pains are assumptions until the evidence log says otherwise.</p></div>
  <div class="journey"><div class="h"><span>Stage</span><span>Pain (assumed)</span><span>Feature that answers it</span></div>${JOURNEY.map((j, i) => `<div><b>${String(i + 1).padStart(2, '0')} ${j.stage}</b><span>${esc(j.pain)}</span><span>${esc(j.fix)}</span></div>`).join('')}</div></div></section>

<section class="cf-sec" id="cf-prototype"><div class="step">04<small>Prototype</small></div><div class="stack" style="--g:22px">
  <h2 class="h2">What is built, and how it decides</h2>
  <div class="cols eq">
    <div class="panel"><div class="eyebrow">Scoring, live from your settings</div><p class="small" style="margin:8px 0 12px">Eligibility (year, branch, CGPA) is a hard gate: ineligible listings are capped at 28. Everything else is a weighted average:</p>
      ${WEIGHT_META.map(m => `<div class="break-row" style="grid-template-columns:130px 1fr 44px;margin-bottom:8px"><span>${m.label}</span><div class="meter" style="color:var(--ink)"><i style="width:${(w[m.key] / total) * 100}%;background:var(--ink)"></i></div><span class="mono small">${Math.round((w[m.key] / total) * 100)}%</span></div>`).join('')}
      <p class="small muted" style="margin-top:10px">Skill fit = for each required skill, min(1, your level ÷ required level), averaged.</p></div>
    <div class="panel"><div class="eyebrow">Honest limits</div><ul class="todo" style="color:var(--ink-2)"><li>Listings are sample data. A real deployment needs a coordinator feed (the “Post an opportunity” form shows the idea).</li><li>The assistant is rule-based, not a language model. It answers only from the data.</li><li>Everything is stored in this browser. There are no accounts and nothing is sent anywhere.</li><li>Match weights are our design choice, which is why they are adjustable.</li></ul></div>
  </div></div></section>

<section class="cf-sec" id="cf-test"><div class="step">05<small>Test</small></div><div class="stack" style="--g:24px">
  <div><h2 class="h2">Measure usability with the SUS</h2><p class="lede" style="margin-top:8px">Ask a classmate to complete three tasks (find a paid remote internship, save it, draft a cover letter), then have them answer these ten statements. The System Usability Scale converts the answers to a 0–100 score.</p></div>
  <div class="cols">
    <form id="sus-form" class="panel"><div class="field" style="margin-bottom:8px"><label class="lbl" for="sus-who">Participant (optional)</label><input id="sus-who" name="who" maxlength="40" placeholder="e.g. Year 1 CSE, P1"></div>
      <p class="small muted" style="margin:10px 0 4px">1 = strongly disagree · 5 = strongly agree</p>
      ${SUS_ITEMS.map((t, i) => `<div class="sus-q"><span>${i + 1}. ${t}</span><div class="sus-opts" role="radiogroup" aria-label="Statement ${i + 1}">${[1, 2, 3, 4, 5].map(n => `<label><input type="radio" name="q${i}" value="${n}" ${n === 1 ? 'required' : ''}>${n}</label>`).join('')}</div></div>`).join('')}
      <div style="margin-top:18px"><button class="btn acc" type="submit">Record response</button></div></form>
    <aside class="stack sticky" style="--g:18px"><div class="panel">${sectionHead('Results', 'live')}<div id="sus-results">${susResultsHTML()}</div></div></aside>
  </div></div></section>`;
}
