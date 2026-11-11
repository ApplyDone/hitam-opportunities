/* ============================================================
   ui.js — DOM helpers and reusable components (tickets, rows,
   toasts, modal, focus handling). Returns HTML strings; all
   user-supplied text goes through esc().
   ============================================================ */
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const richText = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

const ICONS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  bell: '<path d="M6 16v-5a6 6 0 0112 0v5l2 2H4zM10 21h4"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18 16l.8 2.2L21 19l-2.2.8L18 22l-.8-2.2L15 19l2.2-.8z"/>',
  compare: '<path d="M8 4v16M16 4v16M4 8h8M12 16h8"/>',
  download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  rupee: '<path d="M7 5h10M7 9h10M7 5c5 0 6 3.5 3 6s-3 3-3 3l7 6"/>',
  pin: '<path d="M12 21s-6.5-5.7-6.5-11a6.5 6.5 0 0113 0c0 5.3-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  send: '<path d="M4 12l16-8-6 17-3-7z"/>',
  command: '<path d="M9 9h6v6H9zM9 9V6.5A2.5 2.5 0 106.5 9H9zM15 9V6.5A2.5 2.5 0 1117.5 9H15zM9 15v2.5A2.5 2.5 0 116.5 15H9zM15 15v2.5a2.5 2.5 0 102.5-2.5H15z"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/>',
  board: '<rect x="3.5" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="10" rx="1"/><rect x="16.5" y="4" width="4" height="13" rx="1"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6"/>',
  chevL: '<path d="M15 5l-7 7 7 7"/>', chevR: '<path d="M9 5l7 7-7 7"/>',
  file: '<path d="M6 3h8l4 4v14H6zM14 3v5h4M9 13h6M9 17h6"/>',
  home: '<path d="M4 11l8-6 8 6v8a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5"/>',
  logout: '<path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 16l-4-4 4-4M6 12h10"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/>',
  map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/>'
};
const icon = (n, label) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ${label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true"'}>${ICONS[n]}</svg>`;

/* Brand mark: "Find your path". A start point, the trail so far (dotted), and the way ahead in brand orange. */
const BRAND_MARK_SVG = '<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="#111318"/><path d="M10.6 22.5h3q2.4 0 2.4-2.4" stroke="#fff" stroke-opacity=".7" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="0 3.1" fill="none"/><path d="M16 19.6V14.8q0-2.8 2.8-2.8h3.4" stroke="#e8590c" stroke-width="2.6" stroke-linecap="round" fill="none"/><path d="M20.4 8.7l3.4 3.3-3.4 3.3" stroke="#e8590c" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="8" cy="22.5" r="2.4" fill="#fff"/></svg>';
const BRAND_MARK = BRAND_MARK_SVG;

/* ---------- Tickets & rows ---------- */
function segMeter(score) {
  const n = Math.round(score / 10);
  return `<div class="seg" aria-hidden="true">${Array.from({ length: 10 }, (_, i) => `<i class="${i < n ? 'f' : ''}"></i>`).join('')}</div>`;
}

function dueBadge(r, o) {
  if (!Number.isFinite(r.dl)) {
    const ago = o ? postedDaysAgo(o) : null;
    const isNew = ago !== null && ago <= 1;
    return `<span class="due fresh ${isNew ? 'new' : ''}" title="Open until filled">${isNew ? 'New today' : esc(freshLabel(ago))}</span>`;
  }
  return `<span class="due ${urgency(r.dl)}" title="${esc(countdownLong(r.dl))}">${countdown(r.dl)}</span>`;
}
const sourcePill = o => (o.live ? '<span class="pill live" title="From a live job posting">Live</span>' : o.program ? '<span class="pill ok" title="Official programme with a verified date">Official</span>' : o.cdc ? '<span class="pill acc" title="Verified HITAM listing">HITAM</span>' : o.custom || o.shared ? `<span class="pill acc" title="On the HITAM board">HITAM</span>` : '<span class="pill" title="Example listing shown in local preview only">Example</span>');
const applyBtn = (o, cls = 'btn sm acc') => (o.applyUrl ? `<a class="${cls}" href="${esc(o.applyUrl)}" target="_blank" rel="noopener noreferrer">Apply${icon('external')}</a>` : '');

function skillTags(o, r, max = 4) {
  const shown = o.skills.slice(0, max).map(s => `<span class="tag ${r.have.includes(s) ? 'have' : r.gaps.some(g => g.skill === s) && (S.profile.skills[s] || 0) > 0 ? 'gap' : ''}">${esc(s)}</span>`);
  if (o.skills.length > max) shown.push(`<span class="tag">+${o.skills.length - max}</span>`);
  return shown.join('');
}

let ANIM = true; // entrance animation only on navigation, never on in-place refreshes

function ticket(o, r, i = 0) {
  const app = S.apps[o.id];
  const stubLabel = r.closed ? 'closed' : !r.elig.ok ? 'not open' : 'match';
  return `<article class="tkt ${ANIM ? 'rise' : ''} band-${band(r.score)} ${r.closed ? 'closed' : ''}" data-type="${o.type}" style="--i:${Math.min(i, 12)}">
  <div class="tkt-main">
    <div class="tkt-top"><span class="tcode">${TYPE_CODE[o.type]}</span><span class="ttype">${o.type}</span>${sourcePill(o)}${dueBadge(r, o)}</div>
    <h3><button class="tkt-title" data-act="open" data-id="${o.id}">${esc(o.title)}</button></h3>
    <div class="tkt-org">${esc(o.org)}${o.remoteSource ? ' · via <a class="src-link" href="https://himalayas.app/jobs" target="_blank" rel="noopener noreferrer">Himalayas</a>' : ''}</div>
    <ul class="tkt-meta"><li>${icon('pin')}${o.city ? esc(o.city) + ' · ' : ''}${o.mode}</li><li>${icon('rupee')}${esc(payLabel(o.pay))}</li><li>${icon('clock')}${esc(o.dur)}</li></ul>
    <div class="tkt-skills">${skillTags(o, r)}</div>
    <div class="tkt-act">
      <button class="btn sm ghost bm ${app ? 'on' : ''}" data-act="save" data-id="${o.id}" aria-pressed="${Boolean(app)}">${icon('bookmark')}${app ? app.st : 'Save'}</button>
      ${applyBtn(o)}
    </div>
  </div>
  <div class="tkt-stub">
    <div class="score">${r.elig.ok ? r.score : '—'}${r.elig.ok ? '<small>%</small>' : ''}</div>
    <div class="score-lbl">${stubLabel}</div>${r.elig.ok && !r.closed ? segMeter(r.score) : ''}
  </div>
</article>`;
}

function ledgerRow(o, r) {
  const app = S.apps[o.id];
  return `<div class="lrow ${r.closed ? 'closed' : ''}" data-type="${o.type}">
  <span class="tcode" title="${o.type}">${TYPE_CODE[o.type]}</span>
  <div><button class="tt" data-act="open" data-id="${o.id}">${esc(o.title)}</button><div class="sub">${esc(o.org)}${app ? ` · <b>${app.st}</b>` : ''}</div></div>
  <div class="small">${o.mode}<div class="sub">${esc(o.dur)}</div></div>
  <div class="small">${esc(payLabel(o.pay))}</div>
  ${dueBadge(r, o)}
  <div class="sc">${r.elig.ok ? r.score + '%' : '—'}</div>
</div>`;
}

function miniRow(o, r, note) {
  return `<button class="mini" data-act="open" data-id="${o.id}" data-type="${o.type}">
  <span class="mini-d ${r.dl <= 3 && !r.closed ? 'hot' : ''}">${!Number.isFinite(r.dl) ? 'Open' : r.dl < 0 ? '—' : r.dl === 0 ? 'Now' : r.dl + 'd'}</span>
  <span><span class="mini-t">${esc(o.title)}</span><br><span class="mini-s">${esc(note || o.org)}</span></span>
  <span class="mono small">${r.elig.ok ? r.score + '%' : '—'}</span>
</button>`;
}

const sectionHead = (title, eyebrow) => `<div class="sec-head"><h2 class="h3">${title}</h2>${eyebrow ? `<span class="eyebrow">${eyebrow}</span>` : ''}</div>`;
const emptyBox = (title, body, cta) => `<div class="empty"><div class="h2">${title}</div><p>${body}</p>${cta || ''}</div>`;

/* ---------- Toasts ---------- */
function toast(msg, action) {
  const host = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button">${esc(action.label)}</button>` : ''}`;
  if (action) el.querySelector('button').addEventListener('click', () => { action.run(); el.remove(); });
  host.appendChild(el);
  while (host.children.length > 3) host.firstChild.remove();
  setTimeout(() => el.remove(), action ? 6500 : 2600);
}

/* ---------- Overlays: focus handling ---------- */
let lastFocus = null;
let releaseTrap = null;
function trapFocus(container) {
  const onKey = e => {
    if (e.key !== 'Tab') return;
    const f = $$('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])', container).filter(x => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  container.addEventListener('keydown', onKey);
  return () => container.removeEventListener('keydown', onKey);
}
function openOverlay(host, html, focusSel) {
  lastFocus = document.activeElement;
  host.innerHTML = html;
  if (releaseTrap) releaseTrap();
  releaseTrap = trapFocus(host);
  const f = focusSel ? $(focusSel, host) : $('[data-autofocus]', host);
  if (f) f.focus();
  document.body.style.overflow = 'hidden';
}
function closeOverlay(host) {
  host.innerHTML = '';
  if (releaseTrap) { releaseTrap(); releaseTrap = null; }
  if (!$('#drawer').innerHTML && !$('#modal').innerHTML && !$('#palette').innerHTML) document.body.style.overflow = '';
  if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
}

function download(name, text, mime = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (err) {
    const t = document.createElement('textarea');
    t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    t.remove();
    return ok;
  }
}
const typeColorVar = type => `var(--t-${type.toLowerCase()})`;
const initial = p => (p.name.trim()[0] || 'S').toUpperCase();
