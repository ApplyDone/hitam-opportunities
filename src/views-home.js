/* ============================================================
   views-home.js — Briefing (home) and 01 Student profile
   ============================================================ */
'use strict';

const rankNow = () => rankOpps(allOpps(), S.profile, S.weights);
const greeting = () => { const h = new Date().getHours(); return h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
const NUM_WORD = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

function breakRows(r, dark) {
  return r.parts.map(p => `<div class="break-row"><span>${p.label}</span><div class="meter"><i style="width:${Math.round(p.v * 100)}%"></i></div><span class="mono small">${p.pts}/${p.max}</span></div><div class="break-note">${esc(p.note)}</div>`).join('');
}

function upcomingInterviews(now = new Date()) {
  return Object.entries(S.apps)
    .filter(([, a]) => a.iv)
    .map(([id, a]) => ({ o: oppById(id), a, days: Math.round((startOfDay(new Date(a.iv + 'T00:00')) - startOfDay(now)) / MS_DAY) }))
    .filter(x => x.o && x.days >= 0)
    .sort((a, b) => a.days - b.days);
}

function weekStrip(rows) {
  const today = startOfDay(new Date());
  const ivs = upcomingInterviews();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() + i);
    const items = rows.filter(x => x.r.dl === i);
    const iv = ivs.filter(x => x.days === i);
    const cells = [
      ...iv.map(x => `<button class="week-item" style="--tc:var(--ink)" data-act="open" data-id="${x.o.id}">Interview · ${esc(x.o.title)}</button>`),
      ...items.slice(0, 3).map(x => `<button class="week-item" data-type="${x.o.type}" data-act="open" data-id="${x.o.id}">${esc(x.o.title)}</button>`)
    ].join('');
    return `<div class="week-day ${i === 0 ? 'today' : ''}"><div class="dn">${DAY_NAMES[d.getDay()]}${i === 0 ? ' · today' : ''}</div><div class="dd">${d.getDate()}</div>${cells}${items.length > 3 ? `<span class="tiny muted">+${items.length - 3} more</span>` : ''}</div>`;
  });
  return `<div class="week" role="list" aria-label="Deadlines this week">${days.join('')}</div>`;
}

function pipelineFunnel() {
  const counts = COLUMNS.map(c => [c, Object.values(S.apps).filter(a => a.st === c).length]);
  const max = Math.max(1, ...counts.map(x => x[1]));
  return `<div class="funnel">${counts.map(([c, n]) => `<div class="funnel-row"><span>${c}</span><div class="bar"><i style="width:${(n / max) * 100}%"></i></div><b class="mono">${n}</b></div>`).join('')}</div>`;
}

