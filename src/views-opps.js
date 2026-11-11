/* ============================================================
   views-opps.js — the Opportunities page: five tabs, one clear
   list. Company jobs are the last, optional tab.
   ============================================================ */
'use strict';

const OP_TABS = [
  ['internships', 'Internships', ['Internship']],
  ['drives', 'Campus drives', ['Placement']],
  ['hackathons', 'Hackathons', ['Hackathon']],
  ['events', 'Clubs & events', ['Club', 'Workshop', 'Research']],
  ['jobs', 'Company jobs', ['Job']]
];
const OP = { q: '', mine: true, sort: 'match', paid: false, remote: false };
const opTab = id => OP_TABS.find(t => t[0] === id) || OP_TABS[0];

function opRows(tab, withQuery = true, mine = OP.mine) {
  const f = { ...DEFAULT_FILTERS, types: tab[2], q: withQuery ? OP.q : '', mine, sort: OP.sort, pay: OP.paid ? 'paid' : 'any', mode: OP.remote ? 'Remote' : 'Any' };
  return filterOpps(allOpps(), f, S.profile, S.weights);
}

function tabNote(tab) {
  const cdc = `<a class="link" href="${CAMPUS_SOURCES.cdcApp}" target="_blank" rel="noopener noreferrer">CDC Explorer</a>`;
  if (tab[0] === 'internships') return 'Live internships from company career pages, plus internships posted by students. Open to every year.';
  if (tab[0] === 'drives') return `Official drive registration happens in ${cdc}. Paste a drive notice below and it shows up here for everyone at HITAM.`;
  if (tab[0] === 'hackathons') return 'Hackathons announced on campus or shared by students. Hackathon Club runs the big ones.';
  if (tab[0] === 'jobs') return 'Optional. Fresher-level openings from company career pages, mostly outside campus. Not required for placements.';
  return 'Workshops, research openings and club calls. Clubs that help a job search are marked below.';
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
      hidden ? `${hidden} more exist that are not open to your branch or year.` : 'New ones appear here every morning, or when someone posts a notice.',
      hidden ? '<button class="btn" data-act="op-all">Show them anyway</button>' : '<button class="btn" data-act="op-notice">Post a notice</button>');
  }
  return `<div class="row between" style="margin-bottom:12px"><span class="small muted"><b class="mono">${rows.length}</b> ${rows.length === 1 ? 'listing' : 'listings'}</span></div><div class="tkts">${rows.map((x, i) => ticket(x.o, x.r, i)).join('')}</div>`;
}
function refreshOps() { const r = $('#op-results'); if (r) r.innerHTML = opResultsHTML(); }

function viewOpps(arg) {
  const tab = opTab(arg);
  const jobsTab = tab[0] === 'jobs';
  return `
<header class="page-head">
  <div class="eyebrow">Opportunities</div>
  <h1 class="h1">What’s open for you, <em>${esc(tab[1].toLowerCase())}.</em></h1>
  <p class="lede">${tabNote(tab)}</p>
</header>
<nav class="tabs-nav" aria-label="Opportunity types">${OP_TABS.map(t => `<a class="${t[0] === tab[0] ? 'on' : ''} ${t[0] === 'jobs' ? 'opt' : ''}" href="#/explore/${t[0]}" ${t[0] === tab[0] ? 'aria-current="page"' : ''}>${t[1]}<span class="ct">${opRows(t, false).length}</span></a>`).join('')}</nav>
<div class="op-bar">
  <div class="bar-search grow">${icon('search')}<input type="search" id="q" data-in-op="q" placeholder="Search by role, company or skill" value="${esc(OP.q)}" aria-label="Search"></div>
  <select data-act="op-sort" aria-label="Sort by" style="width:auto"><option value="match" ${OP.sort === 'match' ? 'selected' : ''}>Best match</option><option value="deadline" ${OP.sort === 'deadline' ? 'selected' : ''}>Closing soonest</option><option value="fresh" ${OP.sort === 'fresh' ? 'selected' : ''}>Newest</option></select>
  <label class="ck op-ck"><input type="checkbox" data-act="op-mine" ${OP.mine ? 'checked' : ''}><span>Open to me</span></label>
  ${jobsTab || tab[0] === 'internships' ? `<label class="ck op-ck"><input type="checkbox" data-act="op-paid" ${OP.paid ? 'checked' : ''}><span>Paid</span></label><label class="ck op-ck"><input type="checkbox" data-act="op-remote" ${OP.remote ? 'checked' : ''}><span>Remote</span></label>` : ''}
</div>
${tab[0] === 'events' ? clubsHTML() : ''}
<div id="op-results">${opResultsHTML()}</div>
<details class="engine" id="notice-details" style="margin-top:36px" ${NOTICE.parsed ? 'open' : ''}><summary>${icon('plus')} Got a notice on WhatsApp or email? Add it for everyone</summary><div class="engine-b">${noticeBoxHTML()}</div></details>`;
}
