/* ============================================================
   views-work.js — 05 Preparation & application, 06 Tracking
   ============================================================ */
'use strict';

/* ---------- 05 Prepare ---------- */
const PREP = { tab: 'letter', tone: 'professional', project: '', oppId: null, text: '' };
const TONES = [['professional', 'Professional'], ['concise', 'Concise'], ['warm', 'Warm']];
const PREP_TABS = [['letter', 'Cover letter'], ['interview', 'Interview prep'], ['resume', 'Resume bullets'], ['notes', 'Notes']];

function pickPrepOpp(arg) {
  const direct = arg && oppById(arg);
  if (direct) return direct;
  const keep = PREP.oppId && oppById(PREP.oppId);
  if (keep) return keep;
  const tracked = Object.keys(S.apps).map(oppById).filter(o => o && !isClosed(o))[0];
  if (tracked) return tracked;
  const top = rankNow().find(x => !x.r.closed && x.r.elig.ok);
  return top ? top.o : allOpps()[0];
}
function regenLetter(o) {
  PREP.text = coverLetter(o, S.profile, { tone: PREP.tone, project: PREP.project });
}

function prepSelectHTML(cur) {
  const tracked = Object.keys(S.apps).map(oppById).filter(Boolean);
  const topIds = rankNow().filter(x => !x.r.closed && x.r.elig.ok).slice(0, 8).map(x => x.o);
  const seen = new Set(tracked.map(o => String(o.id)));
  const top = topIds.filter(o => !seen.has(String(o.id)));
  top.forEach(o => seen.add(String(o.id)));
  const rest = allOpps().filter(o => !seen.has(String(o.id)) && !isClosed(o));
  const opt = o => `<option value="${o.id}" ${String(o.id) === String(cur.id) ? 'selected' : ''}>${esc(o.title)} — ${esc(o.org)}</option>`;
  return `<select id="prep-pick" data-act="prep-pick" aria-label="Choose a listing">${tracked.length ? `<optgroup label="Your tracker">${tracked.map(opt).join('')}</optgroup>` : ''}${top.length ? `<optgroup label="Your top matches">${top.map(opt).join('')}</optgroup>` : ''}<optgroup label="All open listings">${rest.map(opt).join('')}</optgroup></select>`;
}

function prepTabBody(o) {
  if (PREP.tab === 'letter') {
    return `<div class="row" style="margin-bottom:14px"><div class="chips" role="group" aria-label="Tone">${TONES.map(([v, l]) => `<button class="chip ${PREP.tone === v ? 'on' : ''}" data-act="tone" data-id="${v}" aria-pressed="${PREP.tone === v}">${l}</button>`).join('')}</div>
    <div class="grow" style="min-width:220px"><label class="sr" for="pp">Project to mention</label><input id="pp" type="text" data-in-letter="project" value="${esc(PREP.project)}" placeholder="${esc(S.profile.project || 'A project you want to mention')}"></div></div>
    <textarea id="letter-text" class="letter" data-in-letter="text" aria-label="Cover letter" spellcheck="true">${esc(PREP.text)}</textarea>
    <div class="row" style="margin-top:14px"><button class="btn acc" data-act="letter-copy">${icon('copy')}Copy letter</button><button class="btn ghost" data-act="letter-dl">${icon('download')}Download .txt</button><button class="btn ghost" data-act="letter-regen">Regenerate</button><span class="small muted">Edit freely. Regenerate resets to the template.</span></div>`;
  }
  if (PREP.tab === 'interview') {
    const type = (QBANK[o.type] || []).map(q => ({ q, tag: o.type }));
    const sk = o.skills.filter(s => SKILL_Q[s]).slice(0, 4).map(s => ({ q: SKILL_Q[s], tag: s }));
    return `<div class="panel" style="margin-bottom:18px"><div class="eyebrow">Answer framework</div><p style="margin-top:6px"><b>STAR</b>: Situation, Task, Action, Result. Keep each answer under two minutes and end on what you learned.</p></div>
    ${[...type, ...sk].map(x => `<div class="qcard"><span class="eyebrow">${esc(x.tag)}</span><span class="q">${esc(x.q)}</span></div>`).join('')}`;
  }
  if (PREP.tab === 'resume') {
    return `<p class="small muted" style="margin-bottom:14px">Templates only. Replace every [bracket] with a real fact from your own work, and never invent results.</p>${resumeBullets(o, S.profile).map(b => `<div class="bullet">${esc(b)}</div>`).join('')}
    <div class="panel flat" style="margin-top:18px"><div class="eyebrow">Checklist</div><ul class="todo" style="color:var(--ink-2)"><li>One page, projects before coursework</li><li>Mention ${esc(joinList(o.skills.slice(0, 3)))} where you honestly used them</li><li>GitHub and LinkedIn links tested</li></ul></div>`;
  }
  const app = S.apps[o.id];
  return `<label class="lbl" for="note-in">Private notes ${app ? '' : '(saves this listing to your tracker)'}</label><textarea id="note-in" data-in-note="${o.id}" style="min-height:260px;margin-top:8px" placeholder="Contacts, questions to ask, what you learned from the call…">${esc(app ? app.notes : '')}</textarea>`;
}