function viewBriefing() {
  const p = S.profile;
  const rk = rankNow();
  const open = rk.filter(x => !x.r.closed);
  const mine = open.filter(x => x.r.elig.ok);
  const closing = mine.filter(x => x.r.dl <= 7).sort((a, b) => a.r.dl - b.r.dl);
  const strong = mine.filter(x => x.r.score >= 70).length;
  const lead = mine[0];
  const ivs = upcomingInterviews().filter(x => x.days <= 7);
  const needs = closing.length + ivs.length;
  const strength = profileStrength(p);
  const gap = skillGaps(allOpps(), p, S.weights)[0];
  const name = p.name.trim();
  const now = new Date();

  const headline = needs
    ? `${greeting()}, <em>${esc(name || 'there')}.</em> ${NUM_WORD[Math.min(needs, 10)] || needs} ${needs === 1 ? 'thing needs' : 'things need'} you this week.`
    : `${greeting()}, <em>${esc(name || 'there')}.</em> A quiet week. Get ahead of it.`;

  const leadCard = lead ? `<article class="lead-card" data-type="${lead.o.type}">
    <div class="lead-l">
      <div class="eyebrow"><b>Lead match</b> · ${lead.o.type} · ${esc(countdownLong(lead.r.dl))}</div>
      <h3>${esc(lead.o.title)}</h3>
      <p>${esc(lead.o.org)} · ${lead.o.mode} · ${esc(payLabel(lead.o.pay))}</p>
      <p>${esc(lead.o.desc)}</p>
      <div class="tkt-skills">${skillTags(lead.o, lead.r, 6)}</div>
      <div class="row"><button class="btn acc" data-act="open" data-id="${lead.o.id}">Open details ${icon('arrow')}</button>
      <button class="btn ghost" data-act="save" data-id="${lead.o.id}">${icon('bookmark')}${S.apps[lead.o.id] ? 'Saved' : 'Save'}</button>
      <a class="btn ghost" href="#/prepare/${lead.o.id}">Prepare</a></div>
    </div>
    <div class="lead-r"><div class="big">${lead.r.score}<small>% match</small></div><div class="break">${breakRows(lead.r)}</div></div>
  </article>` : emptyBox('No eligible listings', 'Adjust your year, branch or CGPA in your profile.', '<a class="btn" href="#/profile">Edit profile</a>');

  const alsoRows = mine.slice(1, 5);
  const closingRail = closing.slice(0, 5).map(x => miniRow(x.o, x.r, `${x.r.score}% match · ${x.o.type}`)).join('') || '<p class="muted small">Nothing eligible closes in the next seven days.</p>';

  return `
<section class="hero">
  <div class="eyebrow"><b>The briefing</b> · ${DAY_NAMES[now.getDay()]} ${now.getDate()} ${MONTH_LONG[now.getMonth()]} ${now.getFullYear()}</div>
  <h1 class="display">${headline}</h1>
  <div class="hero-meta">
    <p class="lede">I ranked <b>${open.length}</b> open listings against your profile. ${strong ? `<b>${strong}</b> are strong matches` : 'None are strong matches yet'}${closing.length ? `, and <b>${closing.length}</b> you can apply to close within a week.` : '.'}</p>
    <div class="hero-stats">
      <div><b>${strong}</b><span class="eyebrow">Strong matches</span></div>
      <div><b class="acc">${closing.length}</b><span class="eyebrow">Closing ≤ 7 days</span></div>
      <div><b>${Object.keys(S.apps).length}</b><span class="eyebrow">Tracked</span></div>
      <div><b>${strength}<small style="font-size:.4em">%</small></b><span class="eyebrow">Profile strength</span></div>
    </div>
  </div>
</section>

<div class="cols">
  <div class="stack" style="--g:44px">
    <section>${sectionHead('Lead opportunity', 'ranked #1 for you')}${leadCard}</section>
    ${alsoRows.length ? `<section>${sectionHead('Also worth your time', `next ${alsoRows.length}`)}<div class="tkts">${alsoRows.map((x, i) => ticket(x.o, x.r, i)).join('')}</div></section>` : ''}
    <section>${sectionHead('The week ahead', 'deadlines you can act on')}${weekStrip(mine)}</section>
  </div>
  <aside class="stack sticky" style="--g:26px">
    ${!S.resume ? `<section class="panel ink"><div class="eyebrow"><b>Biggest upgrade</b></div><div class="h2" style="margin:10px 0 6px">Upload your resume</div><p class="small muted">It fills your skills, re-ranks every listing and tells you exactly what to fix. Read in your browser, never uploaded.</p><a class="btn sm acc" style="margin-top:12px" href="#/resume">Open Resume Studio</a></section>` : ''}
    ${LIVE.jobs.length ? `<section class="panel">${sectionHead('Live company jobs', `${LIVE.jobs.length} open`)}${rk.filter(x => x.o.live && x.r.elig.ok).slice(0, 4).map(x => miniRow(x.o, x.r, `${x.o.org} · ${x.o.city}`)).join('') || '<p class="muted small">None match your year yet. Internships open from year 2.</p>'}<button class="btn sm ghost" style="margin-top:12px" data-act="f-live-new">See all live jobs</button></section>` : ''}
    <section class="panel">${sectionHead('Closing soon', `${closing.length} this week`)}${closingRail}</section>
    ${gap ? `<section class="panel ink"><div class="eyebrow"><b>Next best skill</b></div><div class="h2" style="margin:10px 0 6px">${esc(gap.skill)} <em>to ${LEVELS[gap.target].toLowerCase()}</em></div><p class="small muted">Lifts ${gap.ids.length} listing${gap.ids.length > 1 ? 's' : ''} by ${gap.delta} points in total${gap.unlocks ? ` and moves ${gap.unlocks} into strong-match range` : ''}.</p><p class="small" style="margin:10px 0 14px">${esc(gap.learn)}.</p><a class="btn sm ghost" href="#/matches">See the full roadmap</a></section>` : ''}
    <section class="panel">${sectionHead('Your pipeline', `${Object.keys(S.apps).length} tracked`)}${Object.keys(S.apps).length ? pipelineFunnel() : '<p class="muted small">Save a listing and it lands here.</p>'}<a class="btn sm ghost" style="margin-top:14px" href="#/track">Open tracker</a></section>
    ${strength < 100 ? `<section class="panel"><div class="eyebrow">Sharper matches</div><ul class="todo" style="color:var(--ink-2)">${profileTodo(p).slice(0, 3).map(t => `<li>${t}</li>`).join('')}</ul><a class="btn sm ghost" style="margin-top:14px" href="#/profile">Complete profile</a></section>` : ''}
  </aside>
</div>`;
}

