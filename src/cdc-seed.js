/* ============================================================
   cdc-seed.js — read the other CDC Explorer pages (flagship
   projects, career portals, learning tracks), detect which page
   was pasted, and score each item against a student's profile.
   Pure functions: used by the admin dashboard and the student views.
   ============================================================ */
'use strict';

const CDC_KINDS = ['opps', 'projects', 'portals', 'tracks'];
const cdcLines = t => String(t || '').replace(/\r/g, '').split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
const CS_FAMILY = ['CSE', 'CSM', 'CSD', 'CSC', 'CSO', 'IT'];
const normBranch = b => ({ MECH: 'MECH', MECHANICAL: 'MECH', CIVIL: 'CIVIL' }[String(b).trim().toUpperCase()] || String(b).trim().toUpperCase());

/* Stack names CDC uses that the skills dictionary does not know. */
const STACK_EXTRA = { 'mern stack': 'React Node.js JavaScript', 'scikit-learn': 'machine learning', 'power bi': 'power bi', 'qr code apis': 'web development', influxdb: 'sql', mqtt: 'iot' };
function stackSkills(stack) {
  const text = stack.map(s => `${s} ${STACK_EXTRA[s.toLowerCase()] || ''}`).join(', ');
  return Object.keys(detectSkills(text)).filter(s => SKILLS.includes(s));
}

/* ---------- Flagship projects ---------- */
const PROJECT_CODE = /^(CDC|HITAM)-\d{1,3}$/;
const DIFFICULTY = /^(easy|medium|medium-hard|hard|very high|advanced|beginner|intermediate)$/i;
function parseCdcProjects(text) {
  const L = cdcLines(text);
  const out = [];
  L.forEach((l, i) => {
    if (!PROJECT_CODE.test(l) || !L[i + 1]) return;
    const end = L.findIndex((x, j) => j > i && (PROJECT_CODE.test(x) || /^<\/pasted_content/.test(x)));
    const blk = L.slice(i + 1, end < 0 ? L.length : end);
    const at = re => blk.findIndex(x => re.test(x));
    const iAbs = at(/^full abstract$/i);
    const iDel = at(/^key deliverables/i);
    const iTech = at(/^technologies/i);
    const iEnd = at(/^(view detailed abstract|request project)$/i);
    const span = (a, b) => (a < 0 ? [] : blk.slice(a + 1, b < 0 ? blk.length : b));
    const stack = span(iTech, iEnd).filter(x => x.length <= 40);
    out.push({
      code: l, title: blk[0].slice(0, 110), level: DIFFICULTY.test(blk[1] || '') ? blk[1] : '',
      abstract: span(iAbs, iDel).join(' ').slice(0, 1500), deliverables: span(iDel, iTech).join(' ').slice(0, 1000),
      stack: stack.slice(0, 12), skills: stackSkills(stack)
    });
  });
  const seen = new Set();
  return out.filter(p => !seen.has(p.code) && seen.add(p.code)).sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
}

