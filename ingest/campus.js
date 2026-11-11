'use strict';
/* ============================================================
   campus.js — collects public, official HITAM data from
   hitam.org (WordPress REST API; robots.txt allows it).
   Writes data/campus.json. Login-gated CDC Explorer is NOT read.
   ============================================================ */
const fs = require('node:fs');
const path = require('node:path');
const { getJson } = require('./sources.js');
const P = require('./campus-parse.js');

const BASE = 'https://hitam.org/wp-json/wp/v2';
const CATS = { 12: 'Event', 24: 'Student activity', 11: 'News', 23: 'Blog' };

async function collectCampus() {
  const posts = await getJson(`${BASE}/posts?per_page=40&categories=12,24,11&_fields=id,date,link,title,excerpt,categories`);
  const news = P.dedupePosts(posts.map(p => P.postToItem(p, CATS))).slice(0, 24);
  const pages = await getJson(`${BASE}/pages?slug=placement-lists&_fields=content,modified,link`);
  const page = pages[0];
  const agg = page ? P.aggregatePlacements(P.parsePlacementTables(page.content.rendered)) : { recruiters: [], stats: {} };
  return {
    generatedAt: new Date().toISOString(),
    sources: { news: 'https://hitam.org/news-and-media/', placements: page ? page.link : 'https://hitam.org/placement-lists/', placementsUpdated: page ? page.modified : null },
    news,
    placements: agg,
    contacts: { cdcPage: 'https://hitam.org/career-design-centre/', cdcExplorer: 'https://cdc.hitam.org/', trainingPage: 'https://hitam.org/training-and-placements/', clubsPage: 'https://hitam.org/clubs-and-societies/' }
  };
}

if (require.main === module) {
  collectCampus().then(out => {
    const file = path.join(__dirname, '..', 'data', 'campus.json');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(out));
    const s = out.placements.stats;
    console.log(`Campus: ${out.news.length} official posts, ${s.offers || 0} placement offers from ${s.companies || 0} companies (median ${s.medianPkg} LPA). Wrote data/campus.json`);
  }).catch(err => { console.error('Campus collection failed:', err.message); process.exit(1); });
}

module.exports = { collectCampus };
