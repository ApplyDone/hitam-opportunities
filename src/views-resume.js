/* ============================================================
   views-resume.js — Resume Studio: upload -> read locally ->
   score -> fix -> tailor -> one-click profile update.
   ============================================================ */
'use strict';

const LIBS = {
  pdf: { src: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', sri: 'sha384-/1qUCSGwTur9vjf/z9lmu/eCUYbpOTgSjmpbMQZ1/CtX2v/WcAIKqRv+U1DUCG6e', worker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js' },
  docx: { src: 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js', sri: 'sha384-nFoSjZIoH3CCp8W639jJyQkuPHinJ2NHe7on1xvlUA7SuGfJAfvMldrsoAVm6ECz' }
};
const MAX_FILE = 5 * 1024 * 1024;
const RS = { phase: 'idle', steps: [], error: '', tailorId: '' };
const loaded = {};

function loadScript({ src, sri }) {
  if (!loaded[src]) {
    loaded[src] = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.integrity = sri; s.crossOrigin = 'anonymous'; s.referrerPolicy = 'no-referrer';
      s.onload = resolve;
      s.onerror = () => { delete loaded[src]; reject(new Error('Could not load the file reader. Check your internet connection, or paste the text instead.')); };
      document.head.appendChild(s);
    });
  }
  return loaded[src];
}

async function readResumeFile(file) {
  if (file.size > MAX_FILE) throw new Error('That file is over 5 MB. Export a smaller PDF, or paste the text.');
  const name = file.name.toLowerCase();
  if (name.endsWith('.txt') || file.type === 'text/plain') return { text: await file.text(), pages: null };
  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    await loadScript(LIBS.pdf);
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = LIBS.pdf.worker;
    const doc = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const out = [];
    for (let i = 1; i <= doc.numPages; i += 1) {
      const page = await doc.getPage(i);
      const tc = await page.getTextContent();
      out.push(tc.items.map(it => it.str + (it.hasEOL ? '\n' : ' ')).join(''));
    }
    return { text: out.join('\n'), pages: doc.numPages };
  }
  if (name.endsWith('.docx')) {
    await loadScript(LIBS.docx);
    const res = await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return { text: res.value, pages: null };
  }
  throw new Error('Use a PDF, DOCX or TXT file. Old .doc files: save as PDF first.');
}

/* ---------- Derived numbers ---------- */
function demandSkills(profile) {
  const pool = allOpps().filter(o => !isClosed(o) && (!profile.track || (o.track || []).includes(profile.track)));
  const counts = {};
  pool.forEach(o => o.skills.forEach(s => { counts[s] = (counts[s] || 0) + (o.live ? 2 : 1); }));
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([s]) => s).filter(s => !['Communication', 'Problem Solving'].includes(s));
}
const strongCount = p => rankOpps(allOpps(), p, S.weights).filter(x => !x.r.closed && x.r.elig.ok && x.r.score >= 70).length;

async function runResume(getText, fileName) {
  RS.phase = 'reading'; RS.error = ''; RS.steps = [];
  const step = async (label, ms = 260) => { RS.steps = [...RS.steps, label]; if (current.name === 'resume') rerender(); await new Promise(r => setTimeout(r, ms)); };
  try {
    await step(`Reading ${fileName}`);
    const { text, pages } = await getText();
    if (!text || text.trim().length < 80) throw new Error('Could not find enough text. If this is a scanned image PDF, paste the text instead.');
    const parsed = parseResume(text, { pages });
    await step(`Found ${Object.keys(parsed.sections).filter(k => k !== 'header').length} sections and ${parsed.bullets.length} bullet points`);
    await step(`Recognised ${Object.keys(parsed.skills).length} skills`);
    await step(`Scoring against 12 recruiter checks`);
    await step(`Re-ranking ${allOpps().filter(o => !isClosed(o)).length} open listings for you`, 380);
    commit({ resume: { text: text.slice(0, 60000), pages, fileName: String(fileName).slice(0, 80), at: Date.now() } });
    RS.phase = 'done';
  } catch (err) {
    RS.phase = 'idle';
    RS.error = err.message || 'Something went wrong reading that file.';
  }
  if (current.name === 'resume') rerender();
}

/* ---------- Pieces ---------- */
const SAMPLE_RESUME = `Sample Student
sample.student@example.com | +91 90000 00000 | github.com/sample-student
EDUCATION
B.Tech, Computer Science and Engineering, HITAM, Hyderabad 2024 - 2028
CGPA: 7.9/10
SKILLS
Python, C, HTML, CSS, JavaScript, SQL, Git
PROJECTS
College Event Website
• Worked on the frontend of the college fest website using HTML, CSS and JavaScript
• Responsible for making the pages responsive
Expense Tracker
• Built a Python and SQLite expense tracker used by 40 hostel students
ACHIEVEMENTS
• Participated in HITAM Hack-a-thon
I am a hardworking and passionate student who is a quick learner.`;

