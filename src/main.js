/* ============================================================
   main.js — shell, hash router, event delegation, boot
   ============================================================ */
'use strict';

const VIEWS = { assistant: viewAssistant, roadmap: viewRoadmap, home: viewHome, explore: viewOpps, placements: viewPlacements, resume: viewResume, track: viewTrack, profile: viewProfile, prepare: viewPrepare, playbook: viewPlaybook, cdc: viewCdc, admin: viewAdmin };
const TITLES = { assistant: 'Assistant', roadmap: 'Skill roadmap', home: 'Home', explore: 'Opportunities', placements: 'Placements', resume: 'Resume', track: 'Applications', profile: 'Profile', prepare: 'Prepare', playbook: 'Playbook', cdc: 'CDC Hub', admin: 'Admin' };
const NAV_ITEMS = [['home', 'Home', 'home'], ['explore', 'Opportunities', 'search'], ['cdc', 'CDC Hub', 'grid'], ['placements', 'Placements', 'target'], ['resume', 'Resume', 'file'], ['track', 'Applications', 'board']];
const MORE_ITEMS = [['roadmap', 'Skill roadmap', 'map'], ['assistant', 'Assistant', 'send'], ['playbook', 'Where to apply', 'external']];
const navGroups = () => [['', NAV_ITEMS], ['More', MORE_ITEMS], ...(isAdmin() || AUTH.state === 'preview' ? [['Admin', [['admin', 'Daily CDC update', 'upload']]]] : [])];
const TABBAR = NAV_ITEMS.filter(([k]) => k !== 'placements');
const STAGE_NAV = [];

let current = { name: '', arg: '' };
let drawerId = null;
let palItems = [];
const appReady = () => AUTH.state === 'signedin' || AUTH.state === 'preview';