/* ---------- Career portals ---------- */
const PORTAL_BRANCHES = [
  [/software|it, ai|data & cloud/i, CS_FAMILY],
  [/semiconductor|ece|electronic design/i, ['ECE', 'EEE']],
  [/telecom|networking/i, ['ECE', 'EEE', ...CS_FAMILY]],
  [/electrical|energy|power/i, ['EEE', 'MECH']],
  [/mechanical|automotive|aerospace|industrial/i, ['MECH', 'EEE', 'CIVIL']]
];
const portalBranches = cat => (PORTAL_BRANCHES.find(([re]) => re.test(cat)) || [null, 'ALL'])[1];
function parseCdcPortals(text) {
  const L = cdcLines(text);
  const out = [];
  let start = 0;
  L.forEach((l, i) => {
    if (!/^visit portal$/i.test(l)) return;
    const blk = L.slice(start, i).filter(x => !/^copy url$/i.test(x));
    start = i + 1;
    const f = blk.findIndex(x => /^focus areas$/i.test(x));
    if (f < 2) return;
    const head = blk.slice(0, f - 1);
    const iInit = head.map(x => /^[A-Z0-9&]{1,3}$/.test(x)).lastIndexOf(true);
    const name = (iInit >= 0 ? head[iInit + 1] : head.filter(x => !/^portal #|^tailored for/i.test(x)).pop()) || '';
    if (!name || name.length > 90) return;
    const cat = blk[f - 1];
    out.push({ name, cat: cat.slice(0, 90), focus: (blk[f + 1] || '').slice(0, 160), br: portalBranches(cat), forCse: blk.some(x => /^tailored for cse$/i.test(x)) });
  });
  const seen = new Set();
  return out.filter(p => !seen.has(p.name.toLowerCase()) && seen.add(p.name.toLowerCase()));
}
const portalUrl = p => `https://www.google.com/search?q=${encodeURIComponent(`${p.name} careers students India`)}`;

/* ---------- Learning tracks ---------- */
function parseCdcTracks(text) {
  const L = cdcLines(text);
  const out = [];
  let start = 0;
  L.forEach((l, i) => {
    if (!/^explore journey$/i.test(l)) return;
    const blk = L.slice(start, i).filter(x => !/^recommended for your branch$/i.test(x));
    start = i + 1;
    const f = blk.findIndex(x => /^focus:/i.test(x));
    if (f < 1) return;
    const sem = blk.find(x => /^\d+\s+semesters?$/i.test(x)) || '';
    const pref = blk.find(x => /^preferably for:/i.test(x)) || '';
    const focus = blk[f].replace(/^focus:\s*/i, '');
    out.push({
      name: blk[f - 1].slice(0, 90), focus: focus.slice(0, 240), semesters: Number(sem.match(/\d+/) ? sem.match(/\d+/)[0] : 0) || null,
      br: pref ? pref.replace(/^preferably for:\s*/i, '').split(/[,/]+/).map(normBranch).filter(Boolean) : 'ALL',
      skills: Object.keys(detectSkills(`${blk[f - 1]} ${focus}`)).filter(s => SKILLS.includes(s))
    });
  });
  return out;
}

/** Detect every CDC page in one paste. Any section may be missing. */
function parseCdcAll(text, now = new Date()) {
  return { opps: parseCdcText(text, now), projects: parseCdcProjects(text), portals: parseCdcPortals(text), tracks: parseCdcTracks(text) };
}

/* ---------- Student-facing objects and fit ---------- */
function hashStr(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/** A stored CDC opportunity to an app listing. Untrusted input: every field is checked. */
function cdcItemToOpp(it) {
  if (!it || typeof it.title !== 'string' || !TYPES.includes(it.type)) return null;
  const deadline = /^\d{4}-\d{2}-\d{2}$/.test(it.deadline || '') ? it.deadline : undefined;
  const posted = /^\d{4}-\d{2}-\d{2}$/.test(it.postedOn || '') ? `${it.postedOn}T09:00:00` : null;
  const loc = String(it.location || '').slice(0, 80);
  const skills = (Array.isArray(it.skills) ? it.skills : []).filter(s => SKILLS.includes(s)).slice(0, 6);
  const payOk = Array.isArray(it.pay) && ['stipend', 'ctc', 'none', 'text', 'unknown'].includes(it.pay[0]);
  return {
    id: `cdc-${hashStr(`${it.title}|${it.org}`.toLowerCase())}`, cdc: true, type: it.type, title: it.title.slice(0, 90), org: String(it.org || '').slice(0, 60),
    deadline, br: it.br === 'ALL' ? 'ALL' : (Array.isArray(it.br) && it.br.length ? it.br.map(String) : 'ALL'),
    years: Array.isArray(it.years) && it.years.length ? it.years.filter(y => [1, 2, 3, 4].includes(y)) : [1, 2, 3, 4],
    mode: /remote|online/i.test(loc) ? 'Remote' : /hybrid/i.test(loc) ? 'Hybrid' : 'On-site', city: loc || 'India', location: loc,
    pay: payOk ? it.pay.slice(0, 2) : ['unknown'], skills: skills.length ? skills : ['Problem Solving'], lvl: 1,
    dur: it.type === 'Placement' ? 'Full-time' : deadline ? 'See listing' : 'Rolling', hrs: 0, track: ['sw'],
    tags: ['HITAM listing', ...(deadline ? [] : ['Rolling'])], desc: String(it.desc || '').replace(/^From CDC Explorer[^.]*\.\s*/, '').slice(0, 1200),
    applyUrl: isHttpUrl(it.link) ? it.link : CAMPUS_SOURCES.cdcApp, postedAt: posted
  };
}

const branchFits = (br, p) => br === 'ALL' || br.includes(p.branch) || (CS_FAMILY.includes(p.branch) && br.some(b => CS_FAMILY.includes(b)));
const skillShare = (need, p, bar = 2) => (need.length ? need.reduce((a, s) => a + Math.min(1, (p.skills[s] || 0) / bar), 0) / need.length : 0.5);

/** Project fit: 70% skills against the stack (intermediate bar), 30% difficulty against year. */
function projectFit(pr, p) {
  const hard = /hard|very high|advanced/i.test(pr.level);
  const yearV = !hard || Number(p.year) >= 3 ? 1 : Number(p.year) === 2 ? 0.6 : 0.3;
  const have = pr.skills.filter(s => (p.skills[s] || 0) >= 1);
  return { score: Math.round(100 * (0.7 * skillShare(pr.skills, p) + 0.3 * yearV)), have, gaps: pr.skills.filter(s => !have.includes(s)) };
}

/** Track fit: 60% branch preference, 40% skills it builds on. */
function trackFit(t, p) {
  const brV = t.br === 'ALL' ? 0.7 : branchFits(t.br, p) ? 1 : 0;
  const have = t.skills.filter(s => (p.skills[s] || 0) >= 1);
  const skV = t.skills.length ? have.length / t.skills.length : 0.5;
  return { score: Math.round(100 * (0.6 * brV + 0.4 * skV)), forBranch: brV === 1, have };
}

if (typeof module !== 'undefined') module.exports = { parseCdcAll, parseCdcProjects, parseCdcPortals, parseCdcTracks, cdcItemToOpp, projectFit, trackFit };