/* ---------- 01 Profile ---------- */
function idCardHTML() {
  const p = S.profile;
  const st = profileStrength(p);
  const todo = profileTodo(p);
  const track = TRACKS.find(t => t.id === p.track);
  return `<div class="idcard">
    <div class="eyebrow">Hyderabad Institute of Technology and Management</div>
    <div class="nm">${esc(p.name.trim() || 'Your name')}</div>
    <div class="mono small" style="opacity:.8">${p.branch} · YEAR ${p.year}${p.cgpa ? ` · CGPA ${esc(p.cgpa)}` : ''}</div>
    <div class="stripe"></div>
    <div class="row between" style="margin-bottom:8px"><span class="eyebrow">Profile strength</span><b class="mono">${st}%</b></div>
    <div class="meter"><i style="width:${st}%"></i></div>
    <div class="small" style="margin-top:14px;opacity:.85">${track ? `Track: <b>${track.label}</b>` : 'No track chosen'}<br>${Object.keys(p.skills).length} skills rated · ${p.interests.length} interests · ${p.hours} h/week</div>
    ${todo.length ? `<ul class="todo">${todo.slice(0, 4).map(t => `<li>${t}</li>`).join('')}</ul>` : '<p class="small" style="margin-top:12px">✓ Complete. Matching is at full strength.</p>'}
  </div>`;
}
function refreshIdCard() { const el = $('#idcard'); if (el) el.innerHTML = idCardHTML(); }

function skillGroupsHTML() {
  return `<div class="skill-groups">${SKILL_GROUPS.map(g => `<div class="skill-group"><h4>${g.name}</h4><div class="skill-tiles">${g.skills.map(s => {
    const lv = S.profile.skills[s] || 0;
    return `<div class="skill-tile ${lv ? 'has' : ''}"><span>${s}</span><span class="pips" role="group" aria-label="${s} level">${[1, 2, 3].map(n => `<button class="pip ${lv >= n ? 'on' : ''}" data-act="skill" data-skill="${esc(s)}" data-level="${n}" aria-label="${s}: ${LEVELS[n]}" aria-pressed="${lv >= n}" title="${LEVELS[n]}"></button>`).join('')}</span></div>`;
  }).join('')}</div></div>`).join('')}</div>`;
}