/* ---------- Routing ---------- */
function parseRoute() {
  const h = location.hash.replace(/^#\/?/, '');
  const [pathPart, qs = ''] = h.split('?');
  const seg = pathPart.split('/').filter(Boolean);
  return { name: VIEWS[seg[0]] ? seg[0] : 'home', arg: seg[1] || '', q: new URLSearchParams(qs) };
}
const basePath = r => `#/${r.name}${r.arg ? '/' + r.arg : ''}`;

function route() {
  if (!appReady()) return;
  const r = parseRoute();
  if (r.name !== current.name || r.arg !== current.arg) renderView(r);
  syncDrawer(r);
  handleRouteParams(r);
}

function renderView(r) {
  ANIM = true;
  current = { name: r.name, arg: r.arg };
  const v = $('#view');
  v.className = 'enter';
  v.innerHTML = VIEWS[r.name](r.arg);
  document.title = `${TITLES[r.name]} · HITAM Opportunities Intelligence`;
  window.scrollTo(0, 0);
  renderNav();
  if (r.name === 'assistant') { const c = $('#chat'); if (c) c.scrollTop = c.scrollHeight; }
  setTimeout(() => { ANIM = false; }, 900);
}

function rerender() {
  if (!appReady() || !current.name) return;
  ANIM = false;
  const v = $('#view');
  const y = window.scrollY;
  v.className = '';
  v.innerHTML = VIEWS[current.name](current.arg);
  renderNav();
  window.scrollTo(0, y);
  if (current.name === 'assistant') { const c = $('#chat'); if (c) c.scrollTop = c.scrollHeight; }
}

function handleRouteParams(r) {
  if (r.q.get('export')) { exportICS(); history.replaceState(null, '', basePath(r)); }
  if (r.q.get('cmp')) {
    const ids = r.q.get('cmp').split(',').filter(id => oppById(id)).slice(0, 3);
    commit({ compare: ids });
    history.replaceState(null, '', basePath(r));
    if (current.name !== 'explore') { location.hash = '#/explore'; return; }
    refreshTray();
    if (ids.length > 1) openModal(compareHTML());
  }
}
const pagerHTML = () => '';

/* ---------- Shell ---------- */
function shellHTML() {
  return `
<div class="app">
  <aside class="side" aria-label="Main navigation">
    <a class="brand" href="#/home" aria-label="HITAM Opportunities, campus">${BRAND_MARK}<span class="brand-t"><b>HITAM</b><span>Opportunities Intelligence</span></span></a>
    <nav class="nav" id="nav"></nav>
    <div class="me" id="me"></div>
  </aside>
  <div class="main">
    <header class="top" id="top"></header>
    <main id="view" tabindex="-1"></main>
  </div>
  <nav class="tabbar" id="tabbar" aria-label="Main navigation"></nav>
</div>
<div id="gate"></div>
<div id="drawer"></div><div id="modal"></div><div id="palette"></div><div class="toasts" id="toasts" aria-live="polite"></div>`;
}

function navBadge(key) {
  if (key === 'track') { const n = Object.keys(S.apps).length; return n ? `<span class="badge">${n}</span>` : ''; }
  if (key === 'resume' && !S.resume) return '<span class="dot" title="Upload your resume"></span>';
  return '';
}

function renderNav() {
  const n = current.name;
  $('#nav').innerHTML = navGroups().map(([label, items]) => `<div class="nav-g">${label ? `<div class="nav-l">${label}</div>` : ''}${items.map(([k, l, ic]) => `<a class="nav-i ${n === k ? 'on' : ''}" href="#/${k}" ${n === k ? 'aria-current="page"' : ''}>${icon(ic)}<span>${l}</span>${navBadge(k)}</a>`).join('')}</div>`).join('');
  $('#tabbar').innerHTML = TABBAR.map(([k, l, ic]) => `<a class="tab ${n === k ? 'on' : ''}" href="#/${k}" ${n === k ? 'aria-current="page"' : ''}>${icon(ic)}<span>${l}</span></a>`).join('');
  renderTools();
}

function userLine() {
  const r = AUTH.user && parseRoll(AUTH.user.email);
  if (AUTH.state === 'preview') return 'Local preview';
  if (r) return `${r.roll} · ${r.branch || S.profile.branch}${r.year ? ` · Year ${r.year}` : ''}`;
  return AUTH.user ? AUTH.user.email : '';
}
function avatarHTML(cls = 'av') {
  const u = AUTH.user;
  return u && u.photo ? `<img class="${cls}" src="${esc(u.photo)}" alt="" referrerpolicy="no-referrer">` : `<span class="${cls}">${esc(initial(S.profile))}</span>`;
}

function renderTools() {
  const name = S.profile.name.trim() || (AUTH.user && AUTH.user.name) || 'Student';
  $('#me').innerHTML = `<a class="me-card" href="#/profile">${avatarHTML()}<span><b>${esc(name)}</b><small>${esc(userLine())}</small></span></a>
    <button class="icon-btn" data-act="sign-out" aria-label="Sign out" title="Sign out">${icon('logout')}</button>`;
  $('#top').innerHTML = `<div class="crumb"><span>${esc(TITLES[current.name] || '')}</span></div>
    <button class="search" data-act="palette" aria-label="Search everything">${icon('search')}<span>Search roles, companies, pages</span><kbd>Ctrl K</kbd></button>
    <a class="top-av" href="#/profile" aria-label="Your profile">${avatarHTML()}</a>`;
}

const buildTicker = () => { if (appReady()) renderNav(); };

/* ---------- Theme (light only) ---------- */
function applyTheme() { document.documentElement.dataset.theme = 'light'; }
function toggleTheme() { applyTheme(); }

/* ---------- Sign-in gate ---------- */
const GOOGLE_G = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17z"/><path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-2.9-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.6 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.2-8.5 2.2-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>';

function gateProof() {
  const s = CAMPUS && CAMPUS.placements ? CAMPUS.placements.stats : null;
  const items = [
    s && [s.offers, 'campus offers on record'], s && [s.companies, 'companies hired from HITAM'],
    LIVE.jobs.length && [LIVE.jobs.length, 'live roles for students today'], s && s.maxPkg && [`${s.maxPkg} LPA`, 'highest recorded package']
  ].filter(Boolean).slice(0, 3);
  return items.map(([n, l]) => `<div><b>${esc(n)}</b><span>${esc(l)}</span></div>`).join('');
}

function renderGate() {
  if (appReady()) { $('#gate').innerHTML = ''; document.body.classList.remove('gated'); return; }
  document.body.classList.add('gated');
  const st = AUTH.state;
  const body = st === 'loading'
    ? '<div class="gate-load"><span class="spin"></span>Checking your session…</div>'
    : st === 'unconfigured'
      ? `<p class="gate-note">Sign-in is not connected yet. The administrator needs to add the Firebase settings (see SETUP.md).</p>${isLocalHost() ? '<button class="btn primary wide" data-act="preview">Open local preview</button><p class="gate-small">Preview runs on this device only, with sample listings.</p>' : ''}`
      : `<button class="btn google wide" data-act="sign-in">${GOOGLE_G}<span>Continue with your HITAM account</span></button>
         ${AUTH.error ? `<p class="gate-err" role="alert">${esc(AUTH.error)}</p>` : ''}
         <p class="gate-small">Use your <b>roll-number@hitam.org</b> Google account. Other emails are refused.</p>
         ${/admin/.test(location.hash) ? `<button class="btn ghost wide" style="margin-top:10px" data-act="sign-in-admin">Admin: sign in with the admin Google account</button>` : ''}`;
  $('#gate').innerHTML = `<div class="gate">
    <section class="gate-l">
      <a class="brand" aria-label="HITAM Opportunities">${BRAND_MARK}<span class="brand-t"><b>HITAM</b><span>Opportunities Intelligence</span></span></a>
      <div class="gate-copy"><h1>Every opportunity at HITAM, <span>in one place.</span></h1>
      <p>Campus drives, hackathons and internships, ranked for your branch and year. Upload your resume once and see exactly what to fix.</p>
      <div class="gate-proof">${gateProof()}</div></div>
      <p class="gate-src">Placement figures from hitam.org. Live roles from official company career feeds.</p>
    </section>
    <section class="gate-r"><div class="gate-card">
      <h2>Sign in</h2><p class="muted">For HITAM students.</p>
      ${body}
      <ul class="gate-trust"><li>${icon('check')}Only @hitam.org accounts</li><li>${icon('check')}We never see your password</li><li>${icon('check')}Your resume is read on your device</li></ul>
    </div></section>
  </div>`;
}

function applyRollProfile() {
  const r = AUTH.user && parseRoll(AUTH.user.email);
  const patch = {};
  if (!S.profile.name.trim() && AUTH.user && AUTH.user.name) patch.name = AUTH.user.name;
  if (r && S.rollSynced !== r.roll) {
    if (r.branch) patch.branch = r.branch;
    if (r.year) patch.year = r.year;
    commit({ rollSynced: r.roll });
    toast(`Welcome${patch.name ? `, ${patch.name.split(' ')[0]}` : ''}. ${r.branch || 'Branch'}${r.year ? `, year ${r.year}` : ''} set from your roll number.`);
  }
  if (Object.keys(patch).length) setProfile(patch);
}

function renderApp() {
  renderGate();
  if (!appReady()) return;
  current = { name: '', arg: '' };
  route();
}

async function onAuthChange() {
  if (AUTH.state === 'signedin') {
    try { await cloudLoad(); } catch (err) { toast('Working offline. Changes will sync when you reconnect.'); CLOUD.loaded = true; }
    applyRollProfile();
    subscribeNotices(() => { buildTicker(); rerender(); });
    subscribeCdc(() => { buildTicker(); rerender(); });
  } else {
    stopCloud();
  }
  renderApp();
}

/* ---------- Overlays ---------- */
function openModal(html) { openOverlay($('#modal'), `<div class="scrim" data-act="modal-close"></div><div class="modal" role="dialog" aria-modal="true">${html}</div>`); }
function closeModal() { closeOverlay($('#modal')); }
function openPalette() {
  if ($('#palette').innerHTML) return;
  openOverlay($('#palette'), `<div class="scrim" data-act="pal-close"></div><div class="modal"><div class="modal-box palette" role="dialog" aria-modal="true" aria-label="Command palette"><input id="pal-q" type="text" placeholder="Search listings, pages and actions…" autocomplete="off" aria-label="Search" data-autofocus><ul id="pal-list"></ul></div></div>`);
  palSel = 0;
  palItems = renderPalette();
}
function closePalette() { closeOverlay($('#palette')); }
function runPalette(i) {
  const it = palItems[i];
  if (!it) return;
  closePalette();
  it.run();
}

function openDrawerFor(id) {
  const r = parseRoute();
  location.hash = `${basePath(r)}?o=${id}`;
}
function closeDrawer() {
  const r = parseRoute();
  location.hash = basePath(r);
}
function syncDrawer(r) {
  const id = r.q.get('o');
  const o = id && oppById(id);
  if (o) {
    if (String(drawerId) !== String(id)) { drawerId = id; openOverlay($('#drawer'), drawerHTML(o), '.drawer-x'); }
  } else if (drawerId !== null) {
    drawerId = null;
    closeOverlay($('#drawer'));
  }
}
function refreshDrawer() {
  if (drawerId === null) return;
  const o = oppById(drawerId);
  const host = $('#drawer');
  if (!o) return;
  const body = $('.drawer-b', host);
  const y = body ? body.scrollTop : 0;
  host.innerHTML = drawerHTML(o);
  const nb = $('.drawer-b', host);
  if (nb) nb.scrollTop = y;
}
function afterTrackChange() { rerender(); refreshDrawer(); renderNav(); }

/* ---------- Actions ---------- */
function removeTracked(id) {
  const removed = untrack(id);
  toast('Removed from tracker', { label: 'Undo', run: () => { restoreApp(id, removed); afterTrackChange(); } });
  afterTrackChange();
}
function summaryText(o) {
  const r = scoreOpp(o, S.profile, S.weights);
  return `${o.title} — ${o.org}\n${o.type} · ${o.mode} · ${payLabel(o.pay)} · ${deadlineOf(o) ? `closes ${fmtShort(deadlineOf(o))} (${countdownLong(r.dl)})` : 'open until filled'}${o.applyUrl ? `
Apply: ${o.applyUrl}` : ''}\nSkills: ${o.skills.join(', ')}\n${o.desc}`;
}
function currentCal() { return current.name === 'track' ? 'track' : 'explore'; }
function refreshCal() {
  if (currentCal() === 'track') { const m = $('#tr-main'); if (m) m.innerHTML = trackCalendarHTML(); } else refreshResults();
}

const ACTIONS = {
  open: el => openDrawerFor(el.dataset.id),
  'sign-in': () => signInWithHitam(),
  'sign-in-admin': () => signInWithHitam(true),
  'adm-read': () => { const t = $('#adm-in'); admRead(t ? t.value : ''); },
  'adm-file': el => { const file = el.files && el.files[0]; if (!file) return; if (file.size > 3e6) { toast('That file is too large'); return; } file.text().then(admRead).catch(() => toast('Could not read that file')); el.value = ''; },
  'adm-pick': el => { ADM.pick = { ...ADM.pick, [el.dataset.id]: el.checked }; },
  'adm-publish': () => { admPublish(); },
  'adm-clear': () => { ADM.text = ''; ADM.res = null; rerender(); },
  'ch-cat': el => { CH.cat = el.dataset.id; rerender(); },
  'ch-mine': el => { CH.mine = el.checked; CH.cat = ''; rerender(); },
  'ch-fits': el => { CH.fitsOnly = el.checked; refreshCdcHub(); },
  'sign-out': () => { if (confirm('Sign out of HITAM Opportunities?')) signOutUser(); },
  preview: () => startPreview(),
  'delete-notice': async el => { const o = oppById(el.dataset.id); if (!o || !o.docId || !confirm('Delete your post from the campus board for everyone?')) return; try { await deleteNotice(o.docId); closeDrawer(); toast('Post deleted'); } catch (err) { toast('Could not delete. Try again.'); } },
  'drawer-close': () => closeDrawer(),
  'modal-close': () => closeModal(),
  'pal-close': () => closePalette(),
  palette: () => openPalette(),
  theme: () => toggleTheme(),
  save: el => { const id = el.dataset.id; if (S.apps[id]) removeTracked(id); else { trackOpp(id, 'Saved'); toast('Saved to your tracker'); afterTrackChange(); } },
  apply: el => { trackOpp(el.dataset.id, 'Applied'); toast('Marked as applied. Good luck.'); afterTrackChange(); },
  untrack: el => removeTracked(el.dataset.id),
  'set-status': el => { trackOpp(el.dataset.id, el.value); toast(`Moved to ${el.value}`); afterTrackChange(); },
  cmp: el => {
    const id = String(el.dataset.id);
    if (el.checked && S.compare.length >= 3) { el.checked = false; toast('Compare up to three listings'); return; }
    commit({ compare: el.checked ? [...S.compare, id] : S.compare.filter(x => x !== id) });
    refreshTray();
  },
  'cmp-open': () => openModal(compareHTML()),
  'cmp-clear': () => { commit({ compare: [] }); rerender(); },
  share: async el => { const o = oppById(el.dataset.id); toast((await copyText(summaryText(o))) ? 'Summary copied' : 'Copy failed. Select the text manually.'); },
  'ics-one': el => { const o = oppById(el.dataset.id); if (!deadlineOf(o)) { toast('This listing has no deadline. It stays open until filled.'); return; } download(`${o.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`, buildICS([{ uid: `dl-${o.id}`, date: startOfDay(deadlineOf(o)), title: `Deadline: ${o.title}`, desc: `${o.org} · ${o.type}` }]), 'text/calendar'); toast('Calendar event downloaded'); },
  'delete-custom': el => { const id = el.dataset.id; commit({ custom: S.custom.filter(o => String(o.id) !== String(id)), compare: S.compare.filter(x => x !== String(id)) }); if (S.apps[id]) untrack(id); closeDrawer(); rerender(); buildTicker(); toast('Listing deleted'); },

  persona: el => { const id = el.dataset.id; commit({ profile: id === 'blank' ? { ...BLANK_PROFILE, skills: {}, interests: [] } : personaProfile(id) }); rerender(); renderTools(); toast(id === 'blank' ? 'Started a blank profile' : 'Loaded persona'); },
  track: el => { setProfile({ track: S.profile.track === el.dataset.id ? '' : el.dataset.id }); rerender(); },
  interest: el => { setProfile({ interests: toggleIn(S.profile.interests, el.dataset.id) }); rerender(); },
  skill: el => { const s = el.dataset.skill; const lv = Number(el.dataset.level); const cur = S.profile.skills[s] || 0; setSkill(s, cur === lv ? lv - 1 : lv); rerender(); },

  'f-type': el => { setFilters({ types: toggleIn(S.filters.types, el.dataset.id) }); refreshResults(); },
  'f-mine': el => { setFilters({ mine: el.checked }); refreshResults(); },
  'f-window': el => { setFilters({ window: Number(el.dataset.id) }); refreshResults(); },
  'f-mode': el => { setFilters({ mode: el.dataset.id }); refreshResults(); },
  'f-pay': el => { setFilters({ pay: el.dataset.id }); refreshResults(); },
  'f-skill': el => { if (el.value) { setFilters({ skills: [...S.filters.skills, el.value] }); refreshResults(); } },
  'f-closed': el => { setFilters({ showClosed: el.checked }); refreshResults(); },
  'f-source': el => { setFilters({ source: el.dataset.id }); refreshResults(); },
  'f-city': el => { setFilters({ city: el.dataset.id }); refreshResults(); },
  'f-level': el => { setFilters({ level: el.dataset.id }); refreshResults(); },
  'f-live-new': () => { setFilters({ source: 'live', sort: 'fresh' }); if (current.name === 'explore') rerender(); else location.hash = '#/explore'; },
  digest: async () => { toast((await copyText(digestFromLive())) ? 'WhatsApp post copied. Paste it in your group.' : 'Copy failed'); },
  'rs-file': el => { const file = el.files && el.files[0]; if (file) runResume(() => readResumeFile(file), file.name); el.value = ''; },
  'rs-sample': () => runResume(async () => ({ text: SAMPLE_RESUME, pages: 1 }), 'sample-resume.txt'),
  'rs-paste': () => { const t = $('#rs-paste'); if (t && t.value.trim()) runResume(async () => ({ text: t.value, pages: null }), 'pasted text'); else toast('Paste your resume text first'); },
  'rs-apply': () => {
    const r = parseResume(S.resume.text, { pages: S.resume.pages });
    const { patch } = profileFromResume(r, S.profile);
    const before = strongCount(S.profile);
    setProfile(patch); renderTools();
    toast(`Profile updated. Strong matches: ${before} \u2192 ${strongCount(S.profile)}`);
    location.hash = '#/explore/internships';
  },
  'rs-delete': () => { if (!confirm('Delete the resume text stored in this browser?')) return; commit({ resume: null }); RS.phase = 'idle'; rerender(); toast('Resume deleted from this browser'); },
  'rs-tailor': el => { RS.tailorId = el.value; const box = $('#rs-tailor-box'); if (box) box.innerHTML = tailorHTML(parseResume(S.resume.text, { pages: S.resume.pages })); },
  'copy-text': async el => { toast((await copyText(el.dataset.text)) ? 'Copied' : 'Copy failed'); },
  'pb-track': el => { PB.track = el.dataset.id; rerender(); },
  'pb-cat': el => { PB.cat = el.dataset.id; rerender(); },
  'pb-mine': el => { PB.mine = el.checked; rerender(); },
  'notice-read': () => { const t = $('#notice-in'); NOTICE.text = t ? t.value : ''; if (!NOTICE.text.trim()) { toast('Paste a notice first'); return; } NOTICE.parsed = parseNotice(NOTICE.text); rerender(); },
  'notice-clear': () => { NOTICE.text = ''; NOTICE.parsed = null; rerender(); },
  'op-sort': el => { OP.sort = el.value; OP.limit = OP_PAGE; refreshOps(); },
  'op-mine': el => { OP.mine = el.checked; OP.limit = OP_PAGE; refreshOps(); },
  'op-paid': el => { OP.paid = el.checked; OP.limit = OP_PAGE; refreshOps(); },
  'op-remote': el => { OP.remote = el.checked; OP.limit = OP_PAGE; refreshOps(); },
  'op-all': () => { OP.mine = false; OP.limit = OP_PAGE; rerender(); },
  'op-city': el => { OP.city = el.dataset.id; OP.limit = OP_PAGE; rerender(); },
  'op-more': () => { OP.limit += OP_PAGE; refreshOps(); },
  'op-notice': () => { const d = $('#notice-details'); if (d) { d.open = true; d.scrollIntoView({ behavior: 'smooth', block: 'center' }); } },
  'pl-branch': el => { PL.branch = el.dataset.id; rerender(); },
  'f-sort': el => { setFilters({ sort: el.value }); refreshResults(); },
  'f-reset': () => { commit({ filters: { ...DEFAULT_FILTERS } }); const q = $('#q'); if (q) q.value = ''; refreshResults(); },
  'f-clear': el => {
    const { key, val } = el.dataset;
    const f = S.filters;
    const patch = key === 'types' ? { types: f.types.filter(x => x !== val) } : key === 'skills' ? { skills: f.skills.filter(x => x !== val) }
      : key === 'mode' ? { mode: 'Any' } : key === 'pay' ? { pay: 'any' } : key === 'window' ? { window: 0 } : key === 'source' ? { source: 'all' } : key === 'city' ? { city: 'any' } : key === 'level' ? { level: 'any' } : { [key]: false };
    setFilters(patch); refreshResults();
  },
  'ex-view': el => { commit({ views: { ...S.views, explore: el.dataset.id } }); rerender(); },
  'toggle-filters': () => { const f = $('#filters'); if (f) f.classList.toggle('open'); },
  'cal-prev': () => { if (currentCal() === 'track') trackCal -= 1; else calOffset -= 1; refreshCal(); },
  'cal-next': () => { if (currentCal() === 'track') trackCal += 1; else calOffset += 1; refreshCal(); },
  'cal-today': () => { trackCal = 0; calOffset = 0; refreshCal(); },
  'post-form': () => openModal(postFormHTML()),

  learn: el => { setSkill(el.dataset.skill, Number(el.dataset.level)); toast(`${el.dataset.skill} set to ${LEVELS[Number(el.dataset.level)].toLowerCase()}`); refreshMatches(); },
  'w-reset': () => { commit({ weights: { ...W_DEFAULT } }); rerender(); },

  ask: el => askAssistant(el.dataset.q),
  'chat-clear': () => { commit({ chat: [] }); seedChat(); rerender(); },

  'prep-pick': el => { location.hash = `#/prepare/${el.value}`; },
  'prep-tab': el => { PREP.tab = el.dataset.id; rerender(); },
  tone: el => { PREP.tone = el.dataset.id; regenLetter(oppById(PREP.oppId)); rerender(); },
  'letter-regen': () => { regenLetter(oppById(PREP.oppId)); rerender(); toast('Letter regenerated'); },
  'letter-copy': async () => { toast((await copyText(PREP.text)) ? 'Letter copied' : 'Copy failed. Select the text manually.'); },
  'letter-dl': () => { const o = oppById(PREP.oppId); download(`cover-letter-${o.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.txt`, PREP.text); toast('Letter downloaded'); },
  ck: el => { toggleChecklist(el.dataset.id, Number(el.dataset.i)); refreshPrepRail(); renderNav(); },

  'tr-view': el => { commit({ views: { ...S.views, track: el.dataset.id } }); rerender(); },
  mv: el => { const id = el.dataset.id; const i = Math.max(0, Math.min(COLUMNS.length - 1, COLUMNS.indexOf(S.apps[id].st) + Number(el.dataset.dir))); trackOpp(id, COLUMNS[i]); rerender(); renderNav(); },
  iv: el => { patchApp(el.dataset.id, { iv: el.value }); rerender(); },
  'export-ics': () => exportICS(),
  backup: () => exportBackup(),
  restore: el => {
    const file = el.files && el.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try { S = mergeState(JSON.parse(String(reader.result))); persist(); applyTheme(); renderTools(); buildTicker(); rerender(); toast('Backup restored'); } catch (err) { toast(`Could not restore: ${err.message}`); }
    };
    reader.readAsText(file);
  },
  'reset-all': () => {
    if (!confirm('Erase your profile, tracker, notes and test results stored in this browser?')) return;
    try { localStorage.removeItem(STORE_KEY); } catch (err) { /* ignore */ }
    S = freshState(); persist(); renderTools(); location.hash = '#/home'; rerender(); toast('All data reset');
  },

  'print-report': () => window.print(),
  'cf-jump': (el, e) => { e.preventDefault(); const t = document.getElementById(el.dataset.id); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
  'sus-del': el => { commit({ sus: S.sus.filter((_, i) => i !== Number(el.dataset.i)) }); $('#sus-results').innerHTML = susResultsHTML(); },
  'sus-clear': () => { if (confirm('Delete all recorded SUS responses?')) { commit({ sus: [] }); $('#sus-results').innerHTML = susResultsHTML(); } },
  'sus-csv': () => {
    const head = ['participant', ...SUS_ITEMS.map((_, i) => `q${i + 1}`), 'sus_score'].join(',');
    const rows = S.sus.map((r, i) => [`"${(r.who || 'P' + (i + 1)).replace(/"/g, '""')}"`, ...r.a, susScore(r.a)].join(','));
    download('sus-results.csv', [head, ...rows].join('\n'), 'text/csv');
  },
  'ev-del': el => { commit({ evidence: S.evidence.filter(e => e.id !== el.dataset.id) }); $('#ev-list').innerHTML = evidenceHTML(); }
};

function onClick(e) {
  const el = e.target.closest('[data-act]');
  if (!el || el.matches('select, input')) return;
  const pal = e.target.closest('[data-pal]');
  if (pal) { runPalette(Number(pal.dataset.pal)); return; }
  const fn = ACTIONS[el.dataset.act];
  if (fn) fn(el, e);
}
function onChange(e) {
  const el = e.target.closest('[data-act]');
  if (!el || !el.matches('select, input[type=checkbox], input[type=file], input[type=date]')) return;
  const fn = ACTIONS[el.dataset.act];
  if (fn) fn(el, e);
}

function onInput(e) {
  const el = e.target;
  const d = el.dataset;
  if (d.in) {
    let v = el.value;
    if (d.in === 'year' || d.in === 'hours') v = Number(v);
    if (d.in === 'hours') $('#hours-out').textContent = v;
    if (d.in === 'cgpa' && v !== '' && !(parseFloat(v) >= 0 && parseFloat(v) <= 10)) return;
    setProfile({ [d.in]: v });
    refreshIdCard();
    if (d.in === 'name') { const av = $('.avatar'); if (av) av.textContent = initial(S.profile); }
  } else if (d.inCh) {
    CH.q = el.value;
    refreshCdcHub();
  } else if (d.inOp) {
    OP.q = el.value;
    OP.limit = OP_PAGE;
    refreshOps();
  } else if (d.inFilter) {
    setFilters({ [d.inFilter]: el.value });
    const r = $('#results'); if (r) r.innerHTML = resultsHTML();
    refreshTray();
  } else if (d.inWeight) {
    commit({ weights: { ...S.weights, [d.inWeight]: Number(el.value) } });
    refreshMatches();
  } else if (d.inLetter) {
    if (d.inLetter === 'text') PREP.text = el.value;
    else { PREP.project = el.value; regenLetter(oppById(PREP.oppId)); const t = $('#letter-text'); if (t) t.value = PREP.text; }
  } else if (d.inNote) {
    const was = Boolean(S.apps[d.inNote]);
    patchApp(d.inNote, { notes: el.value });
    if (!was) { refreshPrepRail(); renderNav(); }
  } else if (el.id === 'pal-q') {
    palSel = 0;
    palItems = renderPalette();
  }
}

function onSubmit(e) {
  const f = e.target;
  if (f.id === 'chat-form') { e.preventDefault(); const i = $('#chat-in'); askAssistant(i.value); i.value = ''; }
  else if (f.id === 'post-form') {
    e.preventDefault();
    const o = submitPostForm(f);
    if (!o) return;
    closeModal(); buildTicker(); rerender(); toast('Listing posted');
    openDrawerFor(o.id);
  } else if (f.id === 'notice-form') {
    e.preventDefault();
    const o = addNoticeListing(f);
    if (o) { buildTicker(); rerender(); toast('Added to the campus board'); }
  } else if (f.id === 'sus-form') {
    e.preventDefault();
    const fd = new FormData(f);
    const a = SUS_ITEMS.map((_, i) => Number(fd.get(`q${i}`)));
    if (susScore(a) === null) { toast('Answer all ten statements'); return; }
    commit({ sus: [...S.sus, { a, who: String(fd.get('who') || '').slice(0, 40), t: Date.now() }] });
    f.reset(); $('#sus-results').innerHTML = susResultsHTML(); toast('Response recorded');
  } else if (f.id === 'ev-form') {
    e.preventDefault();
    const fd = new FormData(f);
    const text = String(fd.get('text') || '').trim();
    if (!text) return;
    commit({ evidence: [...S.evidence, { id: `e${Date.now()}`, text: text.slice(0, 400), kind: EVIDENCE_KINDS.includes(fd.get('kind')) ? fd.get('kind') : 'Observation', who: String(fd.get('who') || '').slice(0, 40), t: Date.now() }] });
    f.reset(); $('#ev-list').innerHTML = evidenceHTML();
  }
}

const isTyping = t => t && (t.matches('input, textarea, select') || t.isContentEditable);
/* One-click CDC send for the admin: the bookmarklet posts the page text here. Accept it only from CDC Explorer. */
function onCdcMessage(e) {
  if (e.origin !== 'https://cdc.hitam.org' || !e.data || e.data.hitamCdc !== 1 || typeof e.data.text !== 'string') return;
  try { e.source.postMessage({ hitamCdcAck: 1 }, e.origin); } catch (err) { /* sender gone */ }
  if (!isAdmin() && AUTH.state !== 'preview') { toast('Only the admin account can add CDC data.'); return; }
  const add = e.data.text.slice(0, 1000000);
  if (ADM.text.includes(add.slice(0, 400))) return;
  ADM.text = ADM.text ? `${ADM.text}

${add}` : add;
  if (current.name !== 'admin') location.hash = '#/admin';
  admRead(ADM.text);
}

function onKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if ($('#palette').innerHTML) closePalette(); else openPalette(); return; }
  if ($('#palette').innerHTML) {
    if (e.key === 'Escape') { closePalette(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); palSel = Math.max(0, Math.min(palItems.length - 1, palSel + (e.key === 'ArrowDown' ? 1 : -1))); palItems = renderPalette(); return; }
    if (e.key === 'Enter') { e.preventDefault(); runPalette(palSel); return; }
    return;
  }
  if (e.key === 'Escape') {
    if ($('#modal').innerHTML) closeModal(); else if (drawerId !== null) closeDrawer();
    return;
  }
  if (e.key === '/' && !isTyping(e.target) && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    if (current.name !== 'explore') { location.hash = '#/explore'; setTimeout(() => { const q = $('#q'); if (q) q.focus(); }, 60); } else { const q = $('#q'); if (q) q.focus(); }
    return;
  }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.kc b[data-act]')) { e.preventDefault(); ACTIONS.open(e.target); }
}