function prepRail(o) {
  const app = S.apps[o.id];
  const list = CHECKLISTS[o.type] || [];
  const pct = readiness(o, app);
  const done = (app && app.ck) || [];
  return `<div class="panel"><div class="row" style="gap:18px"><div class="ring" style="--p:${pct}"><span>${pct}</span></div><div><div class="eyebrow">Readiness</div><div class="h3" style="margin-top:4px">${pct === 100 ? 'Ready to submit' : `${list.length - done.filter(i => i < list.length).length} steps left`}</div><div class="small muted">${esc(countdownLong(daysLeft(o)))}</div></div></div></div>
  <div class="panel"><div class="eyebrow">Checklist for ${o.type.toLowerCase()}</div><div style="margin-top:6px">${list.map((c, i) => `<label class="ck ${done.includes(i) ? 'done' : ''}"><input type="checkbox" data-act="ck" data-id="${o.id}" data-i="${i}" ${done.includes(i) ? 'checked' : ''}><span>${esc(c)}</span></label>`).join('')}</div></div>
  <div class="panel">${app ? `<div class="eyebrow">Status</div><div class="row" style="margin-top:8px"><select data-act="set-status" data-id="${o.id}" aria-label="Status" style="width:auto">${COLUMNS.map(c => `<option ${c === app.st ? 'selected' : ''}>${c}</option>`).join('')}</select></div>`
    : `<div class="eyebrow">Not tracked yet</div><button class="btn acc" style="margin-top:10px" data-act="save" data-id="${o.id}">${icon('bookmark')}Save to tracker</button>`}</div>`;
}

function viewPrepare(arg) {
  const o = pickPrepOpp(arg);
  if (String(PREP.oppId) !== String(o.id)) { PREP.oppId = o.id; PREP.project = ''; regenLetter(o); }
  return `
<header class="page-head">
  <div class="eyebrow">Preparation &amp; application</div>
  <h1 class="h1">Walk in <em>prepared.</em></h1>
  <p class="lede">Pick a listing, work through its checklist, and draft a cover letter in your own details. Everything saves as you go.</p>
</header>
<div class="row" style="margin-bottom:26px;align-items:end"><div class="field grow" style="min-width:260px"><span class="lbl">Preparing for</span>${prepSelectHTML(o)}</div><button class="btn ghost" data-act="open" data-id="${o.id}">View listing details</button></div>
<div class="cols">
  <div data-type="${o.type}"><div class="sec-head" style="border-top-color:var(--tc)"><h2 class="h3" style="font-size:1.6rem">${esc(o.title)}</h2><span class="eyebrow" style="color:var(--tc)">${o.type} · ${esc(o.org)}</span></div>
    <div class="tabs" role="tablist">${PREP_TABS.map(([v, l]) => `<button role="tab" class="${PREP.tab === v ? 'on' : ''}" aria-selected="${PREP.tab === v}" data-act="prep-tab" data-id="${v}">${l}</button>`).join('')}</div>
    <div id="prep-body">${prepTabBody(o)}</div></div>
  <aside class="stack sticky" style="--g:18px" id="prep-rail" data-type="${o.type}">${prepRail(o)}</aside>
</div>`;
}
function refreshPrepRail() { const o = oppById(PREP.oppId); const r = $('#prep-rail'); if (o && r) r.innerHTML = prepRail(o); }

/* ---------- 06 Track ---------- */
let trackCal = 0;
const lastLogTime = (a, st) => { const hit = [...(a.log || [])].reverse().find(x => x.st === st); return hit ? hit.t : 0; };

