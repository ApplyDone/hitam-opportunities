/* ============================================================
   views-opps.js — the Opportunities page. HITAM listings first,
   then official programs, then live company postings. Internships
   behave like a job board: newest first, location filters, show more.
   ============================================================ */
'use strict';

const OP_TABS = [
  ['all', 'All open', ['Internship', 'Placement', 'Hackathon', 'Club', 'Workshop', 'Research', 'Job']],
  ['internships', 'Internships', ['Internship']],
  ['drives', 'Campus drives', ['Placement']],
  ['hackathons', 'Hackathons', ['Hackathon']],
  ['events', 'Clubs & events', ['Club', 'Workshop', 'Research']],
  ['jobs', 'Company jobs', ['Job']]
];
const OP_PAGE = 24;
const OP = { q: '', mine: true, sort: 'match', paid: false, remote: false, city: 'any', limit: OP_PAGE };
const opTab = id => OP_TABS.find(t => t[0] === id) || OP_TABS[0];
const hasCityFilter = tab => ['all', 'internships', 'drives', 'jobs'].includes(tab[0]);
const isHitamListing = o => !o.live && !o.program;

function cityMatches(o) {
  if (OP.city === 'remote') return o.mode === 'Remote';
  if (OP.city === 'hyderabad') return isHitamListing(o) || /hyderabad/i.test(`${o.city || ''} ${o.location || ''}`);
  if (OP.city === 'bengaluru') return /bengaluru|bangalore/i.test(`${o.city || ''} ${o.location || ''}`);
  return true;
}

/** Filtered rows for a tab. HITAM listings first, then official programs, then live postings. */
function opRows(tab, withQuery = true, mine = OP.mine) {
  const f = { ...DEFAULT_FILTERS, types: tab[2], q: withQuery ? OP.q : '', mine, sort: OP.sort, pay: OP.paid ? 'paid' : 'any', mode: OP.remote ? 'Remote' : 'Any' };
  let rows = filterOpps(allOpps(), f, S.profile, S.weights);
  if (OP.city !== 'any' && hasCityFilter(tab)) rows = rows.filter(x => cityMatches(x.o));
  const rank = o => (o.live ? 2 : o.program ? 1 : 0);
  return rows.map((x, i) => ({ x, i })).sort((a, b) => rank(a.x.o) - rank(b.x.o) || a.i - b.i).map(z => z.x);
}