/* ---------- Drag and drop (tracker board) ---------- */
function bindDnD() {
  document.addEventListener('dragstart', e => {
    const kc = e.target.closest && e.target.closest('.kc');
    if (!kc) return;
    e.dataTransfer.setData('text/plain', kc.dataset.id);
    e.dataTransfer.effectAllowed = 'move';
    kc.classList.add('drag');
  });
  document.addEventListener('dragend', e => { const kc = e.target.closest && e.target.closest('.kc'); if (kc) kc.classList.remove('drag'); $$('.col.over').forEach(c => c.classList.remove('over')); });
  document.addEventListener('dragover', e => { const dz = e.target.closest && e.target.closest('#drop'); if (dz) { e.preventDefault(); dz.classList.add('over'); return; } const col = e.target.closest && e.target.closest('.col'); if (!col) return; e.preventDefault(); $$('.col.over').forEach(c => { if (c !== col) c.classList.remove('over'); }); col.classList.add('over'); });
  document.addEventListener('drop', e => {
    const dz = e.target.closest && e.target.closest('#drop');
    if (dz) { e.preventDefault(); dz.classList.remove('over'); const file = e.dataTransfer.files && e.dataTransfer.files[0]; if (file) runResume(() => readResumeFile(file), file.name); return; }
    const col = e.target.closest && e.target.closest('.col');
    if (!col) return;
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id && S.apps[id] && S.apps[id].st !== col.dataset.col) { trackOpp(id, col.dataset.col); toast(`Moved to ${col.dataset.col}`); rerender(); renderNav(); }
  });
}

