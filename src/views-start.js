/* ============================================================
   views-start.js — Home (what do you need?) and Placements
   (HITAM's real placement history from hitam.org).
   ============================================================ */
'use strict';

const PL = { branch: '' };

function startCard(href, ic, title, big, sub) {
  return `<a class="start-card" href="${href}">${icon(ic)}<div><b>${title}</b><span class="start-big">${big}</span><span class="small muted">${sub}</span></div>${icon('arrow')}</a>`;
}

function calendarCard(y, sem) {
  const c = CAREER_CALENDAR[`${y}-${sem}`];
  if (!c) return '';
  return `<section class="panel"><div class="eyebrow"><b>This semester</b> · HITAM’s Career Calendar</div><div class="h3" style="margin:6px 0 10px">${esc(c.label)}</div>
  <ul class="todo">${c.do.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
  <div class="lbl" style="margin:14px 0 6px">Training CDC runs this semester</div><div class="chips">${c.train.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
  <a class="btn sm ghost" style="margin-top:14px" href="#/placements">Full 4-year calendar</a><p class="tiny muted" style="margin-top:8px">Semester is estimated from today’s date.</p></section>`;
}

function viewHome() {
  const p = S.profile;
  const first = (p.name.trim() || (AUTH.user && AUTH.user.name) || '').split(' ')[0];
  const y = Number(p.year) || 1;
  const rk = rankOpps(allOpps(), p, S.weights).filter(x => !x.r.closed && x.r.elig.ok);
  const interns = rk.filter(x => x.o.type === 'Internship');
  const hitam = rk.filter(x => isHitamListing(x.o)).sort((a, b) => a.r.dl - b.r.dl);
  const programs = rk.filter(x => x.o.program).sort((a, b) => a.r.dl - b.r.dl);
  const st = CAMPUS && CAMPUS.placements ? CAMPUS.placements.stats : null;
  let resumeLine = 'Upload once, see what to fix';
  if (S.resume) { const sc = scoreResume(parseResume(S.resume.text, { pages: S.resume.pages }), { demand: [] }); resumeLine = `Your score: ${sc.score}/100`; }
  const atHitam = hitam.length
    ? `<div class="tkts">${hitam.slice(0, 4).map((x, i) => ticket(x.o, x.r, i)).join('')}</div>${hitam.length > 4 ? `<a class="btn ghost" style="margin-top:14px" href="#/explore/all">See all ${hitam.length} at HITAM</a>` : ''}`
    : `<section class="callout"><div><b>Today’s CDC list is not published yet.</b><p class="small muted">The Career Development Centre list is added here every day. Until then, check <a class="link" href="${CAMPUS_SOURCES.cdcApp}" target="_blank" rel="noopener noreferrer">CDC Explorer</a>.</p></div>${isAdmin() ? '<a class="btn acc" href="#/admin">Publish today’s list</a>' : ''}</section>`;
  return `
<header class="page-head">
  <div class="eyebrow">${esc(p.branch)} · Year ${y}</div>
  <h1 class="h1">${greeting()}${first ? `, <em>${esc(first)}.</em>` : '.'}</h1>
  <p class="lede">HITAM Opportunities Intelligence: campus drives, internships and hackathons for HITAM students, ranked for you.</p>
</header>
<section class="start-grid">
  ${startCard('#/explore/internships', 'search', 'Internships', `${interns.length} open for you`, 'HITAM posts, programmes and live roles')}
  ${startCard('#/explore/all', 'spark', 'Everything open at HITAM', `${hitam.length} from CDC for you`, 'Drives, internships, hackathons with fit %')}
  ${startCard('#/placements', 'target', 'HITAM placements', st ? `${st.offers} offers` : 'Records', st ? `${st.companies} companies hired from HITAM` : 'Who hires from HITAM')}
  ${startCard('#/resume', 'file', 'Fix my resume', resumeLine, 'Score, fixes, keyword match')}
</section>
<div class="cols" style="margin-top:34px">
  <div class="stack" style="--g:34px">
    <section>${sectionHead('At HITAM right now', hitam.length ? `${hitam.length} open for you · ${cdcFreshness() || 'campus board'}` : 'from CDC')}${atHitam}</section>
    ${programs.length ? `<section>${sectionHead('Hackathons and programmes closing soon', 'verified dates')}${programs.slice(0, 5).map(x => miniRow(x.o, x.r, `${x.o.type} · ${x.o.org}`)).join('')}<a class="btn ghost" style="margin-top:12px" href="#/explore/hackathons">See all hackathons</a></section>` : ''}
    <section>${sectionHead('Best internships for you', interns.length ? 'newest and best matched' : '')}
      ${interns.length ? `<div class="tkts">${interns.slice(0, 4).map((x, i) => ticket(x.o, x.r, i)).join('')}</div><a class="btn ghost" style="margin-top:14px" href="#/explore/internships">See all ${interns.length} internships</a>`
        : emptyBox('No internships open for you yet', 'New ones are added every 6 hours.', '<a class="btn" href="#/explore/internships">Open internships</a>')}</section>
  </div>
  <aside class="stack sticky" style="--g:18px">
    ${cdcHomeCard(p)}
    ${calendarCard(y, currentSemester())}
    ${S.resume ? '' : `<section class="panel ink"><div class="eyebrow"><b>Biggest upgrade</b></div><div class="h3" style="margin:6px 0">Upload your resume</div><p class="small muted">It fills your skills and ranks every opportunity for you. Read on your device only.</p><a class="btn sm acc" style="margin-top:12px" href="#/resume">Upload resume</a></section>`}
    <section class="panel"><div class="eyebrow">More tools</div><div class="chips" style="margin-top:10px"><a class="chip" href="#/roadmap">Skill roadmap</a><a class="chip" href="#/assistant">Ask the assistant</a><a class="chip" href="#/playbook">Where to apply</a><a class="chip" href="#/profile">My profile</a></div></section>
  </aside>
</div>`;
}

