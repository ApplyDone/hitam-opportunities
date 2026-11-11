/* ============================================================
   views-explore.js — 02 Opportunity database, detail drawer,
   compare modal, "post an opportunity" form, command palette
   ============================================================ */
'use strict';

const WINDOWS = [[0, 'Any time'], [3, '3 days'], [7, '7 days'], [14, '14 days'], [30, '30 days']];
const SORTS = [['match', 'Best match'], ['deadline', 'Closing soonest'], ['fresh', 'Newest posted'], ['pay', 'Highest pay']];

function activeFilterChips() {
  const f = S.filters;
  const chips = [];
  f.types.forEach(t => chips.push(['types', t, t]));
  if (f.mode !== 'Any') chips.push(['mode', '', f.mode]);
  if (f.pay !== 'any') chips.push(['pay', '', f.pay === 'paid' ? 'Paid only' : 'Unpaid only']);
  if (f.window) chips.push(['window', '', `Closes in ${f.window} days`]);
  if (f.mine) chips.push(['mine', '', 'Open to me']);
  f.skills.forEach(s => chips.push(['skills', s, s]));
  if (f.showClosed) chips.push(['showClosed', '', 'Including closed']);
  if (f.source && f.source !== 'all') chips.push(['source', '', f.source === 'live' ? 'Live jobs only' : 'Campus only']);
  if (f.city && f.city !== 'any') chips.push(['city', '', f.city === 'hyderabad' ? 'Hyderabad' : 'Remote']);
  if (f.level && f.level !== 'any') chips.push(['level', '', { intern: 'Internships', fresher: 'Fresher', early: '0–2 years' }[f.level]]);
  return chips;
}

function filtersHTML() {
  const f = S.filters;
  const all = allOpps();
  return `
<div class="fgroup"><span class="lbl">Type</span><div class="chips">${TYPES.map(t => `<button class="chip type ${f.types.includes(t) ? 'on' : ''}" style="--tc:var(--t-${t.toLowerCase()})" data-act="f-type" data-id="${t}" aria-pressed="${f.types.includes(t)}">${t}<span class="ct">${all.filter(o => o.type === t && (f.showClosed || !isClosed(o))).length}</span></button>`).join('')}</div></div>
${LIVE.jobs.length ? `<div class="fgroup"><span class="lbl">Source</span><div class="chips">${[['all', 'All'], ['live', `Live jobs (${LIVE.jobs.length})`], ['campus', 'Campus']].map(([v, l]) => `<button class="chip ${f.source === v ? 'on' : ''}" data-act="f-source" data-id="${v}">${l}</button>`).join('')}</div></div>
<div class="fgroup"><span class="lbl">Location</span><div class="chips">${[['any', 'Anywhere'], ['hyderabad', 'Hyderabad'], ['remote', 'Remote']].map(([v, l]) => `<button class="chip ${f.city === v ? 'on' : ''}" data-act="f-city" data-id="${v}">${l}</button>`).join('')}</div></div>
<div class="fgroup"><span class="lbl">Experience</span><div class="chips">${[['any', 'Any'], ['intern', 'Internship'], ['fresher', 'Fresher'], ['early', '0–2 years']].map(([v, l]) => `<button class="chip ${f.level === v ? 'on' : ''}" data-act="f-level" data-id="${v}">${l}</button>`).join('')}</div></div>` : ''}
<div class="fgroup"><span class="lbl">Eligibility</span><label class="ck" style="padding:4px 0;border:0"><input type="checkbox" data-act="f-mine" ${f.mine ? 'checked' : ''}><span>Only listings open to me <span class="muted small">(${p_label()})</span></span></label></div>
<div class="fgroup"><span class="lbl">Closes within</span><div class="chips">${WINDOWS.map(([v, l]) => `<button class="chip ${f.window === v ? 'on' : ''}" data-act="f-window" data-id="${v}">${l}</button>`).join('')}</div></div>
<div class="fgroup"><span class="lbl">Mode</span><div class="chips">${MODES.map(m => `<button class="chip ${f.mode === m ? 'on' : ''}" data-act="f-mode" data-id="${m}">${m === 'Any' ? 'Any mode' : m}</button>`).join('')}</div></div>
<div class="fgroup"><span class="lbl">Pay</span><div class="chips">${[['any', 'Any'], ['paid', 'Paid'], ['unpaid', 'Unpaid']].map(([v, l]) => `<button class="chip ${f.pay === v ? 'on' : ''}" data-act="f-pay" data-id="${v}">${l}</button>`).join('')}</div></div>
<div class="fgroup"><label class="lbl" for="f-skill">Requires skill</label><select id="f-skill" data-act="f-skill"><option value="">Add a skill filter…</option>${SKILLS.filter(s => !f.skills.includes(s)).map(s => `<option>${s}</option>`).join('')}</select></div>
<div class="fgroup"><label class="ck" style="padding:4px 0;border:0"><input type="checkbox" data-act="f-closed" ${f.showClosed ? 'checked' : ''}><span>Show closed listings</span></label></div>
<button class="btn ghost sm" data-act="f-reset">Reset all filters</button>
<button class="btn ghost sm" data-act="post-form">${icon('plus')}Post an opportunity</button>`;
}
const p_label = () => `${S.profile.branch}, year ${S.profile.year}`;