/* ---------- Live jobs ---------- */
function loadLive() {
  const pe = document.getElementById('programs-data');
  if (pe) { try { setProgramsData(JSON.parse(pe.textContent)); } catch (err) { /* run without programmes */ } }
  if (/^https?:$/.test(location.protocol)) {
    fetch('data/programs.json', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).then(d => { if (d && setProgramsData(d)) { buildTicker(); rerender(); } }).catch(() => {});
    fetch('data/remote.json', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).then(d => { if (d && setLiveData(d, 'remote')) { buildTicker(); rerender(); } }).catch(() => {});
  }
  const ce = document.getElementById('campus-data');
  if (ce) { try { setCampusData(JSON.parse(ce.textContent)); } catch (err) { /* run without campus snapshot */ } }
  if (/^https?:$/.test(location.protocol)) fetch('data/campus.json', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).then(d => { if (d && (!CAMPUS || String(d.generatedAt) > String(CAMPUS.generatedAt)) && setCampusData(d) && current.name === 'campus') rerender(); }).catch(() => {});
  const el = document.getElementById('live-jobs');
  if (el) { try { setLiveData(JSON.parse(el.textContent)); } catch (err) { /* embedded snapshot unreadable: run without it */ } }
  if (!/^https?:$/.test(location.protocol)) return;
  fetch('data/jobs.json', { cache: 'no-store' })
    .then(r => (r.ok ? r.json() : null))
    .then(d => { if (d && (!LIVE.meta || String(d.generatedAt) > String(LIVE.meta.generatedAt)) && setLiveData(d)) { buildTicker(); rerender(); } })
    .catch(() => { /* offline or not hosted with data/: keep the embedded snapshot */ });
}

/* ---------- Boot ---------- */
function init() {
  loadState();
  loadLive();
  applyTheme();
  $('#app').innerHTML = shellHTML();
  document.addEventListener('click', onClick);
  document.addEventListener('change', onChange);
  document.addEventListener('input', onInput);
  document.addEventListener('submit', onSubmit);
  document.addEventListener('keydown', onKeydown);
  window.addEventListener('message', onCdcMessage);
  bindDnD();
  window.addEventListener('hashchange', route);
  renderGate();
  initAuth(onAuthChange);
}
init();