function viewRoadmap() {
  const demand = Object.entries(liveSkillDemand()).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const maxD = Math.max(1, ...demand.map(x => x[1]));
  return `
<header class="page-head"><div class="eyebrow">Skill roadmap</div><h1 class="h1">What to learn next, <em>to get more.</em></h1>
<p class="lede">Each skill is scored by how many more opportunities it would open for you. Mark a skill when you reach the level, and the whole app re-ranks.</p></header>
<div class="cols"><section class="panel">${sectionHead('Biggest lifts', 'for your profile')}<div id="roadmap">${roadmapHTML()}</div></section>
<aside class="stack" style="--g:18px"><section class="panel">${sectionHead('Skills live postings ask for', 'today')}${demand.length ? demand.map(([s, n]) => `<div class="hbar" style="--tc:var(--brand)"><span>${esc(s)}${(S.profile.skills[s] || 0) ? ' ✓' : ''}</span><div class="bar"><i style="width:${(n / maxD) * 100}%"></i></div><b class="mono">${n}</b></div>`).join('') : '<p class="muted small">Live postings are loading.</p>'}<p class="tiny muted" style="margin-top:8px">From live internship and job postings. A tick means you already rate it.</p></section>
<section class="panel"><a class="btn sm" href="#/resume">Upload resume to fill skills</a></section></aside></div>`;
}

/* ---------- Placements ---------- */
function placementBranchChips(stats) {
  const branches = Object.entries(stats.byBranch || {}).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  const cur = PL.branch || (branches.includes(S.profile.branch) ? S.profile.branch : 'All');
  PL.branch = cur;
  return `<div class="chips">${['All', ...branches].map(b => `<button class="chip ${b === cur ? 'on' : ''}" data-act="pl-branch" data-id="${b}">${b}${b !== 'All' ? `<span class="ct">${stats.byBranch[b]}</span>` : ''}</button>`).join('')}</div>`;
}