function viewProfile() {
  const p = S.profile;
  const typeCounts = TYPES.map(t => [t, allOpps().filter(o => o.type === t && !isClosed(o)).length]);
  return `
<header class="page-head">
  <div class="eyebrow">Student profile</div>
  <h1 class="h1">Tell us who you are, <em>once.</em></h1>
  <p class="lede">Every score, ranking and suggestion in this app is computed from what you enter here. Nothing leaves your browser.</p>
</header>

<section class="panel acct" style="margin-bottom:34px">${(() => { const r = AUTH.user && parseRoll(AUTH.user.email); return `<div class="row between"><div class="row" style="gap:14px">${avatarHTML('av lg')}<div><div class="h3">${esc(AUTH.user && AUTH.user.email ? AUTH.user.email : 'Local preview')}</div><p class="small muted">${r ? `Roll ${esc(r.roll)} \u00B7 admitted ${r.admitYear}${r.lateral ? ' (lateral entry)' : ''} \u00B7 graduating ${r.gradYear}. Branch and year are read from your roll number; change them below if needed.` : 'Fill in your details below.'}</p></div></div>
  <a class="btn ghost sm" href="#/resume">${icon('upload')}Fill from my resume</a></div>`; })()}
</section>

<div class="cols">
  <div class="stack" style="--g:40px">
    <section>${sectionHead('Basics')}
      <div class="form-grid">
        <div class="field"><label class="lbl" for="f-name">Full name</label><input id="f-name" type="text" data-in="name" value="${esc(p.name)}" autocomplete="name" placeholder="e.g. Ananya Rao"></div>
        <div class="field"><label class="lbl" for="f-branch">Branch</label><select id="f-branch" data-in="branch">${BRANCHES.map(b => `<option ${b === p.branch ? 'selected' : ''}>${b}</option>`).join('')}</select></div>
        <div class="field"><label class="lbl" for="f-year">Year of study</label><select id="f-year" data-in="year">${[1, 2, 3, 4].map(y => `<option value="${y}" ${y === Number(p.year) ? 'selected' : ''}>Year ${y}</option>`).join('')}</select></div>
        <div class="field"><label class="lbl" for="f-cgpa">CGPA (optional)</label><input id="f-cgpa" type="number" min="0" max="10" step="0.1" data-in="cgpa" value="${esc(p.cgpa)}" placeholder="e.g. 7.8" inputmode="decimal"></div>
        <div class="field"><label class="lbl" for="f-mode">Preferred mode</label><select id="f-mode" data-in="mode">${MODES.map(m => `<option ${m === p.mode ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
        <div class="field"><label class="lbl" for="f-hours">Hours per week you can give: <b id="hours-out">${p.hours}</b></label><input id="f-hours" type="range" min="2" max="40" step="1" data-in="hours" value="${p.hours}"></div>
      </div>
    </section>
    <section>${sectionHead('Career track', 'pick the closest')}
      <div class="track-cards">${TRACKS.map(t => `<button class="track-card ${p.track === t.id ? 'on' : ''}" data-act="track" data-id="${t.id}" aria-pressed="${p.track === t.id}"><b>${t.label}</b><span>${t.hint}</span></button>`).join('')}</div>
    </section>
    <section>${sectionHead('Interested in', 'choose any')}
      <div class="chips">${typeCounts.map(([t, n]) => `<button class="chip type ${p.interests.includes(t) ? 'on' : ''}" data-type="${t}" style="--tc:var(--t-${t.toLowerCase()})" data-act="interest" data-id="${t}" aria-pressed="${p.interests.includes(t)}">${t}<span class="ct">${n}</span></button>`).join('')}</div>
      <p class="small muted" style="margin-top:8px">${p.interests.length ? p.interests.map(t => TYPE_BLURB[t]).join(' · ') : 'Leave empty and every type counts equally.'}</p>
    </section>
    <section>${sectionHead('Skills', 'tap a dot to set your level')}
      <div class="legend" style="margin-bottom:16px"><span><i></i>1 Learning</span><span><i></i>2 Comfortable</span><span><i></i>3 Strong</span><span>Tap the same dot again to lower it.</span></div>
      <div id="skills">${skillGroupsHTML()}</div>
    </section>
    <section>${sectionHead('Goal and proof', 'used in your cover letters')}
      <div class="stack" style="--g:16px">
        <div class="field"><label class="lbl" for="f-goal">Career goal</label><input id="f-goal" type="text" data-in="goal" value="${esc(p.goal)}" placeholder="e.g. Land an internship at a product company"></div>
        <div class="field"><label class="lbl" for="f-project">One project you are proud of</label><input id="f-project" type="text" data-in="project" value="${esc(p.project)}" placeholder="e.g. a weather app in JavaScript"></div>
      </div>
    </section>
    <div class="row"><a class="btn acc" href="#/explore">Save and browse opportunities ${icon('arrow')}</a><a class="btn ghost" href="#/matches">Jump to my matches</a></div>
  </div>
  <aside class="stack sticky" style="--g:20px">
    <div id="idcard">${idCardHTML()}</div>
    <div class="panel"><div class="eyebrow">How matching reads this</div>
      <p class="small" style="margin-top:8px">Skill levels are compared with each listing’s bar. Year, branch and CGPA decide eligibility. Track, interests and mode adjust ranking. You can change the weights on the Matches page.</p></div>
  </aside>
</div>`;
}