function reminders() {
  const out = [];
  Object.entries(S.apps).forEach(([id, a]) => {
    const o = oppById(id);
    if (!o) return;
    const dl = daysLeft(o);
    if (a.st === 'Saved' && dl >= 0 && dl <= 5) out.push({ u: dl, when: countdown(dl), text: `Apply to <b>${esc(o.title)}</b>. ${esc(countdownLong(dl))}.`, id });
    if (a.st === 'Applied') {
      const age = Math.floor((Date.now() - (lastLogTime(a, 'Applied') || Date.now())) / MS_DAY);
      if (age >= 7) out.push({ u: 6, when: 'Follow up', text: `<b>${esc(o.title)}</b>: applied ${age} days ago with no update.`, id });
    }
    if (a.iv) {
      const d = Math.round((startOfDay(new Date(`${a.iv}T00:00`)) - startOfDay(new Date())) / MS_DAY);
      if (d >= 0 && d <= 7) out.push({ u: d - 0.5, when: d === 0 ? 'Today' : `D−${d}`, text: `Interview: <b>${esc(o.title)}</b>`, id });
    }
  });
  return out.sort((a, b) => a.u - b.u);
}

function kanbanCard(id, a, si) {
  const o = oppById(id);
  if (!o) return '';
  const r = scoreOpp(o, S.profile, S.weights);
  return `<div class="kc" draggable="true" data-id="${id}" data-type="${o.type}">
    <b data-act="open" data-id="${id}" role="button" tabindex="0">${esc(o.title)}</b>
    <span class="small muted">${esc(o.org)}</span>
    <div class="row" style="gap:6px">${dueBadge(r, o)}<span class="pill">${r.elig.ok ? r.score + '% match' : 'not eligible'}</span></div>
    <label class="sr" for="iv-${id}">Interview date</label><input id="iv-${id}" type="date" data-act="iv" data-id="${id}" value="${esc(a.iv || '')}" title="Interview date">
    <div class="kc-act"><button class="btn sm ghost" data-act="mv" data-id="${id}" data-dir="-1" ${si === 0 ? 'disabled' : ''} aria-label="Move back">‹</button><button class="btn sm ghost" data-act="mv" data-id="${id}" data-dir="1" ${si === COLUMNS.length - 1 ? 'disabled' : ''} aria-label="Move forward">›</button><button class="btn sm ghost" data-act="untrack" data-id="${id}" aria-label="Remove">${icon('trash')}</button></div></div>`;
}

function boardHTML() {
  const ids = Object.keys(S.apps);
  return `<div class="board">${COLUMNS.map((c, si) => {
    const cards = ids.filter(i => S.apps[i].st === c);
    return `<div class="col" data-col="${c}"><h4>${c}<span>${cards.length}</span></h4>${cards.map(i => kanbanCard(i, S.apps[i], si)).join('') || '<p class="tiny muted" style="padding:6px 4px">Drop a card here</p>'}</div>`;
  }).join('')}</div>`;
}

function trackListHTML() {
  const rows = Object.keys(S.apps).map(oppById).filter(Boolean).map(o => ({ o, r: scoreOpp(o, S.profile, S.weights) })).sort((a, b) => a.r.dl - b.r.dl);
  return `<div class="ledger"><div class="lrow head"><span></span><span>Listing</span><span>Status</span><span>Interview</span><span style="text-align:right">Closes</span><span style="text-align:right">Match</span></div>${rows.map(({ o, r }) => {
    const a = S.apps[o.id];
    return `<div class="lrow" data-type="${o.type}"><span class="tcode">${TYPE_CODE[o.type]}</span><div><button class="tt" data-act="open" data-id="${o.id}">${esc(o.title)}</button><div class="sub">${esc(o.org)}</div></div><div><select data-act="set-status" data-id="${o.id}" aria-label="Status for ${esc(o.title)}" style="position:relative;z-index:2;width:auto">${COLUMNS.map(c => `<option ${c === a.st ? 'selected' : ''}>${c}</option>`).join('')}</select></div><div class="small">${a.iv ? fmtShort(new Date(`${a.iv}T00:00`)) : '—'}</div>${dueBadge(r, o)}<div class="sc">${r.elig.ok ? r.score + '%' : '—'}</div></div>`;
  }).join('')}</div>`;
}

