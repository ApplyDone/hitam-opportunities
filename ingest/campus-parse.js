'use strict';
/* ============================================================
   campus-parse.js — pure parsers for official hitam.org data.
   Placement tables contain student names and roll numbers: we
   read ONLY branch, company and package, and only keep totals.
   ============================================================ */
const BRANCH_MAP = [[/(^|[^a-z])csc([^a-z]|$)|cyber/i, 'CSC'], [/(^|[^a-z])cso([^a-z]|$)|iot|internet of things/i, 'CSO'], [/csm|ai\s*&?\s*ml|aiml/i, 'CSM'], [/csd|data science/i, 'CSD'], [/\bit\b|information tech/i, 'IT'], [/ece|electronics and comm/i, 'ECE'], [/eee|electrical/i, 'EEE'], [/mech/i, 'MECH'], [/civil/i, 'CIVIL'], [/cse|computer science/i, 'CSE']];
const cellText = c => c.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;|&#\d+;/g, ' ').replace(/﻿/g, '').replace(/\s+/g, ' ').trim();
const normBranch = b => (BRANCH_MAP.find(([re]) => re.test(b)) || [])[1] || '';
const normCompany = c => c.replace(/\s+/g, ' ').replace(/\b(pvt|private)\.?\s*(ltd|limited)\.?$/i, '').replace(/[.,]$/, '').trim();

/** Returns [{branch, company, pkg, year}] — never names or roll numbers. */
function parsePlacementTables(html) {
  const out = [];
  const parts = String(html).split(/(<table[\s\S]*?<\/table>)/);
  let year = null;
  parts.forEach(part => {
    if (!part.startsWith('<table')) {
      const ys = part.replace(/<[^>]+>/g, ' ').match(/placements?\s*(?:list\s*)?(20\d\d)/gi);
      if (ys) year = Number(ys[ys.length - 1].match(/20\d\d/)[0]);
      return;
    }
    const rows = (part.match(/<tr[\s\S]*?<\/tr>/g) || []).map(r => (r.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/g) || []).map(cellText));
    if (!rows.length) return;
    const head = rows[0].map(h => h.toLowerCase());
    const iCo = head.findIndex(h => /company/.test(h));
    const iBr = head.findIndex(h => /branch|dept/.test(h));
    const iPk = head.findIndex(h => /package|ctc|lpa|salary/.test(h));
    if (iCo < 0) return;
    rows.slice(1).forEach(r => {
      const company = normCompany(r[iCo] || '');
      if (!company || company.length > 80) return;
      const pkg = iPk >= 0 ? parseFloat(String(r[iPk]).replace(/[^\d.]/g, '')) : NaN;
      out.push({ company, branch: iBr >= 0 ? normBranch(r[iBr] || '') : '', pkg: Number.isFinite(pkg) && pkg > 0 && pkg < 100 ? pkg : null, year });
    });
  });
  return out;
}

const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/** Totals only. */
function aggregatePlacements(rows) {
  const byCo = new Map();
  rows.forEach(r => {
    const k = r.company.toLowerCase();
    const cur = byCo.get(k) || { company: r.company, offers: 0, branches: new Set(), pkgs: [], years: new Set() };
    cur.offers += 1;
    if (r.branch) cur.branches.add(r.branch);
    if (r.pkg) cur.pkgs.push(r.pkg);
    if (r.year) cur.years.add(r.year);
    byCo.set(k, cur);
  });
  const recruiters = [...byCo.values()].map(c => ({ company: c.company, offers: c.offers, branches: [...c.branches].sort(), maxPkg: c.pkgs.length ? Math.max(...c.pkgs) : null, medianPkg: median(c.pkgs), years: [...c.years].sort() }))
    .sort((a, b) => b.offers - a.offers || (b.maxPkg || 0) - (a.maxPkg || 0));
  const pk = rows.map(r => r.pkg).filter(Boolean);
  const byBranch = {};
  rows.forEach(r => { if (r.branch) byBranch[r.branch] = (byBranch[r.branch] || 0) + 1; });
  const years = [...new Set(rows.map(r => r.year).filter(Boolean))].sort();
  return { recruiters, stats: { offers: rows.length, companies: recruiters.length, medianPkg: median(pk), maxPkg: pk.length ? Math.max(...pk) : null, byBranch, years } };
}

function postToItem(p, catNames) {
  const title = cellText(p.title && p.title.rendered ? p.title.rendered : '');
  const excerpt = cellText(p.excerpt && p.excerpt.rendered ? p.excerpt.rendered : '').slice(0, 220);
  const kinds = (p.categories || []).map(c => catNames[c]).filter(Boolean);
  return { id: p.id, title, date: String(p.date || '').slice(0, 10), link: p.link, excerpt, kinds };
}
/* Same story re-posted with reworded titles: treat as duplicate when most words overlap. */
const STOP = new Set(['hitam', 'the', 'in', 'with', 'for', 'and', 'of', 'a', 'to', 'program', 'programme']);
const wordSet = t => new Set(t.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w)));
const overlap = (a, b) => { const inter = [...a].filter(w => b.has(w)).length; return inter / Math.max(1, Math.min(a.size, b.size)); };
function dedupePosts(items) {
  const kept = [];
  items.forEach(i => {
    const ws = wordSet(i.title);
    if (!ws.size || !/[a-z]/i.test(i.title)) return; // also drops titles in non-Latin scripts duplicated from English posts
    if (kept.some(k => overlap(k.ws, ws) >= (k.date === i.date ? 0.25 : 0.5))) return;
    kept.push({ ...i, ws });
  });
  return kept.map(({ ws, ...i }) => i);
}

module.exports = { parsePlacementTables, aggregatePlacements, postToItem, dedupePosts, normBranch };