function agoText(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 'recently';
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  return m < 2 ? 'just now' : m < 90 ? `${m} min ago` : m < 2880 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`;
}
const latestLive = () => [LIVE.times && LIVE.times.ats, LIVE.times && LIVE.times.remote].filter(Boolean).sort().pop();

function cdcFreshness() {
  const t = CDC.times && CDC.times.opps;
  return CDC.opps.length ? `CDC list updated ${t ? agoText(t) : 'recently'}.` : '';
}

function tabNote(tab) {
  const cdc = `<a class="link" href="${CAMPUS_SOURCES.cdcApp}" target="_blank" rel="noopener noreferrer">CDC Explorer</a>`;
  if (tab[0] === 'all') return `Every open opportunity in one list: CDC-verified HITAM listings first, then official programmes, then live company postings. The % is how well each fits your skills, branch and year. ${cdcFreshness()}`;
  if (tab[0] === 'internships') return 'Internships posted for HITAM first, then official programs, then live postings from company career pages. Open to every year.';
  if (tab[0] === 'drives') return `Campus placement drives. Register in ${cdc}; import the list below so everyone at HITAM sees it here with deadlines.`;
  if (tab[0] === 'hackathons') return 'Hackathons and contests: those posted for HITAM first, then official national programs.';
  if (tab[0] === 'jobs') return 'Optional. Fresher-level openings from company career pages. Not required for placements.';
  return 'Workshops, research openings and club calls. Clubs that help a job search are marked below.';
}

function boardStrip(tab) {
  if (tab[0] !== 'internships' || !LIVE.jobs.length) return '';
  const n = LIVE.jobs.filter(o => o.type === 'Internship').length;
  const t = latestLive();
  return `<section class="live-strip"><div><span class="pulse" aria-hidden="true"></span><b>${n} live internships</b> from company career pages and <a class="link" href="https://himalayas.app/jobs" target="_blank" rel="noopener noreferrer">Himalayas</a>. New postings are added every 6 hours.</div><span class="small muted">Updated ${t ? agoText(t) : 'recently'}</span></section>`;
}

function hitamCallout(tab) {
  if (!['all', 'internships', 'drives', 'hackathons'].includes(tab[0])) return '';
  if (opRows(tab, false, false).some(x => isHitamListing(x.o))) return '';
  return `<section class="callout"><div><b>No CDC ${esc(tab[1].toLowerCase())} published yet.</b><p class="small muted">The Career Development Centre list is added here every day. Until then, check <a class="link" href="${CAMPUS_SOURCES.cdcApp}" target="_blank" rel="noopener noreferrer">CDC Explorer</a> directly.</p></div>${isAdmin() ? '<a class="btn acc" href="#/admin">Publish today’s CDC list</a>' : ''}</section>`;
}

function clubsHTML() {
  return `<section style="margin-bottom:26px">${sectionHead('Clubs and programmes at HITAM', 'from hitam.org')}
  <div class="club-grid">${HITAM_CLUBS.map(c => `<div class="club ${c.jobs ? 'jobs' : ''}"><b>${esc(c.name)}</b>${c.jobs ? '<span class="pill acc">Helps your job search</span>' : ''}<p class="small muted">${esc(c.note)}</p></div>`).join('')}</div>
  <p class="tiny muted" style="margin-top:8px"><a class="link" href="${CAMPUS_SOURCES.clubs}" target="_blank" rel="noopener noreferrer">HITAM clubs page</a>. Club calls and events are not listed publicly, so post them below when you hear of one.</p></section>`;
}

function opResultsHTML() {
  const tab = opTab(current.arg);
  const rows = opRows(tab);
  if (!rows.length) {
    const hidden = OP.mine ? opRows(tab, true, false).length : 0;
    return emptyBox(OP.q ? 'No matches' : `No ${tab[1].toLowerCase()} open right now`,
      hidden ? `${hidden} more exist that are not open to your branch or year.` : 'New ones appear here as they are posted.',
      hidden ? '<button class="btn" data-act="op-all">Show them anyway</button>' : '<button class="btn" data-act="op-notice">Add one</button>');
  }
  const shown = rows.slice(0, OP.limit);
  return `<div class="row between" style="margin-bottom:12px"><span class="small muted"><b class="mono">${rows.length}</b> ${rows.length === 1 ? 'listing' : 'listings'}</span></div>
  <div class="tkts">${shown.map((x, i) => ticket(x.o, x.r, i)).join('')}</div>
  ${rows.length > shown.length ? `<div style="text-align:center;margin-top:18px"><button class="btn ghost" data-act="op-more">Show ${Math.min(OP_PAGE, rows.length - shown.length)} more <span class="muted">(${rows.length - shown.length} left)</span></button></div>` : ''}`;
}
function refreshOps() { const r = $('#op-results'); if (r) r.innerHTML = opResultsHTML(); }

function viewOpps(arg) {
  const tab = opTab(arg);
  return `
<header class="page-head">
  <div class="eyebrow">HITAM Opportunities</div>
  <h1 class="h1">What’s open for you, <em>${tab[0] === 'all' ? 'all of it' : esc(tab[1].toLowerCase())}.</em></h1>
  <p class="lede">${tabNote(tab)}</p>
</header>
<nav class="tabs-nav" aria-label="Opportunity types">${OP_TABS.map(t => `<a class="${t[0] === tab[0] ? 'on' : ''} ${t[0] === 'jobs' ? 'opt' : ''}" href="#/explore/${t[0]}" ${t[0] === tab[0] ? 'aria-current="page"' : ''}>${t[1]}<span class="ct">${opRows(t, false).length}</span></a>`).join('')}</nav>
${boardStrip(tab)}${hitamCallout(tab)}
<div class="op-bar">
  <div class="bar-search grow">${icon('search')}<input type="search" id="q" data-in-op="q" placeholder="Search by role, company or skill" value="${esc(OP.q)}" aria-label="Search"></div>
  <select data-act="op-sort" aria-label="Sort by" style="width:auto"><option value="fresh" ${OP.sort === 'fresh' ? 'selected' : ''}>Newest</option><option value="match" ${OP.sort === 'match' ? 'selected' : ''}>Best match</option><option value="deadline" ${OP.sort === 'deadline' ? 'selected' : ''}>Closing soonest</option></select>
  <label class="ck op-ck"><input type="checkbox" data-act="op-mine" ${OP.mine ? 'checked' : ''}><span>Open to me</span></label>
  ${hasCityFilter(tab) ? `<label class="ck op-ck"><input type="checkbox" data-act="op-paid" ${OP.paid ? 'checked' : ''}><span>Paid</span></label>` : ''}
</div>
${hasCityFilter(tab) ? `<div class="chips" style="margin:-4px 0 18px">${[['any', 'Anywhere'], ['remote', 'Remote'], ['hyderabad', 'Hyderabad'], ['bengaluru', 'Bengaluru']].map(([v, l]) => `<button class="chip ${OP.city === v ? 'on' : ''}" data-act="op-city" data-id="${v}">${l}</button>`).join('')}</div>` : ''}
${tab[0] === 'events' ? clubsHTML() : ''}
<div id="op-results">${opResultsHTML()}</div>
<details class="engine" id="notice-details" style="margin-top:36px" ${NOTICE.parsed ? 'open' : ''}><summary>${icon('plus')} Heard of something not listed? Post a campus notice</summary><div class="engine-b">${noticeBoxHTML()}</div></details>`;
}