function trackCalendarHTML() {
  const rows = Object.keys(S.apps).map(oppById).filter(Boolean).map(o => ({ o, r: scoreOpp(o, S.profile, S.weights) }));
  const ivs = Object.entries(S.apps).filter(([, a]) => a.iv).map(([id, a]) => ({ o: oppById(id), key: a.iv })).filter(x => x.o);
  return calendarHTML(rows, trackCal, ivs);
}

function viewTrack() {
  const ids = Object.keys(S.apps);
  const m = S.views.track;
  const head = `
<header class="page-head">
  <div class="eyebrow">Tracking &amp; reminders</div>
  <h1 class="h1">Nothing slips <em>through.</em></h1>
  <p class="lede">Move each application through its stages. Reminders cover the next seven days, and the calendar export puts every deadline on your phone.</p>
</header>`;
  if (!ids.length) {
    return head + emptyBox('Nothing tracked yet', 'Save a listing from the database or your matches, and it appears here with reminders.', '<div class="row" style="justify-content:center"><a class="btn acc" href="#/matches">See my matches</a><a class="btn ghost" href="#/explore">Browse listings</a><label class="btn ghost">Restore backup<input type="file" accept="application/json" data-act="restore" hidden></label></div>');
  }
  const rem = reminders();
  const moved = ids.filter(i => S.apps[i].st !== 'Saved').length;
  const pct = Math.round((moved / ids.length) * 100);
  return head + `
<div class="row between" style="margin-bottom:22px">
  <div class="seg-ctl" role="group" aria-label="View">${[['board', 'Board', 'board'], ['list', 'List', 'list'], ['calendar', 'Calendar', 'calendar']].map(([v, l, ic]) => `<button class="${m === v ? 'on' : ''}" data-act="tr-view" data-id="${v}" aria-pressed="${m === v}">${icon(ic)}${l}</button>`).join('')}</div>
  <div class="row" style="gap:8px"><button class="btn sm ghost" data-act="export-ics">${icon('calendar')}Export calendar</button><button class="btn sm ghost" data-act="backup">${icon('download')}Backup</button><label class="btn sm ghost" style="cursor:pointer">${icon('upload')}Restore<input type="file" accept="application/json" data-act="restore" hidden></label></div>
</div>
<div id="tr-main">${m === 'board' ? boardHTML() : m === 'list' ? trackListHTML() : trackCalendarHTML()}</div>
<div class="cols eq" style="margin-top:40px">
  <section class="panel">${sectionHead('Needs attention', `${rem.length} item${rem.length === 1 ? '' : 's'}`)}${rem.length ? `<ul class="alerts">${rem.map(r => `<li><span class="when">${r.when}</span><span>${r.text}</span></li>`).join('')}</ul>` : '<p class="muted small">All clear. No deadlines or interviews in the next seven days.</p>'}</section>
  <section class="panel">${sectionHead('Progress')}<div class="row" style="gap:22px"><div class="ring" style="--p:${pct};--sz:110px"><span>${pct}</span></div><div><div class="h3">${moved} of ${ids.length} moved past saved</div><p class="small muted" style="margin-top:4px">${S.apps && Object.values(S.apps).some(a => a.st === 'Offer') ? 'You have an offer on the board. Congratulations.' : 'Applications only count once you submit them.'}</p></div></div><div style="margin-top:20px">${pipelineFunnel()}</div></section>
</div>`;
}

/* ---------- Exports ---------- */
function calendarItems() {
  const items = [];
  Object.entries(S.apps).forEach(([id, a]) => {
    const o = oppById(id);
    if (!o) return;
    if (['Saved', 'Applied'].includes(a.st) && !isClosed(o) && deadlineOf(o)) items.push({ uid: `dl-${id}`, date: startOfDay(deadlineOf(o)), title: `Deadline: ${o.title}`, desc: `${o.org} · ${o.type} · ${a.st}` });
    if (a.iv) items.push({ uid: `iv-${id}`, date: new Date(`${a.iv}T00:00`), title: `Interview: ${o.title}`, desc: o.org });
  });
  return items;
}
function exportICS() {
  const items = calendarItems();
  if (!items.length) { toast('Nothing to export yet. Save a listing first.'); return; }
  download('hitam-opportunities.ics', buildICS(items), 'text/calendar');
  toast(`Exported ${items.length} calendar event${items.length > 1 ? 's' : ''}`);
}
function exportBackup() {
  download(`hitam-opportunities-backup-${ymd(new Date())}.json`, JSON.stringify(S, null, 2), 'application/json');
  toast('Backup downloaded');
}
