/* ============================================================
   views-admin.js — the admin's daily CDC update. Paste one or more
   CDC Explorer pages, check the preview, publish. Only the admin
   account can write (enforced by firestore.rules); students read.
   ============================================================ */
'use strict';

const ADM = { text: '', res: null, pick: { opps: true, projects: true, portals: true, tracks: true }, busy: false };
const ADM_LABELS = { opps: 'Opportunities', projects: 'Flagship projects', portals: 'Career portals', tracks: 'Learning tracks' };
const ADM_PAGES = { opps: 'Opportunities', projects: 'Multi-Stack projects', portals: 'Engineering Career Portals', tracks: 'Learning Tracks' };
const admCount = (res, k) => (k === 'opps' ? res.opps.items.length : res[k].length);
const admItems = (res, k) => (k === 'opps' ? res.opps.items : res[k]);

/** Bookmarklet that runs on the admin's own CDC page and hands its text to this app. */
function cdcBookmarklet() {
  const home = `${location.origin}${location.pathname}`;
  const code = `(function(){var t=document.body.innerText,u=${JSON.stringify(home)}+'#/admin',o=${JSON.stringify(location.origin)},w=window.open(u,'hitamopps'),n=0,iv=setInterval(function(){try{w.postMessage({hitamCdc:1,text:t},o)}catch(e){}if(++n>60)clearInterval(iv)},500);window.addEventListener('message',function(e){if(e.origin===o&&e.data&&e.data.hitamCdcAck){clearInterval(iv);alert('Sent to HITAM Opportunities. Check the preview in the other tab.')}})})();`;
  return `javascript:${encodeURIComponent(code)}`;
}

function admStatusHTML() {
  return `<div class="adm-status">${CDC_KINDS.map(k => `<div class="panel"><div class="eyebrow">${ADM_LABELS[k]}</div><b class="adm-n">${CDC[k].length}</b><span class="tiny muted">${CDC.times[k] ? `live · updated ${agoText(CDC.times[k])}` : 'not published yet'}</span></div>`).join('')}</div>`;
}

function admOppsPreview(items) {
  return `<div class="ledger" style="max-height:380px;overflow:auto">${items.map(it => `<div class="lrow adm-row"><span class="pill">${esc(it.type)}</span><div><b>${esc(it.title)}</b><div class="sub">${esc(it.org)} · ${esc(it.location || '—')}</div></div><span class="small muted">${esc(it.br === 'ALL' ? 'All branches' : it.br.join(', '))}</span><span class="small">${esc(payLabel(it.pay))}</span><span class="mono small" style="text-align:right">${it.deadline ? esc(it.deadline.slice(5).split('-').reverse().join('/')) : 'Rolling'}</span></div>`).join('')}</div>`;
}

function admPreviewHTML() {
  const r = ADM.res;
  if (!r) return '';
  const found = CDC_KINDS.filter(k => admCount(r, k));
  if (!found.length) return '<p class="small" style="color:var(--bad);margin-top:12px">Nothing readable found. Copy a whole CDC page (Ctrl+A, Ctrl+C) and paste it again.</p>';
  const o = r.opps;
  return `<section style="margin-top:22px">${sectionHead('Preview', 'check before publishing')}
  <div class="adm-pick">${CDC_KINDS.map(k => `<label class="ck adm-ck ${admCount(r, k) ? '' : 'off'}"><input type="checkbox" data-act="adm-pick" data-id="${k}" ${ADM.pick[k] && admCount(r, k) ? 'checked' : ''} ${admCount(r, k) ? '' : 'disabled'}><span><b>${admCount(r, k)}</b> ${ADM_LABELS[k].toLowerCase()}${k === 'opps' && admCount(r, k) ? `<small class="muted"> · ${o.skippedClosed} closed and ${o.skippedPast} past skipped</small>` : ''}</span></label>`).join('')}</div>
  ${o.items.length ? `<div class="lbl" style="margin:16px 0 8px">Open opportunities (${o.items.length}) · ${o.items.filter(i => !i.deadline).length} rolling</div>${admOppsPreview(o.items)}` : ''}
  ${r.projects.length ? `<div class="lbl" style="margin:16px 0 8px">Projects</div><div class="chips">${r.projects.map(p => `<span class="tag" title="${esc(p.title)}">${esc(p.code)}</span>`).join('')}</div>` : ''}
  ${r.tracks.length ? `<div class="lbl" style="margin:16px 0 8px">Tracks</div><div class="chips">${r.tracks.map(t => `<span class="tag">${esc(t.name)}</span>`).join('')}</div>` : ''}
  ${r.portals.length ? `<div class="lbl" style="margin:16px 0 8px">Portals</div><p class="small muted">${r.portals.slice(0, 12).map(p => esc(p.name)).join(', ')}${r.portals.length > 12 ? ` and ${r.portals.length - 12} more` : ''}</p>` : ''}
  <div class="row" style="margin-top:18px"><button class="btn acc" data-act="adm-publish" ${ADM.busy ? 'disabled' : ''}>${icon('upload')}${ADM.busy ? 'Publishing…' : AUTH.state === 'preview' ? 'Load on this device (preview)' : 'Publish to every HITAM student'}</button><button class="btn ghost" data-act="adm-clear">Clear</button></div>
  <p class="tiny muted" style="margin-top:8px">Publishing replaces the ticked sections with today’s list. Sections you leave unticked stay as they are.</p></section>`;
}

