/* ============================================================
   resume.js — pure resume intelligence (no DOM, no network).
   parseResume(text) -> structured facts
   scoreResume(parsed, ctx) -> 0..100 with checks and fixes
   bulletFixes(parsed) -> before/after rewrites
   tailorToJob(parsed, job) -> keyword match for one listing
   profileFromResume(parsed, profile) -> patch + human diff
   Runs entirely in the browser; the file never leaves it.
   ============================================================ */
'use strict';

const SECTION_RE = /^(?:[#*•\s-]*)(education|academic(?:s| details| background)?|(?:technical )?skills|skill set|core competencies|projects?|academic projects|(?:work |professional )?experience|internships?|certifications?|certificates|achievements|awards|activities|extra[- ]?curricular(?: activities)?|positions? of responsibility|leadership|summary|objective|profile|about me|publications|hackathons?|courses?|coursework)\s*:?\s*$/i;
const SECTION_KEY = h => {
  const t = h.toLowerCase();
  if (/educat|academic(?!.*project)/.test(t)) return 'education';
  if (/skill|competenc/.test(t)) return 'skills';
  if (/project/.test(t)) return 'projects';
  if (/experience|intern/.test(t)) return 'experience';
  if (/certif|course/.test(t)) return 'certifications';
  if (/achiev|award|hackathon/.test(t)) return 'achievements';
  if (/activit|curricular|responsib|leadership/.test(t)) return 'activities';
  if (/summary|objective|profile|about/.test(t)) return 'summary';
  return 'other';
};
const BULLET_RE = /^\s*(?:[•●▪◦‣∙·*–-]|\d+[.)])\s+/;
const STRONG_VERBS = ['Built', 'Designed', 'Developed', 'Implemented', 'Automated', 'Optimised', 'Optimized', 'Led', 'Launched', 'Reduced', 'Increased', 'Created', 'Engineered', 'Analysed', 'Analyzed', 'Deployed', 'Integrated', 'Improved', 'Shipped', 'Migrated', 'Trained', 'Won', 'Architected', 'Organised', 'Organized', 'Coordinated', 'Researched', 'Published', 'Mentored', 'Debugged', 'Tested', 'Wrote', 'Scaled', 'Delivered', 'Configured', 'Modelled', 'Modeled', 'Simulated', 'Prototyped', 'Presented', 'Achieved', 'Ranked', 'Secured', 'Earned', 'Completed'];
const STRONG_RE = new RegExp(`^(${STRONG_VERBS.join('|')})\\b`, 'i');
const WEAK_RE = /^(worked on|working on|responsible for|helped( in| with)?|did|was part of|part of|involved in|participated in|assisted( in| with)?|handled|tasked with|duties included|learned|learnt|made)\b/i;
const CLICHES = ['hardworking', 'hard working', 'hard-working', 'team player', 'go-getter', 'passionate', 'self-motivated', 'self motivated', 'result-oriented', 'results-oriented', 'detail-oriented', 'quick learner', 'synergy', 'dynamic individual', 'think outside the box', 'seeking a challenging'];
const SOFT = new Set(['Communication', 'Problem Solving', 'Public Speaking', 'Leadership', 'Technical Writing']);

const BRANCH_PATTERNS = [
  ['CSM', /(computer science|cse)\s*(and|&|\(|-|with)?\s*(engineering)?\s*\(?\s*(ai\s*(&|and)\s*ml|artificial intelligence\s*(&|and)\s*machine learning)|\bcsm\b/i],
  ['CSD', /(computer science|cse)\s*(and|&|\(|-|with)?\s*(engineering)?\s*\(?\s*data science|\bcsd\b/i],
  ['IT', /information technology|\bb\.?\s?tech\.?\s*(in\s*)?it\b/i],
  ['ECE', /electronics\s*(and|&)\s*communication|\bece\b/i],
  ['EEE', /electrical\s*(and|&)\s*electronics|\beee\b/i],
  ['MECH', /mechanical|\bmech\b/i],
  ['CIVIL', /\bcivil\b/i],
  ['CSE', /computer science|\bcse\b/i]
];

const words = s => (s.match(/[A-Za-z][A-Za-z'+#.-]*/g) || []).length;

function splitSections(lines) {
  const sections = { header: [] };
  let cur = 'header';
  lines.forEach(l => {
    const t = l.trim();
    if (t && t.length <= 42 && SECTION_RE.test(t)) { cur = SECTION_KEY(t.replace(/[#*•:]/g, '').trim()); sections[cur] = sections[cur] || []; return; }
    (sections[cur] = sections[cur] || []).push(l);
  });
  return sections;
}

function academicYear(gradYear, now) {
  const endYear = now.getMonth() >= 5 ? now.getFullYear() + 1 : now.getFullYear();
  const y = 4 - (gradYear - endYear);
  return y >= 1 && y <= 4 ? y : null;
}

/** Turn raw resume text into structured facts. */
function parseResume(rawText, { pages = null, now = new Date() } = {}) {
  const text = String(rawText || '').replace(/\r/g, '').replace(/ /g, ' ').replace(/[ \t]+/g, ' ');
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const sections = splitSections(lines);
  const secText = k => (sections[k] || []).join('\n');

  const email = (text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/) || [])[0] || '';
  const phone = (text.match(/(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/) || [])[0] || '';
  const linkedin = (text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+/i) || [])[0] || '';
  const github = (text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_-]+/i) || [])[0] || '';
  const portfolio = (text.match(/https?:\/\/(?!(?:www\.)?(?:linkedin|github)\.com)[^\s,)]+/i) || [])[0] || '';

  const first = lines[0] || '';
  const name = /@|\d|resume|curriculum/i.test(first) || first.split(/\s+/).length > 5 ? '' : first.replace(/[^A-Za-z .'-]/g, '').trim();

  const eduText = secText('education') || text;
  const branch = (BRANCH_PATTERNS.find(([, re]) => re.test(eduText)) || [])[0] || '';
  const cg = eduText.match(/(?:cgpa|gpa|sgpa|cpi)\s*[:\-–]?\s*(\d{1,2}(?:\.\d{1,2})?)(?:\s*\/\s*10)?/i) || eduText.match(/(\d\.\d{1,2})\s*\/\s*10\b/);
  const cgpa = cg && Number(cg[1]) <= 10 ? String(Number(cg[1])) : '';
  const btechLine = lines.find(l => /b\.?\s?tech|b\.?e\.?\b|bachelor/i.test(l) && /20\d\d/.test(l)) || '';
  const yearsInEdu = (btechLine || eduText).match(/20[2-3]\d/g) || [];
  const gradYear = yearsInEdu.length ? Math.max(...yearsInEdu.map(Number).filter(y => y <= now.getFullYear() + 5)) : null;
  const year = gradYear ? academicYear(gradYear, now) : null;

  const bulletLines = lines.filter(l => BULLET_RE.test(l)).map(l => l.replace(BULLET_RE, '').trim()).filter(l => l.length > 12);
  const sectionBullets = ['projects', 'experience', 'activities', 'achievements']
    .flatMap(k => (sections[k] || []).filter(l => !BULLET_RE.test(l) && l.length > 45));
  const bullets = [...new Set([...bulletLines, ...sectionBullets])];

  const counts = detectSkills(text);
  const inProj = detectSkills(secText('projects'));
  const inExp = detectSkills(secText('experience'));
  const skills = {};
  Object.keys(counts).forEach(s => {
    let lv = 1;
    if (inProj[s]) lv = 2;
    if (inExp[s] || counts[s] >= 4) lv = 3;
    skills[s] = SOFT.has(s) ? Math.min(lv, 2) : lv;
  });

  const projectTitles = (sections.projects || []).filter(l => !BULLET_RE.test(l) && l.length >= 3 && l.length <= 90 && !/^\(|^\d/.test(l));
  return {
    text, lines, sections, pages, wordCount: words(text),
    name, email, phone, links: { linkedin, github, portfolio },
    branch, cgpa, gradYear, year,
    bullets, skills, keywords: extractKeywords(text),
    projectTitles: projectTitles.slice(0, 8),
    hasInternship: /intern/i.test(secText('experience')) || /\bintern(ship)?\b/i.test(text),
    hasSection: k => Boolean(sections[k] && sections[k].length)
  };
}

/* ---------- Scoring ---------- */
function check(id, label, max, ok, points, detail, fix, examples = []) {
  return { id, label, max, ok, points: Math.round(Math.max(0, Math.min(max, points))), detail, fix, examples };
}

function scoreResume(r, { demand = [] } = {}) {
  const b = r.bullets;
  const strong = b.filter(x => STRONG_RE.test(x));
  const weak = b.filter(x => !STRONG_RE.test(x));
  const quant = b.filter(x => /\d/.test(x));
  const firstPerson = b.filter(x => /\b(I|my|me|myself)\b/.test(x));
  const lower = r.text.toLowerCase();
  const cliches = CLICHES.filter(c => lower.includes(c));
  const nSkills = Object.keys(r.skills).filter(s => !SOFT.has(s)).length;
  const strongShare = b.length ? strong.length / b.length : 0;
  const quantShare = b.length ? quant.length / b.length : 0;
  const lenOk = r.wordCount >= 250 && r.wordCount <= 750;
  const lenNear = r.wordCount >= 150 && r.wordCount <= 1000;
  const pagesOk = r.pages === null || r.pages <= 1;
  const top = demand.slice(0, 10);
  const marketHave = top.filter(s => r.skills[s]);
  const secs = ['education', 'skills', 'projects'].filter(k => r.hasSection(k));

  const checks = [
    check('contact', 'Email and phone', 5, Boolean(r.email && r.phone), (r.email ? 2.5 : 0) + (r.phone ? 2.5 : 0),
      r.email && r.phone ? 'Both found.' : `Missing: ${[!r.email && 'email', !r.phone && 'phone'].filter(Boolean).join(' and ')}.`, 'Put a professional email and a 10-digit mobile number on the first line under your name.'),
    check('linkedin', 'LinkedIn profile', 5, Boolean(r.links.linkedin), r.links.linkedin ? 5 : 0,
      r.links.linkedin ? r.links.linkedin : 'No LinkedIn link found.', 'Add linkedin.com/in/your-name. Recruiters check it before calling.'),
    check('github', 'GitHub or portfolio', 5, Boolean(r.links.github || r.links.portfolio), r.links.github || r.links.portfolio ? 5 : 0,
      r.links.github || r.links.portfolio || 'No GitHub or portfolio link.', 'Link a GitHub with pinned projects that have READMEs and screenshots.'),
    check('sections', 'Core sections', 15, secs.length === 3, secs.length * 5,
      `Found: ${secs.join(', ') || 'none'}.`, 'Use clear headings: Education, Skills, Projects (then Experience, Achievements).'),
    check('experience', 'Experience or achievements', 5, r.hasSection('experience') || r.hasSection('achievements') || r.hasInternship,
      r.hasSection('experience') || r.hasInternship ? 5 : r.hasSection('achievements') ? 4 : 0,
      r.hasInternship ? 'Internship experience found.' : 'No internship or achievements section.', 'Add internships, hackathons, club roles or competitive programming ranks. Even one counts.'),
    check('length', 'Length (one page)', 10, lenOk && pagesOk, (lenOk ? 7 : lenNear ? 4 : 1) + (pagesOk ? 3 : 0),
      `${r.wordCount} words${r.pages ? `, ${r.pages} page${r.pages > 1 ? 's' : ''}` : ''}.`, 'Students: one page, roughly 350–650 words. Cut coursework lists and long objectives first.'),
    check('verbs', 'Bullets start with action verbs', 15, strongShare >= 0.6, (strongShare / 0.6) * 15,
      b.length ? `${strong.length} of ${b.length} bullets start strong.` : 'No bullet points found.', 'Start every bullet with a past-tense verb: Built, Designed, Automated, Led, Reduced.', weak.slice(0, 3)),
    check('numbers', 'Results with numbers', 15, quantShare >= 0.4, (quantShare / 0.4) * 15,
      b.length ? `${quant.length} of ${b.length} bullets have a number.` : 'No bullet points to measure.', 'Add a number to show impact: users, accuracy %, time saved, rank, team size.', b.filter(x => !/\d/.test(x)).slice(0, 3)),
    check('skills', 'Technical skills listed', 10, nSkills >= 6, (nSkills / 6) * 10,
      `${nSkills} technical skills recognised${nSkills ? `: ${Object.keys(r.skills).filter(s => !SOFT.has(s)).slice(0, 8).join(', ')}` : ''}.`, 'List 6–12 tools you can actually discuss in an interview, grouped (Languages, Frameworks, Tools).'),
    check('voice', 'No first person', 5, firstPerson.length === 0, firstPerson.length ? 0 : 5,
      firstPerson.length ? `${firstPerson.length} bullet${firstPerson.length > 1 ? 's use' : ' uses'} "I" or "my".` : 'Good.', 'Drop "I" and "my": write "Built a…", not "I built a…".', firstPerson.slice(0, 2)),
    check('cliches', 'No filler words', 5, cliches.length === 0, Math.max(0, 5 - cliches.length * 2),
      cliches.length ? `Found: ${cliches.join(', ')}.` : 'Good.', 'Replace adjectives about yourself with evidence: a project, a number, a result.'),
    check('market', 'Skills employers here ask for', 5, top.length > 0 && marketHave.length >= Math.ceil(top.length / 2), top.length ? (marketHave.length / Math.max(1, Math.ceil(top.length / 2))) * 5 : 5,
      top.length ? `You show ${marketHave.length} of the ${top.length} skills most requested in matching listings (${top.join(', ')}).` : 'Not enough listing data to compare.', 'If you have used one of these, say so in a project bullet. If not, it is a learning target.')
  ];
  const score = checks.reduce((a, c) => a + c.points, 0);
  return { score, checks, grade: score >= 80 ? 'Strong' : score >= 60 ? 'Good, with fixes' : score >= 40 ? 'Needs work' : 'Rebuild it' };
}

/* ---------- Bullet rewrites ---------- */
function pickVerb(b) {
  const t = b.toLowerCase();
  if (/test|bug|debug/.test(t)) return 'Tested';
  if (/model|predict|classif|train|dataset/.test(t)) return 'Trained';
  if (/analy[sz]|dashboard|report|insight/.test(t)) return 'Analysed';
  if (/team|led|lead|club|event|organi[sz]/.test(t)) return 'Led';
  if (/design|ui|ux|figma|wireframe/.test(t)) return 'Designed';
  if (/automat|script/.test(t)) return 'Automated';
  if (/deploy|cloud|aws|server/.test(t)) return 'Deployed';
  if (/website|app|api|system|platform|tool/.test(t)) return 'Built';
  return 'Developed';
}

function bulletFixes(r, limit = 6) {
  return r.bullets.map(b => {
    const issues = [];
    let after = b.replace(/\s+/g, ' ').trim();
    if (/\b(I|my)\b/.test(after)) { issues.push('first person'); after = after.replace(/^(I|We)\s+/i, '').replace(/\bmy\b/gi, 'the'); }
    if (WEAK_RE.test(after)) { issues.push('weak opening'); after = after.replace(WEAK_RE, '').replace(/^[\s,:-]+/, ''); after = `${pickVerb(b)} ${after.charAt(0).toLowerCase()}${after.slice(1)}`; }
    else if (!STRONG_RE.test(after)) { issues.push('no action verb'); after = `${pickVerb(b)} ${after.charAt(0).toLowerCase()}${after.slice(1)}`; }
    if (!/\d/.test(after)) { issues.push('no number'); after = `${after.replace(/[.;]$/, '')}, [add a result: e.g. used by 150 students, 92% accuracy, 40% faster]`; }
    if (words(b) > 32) issues.push('too long');
    return { before: b, after, issues };
  }).filter(x => x.issues.length).slice(0, limit);
}

/* ---------- Tailoring to one listing ---------- */
function tailorToJob(r, job) {
  const want = [...new Set([...(job.skills || []), ...(job.keywords || [])])];
  const have = new Set([...Object.keys(r.skills), ...r.keywords].map(k => k.toLowerCase()));
  const present = want.filter(k => have.has(k.toLowerCase()));
  const missing = want.filter(k => !have.has(k.toLowerCase()));
  const pct = want.length ? Math.round((present.length / want.length) * 100) : 0;
  return { want, present, missing, pct };
}

/* ---------- Apply to profile ---------- */
function profileFromResume(r, profile) {
  const skills = { ...profile.skills };
  const diff = [];
  Object.entries(r.skills).forEach(([s, lv]) => {
    if (!SKILLS.includes(s)) return;
    const cur = skills[s] || 0;
    if (lv > cur) { diff.push({ field: s, from: LEVELS[cur], to: LEVELS[lv], kind: 'skill' }); skills[s] = lv; }
  });
  const patch = { skills };
  const set = (field, value, label) => {
    if (value === '' || value === null || value === undefined || String(profile[field]) === String(value)) return;
    patch[field] = value;
    diff.push({ field: label, from: String(profile[field] || '—'), to: String(value), kind: 'field' });
  };
  if (r.name && !profile.name.trim()) set('name', r.name, 'Name');
  if (r.branch && BRANCHES.includes(r.branch)) set('branch', r.branch, 'Branch');
  if (r.year) set('year', r.year, 'Year');
  if (r.cgpa) set('cgpa', r.cgpa, 'CGPA');
  if (!profile.project.trim() && r.projectTitles[0]) set('project', r.projectTitles[0].slice(0, 80), 'Project');
  return { patch, diff };
}

if (typeof module !== 'undefined') module.exports = { parseResume, scoreResume, bulletFixes, tailorToJob, profileFromResume, academicYear };
