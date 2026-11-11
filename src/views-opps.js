/* ============================================================
   views-opps.js — the Opportunities page. HITAM listings first,
   then official programs, then live company postings. Internships
   behave like a job board: newest first, location filters, show more.
   ============================================================ */
'use strict';

const OP_TABS = [
  ['internships', 'Internships', ['Internship']],
  ['drives', 'Campus drives', ['Placement']],
  ['hackathons', 'Hackathons', ['Hackathon']],
  ['events', 'Clubs & events', ['Club', 'Workshop', 'Research']],
  ['jobs', 'Company jobs', ['Job']]
];
const OP_PAGE = 24;
const OP = { q: '', mine: true, sort: 'fresh', paid: false, remote: false, city: 'any', limit: OP_PAGE };
const CDCIMP = { text: '', res: null };
const opTab = id => OP_TABS.find(t => t[0] === id) || OP_TABS[0];
const hasCityFilter = tab => tab[0] === 'internships' || tab[0] === 'jobs';
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

function tabNote(tab) {
  const cdc = `<a class="link" href="${CAMPUS_SOURCES.cdcApp}" target="_blank" rel="noopener noreferrer">CDC Explorer</a>`;
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
  if (!['internships', 'drives', 'hackathons'].includes(tab[0])) return '';
  const any = opRows(tab, false, false).some(x => isHitamListing(x.o));
  if (any) return '';
  return `<section class="callout"><div><b>No HITAM ${esc(tab[1].toLowerCase())} posted yet.</b><p class="small muted">The official ones live inside CDC Explorer. Copy your CDC Opportunities page and import it once: everyone at HITAM then sees these with deadlines.</p></div><button class="btn acc" data-act="op-notice">Import from CDC</button></section>`;
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

/* ---------- Import from CDC Explorer ---------- */
/** Bookmarklet that runs on the student's own CDC page and hands the page text to this app via postMessage. */
function cdcBookmarklet() {
  const home = `${location.origin}${location.pathname}`;
  const code = `(function(){var t=document.body.innerText,u=${JSON.stringify(home)}+'#/explore/drives',o=${JSON.stringify(location.origin)},w=window.open(u,'hitamopps'),n=0,iv=setInterval(function(){try{w.postMessage({hitamCdc:1,text:t},o)}catch(e){}if(++n>60)clearInterval(iv)},500);window.addEventListener('message',function(e){if(e.origin===o&&e.data&&e.data.hitamCdcAck){clearInterval(iv);alert('Sent to HITAM Opportunities. Check the preview in the other tab.')}})})();`;
  return `javascript:${encodeURIComponent(code)}`;
}

function lastCdcImport() {
  const t = allOpps().filter(o => (o.tags || [])[0] === 'From CDC Explorer' && o.postedAt).map(o => o.postedAt).sort().pop();
  return t ? `Last import ${agoText(t)}` : 'No import yet';
}

function cdcImportHTML() {
  const r = CDCIMP.res;
  return `<section class="panel notice-box"><div class="row between"><div class="eyebrow"><b>Fastest way: import from CDC Explorer</b></div><span class="pill">${lastCdcImport()}</span></div>
  <div class="callout" style="margin:12px 0"><div><b>One click, no copy and paste</b><p class="small muted">Drag this button to your bookmarks bar. Then open CDC Explorer, go to Opportunities, scroll to load the list, and click it. It runs in your own browser and sends the list here for a preview. Nothing is stored and nobody else sees your CDC page.</p></div><a class="btn acc" href="${esc(cdcBookmarklet())}" onclick="event.preventDefault();toast('Drag this button to your bookmarks bar instead of clicking it')" draggable="true">${icon('upload')}Send CDC to HITAM</a></div>
  <ol class="todo" style="margin:10px 0"><li>Open <a class="link" href="${CAMPUS_SOURCES.cdcApp}" target="_blank" rel="noopener noreferrer">CDC Explorer</a> and go to <b>Opportunities</b></li><li>Scroll to load the list, then select all (Ctrl+A) and copy (Ctrl+C)</li><li>Paste it below. Only open ones are added, each with its deadline</li></ol>
  <textarea id="cdc-in" placeholder="Paste the copied CDC Opportunities page here" aria-label="CDC Explorer text">${esc(CDCIMP.text)}</textarea>
  <div class="row"><button class="btn acc" data-act="cdc-read">${icon('spark')}Read list</button>${r ? `<span class="small muted">${r.items.length} open · ${r.skippedPast} past skipped${r.skippedUnreadable ? ` · ${r.skippedUnreadable} unreadable` : ''}</span>` : ''}</div>
  ${r && r.items.length ? `<div class="ledger" style="margin-top:14px;max-height:340px;overflow:auto">${r.items.map(it => `<div class="lrow rec" style="grid-template-columns:90px minmax(0,2fr) 1fr 90px"><span class="pill">${esc(it.type)}</span><b>${esc(it.title)}</b><span class="small muted">${esc(it.org)}</span><span class="mono small" style="text-align:right">${esc(it.deadline.slice(5))}</span></div>`).join('')}</div>
  <div class="row" style="margin-top:12px"><button class="btn" data-act="cdc-add">${icon('plus')}Add ${r.items.length} to the HITAM board</button><button class="btn ghost" data-act="cdc-clear">Clear</button></div>` : ''}
  ${r && !r.items.length ? '<p class="small" style="color:var(--bad);margin-top:10px">Nothing readable found. Make sure you copied the Opportunities page (cards with Deadline and Apply Now), then try again. If it keeps failing, send me the pasted text so I can adjust the reader.</p>' : ''}</section>`;
}

function noticeOppFromCdc(it, i) {
  const skills = it.skills.filter(s => SKILLS.includes(s));
  return {
    id: `n${Date.now()}${i}`, custom: true, notice: true, type: it.type, title: it.title, org: it.org, deadline: it.deadline,
    skills: skills.length ? skills : ['Problem Solving'], lvl: 1, years: it.years, br: it.br,
    mode: /remote|online/i.test(it.location) ? 'Remote' : 'On-campus', pay: ['unknown'], dur: it.type === 'Placement' ? 'Full-time' : 'See listing', hrs: 0,
    track: ['sw'], tags: ['From CDC Explorer'], desc: it.desc, applyUrl: CAMPUS_SOURCES.cdcApp, city: 'HITAM', postedAt: new Date().toISOString()
  };
}

async function addCdcItems() {
  const r = CDCIMP.res;
  if (!r || !r.items.length) return;
  const have = new Set(allOpps().map(o => `${o.title}|${o.org}|${o.deadline}`.toLowerCase()));
  const fresh = r.items.filter(it => !have.has(`${it.title}|${it.org}|${it.deadline}`.toLowerCase()));
  if (!fresh.length) { toast('All of these are already on the board'); return; }
  const opps = fresh.map(noticeOppFromCdc);
  let ok = 0;
  if (AUTH.state === 'signedin') {
    for (const o of opps) { try { await publishNotice(o); ok += 1; } catch (err) { /* continue with the rest */ } }
  } else { commit({ custom: [...S.custom, ...opps] }); ok = opps.length; }
  CDCIMP.text = ''; CDCIMP.res = null;
  toast(ok === opps.length ? `Added ${ok} to the HITAM board${r.items.length > ok ? ` (${r.items.length - ok} already there)` : ''}` : `Added ${ok} of ${opps.length}. Try again for the rest.`);
  rerender();
}

function viewOpps(arg) {
  const tab = opTab(arg);
  return `
<header class="page-head">
  <div class="eyebrow">HITAM Opportunities</div>
  <h1 class="h1">What’s open for you, <em>${esc(tab[1].toLowerCase())}.</em></h1>
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
<details class="engine" id="notice-details" style="margin-top:36px" ${NOTICE.parsed || CDCIMP.res ? 'open' : ''}><summary>${icon('plus')} Add HITAM opportunities: import from CDC Explorer or paste a notice</summary><div class="engine-b">${cdcImportHTML()}${noticeBoxHTML()}</div></details>`;
}
