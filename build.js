'use strict';
/* Inlines src/style.css and src/*.js into one self-contained HTML file. */
const fs = require('node:fs');
const path = require('node:path');

const SRC = path.join(__dirname, 'src');
const OUT_DIR = path.join(__dirname, 'dist');
const ORDER = ['data.js', 'skills-dict.js', 'directory.js', 'engine.js', 'assistant.js', 'store.js', 'roll.js', 'config.js', 'auth.js', 'ui.js', 'views-home.js', 'views-explore.js', 'views-match.js', 'views-work.js', 'views-more.js', 'campus-info.js', 'notice.js', 'views-campus.js', 'views-opps.js', 'views-start.js', 'resume.js', 'views-resume.js', 'views-playbook.js', 'main.js'];

const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');
const css = read('theme.css');
const CONFIG_FILE = path.join(__dirname, 'config', 'firebase.json');
const fbConfig = fs.existsSync(CONFIG_FILE) ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) : null;
const js = ORDER.map(f => (f === 'config.js' && fbConfig ? `'use strict';\nconst APP_CONFIG = { firebase: ${JSON.stringify(fbConfig)}, allowedDomain: 'hitam.org' };` : read(f))).join('\n\n');
if (js.includes('</script')) throw new Error('JS contains a closing script tag');
const JOBS_FILE = path.join(__dirname, 'data', 'jobs.json');
const jobsJson = fs.existsSync(JOBS_FILE) ? fs.readFileSync(JOBS_FILE, 'utf8') : '';
const CAMPUS_FILE = path.join(__dirname, 'data', 'campus.json');
const campusTag = fs.existsSync(CAMPUS_FILE) ? `<script id="campus-data" type="application/json">${JSON.stringify(JSON.parse(fs.readFileSync(CAMPUS_FILE, 'utf8'))).replace(/</g, '\\u003c')}</script>` : '';
const liveTag = jobsJson ? `<script id="live-jobs" type="application/json">${JSON.stringify(JSON.parse(jobsJson)).replace(/</g, '\\u003c')}</script>` : '';

const html = `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>HITAM Opportunities</title>
<meta name="description" content="Find, match, prepare for and track campus opportunities at HITAM.">
<meta name="theme-color" content="#f6f6f3">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap">
<style>
${css}
</style>
</head>
<body>
<div id="app"></div>
${campusTag}
${liveTag}
<noscript>This app needs JavaScript.</noscript>
<script>
${js}
</script>
</body>
</html>
`;

fs.mkdirSync(OUT_DIR, { recursive: true });
const out = path.join(OUT_DIR, 'HITAM Opportunities Intelligence v2.html');
fs.writeFileSync(out, html, 'utf8');
// Hostable copy for GitHub Pages: index.html plus the fresh data the page fetches.
const SITE = path.join(__dirname, 'site');
fs.mkdirSync(path.join(SITE, 'data'), { recursive: true });
fs.writeFileSync(path.join(SITE, 'index.html'), html, 'utf8');
['jobs.json', 'campus.json', 'digest.txt'].forEach(f => {
  const src = path.join(__dirname, 'data', f);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(SITE, 'data', f));
});
console.log(`Built ${out} (${(html.length / 1024).toFixed(1)} KB)`);