function dropzoneHTML() {
  const steps = RS.phase === 'reading'
    ? `<ol class="rs-steps">${RS.steps.map((s, i) => `<li class="${i === RS.steps.length - 1 ? 'now' : 'done'}">${esc(s)}</li>`).join('')}</ol>`
    : '';
  return `<section class="drop ${RS.phase === 'reading' ? 'busy' : ''}" id="drop">
    ${RS.phase === 'reading' ? `<div class="eyebrow"><b>Reading</b> · in your browser</div>${steps}` : `
    <div class="drop-ic">${icon('upload')}</div>
    <h2 class="h2">Drop your resume here</h2>
    <p class="muted">PDF, DOCX or TXT, up to 5 MB. It is read inside your browser and never uploaded anywhere.</p>
    <div class="row" style="justify-content:center;margin-top:16px">
      <label class="btn acc" style="cursor:pointer">${icon('file')}Choose a file<input type="file" accept=".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" data-act="rs-file" hidden></label>
      <button class="btn ghost" data-act="rs-sample">Try a sample resume</button>
    </div>
    ${RS.error ? `<p class="rs-err" role="alert">${esc(RS.error)}</p>` : ''}
    <details class="rs-paste"><summary>Or paste the text</summary><textarea id="rs-paste" placeholder="Paste your resume text here" aria-label="Resume text"></textarea><button class="btn sm" data-act="rs-paste">Read pasted text</button></details>`}
  </section>`;
}

function checksHTML(sc) {
  const rows = [...sc.checks].sort((a, b) => (b.max - b.points) - (a.max - a.points));
  return rows.map(c => `<div class="rs-check ${c.ok ? 'ok' : ''}">
    <span class="ic ${c.ok ? 'y' : c.points > 0 ? 'w' : 'n'}">${c.ok ? '✓' : c.points > 0 ? '~' : '×'}</span>
    <div><div class="row between" style="gap:8px"><b>${esc(c.label)}</b><span class="mono small">${c.points}/${c.max}</span></div>
    <div class="small muted">${esc(c.detail)}</div>
    ${c.ok ? '' : `<div class="small rs-fix">${esc(c.fix)}</div>${c.examples.length ? `<ul class="rs-ex">${c.examples.map(e => `<li>“${esc(e)}”</li>`).join('')}</ul>` : ''}`}</div>
  </div>`).join('');
}

function factsHTML(r) {
  const lv = s => r.skills[s];
  const skills = Object.keys(r.skills).sort((a, b) => lv(b) - lv(a));
  const row = (k, v) => `<div class="row between rs-fact"><span class="lbl">${k}</span><span>${v ? esc(v) : '<span class="muted">not found</span>'}</span></div>`;
  return `${row('Name', r.name)}${row('Branch', r.branch)}${row('Year', r.year ? `Year ${r.year} (graduating ${r.gradYear})` : '')}${row('CGPA', r.cgpa)}${row('LinkedIn', r.links.linkedin ? 'yes' : '')}${row('GitHub', r.links.github ? 'yes' : '')}
  <div class="lbl" style="margin:14px 0 8px">Skills, with the level I inferred</div>
  <div class="chips">${skills.map(s => `<span class="tag ${lv(s) >= 2 ? 'have' : ''}" title="${LEVELS[lv(s)]}">${esc(s)} · ${lv(s)}</span>`).join('') || '<span class="muted small">None recognised</span>'}</div>
  <p class="tiny muted" style="margin-top:8px">1 = only listed, 2 = used in a project, 3 = used at an internship or mentioned often. Adjust anything in your profile.</p>`;
}

function tailorHTML(r) {
  const rows = rankOpps(allOpps(), S.profile, S.weights).filter(x => !x.r.closed).slice(0, 14);
  if (!rows.length) return '';
  const pick = oppById(RS.tailorId) || rows[0].o;
  const t = tailorToJob(r, pick);
  return `<div class="row" style="margin-bottom:14px"><label class="lbl" for="rs-tailor">Compare with</label><select id="rs-tailor" data-act="rs-tailor" style="max-width:520px">${rows.map(x => `<option value="${x.o.id}" ${String(x.o.id) === String(pick.id) ? 'selected' : ''}>${esc(x.o.title)} — ${esc(x.o.org)}${x.o.live ? ' (live)' : ''}</option>`).join('')}</select></div>
  <div class="row" style="gap:22px;align-items:flex-start"><div class="ring" style="--p:${t.pct};--sz:104px"><span>${t.pct}</span></div>
  <div class="grow"><div class="small muted">Keyword match with this listing</div>
  <div class="lbl" style="margin:10px 0 6px">Already on your resume</div><div class="chips">${t.present.map(k => `<span class="tag have">${esc(k)}</span>`).join('') || '<span class="muted small">none</span>'}</div>
  <div class="lbl" style="margin:12px 0 6px">Missing</div><div class="chips">${t.missing.map(k => `<span class="tag gap">${esc(k)}</span>`).join('') || '<span class="muted small">nothing, nice</span>'}</div>
  ${t.missing.length ? `<ul class="todo" style="color:var(--ink-2)">${t.missing.slice(0, 4).map(k => `<li><b>${esc(k)}</b>: if you have used it, name it in a project bullet. ${LEARN[k] ? `If not: ${esc(LEARN[k])}.` : 'If not, leave it out. Never claim a skill you cannot discuss.'}</li>`).join('')}</ul>` : ''}
  ${pick.applyUrl ? `<a class="btn sm acc" style="margin-top:12px" href="${esc(pick.applyUrl)}" target="_blank" rel="noopener noreferrer">${icon('arrow')}Apply on ${esc(pick.org)}</a>` : `<button class="btn sm ghost" style="margin-top:12px" data-act="open" data-id="${pick.id}">Open listing</button>`}</div></div>`;
}