function viewAdmin() {
  const head = '<header class="page-head"><div class="eyebrow">Admin</div><h1 class="h1">Today’s CDC update, <em>in one paste.</em></h1>';
  if (!isAdmin() && AUTH.state !== 'preview') return `${head}<p class="lede">This page is for the app administrator only.</p></header>`;
  return `${head}<p class="lede">Copy any CDC Explorer page and paste it below. Paste several pages one after another in the same box; each kind is detected on its own. Students see the result right away, with a fit % for each item.</p></header>
${admStatusHTML()}
<section class="panel" style="margin-top:22px">
  <ol class="todo" style="margin:0 0 12px"><li><span>Open <a class="link" href="${CAMPUS_SOURCES.cdcApp}" target="_blank" rel="noopener noreferrer">CDC Explorer</a> and visit any of: ${Object.values(ADM_PAGES).map(p => `<b>${p}</b>`).join(', ')}</span></li><li><span>On each page scroll to the end, press Ctrl+A then Ctrl+C</span></li><li><span>Paste here (several pages are fine), or load a saved text file, then press Read</span></li></ol>
  <textarea id="adm-in" class="adm-in" placeholder="Paste one or more CDC Explorer pages here" aria-label="CDC Explorer text">${esc(ADM.text)}</textarea>
  <div class="row" style="margin-top:10px"><button class="btn acc" data-act="adm-read">${icon('spark')}Read</button>
  <label class="btn ghost">${icon('file')}Load a .txt file<input type="file" accept=".txt,text/plain" data-act="adm-file" hidden></label>
  <a class="btn ghost" href="${esc(cdcBookmarklet())}" onclick="event.preventDefault();toast('Drag this button to your bookmarks bar, then click it on any CDC page')" draggable="true" title="Drag to your bookmarks bar">${icon('upload')}Send CDC page (bookmark)</a></div>
  ${admPreviewHTML()}
</section>
<p class="tiny muted" style="margin-top:14px">CDC data is stored in the app’s database and is readable only by signed-in @hitam.org accounts. It is never added to the public code repository.</p>`;
}

function admRead(text) {
  ADM.text = String(text || '').slice(0, 2000000);
  if (!ADM.text.trim()) { toast('Paste a CDC page first'); return; }
  ADM.res = parseCdcAll(ADM.text);
  const found = CDC_KINDS.filter(k => admCount(ADM.res, k)).map(k => `${admCount(ADM.res, k)} ${ADM_LABELS[k].toLowerCase()}`);
  toast(found.length ? `Found ${joinList(found)}` : 'Nothing readable found');
  rerender();
}

async function admPublish() {
  const r = ADM.res;
  if (!r || ADM.busy) return;
  const kinds = CDC_KINDS.filter(k => ADM.pick[k] && admCount(r, k));
  if (!kinds.length) { toast('Tick at least one section'); return; }
  if (AUTH.state === 'preview') {
    kinds.forEach(k => setCdcData(k, admItems(r, k), new Date().toISOString()));
    toast(`Loaded ${kinds.map(k => ADM_LABELS[k].toLowerCase()).join(', ')} on this device`);
    ADM.res = null; ADM.text = ''; buildTicker(); rerender(); return;
  }
  ADM.busy = true; rerender();
  const failed = [];
  for (const k of kinds) {
    try { await publishCdc(k, JSON.parse(JSON.stringify(admItems(r, k)))); } catch (err) { failed.push(ADM_LABELS[k]); }
  }
  ADM.busy = false;
  if (failed.length) toast(`Could not publish ${failed.join(', ')}. Check that the Firestore rules are published, then try again.`);
  else { toast(`Published to every HITAM student: ${kinds.map(k => `${admCount(r, k)} ${ADM_LABELS[k].toLowerCase()}`).join(', ')}`); ADM.res = null; ADM.text = ''; }
  rerender();
}
