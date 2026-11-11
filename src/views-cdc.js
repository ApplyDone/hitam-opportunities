/* ============================================================
   views-cdc.js — Career Hub: HITAM's flagship
   projects, learning tracks and career portals, each scored for
   the signed-in student. Data is published daily by the admin.
   ============================================================ */
'use strict';

const CH_TABS = [['projects', 'Flagship projects'], ['tracks', 'Learning tracks'], ['portals', 'Career portals']];
const CH = { q: '', cat: '', mine: true, fitsOnly: false };
const chTab = id => CH_TABS.find(t => t[0] === id) || CH_TABS[0];
const fitBand = n => (n >= 70 ? 'strong' : n >= 50 ? 'good' : 'stretch');
const fitStub = (n, label = 'fit') => `<div class="cdc-fit band-${fitBand(n)}"><b>${n}<small>%</small></b><span>${label}</span></div>`;
const initials = name => String(name).replace(/\(.*?\)/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

function cdcEmpty(what) {
  return emptyBox(`${what} are not published yet`, 'New HITAM lists are added here every day. Check back soon.',
    isAdmin() ? '<a class="btn acc" href="#/admin">Publish today’s data</a>' : '');
}

function projectCard(pr, f) {
  return `<article class="cdc-card">
  <div class="cdc-card-main">
    <div class="row" style="gap:8px"><span class="mono small muted">${esc(pr.code)}</span>${pr.level ? `<span class="pill ${/hard|high|advanced/i.test(pr.level) ? 'gold' : ''}">${esc(pr.level)}</span>` : ''}</div>
    <h3 class="h3" style="margin:6px 0 6px">${esc(pr.title)}</h3>
    <p class="small muted clamp3">${esc(pr.abstract)}</p>
    <div class="tkt-skills" style="margin-top:10px">${(pr.stack || []).map(s => { const sk = stackSkills([s]); const has = sk.some(x => (S.profile.skills[x] || 0) >= 1); return `<span class="tag ${has ? 'have' : ''}">${esc(s)}</span>`; }).join('')}</div>
    <details class="cdc-more"><summary>Deliverables and how to start</summary>
      <p class="small">${esc(pr.deliverables || 'Ask your department for the full brief.')}</p>
      ${f.gaps.length ? `<p class="small muted">To get ready, learn: <b>${esc(f.gaps.join(', '))}</b>. Rate them in your profile as you go.</p>` : '<p class="small muted">You already rate every skill this stack needs.</p>'}
      <button class="btn sm" data-act="copy-text" data-text="${esc(`${pr.code} · ${pr.title}\n\n${pr.abstract}\n\nDeliverables: ${pr.deliverables}\n\nStack: ${(pr.stack || []).join(', ')}`)}">${icon('copy')}Copy project brief</button>
    </details>
  </div>
  ${fitStub(f.score)}
</article>`;
}

function projectsHTML() {
  if (!CDC.projects.length) return cdcEmpty('Flagship projects');
  const rows = CDC.projects.map(pr => ({ pr, f: projectFit({ ...pr, skills: Array.isArray(pr.skills) ? pr.skills : [] }, S.profile) }))
    .filter(x => !CH.q || `${x.pr.code} ${x.pr.title} ${(x.pr.stack || []).join(' ')} ${x.pr.abstract}`.toLowerCase().includes(CH.q.toLowerCase()))
    .filter(x => !CH.fitsOnly || x.f.score >= 60)
    .sort((a, b) => b.f.score - a.f.score);
  return `<p class="small muted" style="margin-bottom:14px"><b class="mono">${rows.length}</b> projects, best fit first. Fit compares the tech stack with the skills in your profile (from your resume) and the difficulty with your year.</p>
  ${rows.length ? `<div class="cdc-list">${rows.map(x => projectCard(x.pr, x.f)).join('')}</div>` : emptyBox('No projects match', 'Try another search.')}`;
}

function tracksHTML() {
  if (!CDC.tracks.length) return cdcEmpty('Learning tracks');
  const rows = CDC.tracks.map(t => ({ t, f: trackFit({ ...t, skills: Array.isArray(t.skills) ? t.skills : [], br: t.br === 'ALL' || Array.isArray(t.br) ? t.br : 'ALL' }, S.profile) }))
    .filter(x => !CH.q || `${x.t.name} ${x.t.focus}`.toLowerCase().includes(CH.q.toLowerCase()))
    .sort((a, b) => b.f.score - a.f.score);
  return `<p class="small muted" style="margin-bottom:14px">HITAM’s structured training paths. Fit weighs the branches each track is meant for and the skills it builds on.</p>
  <div class="cdc-list">${rows.map(({ t, f }) => `<article class="cdc-card">
    <div class="cdc-card-main">
      <div class="row" style="gap:8px">${f.forBranch ? '<span class="pill acc">For your branch</span>' : ''}${t.semesters ? `<span class="pill">${t.semesters} semester${t.semesters > 1 ? 's' : ''}</span>` : ''}</div>
      <h3 class="h3" style="margin:6px 0">${esc(t.name)}</h3>
      <p class="small muted">${esc(t.focus)}</p>
      <p class="tiny muted" style="margin-top:8px">Preferred for: ${esc(t.br === 'ALL' ? 'all branches' : t.br.join(', '))}</p>
    </div>${fitStub(f.score)}</article>`).join('')}</div>`;
}

function portalsHTML() {
  if (!CDC.portals.length) return cdcEmpty('Career portals');
  const mineOk = pt => !CH.mine || pt.br === 'ALL' || branchFits(pt.br, S.profile);
  const qOk = pt => !CH.q || `${pt.name} ${pt.cat} ${pt.focus}`.toLowerCase().includes(CH.q.toLowerCase());
  const base = CDC.portals.filter(pt => mineOk(pt) && qOk(pt));
  const cats = [...new Set(CDC.portals.map(pt => pt.cat))];
  const rows = base.filter(pt => !CH.cat || pt.cat === CH.cat);
  return `<div class="row" style="margin-bottom:12px;gap:14px"><label class="ck op-ck"><input type="checkbox" data-act="ch-mine" ${CH.mine ? 'checked' : ''}><span>For my branch (${esc(S.profile.branch)})</span></label><span class="small muted"><b class="mono">${rows.length}</b> of ${CDC.portals.length} portals</span></div>
  <div class="chips" style="margin-bottom:16px"><button class="chip ${!CH.cat ? 'on' : ''}" data-act="ch-cat" data-id="">All<span class="ct">${base.length}</span></button>${cats.map(c => { const n = base.filter(pt => pt.cat === c).length; return n ? `<button class="chip ${CH.cat === c ? 'on' : ''}" data-act="ch-cat" data-id="${esc(c)}">${esc(c.split(/,| & /)[0])}<span class="ct">${n}</span></button>` : ''; }).join('')}</div>
  <div class="portal-grid">${rows.map(pt => `<a class="portal" href="${esc(portalUrl(pt))}" target="_blank" rel="noopener noreferrer"><span class="portal-av">${esc(initials(pt.name))}</span><span class="portal-t"><b>${esc(pt.name)}</b><span class="tiny muted">${esc(pt.focus)}</span></span>${icon('external')}</a>`).join('')}</div>
  <p class="tiny muted" style="margin-top:10px">Each link searches for the company’s official careers page; always apply on the company’s own site.</p>`;
}

function viewCdc(arg) {
  const tab = chTab(arg);
  const t = CDC.times[tab[0]];
  const body = tab[0] === 'projects' ? projectsHTML() : tab[0] === 'tracks' ? tracksHTML() : portalsHTML();
  return `
<header class="page-head">
  <div class="eyebrow">Career Hub${t ? ` · updated ${agoText(t)}` : ''}</div>
  <h1 class="h1">Build what industry asks for, <em>${tab[0] === 'portals' ? 'apply where it counts.' : tab[0] === 'tracks' ? 'train on the right path.' : 'ranked for you.'}</em></h1>
  <p class="lede">HITAM’s real institutional projects, learning tracks and a directory of career portals, scored against your profile and resume.</p>
</header>
<nav class="tabs-nav" aria-label="Career Hub sections">${CH_TABS.map(([id, label]) => `<a class="${id === tab[0] ? 'on' : ''}" href="#/hub/${id}" ${id === tab[0] ? 'aria-current="page"' : ''}>${label}<span class="ct">${CDC[id].length}</span></a>`).join('')}</nav>
<div class="op-bar"><div class="bar-search grow">${icon('search')}<input type="search" data-in-ch="q" placeholder="Search ${esc(tab[1].toLowerCase())}" value="${esc(CH.q)}" aria-label="Search"></div>
${tab[0] === 'projects' ? `<label class="ck op-ck"><input type="checkbox" data-act="ch-fits" ${CH.fitsOnly ? 'checked' : ''}><span>60%+ fit only</span></label>` : ''}</div>
${!S.resume ? '<section class="callout" style="margin-bottom:18px"><div><b>Sharper fit scores</b><p class="small muted">Upload your resume and your skills are filled in automatically.</p></div><a class="btn acc" href="#/resume">Upload resume</a></section>' : ''}
<div id="ch-results">${body}</div>`;
}
function refreshCdcHub() { const r = $('#ch-results'); if (r) r.innerHTML = current.arg === 'tracks' ? tracksHTML() : current.arg === 'portals' ? portalsHTML() : projectsHTML(); }

/** Home sidebar: the best CDC project and track for this student. */
function cdcHomeCard(p) {
  if (!CDC.projects.length && !CDC.tracks.length) return '';
  const pr = CDC.projects.map(x => ({ x, f: projectFit({ ...x, skills: x.skills || [] }, p) })).sort((a, b) => b.f.score - a.f.score).slice(0, 3);
  const tr = CDC.tracks.map(x => ({ x, f: trackFit({ ...x, skills: x.skills || [], br: x.br || 'ALL' }, p) })).sort((a, b) => b.f.score - a.f.score)[0];
  return `<section class="panel"><div class="eyebrow"><b>Career Hub</b> · picked for you</div>
  ${pr.map(({ x, f }) => `<a class="mini-link" href="#/hub/projects"><span><b>${esc(x.title)}</b><span class="tiny muted">${esc(x.code)} · ${esc((x.stack || []).slice(0, 3).join(', '))}</span></span><span class="mono small">${f.score}%</span></a>`).join('')}
  ${tr ? `<a class="mini-link" href="#/hub/tracks"><span><b>${esc(tr.x.name)}</b><span class="tiny muted">Learning track${tr.x.semesters ? ` · ${tr.x.semesters} sem` : ''}</span></span><span class="mono small">${tr.f.score}%</span></a>` : ''}
  <a class="btn sm ghost" style="margin-top:10px" href="#/hub">Open Career Hub</a></section>`;
}
