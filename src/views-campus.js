/* ============================================================
   views-campus.js — Campus hub: what is happening at HITAM.
   Official hitam.org data (news, placement records) + campus
   listings + paste-a-notice. Company job feeds are secondary.
   ============================================================ */
'use strict';

let CAMPUS = null;
const NOTICE = { text: '', parsed: null };

function setCampusData(d) {
  if (!d || !d.placements || !Array.isArray(d.news)) return false;
  CAMPUS = d;
  return true;
}
const campusListings = () => allOpps().filter(o => !o.live);

function noticeBoxHTML() {
  const p = NOTICE.parsed;
  const conf = p ? Math.round(p.confidence * 100) : 0;
  return `<section class="panel notice-box"><div class="row between"><div><div class="eyebrow"><b>Got a notice on WhatsApp or email?</b></div><div class="h2" style="margin:6px 0 4px">Paste it. It becomes a listing.</div>
    <p class="small muted">Company, role, deadline, branches, batch, CGPA cut-off and the apply link are read automatically. You check them, then add it to the board.</p></div></div>
    <textarea id="notice-in" data-in-notice="1" placeholder="Paste the drive / hackathon / workshop message here" aria-label="Notice text">${esc(NOTICE.text)}</textarea>
    <div class="row"><button class="btn acc" data-act="notice-read">${icon('spark')}Read notice</button>${p ? `<span class="small muted">Found ${conf}% of key details</span>` : ''}</div>
    ${p ? `<form id="notice-form" class="notice-preview">
      <div class="form-grid">
        <div class="field"><label class="lbl" for="nf-title">Title / role</label><input id="nf-title" name="title" value="${esc(p.title)}" required maxlength="90"></div>
        <div class="field"><label class="lbl" for="nf-org">Company / organiser</label><input id="nf-org" name="org" value="${esc(p.org)}" required maxlength="60"></div>
        <div class="field"><label class="lbl" for="nf-type">Type</label><select id="nf-type" name="type">${TYPES.filter(t => t !== 'Job').map(t => `<option ${t === p.type ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        <div class="field"><label class="lbl" for="nf-dl">Deadline</label><input id="nf-dl" name="deadline" type="date" value="${esc(p.deadline)}" required></div>
        <div class="field"><label class="lbl" for="nf-cg">Min CGPA</label><input id="nf-cg" name="minCgpa" type="number" step="0.1" min="0" max="10" value="${p.minCgpa ?? ''}"></div>
        <div class="field"><label class="lbl" for="nf-url">Apply link</label><input id="nf-url" name="applyUrl" type="url" value="${esc(p.applyUrl)}" placeholder="https://"></div>
      </div>
      <p class="small" style="margin:10px 0">Branches: <b>${p.br === 'ALL' ? 'All' : esc(p.br.join(', '))}</b> · Years: <b>${esc(p.years.join(', '))}</b> · Pay: <b>${esc(payLabel(p.pay))}</b> · Skills: <b>${esc(p.skills.join(', '))}</b></p>
      <div class="row"><button class="btn" type="submit">${icon('plus')}Add to campus board</button><button class="btn ghost" type="button" data-act="notice-clear">Clear</button></div>
    </form>` : ''}</section>`;
}

function newsHTML() {
  if (!CAMPUS || !CAMPUS.news.length) return '<p class="muted small">Official posts are not loaded. Run the campus collector.</p>';
  return `<div class="news">${CAMPUS.news.slice(0, 8).map(n => `<a class="news-item" href="${esc(n.link)}" target="_blank" rel="noopener noreferrer"><span class="mono small muted">${esc(n.date)}</span><b>${esc(n.title)}</b><span class="chips">${n.kinds.map(k => `<span class="tag">${esc(k)}</span>`).join('')}</span></a>`).join('')}</div>
  <p class="tiny muted" style="margin-top:8px">From hitam.org. HITAM posts few event updates publicly. Live drive notices reach students through CDC, so paste them above.</p>`;
}

function recruitersHTML() {
  if (!CAMPUS || !CAMPUS.placements.recruiters.length) return '<p class="muted small">Placement records are not loaded.</p>';
  const s = CAMPUS.placements.stats;
  const branch = S.profile.branch;
  const mine = CAMPUS.placements.recruiters.filter(r => r.branches.includes(branch));
  const rows = CAMPUS.placements.recruiters.slice(0, 15);
  const max = Math.max(...rows.map(r => r.offers));
  const updated = CAMPUS.sources.placementsUpdated ? String(CAMPUS.sources.placementsUpdated).slice(0, 10) : '';
  return `<div class="hero-stats" style="border:0;padding:0;grid-template-columns:repeat(4,1fr);margin-bottom:22px">
      <div><b>${s.offers}</b><span class="eyebrow">Offers recorded</span></div><div><b>${s.companies}</b><span class="eyebrow">Companies</span></div>
      <div><b>${s.medianPkg ?? '—'}</b><span class="eyebrow">Median LPA</span></div><div><b class="acc">${s.maxPkg ?? '—'}</b><span class="eyebrow">Highest LPA</span></div></div>
    <p class="small" style="margin-bottom:12px">${mine.length} of these companies hired from <b>${esc(branch)}</b>${s.byBranch && s.byBranch[branch] ? `, ${s.byBranch[branch]} offers in total` : ''}.</p>
    <div class="ledger">${rows.map(r => `<div class="lrow rec" style="grid-template-columns:minmax(0,2fr) 1fr 1.4fr 80px"><b>${esc(r.company)}</b><div class="bar-mini"><i style="width:${(r.offers / max) * 100}%"></i><span class="mono small">${r.offers}</span></div><span class="small ${r.branches.includes(branch) ? '' : 'muted'}">${esc(r.branches.join(' · '))}</span><span class="mono small" style="text-align:right">${r.maxPkg ? `up to ${r.maxPkg}` : '—'}</span></div>`).join('')}</div>
    <p class="tiny muted" style="margin-top:8px">Totals computed from the official placement list on hitam.org${updated ? ` (updated ${esc(updated)})` : ''}. No student names or roll numbers are stored.</p>`;
}

function viewCampus() {
  const rows = rankOpps(campusListings(), S.profile, S.weights).filter(x => !x.r.closed).sort((a, b) => cmpNum(a.r.dl, b.r.dl));
  const notices = rows.filter(x => x.o.notice);
  return `
<header class="page-head">
  <div class="eyebrow"><b>Campus</b> · Hyderabad Institute of Technology and Management</div>
  <h1 class="h1">What’s happening <em>at HITAM.</em></h1>
  <p class="lede">Campus drives, hackathons, workshops and club calls first. Official news and real placement records from hitam.org. Company job boards come second.</p>
</header>
${noticeBoxHTML()}
<div class="cols" style="margin-top:40px">
  <div class="stack" style="--g:44px">
    <section>${sectionHead('Campus board', `${rows.length} open · ${notices.length} from notices`)}
      ${rows.length ? `<div class="tkts">${rows.slice(0, 12).map((x, i) => ticket(x.o, x.r, i)).join('')}</div>` : emptyBox('Nothing on the board yet', 'Paste a notice above to add the first one.')}
      <p class="tiny muted" style="margin-top:10px">${AUTH.state === 'signedin' ? 'Notices you post are shared with every signed-in HITAM student. Only you can delete yours.' : 'In local preview, notices stay on this device and example listings are shown.'}</p></section>
    <section>${sectionHead('Who recruits from HITAM', 'official placement records')}${recruitersHTML()}</section>
  </div>
  <aside class="stack sticky" style="--g:20px">
    <section class="panel">${sectionHead('Official from hitam.org', 'news & events')}${newsHTML()}</section>
    <section class="panel"><div class="eyebrow">Career Design Centre</div>
      <p class="small" style="margin:8px 0">Drive registrations, track selection and project windows run through CDC Explorer. Use it for official sign-ups; use this app to decide, prepare and track.</p>
      <div class="row"><a class="btn sm" href="https://cdc.hitam.org/" target="_blank" rel="noopener noreferrer">Open CDC Explorer${icon('external')}</a><a class="btn sm ghost" href="https://hitam.org/career-design-centre/" target="_blank" rel="noopener noreferrer">CDC page${icon('external')}</a></div></section>
  </aside>
</div>`;
}

function addNoticeListing(form) {
  const fd = new FormData(form);
  const p = NOTICE.parsed;
  const deadline = String(fd.get('deadline') || '');
  const title = String(fd.get('title') || '').trim();
  const org = String(fd.get('org') || '').trim();
  const url = String(fd.get('applyUrl') || '').trim();
  if (!title || !org || !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) { toast('Add a title, organiser and a valid deadline'); return null; }
  if (url && !isHttpUrl(url)) { toast('The apply link must start with http:// or https://'); return null; }
  const cg = parseFloat(fd.get('minCgpa'));
  const type = TYPES.includes(fd.get('type')) && fd.get('type') !== 'Job' ? fd.get('type') : p.type;
  const o = {
    id: `n${Date.now()}`, custom: true, notice: true, type, title: title.slice(0, 90), org: org.slice(0, 60), deadline,
    skills: p.skills.filter(s => SKILLS.includes(s)).length ? p.skills.filter(s => SKILLS.includes(s)) : ['Problem Solving'],
    lvl: 1, years: p.years, br: p.br, mode: p.mode, pay: p.pay, minCgpa: Number.isFinite(cg) ? cg : undefined,
    dur: type === 'Placement' ? 'Full-time' : 'See notice', hrs: 0, track: S.profile.track ? [S.profile.track] : ['sw'],
    tags: ['From a campus notice'], desc: NOTICE.text.slice(0, 1200), applyUrl: url || undefined, city: 'HITAM'
  };
  NOTICE.text = ''; NOTICE.parsed = null;
  if (AUTH.state === 'signedin') {
    publishNotice(o).then(() => toast('Posted to the campus board for all HITAM students')).catch(() => { commit({ custom: [...S.custom, o] }); toast('Could not share right now. Saved on this device.'); });
    return o;
  }
  commit({ custom: [...S.custom, o] });
  return o;
}