function calendarFullHTML(y, sem) {
  return `<div class="cal-years">${Object.entries(CAREER_CALENDAR).map(([k, c]) => `<details class="engine ${k === `${y}-${sem}` ? 'now' : ''}" ${k === `${y}-${sem}` ? 'open' : ''}><summary>${esc(c.label)}${k === `${y}-${sem}` ? ' <span class="pill acc">You are here</span>' : ''}</summary><div class="engine-b"><ul class="todo">${c.do.map(t => `<li>${esc(t)}</li>`).join('')}</ul><div class="chips">${c.train.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div></div></details>`).join('')}</div>`;
}

function viewPlacements() {
  const head = `<header class="page-head"><div class="eyebrow">Placements</div><h1 class="h1">Who hires from HITAM, <em>and for what.</em></h1>
  <p class="lede">Real placement records published by HITAM, grouped by company and branch. Use it to see where your branch gets hired.</p></header>`;
  if (!CAMPUS || !CAMPUS.placements.recruiters.length) return head + emptyBox('Placement records are not loaded', 'They refresh every morning. Try again shortly.');
  const { recruiters, stats } = CAMPUS.placements;
  const chips = placementBranchChips(stats);
  const b = PL.branch;
  const rows = recruiters.filter(r => b === 'All' || r.branches.includes(b));
  const offers = b === 'All' ? stats.offers : stats.byBranch[b] || 0;
  const max = Math.max(1, ...rows.map(r => r.offers));
  const updated = CAMPUS.sources.placementsUpdated ? String(CAMPUS.sources.placementsUpdated).slice(0, 10) : '';
  const bars = Object.entries(stats.byBranch).sort((a, c) => c[1] - a[1]);
  const maxB = Math.max(1, ...bars.map(x => x[1]));
  const y = Number(S.profile.year) || 1;
  return `${head}
<div class="hero-stats" style="margin-bottom:28px;grid-template-columns:repeat(4,1fr)"><div><b>${stats.offers}</b><span class="eyebrow">Offers recorded</span></div><div><b>${stats.companies}</b><span class="eyebrow">Companies</span></div><div><b>${stats.medianPkg ?? '—'}</b><span class="eyebrow">Median LPA</span></div><div><b class="acc">${stats.maxPkg ?? '—'}</b><span class="eyebrow">Highest LPA</span></div></div>
<div class="cols">
  <div class="stack" style="--g:30px">
    <section>${sectionHead('Companies that hired', `${rows.length} for ${b === 'All' ? 'all branches' : esc(b)} · ${offers} offers`)}<div style="margin-bottom:14px">${chips}</div>
      <div class="ledger">${rows.slice(0, 30).map(r => `<div class="lrow rec"><b>${esc(r.company)}</b><div class="bar-mini"><i style="width:${(r.offers / max) * 100}%"></i><span class="mono small">${r.offers}</span></div><span class="small muted">${esc(r.branches.join(' · '))}</span><span class="mono small" style="text-align:right">${r.maxPkg ? `up to ${r.maxPkg} LPA` : '—'}</span></div>`).join('')}</div>
      <p class="tiny muted" style="margin-top:8px">From HITAM’s placement list${updated ? `, updated ${esc(updated)}` : ''}. Packages shown where HITAM lists them. No student names or roll numbers are stored here.</p></section>
    <section>${sectionHead('Your 4-year Career Calendar', 'official, from CDC')}${calendarFullHTML(y, currentSemester())}<p class="tiny muted" style="margin-top:8px"><a class="link" href="${CAMPUS_SOURCES.calendar}" target="_blank" rel="noopener noreferrer">Read it on hitam.org</a></p></section>
  </div>
  <aside class="stack sticky" style="--g:18px">
    <section class="panel">${sectionHead('Offers by branch')}${bars.map(([k, n]) => `<div class="hbar" style="--tc:var(--brand)"><span>${esc(k)}</span><div class="bar"><i style="width:${(n / maxB) * 100}%"></i></div><b class="mono">${n}</b></div>`).join('')}</section>
    <section class="panel"><div class="eyebrow">Career Design Centre</div><p class="small" style="margin:8px 0">Drive registration and track selection run through CDC Explorer. Use it to register; use this app to decide and prepare.</p>
      <div class="row"><a class="btn sm" href="${CAMPUS_SOURCES.cdcApp}" target="_blank" rel="noopener noreferrer">Open CDC Explorer${icon('external')}</a><a class="btn sm ghost" href="${CAMPUS_SOURCES.cdc}" target="_blank" rel="noopener noreferrer">CDC team${icon('external')}</a></div></section>
    <section class="panel">${sectionHead('Official news', 'hitam.org')}${newsHTML()}</section>
  </aside>
</div>`;
}