function resultsHTML_rs() {
  const r = parseResume(S.resume.text, { pages: S.resume.pages });
  const sc = scoreResume(r, { demand: demandSkills(S.profile) });
  const { patch, diff } = profileFromResume(r, S.profile);
  const before = strongCount(S.profile);
  const after = strongCount({ ...S.profile, ...patch });
  const fixes = bulletFixes(r);
  const top = rankOpps(allOpps(), { ...S.profile, ...patch }, S.weights).filter(x => !x.r.closed && x.r.elig.ok).slice(0, 4);
  return `
<article class="lead-card rs-hero">
  <div class="lead-l" style="--tc:var(--acc)">
    <div class="eyebrow"><b>Resume score</b> · ${esc(S.resume.fileName)}</div>
    <div class="lead-r-big"><span class="big">${sc.score}</span><small>/100 · ${sc.grade}</small></div>
    <p>${sc.checks.filter(c => !c.ok).length} things to fix. The biggest wins are at the top of the list below.</p>
    <div class="row"><label class="btn ghost" style="cursor:pointer">${icon('upload')}Upload new version<input type="file" accept=".pdf,.docx,.txt" data-act="rs-file" hidden></label><button class="btn ghost" data-act="rs-delete">${icon('trash')}Delete resume</button></div>
  </div>
  <div class="lead-r">
    <div class="eyebrow"><b>What your resume changes</b></div>
    <div class="rs-ba"><div><span class="big-n">${before}</span><span class="lbl">strong matches now</span></div><span class="rs-arrow">${icon('arrow')}</span><div><span class="big-n acc">${after}</span><span class="lbl">after update</span></div></div>
    ${diff.length ? `<div class="chips">${diff.slice(0, 9).map(d => `<span class="tag">${esc(d.field)}: ${esc(d.to)}</span>`).join('')}${diff.length > 9 ? `<span class="tag">+${diff.length - 9} more</span>` : ''}</div>
    <button class="btn acc" data-act="rs-apply">${icon('check')}Update my profile with this</button>` : '<p class="small">Your profile already reflects this resume.</p><a class="btn ghost" href="#/matches">See my matches</a>'}
  </div>
</article>
<div class="cols" style="margin-top:40px">
  <div class="stack" style="--g:44px">
    <section>${sectionHead('Fix these first', 'biggest gains on top')}<div class="rs-checks">${checksHTML(sc)}</div></section>
    ${fixes.length ? `<section>${sectionHead('Rewrite weak bullets', `${fixes.length} suggestions`)}<div class="stack" style="--g:12px">${fixes.map(f => `<div class="rs-bullet"><div class="rs-before"><span class="lbl">Before</span>${esc(f.before)}</div><div class="rs-after"><span class="lbl">After</span>${esc(f.after)}<button class="btn sm ghost" data-act="copy-text" data-text="${esc(f.after)}">${icon('copy')}Copy</button></div><div class="chips">${f.issues.map(i => `<span class="pill acc">${i}</span>`).join('')}</div></div>`).join('')}</div><p class="small muted" style="margin-top:10px">Replace every [bracket] with a real result. Never invent numbers.</p></section>` : ''}
    <section>${sectionHead('Tailor to a listing', 'keyword match')}<div id="rs-tailor-box">${tailorHTML(r)}</div></section>
    ${top.length ? `<section>${sectionHead('Best listings for this resume', 'after the update')}<div class="tkts">${top.map((x, i) => ticket(x.o, x.r, i)).join('')}</div></section>` : ''}
  </div>
  <aside class="stack sticky" style="--g:18px"><section class="panel">${sectionHead('What I found')}${factsHTML(r)}</section>
  <section class="panel"><div class="eyebrow">Privacy</div><p class="small" style="margin-top:6px">Your resume text is stored only in this browser so the page remembers it. Delete it any time.</p></section></aside>
</div>`;
}

function viewResume() {
  const showResults = S.resume && RS.phase !== 'reading';
  return `
<header class="page-head">
  <div class="eyebrow">Resume Studio</div>
  <h1 class="h1">Upload once. <em>Everything adjusts.</em></h1>
  <p class="lede">Your resume fills in your skills, branch, year and CGPA, re-ranks every listing, and gets a recruiter-style review with concrete fixes.</p>
</header>
${showResults ? resultsHTML_rs() : dropzoneHTML()}`;
}