function calendarHTML(rows, monthOffset, ivs = []) {
  const base = new Date();
  const first = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  const cells = [];
  const today = ymd(new Date());
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const key = ymd(d);
    const ev = rows.filter(x => { const d = deadlineOf(x.o); return d && ymd(d) === key; });
    const iv = ivs.filter(x => x.key === key);
    cells.push(`<div class="cal-d ${d.getMonth() !== first.getMonth() ? 'out' : ''} ${key === today ? 'today' : ''}"><span class="n">${d.getDate()}</span>${iv.map(x => `<button class="cal-ev iv" data-act="open" data-id="${x.o.id}" title="Interview: ${esc(x.o.title)}">Interview · ${esc(x.o.title)}</button>`).join('')}${ev.slice(0, 3).map(x => `<button class="cal-ev" data-type="${x.o.type}" data-act="open" data-id="${x.o.id}" title="${esc(x.o.title)}">${esc(x.o.title)}</button>`).join('')}${ev.length > 3 ? `<span class="tiny muted">+${ev.length - 3}</span>` : ''}</div>`);
  }
  return `<div class="cal-nav"><button class="icon-btn" data-act="cal-prev" aria-label="Previous month">${icon('chevL')}</button><h2 class="h2">${MONTH_LONG[first.getMonth()]} ${first.getFullYear()}</h2><button class="icon-btn" data-act="cal-next" aria-label="Next month">${icon('chevR')}</button><button class="btn sm ghost" data-act="cal-today">This month</button></div>
  <div class="cal"><div class="cal-h">${DAY_NAMES.map(d => `<div>${d}</div>`).join('')}</div><div class="cal-g">${cells.join('')}</div></div>`;
}

let calOffset = 0;
function resultsHTML() {
  const rows = filterOpps(allOpps(), S.filters, S.profile, S.weights);
  const mode = S.views.explore;
  const chips = activeFilterChips();
  const head = `<div class="row between" style="margin-bottom:16px"><div><b class="mono">${rows.length}</b> <span class="muted">listing${rows.length === 1 ? '' : 's'}</span></div>
    <div class="active-filters">${chips.map(([k, v, l]) => `<button class="x-chip" data-act="f-clear" data-key="${k}" data-val="${esc(v)}">${esc(l)}${icon('close')}</button>`).join('')}</div></div>`;
  if (!rows.length) return head + emptyBox('Nothing matches', 'Loosen a filter, or widen the deadline window.', '<button class="btn" data-act="f-reset">Reset filters</button>');
  if (mode === 'list') return head + `<div class="ledger"><div class="lrow head"><span></span><span>Listing</span><span>Mode · Duration</span><span>Pay</span><span style="text-align:right">Closes</span><span style="text-align:right">Match</span></div>${rows.map(x => ledgerRow(x.o, x.r)).join('')}</div>`;
  if (mode === 'calendar') return head + calendarHTML(rows, calOffset);
  return head + `<div class="tkts">${rows.map((x, i) => ticket(x.o, x.r, i)).join('')}</div>`;
}

function viewExplore() {
  const f = S.filters;
  const m = S.views.explore;
  return `
<header class="page-head">
  <div class="eyebrow">Opportunity database</div>
  <h1 class="h1">Everything open on campus, <em>in one place.</em></h1>
  <p class="lede">${allOpps().filter(o => !isClosed(o)).length} open listings across placements, internships, hackathons, workshops, research and clubs. Search, filter, compare and save.</p>
</header>
${liveStripHTML()}
<div class="explore">
  <aside class="filters" id="filters" aria-label="Filters">${filtersHTML()}</aside>
  <div>
    <div class="row between" style="margin-bottom:18px;gap:12px">
      <div class="bar-search grow" style="min-width:240px">${icon('search')}<input type="search" id="q" data-in-filter="q" placeholder="Search title, organisation, skill or tag" value="${esc(f.q)}" aria-label="Search listings"><span class="kbd">/</span></div>
      <button class="btn ghost filter-toggle" data-act="toggle-filters">${icon('filter')}Filters</button>
      <select data-act="f-sort" aria-label="Sort" style="width:auto">${SORTS.map(([v, l]) => `<option value="${v}" ${f.sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <div class="seg-ctl" role="group" aria-label="View">${[['grid', 'Tickets', 'grid'], ['list', 'Ledger', 'list'], ['calendar', 'Calendar', 'calendar']].map(([v, l, ic]) => `<button class="${m === v ? 'on' : ''}" data-act="ex-view" data-id="${v}" aria-pressed="${m === v}">${icon(ic)}${l}</button>`).join('')}</div>
    </div>
    <div id="results">${resultsHTML()}</div>
  </div>
</div>
${compareTray()}`;
}

function liveStripHTML() {
  if (!LIVE.meta) return '';
  const c = LIVE.meta.counts || {};
  const when = new Date(LIVE.meta.generatedAt);
  return `<section class="live-strip"><div><span class="pulse" aria-hidden="true"></span><b>${LIVE.jobs.length} live roles</b> from ${c.companies || '—'} company feeds · ${c.hyderabad || 0} in Hyderabad · ${c.internships || 0} internships · <b>${c.newToday || 0} new</b> on the last update</div>
  <div class="row" style="gap:8px"><span class="small muted">Updated ${Number.isNaN(when.getTime()) ? '—' : `${fmtShort(when)}, ${pad2(when.getHours())}:${pad2(when.getMinutes())}`}</span><button class="btn sm ghost" data-act="f-live-new">Show live jobs</button><button class="btn sm" data-act="digest">${icon('copy')}Copy today’s WhatsApp post</button></div></section>`;
}

function digestFromLive() {
  const latest = LIVE.jobs.reduce((m, j) => (j.firstSeen && j.firstSeen > m ? j.firstSeen : m), '');
  const fresh = LIVE.jobs.filter(j => j.firstSeen === latest);
  const pick = (fresh.length ? fresh : LIVE.jobs).slice(0, 15);
  return `HITAM Opportunities: ${fresh.length || pick.length} ${fresh.length ? 'new' : 'open'} roles (${latest || 'latest'})
Hyderabad + India-remote · internships and 0–2 years only

${pick.map(j => `• ${j.type === 'Internship' ? '[Intern] ' : ''}${j.title} — ${j.org}, ${j.city}
  ${j.applyUrl}`).join('\n')}

Match scores, resume review and deadlines: open HITAM Opportunities.`;
}

function refreshResults() { const r = $('#results'); if (r) r.innerHTML = resultsHTML(); const f = $('#filters'); if (f) { const wasOpen = f.classList.contains('open'); f.innerHTML = filtersHTML(); } refreshTray(); }
function compareTray() {
  if (!S.compare.length) return '<div id="tray"></div>';
  const names = S.compare.map(id => oppById(id)).filter(Boolean).map(o => esc(o.title));
  return `<div id="tray"><div class="tray"><span class="small"><b>${S.compare.length}</b> selected · ${names.join(' · ').slice(0, 90)}</span><button class="btn sm" data-act="cmp-open" ${S.compare.length < 2 ? 'disabled' : ''}>Compare${S.compare.length < 2 ? ' (pick 2+)' : ''}</button><button class="btn sm ghost" data-act="cmp-clear">Clear</button></div></div>`;
}
function refreshTray() { const t = $('#tray'); if (t) t.outerHTML = compareTray(); }

/* ---------- Compare modal ---------- */
function compareHTML() {
  const items = S.compare.map(id => oppById(id)).filter(Boolean).map(o => ({ o, r: scoreOpp(o, S.profile, S.weights) }));
  const best = (fn, hi = true) => { const vals = items.map(fn); const t = hi ? Math.max(...vals) : Math.min(...vals); return vals.map(v => v === t && vals.filter(x => x === t).length < vals.length); };
  const row = (label, fn, bestFlags) => `<tr><th>${label}</th>${items.map((x, i) => `<td class="${bestFlags && bestFlags[i] ? 'best' : ''}">${fn(x)}</td>`).join('')}</tr>`;
  const scoreB = best(x => x.r.score);
  const dlB = best(x => (x.r.dl < 0 ? 999 : x.r.dl), true);
  const payB = best(x => payMonthly(x.o));
  const hrsB = best(x => x.o.hrs || 0, false);
  return `<div class="modal-box"><div class="row between" style="margin-bottom:18px"><div><div class="eyebrow">Side by side</div><h2 class="h1" style="font-size:2.4rem">Compare <em>${items.length}</em> listings</h2></div><button class="icon-btn" data-act="modal-close" aria-label="Close" data-autofocus>${icon('close')}</button></div>
  <div style="overflow:auto"><table class="cmp-table"><thead><tr><th></th>${items.map(x => `<td>${esc(x.o.title)}</td>`).join('')}</tr></thead><tbody>
  ${row('Type', x => x.o.type)}${row('Organisation', x => esc(x.o.org))}
  ${row('Match', x => x.r.elig.ok ? `${x.r.score}%` : 'Not eligible', scoreB)}
  ${row('Closes', x => deadlineOf(x.o) ? `${fmtShort(deadlineOf(x.o))}<br><span class="muted small">${countdownLong(x.r.dl)}</span>` : `Open until filled<br><span class="muted small">${esc(freshLabel(postedDaysAgo(x.o)))}</span>`, dlB)}
  ${row('Pay', x => esc(payLabel(x.o.pay)), payB)}${row('Mode', x => x.o.mode)}${row('Duration', x => esc(x.o.dur))}
  ${row('Hours / week', x => x.o.hrs || '—', hrsB)}
  ${row('Eligibility', x => x.r.elig.ok ? '✓ Open to you' : esc(x.r.elig.fails.join('; ')))}
  ${row('Skills', x => x.o.skills.map(s => `<span class="tag ${x.r.have.includes(s) ? 'have' : ''}">${esc(s)}</span>`).join(' '))}
  ${row('', x => `<button class="btn sm" data-act="open" data-id="${x.o.id}">Details</button>`)}
  </tbody></table></div></div>`;
}

/* ---------- Detail drawer ---------- */
function drawerHTML(o) {
  const r = scoreOpp(o, S.profile, S.weights);
  const app = S.apps[o.id];
  const sim = similarTo(o, allOpps());
  const ck = CHECKLISTS[o.type] || [];
  const done = readiness(o, app);
  const req = o.skills.map(s => {
    const lv = S.profile.skills[s] || 0;
    const cls = lv >= o.lvl ? 'y' : lv > 0 ? 'w' : 'n';
    const sym = lv >= o.lvl ? '✓' : lv > 0 ? '~' : '×';
    return `<li><span class="ic ${cls}">${sym}</span><span><b>${esc(s)}</b> <span class="muted small">needs ${LEVELS[o.lvl].toLowerCase()} · you: ${LEVELS[lv].toLowerCase()}</span></span></li>`;
  }).join('');
  const el = r.elig.ok
    ? `<li><span class="ic y">✓</span><span>Open to ${p_label()}</span></li>${r.elig.notes.map(n => `<li><span class="ic w">!</span><span>${esc(n)}</span></li>`).join('')}`
    : r.elig.fails.map(n => `<li><span class="ic n">×</span><span>${esc(n)}</span></li>`).join('');
  return `<div class="scrim" data-act="drawer-close"></div>
<aside class="drawer" data-type="${o.type}" role="dialog" aria-modal="true" aria-label="${esc(o.title)}">
  <div class="drawer-h">
    <button class="icon-btn drawer-x" data-act="drawer-close" aria-label="Close details" data-autofocus>${icon('close')}</button>
    <div class="row"><span class="tcode">${TYPE_CODE[o.type]}</span><span class="ttype">${o.type}</span>${sourcePill(o)}${dueBadge(r, o)}</div>
    <h2>${esc(o.title)}</h2>
    <div class="muted">${esc(o.org)}</div>
  </div>
  <div class="drawer-b">
    <div class="facts">
      ${deadlineOf(o) ? `<div><span class="lbl">Closes</span><b>${fmtShort(deadlineOf(o))}</b></div>` : `<div><span class="lbl">Posted</span><b>${esc(freshLabel(postedDaysAgo(o)))}</b></div>`}${o.city ? `<div><span class="lbl">Location</span><b>${esc(o.city)}</b></div>` : ''}
      <div><span class="lbl">Pay</span><b>${esc(payLabel(o.pay))}</b></div>
      <div><span class="lbl">Mode</span><b>${o.mode}</b></div>
      <div><span class="lbl">Duration</span><b>${esc(o.dur)}</b></div>
      <div><span class="lbl">Effort</span><b>${o.hrs ? o.hrs + ' h / week' : 'Full-time'}</b></div>
      ${o.team ? `<div><span class="lbl">Team</span><b>${esc(o.team)}</b></div>` : ''}
    </div>
    <section><p>${esc(o.desc)}</p><div class="chips" style="margin-top:12px">${(o.tags || []).map(t => `<span class="pill">${esc(t)}</span>`).join('')}</div></section>
    <section><div class="sec-head"><h3 class="h3">Why ${r.elig.ok ? r.score + '%' : 'not a match'}</h3><span class="eyebrow">${bandLabel(r.score)}</span></div>
      <div class="break" style="--tc:${typeColorVar(o.type)}">${r.parts.map(p => `<div class="break-row"><span>${p.label}</span><div class="meter"><i style="width:${Math.round(p.v * 100)}%"></i></div><span class="mono small">${p.pts}/${p.max}</span></div><div class="break-note">${esc(p.note)}</div>`).join('')}</div></section>
    <section><div class="sec-head"><h3 class="h3">Skills required</h3><span class="eyebrow">bar: ${LEVELS[o.lvl].toLowerCase()}</span></div><ul class="checks">${req}</ul></section>
    <section><div class="sec-head"><h3 class="h3">Eligibility</h3></div><ul class="checks">${el}${o.minCgpa && r.elig.ok && !r.elig.notes.length ? `<li><span class="ic y">✓</span><span>CGPA at least ${o.minCgpa}</span></li>` : ''}</ul></section>
    <section><div class="sec-head"><h3 class="h3">How to apply</h3>${o.live ? `<span class="eyebrow">${esc(o.source && o.source.ats)} feed</span>` : ''}</div><p>${esc(o.how || HOW_TO[o.type])}</p>${o.live ? `<p class="small muted" style="margin-top:6px">Collected from ${esc(o.org)}’s official careers feed${LIVE.meta ? ` on ${esc(String(LIVE.meta.generatedAt).slice(0, 10))}` : ''}. Check it is still open on their site.</p><div class="row" style="margin-top:12px">${applyBtn(o, 'btn acc')}<a class="btn ghost" href="#/resume">Tailor my resume first</a></div>` : ''}</section>
    ${app ? `<section><div class="sec-head"><h3 class="h3">Your progress</h3><span class="eyebrow">${app.st}</span></div><div class="row"><div class="grow"><div class="meter"><i style="width:${done}%"></i></div></div><b class="mono">${done}% ready</b><a class="link" href="#/prepare/${o.id}">Continue</a></div></section>` : ''}
    ${sim.length ? `<section><div class="sec-head"><h3 class="h3">Similar listings</h3></div>${sim.map(s => miniRow(s, scoreOpp(s, S.profile, S.weights))).join('')}</section>` : ''}
  </div>
  <div class="drawer-f">
    ${applyBtn(o, 'btn acc')}
    ${app ? `<select data-act="set-status" data-id="${o.id}" aria-label="Status" style="width:auto">${COLUMNS.map(c => `<option ${c === app.st ? 'selected' : ''}>${c}</option>`).join('')}</select><button class="btn ghost sm" data-act="untrack" data-id="${o.id}">${icon('trash')}Remove</button>`
      : `<button class="btn acc" data-act="save" data-id="${o.id}">${icon('bookmark')}Save to tracker</button><button class="btn ghost" data-act="apply" data-id="${o.id}">Mark as applied</button>`}
    <a class="btn ghost" href="#/prepare/${o.id}">Prepare</a>
    <button class="btn ghost sm" data-act="ics-one" data-id="${o.id}">${icon('calendar')}Add to calendar</button>
    <button class="btn ghost sm" data-act="share" data-id="${o.id}">${icon('copy')}Copy summary</button>
    ${o.mine ? `<button class="btn ghost sm" data-act="delete-notice" data-id="${o.id}">${icon('trash')}Delete my post</button>` : ''}
    ${o.custom ? `<button class="btn ghost sm" data-act="delete-custom" data-id="${o.id}">${icon('trash')}Delete listing</button>` : ''}
  </div>
</aside>`;
}

/* ---------- Post an opportunity ---------- */
function postFormHTML() {
  const tomorrow = ymd(new Date(Date.now() + 7 * MS_DAY));
  return `<div class="modal-box sm"><div class="row between" style="margin-bottom:6px"><div><div class="eyebrow">Coordinator tools</div><h2 class="h1" style="font-size:2.2rem">Post an <em>opportunity</em></h2></div><button class="icon-btn" data-act="modal-close" aria-label="Close">${icon('close')}</button></div>
  <p class="small muted" style="margin-bottom:18px">Listings you post are stored in this browser and scored like any other.</p>
  <form id="post-form" class="stack" style="--g:14px">
    <div class="field"><label class="lbl" for="pf-title">Title</label><input id="pf-title" name="title" required maxlength="80" data-autofocus></div>
    <div class="form-grid">
      <div class="field"><label class="lbl" for="pf-org">Organisation</label><input id="pf-org" name="org" required maxlength="60"></div>
      <div class="field"><label class="lbl" for="pf-type">Type</label><select id="pf-type" name="type">${TYPES.map(t => `<option>${t}</option>`).join('')}</select></div>
      <div class="field"><label class="lbl" for="pf-dl">Deadline</label><input id="pf-dl" name="deadline" type="date" required value="${tomorrow}"></div>
      <div class="field"><label class="lbl" for="pf-mode">Mode</label><select id="pf-mode" name="mode">${MODES.slice(1).map(m => `<option>${m}</option>`).join('')}</select></div>
      <div class="field"><label class="lbl" for="pf-pay">Monthly stipend (₹, 0 for none)</label><input id="pf-pay" name="pay" type="number" min="0" step="500" value="0"></div>
      <div class="field"><label class="lbl" for="pf-lvl">Skill bar</label><select id="pf-lvl" name="lvl"><option value="1">Learning</option><option value="2">Comfortable</option><option value="3">Strong</option></select></div>
    </div>
    <div class="field"><label class="lbl" for="pf-skills">Skills required (hold Ctrl / Cmd for several)</label><select id="pf-skills" name="skills" multiple size="6">${SKILLS.map(s => `<option>${s}</option>`).join('')}</select></div>
    <div class="field"><label class="lbl" for="pf-desc">Short description</label><textarea id="pf-desc" name="desc" maxlength="400" style="min-height:80px"></textarea></div>
    <div class="row"><button class="btn acc" type="submit">Post listing</button><button class="btn ghost" type="button" data-act="modal-close">Cancel</button></div>
  </form></div>`;
}

function submitPostForm(form) {
  const fd = new FormData(form);
  const title = String(fd.get('title') || '').trim();
  const skills = fd.getAll('skills').filter(s => SKILLS.includes(s));
  const deadline = String(fd.get('deadline') || '');
  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) { toast('Add a title and a valid deadline'); return false; }
  if (!skills.length) { toast('Pick at least one skill'); return false; }
  const pay = Math.max(0, Number(fd.get('pay')) || 0);
  const type = TYPES.includes(fd.get('type')) ? fd.get('type') : 'Internship';
  const mode = MODES.slice(1).includes(fd.get('mode')) ? fd.get('mode') : 'On-campus';
  const o = {
    id: `c${Date.now()}`, custom: true, type, title: title.slice(0, 80), org: String(fd.get('org') || 'Campus').trim().slice(0, 60), deadline,
    skills, lvl: Number(fd.get('lvl')) || 1, years: [1, 2, 3, 4], br: 'ALL', mode, pay: pay > 0 ? ['stipend', pay] : ['none'],
    dur: 'To be announced', hrs: 10, track: S.profile.track ? [S.profile.track] : [], tags: ['Posted by you'], desc: String(fd.get('desc') || 'No description provided.').slice(0, 400)
  };
  commit({ custom: [...S.custom, o] });
  return o;
}

/* ---------- Command palette ---------- */
function paletteItems(q) {
  const nav = [
    ['Home', '#/home'], ['Internships', '#/explore/internships'], ['Campus drives', '#/explore/drives'], ['Hackathons', '#/explore/hackathons'], ['Clubs & events', '#/explore/events'], ['Company jobs (optional)', '#/explore/jobs'],
    ['Placements: who hires from HITAM', '#/placements'], ['Resume', '#/resume'], ['My applications', '#/track'], ['Profile', '#/profile'], ['Playbook', '#/playbook']
  ].map(([l, h]) => ({ grp: 'Go to', label: l, run: () => { location.hash = h; } }));
  const acts = [
    { grp: 'Actions', label: document.documentElement.dataset.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme', run: () => toggleTheme() },
    { grp: 'Actions', label: 'Export calendar (.ics)', run: () => exportICS() },
    { grp: 'Actions', label: 'Download backup (JSON)', run: () => exportBackup() },
    { grp: 'Actions', label: 'Add a notice (WhatsApp / email)', run: () => { location.hash = '#/explore/drives'; setTimeout(() => ACTIONS['op-notice'](), 250); } },
  ];
  const t = q.trim().toLowerCase();
  const opps = allOpps().filter(o => !t || [o.title, o.org, o.type, ...o.skills].join(' ').toLowerCase().includes(t))
    .sort((a, b) => daysLeft(a) - daysLeft(b)).slice(0, t ? 8 : 5)
    .map(o => ({ grp: 'Opportunities', label: o.title, key: `${o.type} · ${countdown(daysLeft(o))}`, run: () => openDrawerFor(o.id) }));
  const f = x => !t || x.label.toLowerCase().includes(t);
  return [...nav.filter(f), ...acts.filter(f), ...opps];
}
let palSel = 0;
function renderPalette() {
  const q = $('#pal-q') ? $('#pal-q').value : '';
  const items = paletteItems(q);
  palSel = Math.min(palSel, Math.max(0, items.length - 1));
  let lastGrp = '';
  const html = items.map((it, i) => {
    const g = it.grp !== lastGrp ? `<li class="grp">${it.grp}</li>` : '';
    lastGrp = it.grp;
    return `${g}<li><button class="${i === palSel ? 'sel' : ''}" data-pal="${i}">${esc(it.label)}${it.key ? `<span class="k">${esc(it.key)}</span>` : ''}</button></li>`;
  }).join('');
  $('#pal-list').innerHTML = html || '<li class="grp">No results</li>';
  const sel = $('#pal-list .sel');
  if (sel) sel.scrollIntoView({ block: 'nearest' });
  return items;
}
