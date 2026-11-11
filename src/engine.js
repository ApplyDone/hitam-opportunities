/* ============================================================
   engine.js — pure logic: dates, eligibility, scoring, ranking,
   skill-gap analysis, filters, letters, ICS export, SUS score.
   No DOM access. Every function returns new data.
   ============================================================ */
'use strict';

const MS_DAY = 864e5;
const startOfDay = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const dateFromOffset = n => { const d = startOfDay(new Date()); d.setDate(d.getDate() + n); d.setHours(23, 59, 0, 0); return d; };

/* Campus listings have a deadline; live company jobs usually do not ("open until filled"). */
function deadlineOf(o) {
  if (o.deadline) return new Date(o.deadline + 'T23:59:00');
  if (typeof o.d === 'number') return dateFromOffset(o.d);
  return null;
}
/** Days until the deadline; Infinity when the listing has none. */
function daysLeft(o, now = new Date()) {
  const d = deadlineOf(o);
  return d ? Math.round((startOfDay(d) - startOfDay(now)) / MS_DAY) : Infinity;
}
function postedDaysAgo(o, now = new Date()) {
  if (!o.postedAt) return null;
  const t = new Date(o.postedAt);
  return Number.isNaN(t.getTime()) ? null : Math.max(0, Math.round((startOfDay(now) - startOfDay(t)) / MS_DAY));
}
const cmpNum = (a, b) => (a === b ? 0 : a < b ? -1 : 1);
const freshLabel = n => (n === null ? 'Open' : n === 0 ? 'Posted today' : n === 1 ? 'Posted yesterday' : `Posted ${n}d ago`);
const isClosed = (o, now) => daysLeft(o, now) < 0;

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const fmtShort = d => `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const pad2 = n => String(n).padStart(2, '0');

function countdown(dl) {
  if (!Number.isFinite(dl)) return 'Open';
  if (dl < 0) return 'Closed';
  if (dl === 0) return 'Today';
  return `D\u2212${dl}`;
}
function countdownLong(dl) {
  if (!Number.isFinite(dl)) return 'Open until filled';
  if (dl < 0) return `Closed ${-dl} day${dl === -1 ? '' : 's'} ago`;
  if (dl === 0) return 'Closes today';
  return `${dl} day${dl === 1 ? '' : 's'} left`;
}
const urgency = dl => (!Number.isFinite(dl) ? 'calm' : dl < 0 ? 'closed' : dl <= 3 ? 'hot' : dl <= 7 ? 'warm' : 'calm');

function fmtMoney(n) { return Number(n).toLocaleString('en-IN'); }
function payLabel(pay) {
  const [kind, amt] = pay;
  if (kind === 'stipend') return `\u20B9${fmtMoney(amt)} / month`;
  if (kind === 'ctc') return `\u20B9${amt} LPA`;
  if (kind === 'prize') return typeof amt === 'number' ? `\u20B9${fmtMoney(amt)} in prizes` : amt;
  if (kind === 'unknown') return 'Pay not disclosed';
  if (kind === 'text') return String(amt);
  return 'No stipend';
}
const isPaid = o => o.pay[0] === 'stipend' || o.pay[0] === 'ctc';
const isUnpaid = o => o.pay[0] === 'none';
const payMonthly = o => (o.pay[0] === 'stipend' ? o.pay[1] : o.pay[0] === 'ctc' ? (o.pay[1] * 100000) / 12 : 0);

function fmtYears(ys) {
  const s = [...ys].sort((a, b) => a - b);
  const contiguous = s.every((v, i) => i === 0 || v === s[i - 1] + 1);
  if (s.length === 1) return String(s[0]);
  return contiguous ? `${s[0]}\u2013${s[s.length - 1]}` : s.join(', ');
}
const ordinal = n => ['', '1st', '2nd', '3rd', '4th'][n] || `${n}th`;
const joinList = a => (a.length <= 1 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);
const lowerFirst = s => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

/* ---------- Eligibility ---------- */
function eligibility(o, p) {
  const fails = [];
  const notes = [];
  const csFamily = ['CSE', 'CSM', 'CSD', 'CSC', 'CSO'];
  const branchOk = o.br === 'ALL' || o.br.includes(p.branch) || (csFamily.includes(p.branch) && o.br.includes('CSE'));
  if (!branchOk) fails.push(`Open to ${o.br.join(', ')} only`);
  if (!o.years.includes(Number(p.year))) fails.push(`Open to year ${fmtYears(o.years)} only`);
  if (o.minCgpa) {
    const cg = parseFloat(p.cgpa);
    if (Number.isNaN(cg)) notes.push(`Minimum CGPA ${o.minCgpa}. Add yours to your profile.`);
    else if (cg < o.minCgpa) fails.push(`Minimum CGPA ${o.minCgpa} (yours is ${cg})`);
  }
  return { ok: fails.length === 0, fails, notes };
}

/* ---------- Scoring ---------- */
function skillFit(o, p) {
  const have = [];
  const gaps = [];
  let sum = 0;
  o.skills.forEach(s => {
    const u = p.skills[s] || 0;
    sum += Math.min(1, u / o.lvl);
    if (u >= o.lvl) have.push(s);
    else gaps.push({ skill: s, have: u, need: o.lvl });
  });
  return { v: o.skills.length ? sum / o.skills.length : 1, have, gaps };
}

function scoreOpp(o, p, w = W_DEFAULT, now = new Date()) {
  const el = eligibility(o, p);
  const sk = skillFit(o, p);
  const dl = daysLeft(o, now);
  const trackV = !p.track ? 0.5 : (o.track || []).includes(p.track) ? 1 : 0;
  const interestV = p.interests.length === 0 ? 0.5 : p.interests.includes(o.type) ? 1 : 0;
  const inPerson = m => m === 'On-campus' || m === 'On-site';
  const modeV = p.mode === 'Any' || o.mode === p.mode || o.mode === 'Hybrid' || (inPerson(o.mode) && inPerson(p.mode)) ? 1 : 0;
  const ago = postedDaysAgo(o, now);
  const freshV = ago === null ? 0.7 : ago <= 7 ? 1 : ago <= 21 ? 0.8 : ago <= 45 ? 0.6 : 0.4;
  const feas = !Number.isFinite(dl) ? freshV : dl < 0 ? 0 : Math.min(1, (dl + 1) / 6);
  const load = !o.hrs || !p.hours ? 1 : Math.min(1, p.hours / o.hrs);
  const timeV = 0.6 * feas + 0.4 * load;

  const total = Object.values(w).reduce((a, b) => a + b, 0) || 1;
  const mk = (key, label, v, note) => ({ key, label, v, w: w[key], pts: Math.round((w[key] / total) * v * 100), max: Math.round((w[key] / total) * 100), note });
  const parts = [
    mk('skills', 'Skill fit', sk.v, sk.have.length === o.skills.length ? 'You meet the bar on every skill' : `${sk.have.length} of ${o.skills.length} skills at the bar`),
    mk('track', 'Career track', trackV, !p.track ? 'Pick a track to sharpen this' : trackV ? 'On your chosen track' : 'Different from your chosen track'),
    mk('interests', 'Interest in type', interestV, p.interests.length === 0 ? 'Choose what you are interested in' : interestV ? `You asked for ${o.type.toLowerCase()} listings` : `${o.type} is not in your interests`),
    mk('mode', 'Mode', modeV, modeV ? (o.mode === 'Hybrid' ? 'Hybrid suits any preference' : `${o.mode} matches your preference`) : `${o.mode}, you prefer ${p.mode.toLowerCase()}`),
    mk('timing', 'Timing & load', timeV, dl < 0 ? 'Closed' : !Number.isFinite(dl) ? `${freshLabel(ago)}, open until filled` : `${countdownLong(dl)}${o.hrs ? `, about ${o.hrs} h/week` : ''}`)
  ];
  const raw = Math.round(parts.reduce((a, x) => a + (x.w / total) * x.v, 0) * 100);
  const score = el.ok ? raw : Math.min(raw, 28);
  return { score, raw, elig: el, parts, have: sk.have, gaps: sk.gaps, closed: dl < 0, dl };
}

const band = s => (s >= 70 ? 'strong' : s >= 50 ? 'good' : 'stretch');
const bandLabel = s => (s >= 70 ? 'Strong match' : s >= 50 ? 'Worth a look' : 'Stretch');

function rankOpps(opps, p, w = W_DEFAULT, now = new Date()) {
  return opps
    .map(o => ({ o, r: scoreOpp(o, p, w, now) }))
    .sort((a, b) => b.r.score - a.r.score || cmpNum(a.r.dl, b.r.dl));
}

/* What should this student learn next? Simulate raising each skill to the bar. */
function skillGaps(opps, p, w = W_DEFAULT, now = new Date()) {
  const pool = opps.filter(o => !isClosed(o, now) && eligibility(o, p).ok);
  const base = new Map(pool.map(o => [o.id, scoreOpp(o, p, w, now).score]));
  const need = {};
  pool.forEach(o => o.skills.forEach(s => {
    if ((p.skills[s] || 0) < o.lvl) need[s] = Math.max(need[s] || 0, o.lvl);
  }));
  return Object.keys(need).map(skill => {
    const target = need[skill];
    const p2 = { ...p, skills: { ...p.skills, [skill]: target } };
    let delta = 0;
    let unlocks = 0;
    const ids = [];
    pool.forEach(o => {
      if (!o.skills.includes(skill)) return;
      const before = base.get(o.id);
      const after = scoreOpp(o, p2, w, now).score;
      if (after > before) {
        delta += after - before;
        ids.push(o.id);
        if (before < 60 && after >= 60) unlocks += 1;
      }
    });
    return { skill, target, delta, unlocks, ids, learn: LEARN[skill] || '' };
  })
    .filter(r => r.delta > 0)
    .sort((a, b) => (b.unlocks * 8 + b.delta) - (a.unlocks * 8 + a.delta))
    .slice(0, 8);
}

function similarTo(o, opps) {
  const set = new Set(o.skills);
  return opps
    .filter(x => String(x.id) !== String(o.id) && !isClosed(x))
    .map(x => {
      const inter = x.skills.filter(s => set.has(s)).length;
      const union = new Set([...x.skills, ...o.skills]).size;
      return { x, sim: inter / union + (x.type === o.type ? 0.15 : 0) + ((x.track || []).some(t => (o.track || []).includes(t)) ? 0.1 : 0) };
    })
    .sort((a, b) => b.sim - a.sim)
    .slice(0, 3)
    .map(r => r.x);
}

/* ---------- Filtering & sorting ---------- */
const DEFAULT_FILTERS = { q: '', types: [], mode: 'Any', pay: 'any', mine: false, window: 0, skills: [], showClosed: false, sort: 'match', source: 'all', city: 'any', level: 'any' };

function filterOpps(opps, f, p, w = W_DEFAULT, now = new Date()) {
  const q = f.q.trim().toLowerCase();
  const rows = opps
    .filter(o => {
      const dl = daysLeft(o, now);
      if (!f.showClosed && dl < 0) return false;
      if (f.types.length && !f.types.includes(o.type)) return false;
      if (f.mode !== 'Any' && o.mode !== f.mode && !(f.mode === 'On-campus' && o.mode === 'On-site')) return false;
      if (f.pay === 'paid' && !isPaid(o)) return false;
      if (f.pay === 'unpaid' && !isUnpaid(o)) return false;
      if (f.source === 'live' && !o.live) return false;
      if (f.source === 'campus' && o.live) return false;
      if (f.city === 'hyderabad' && !/hyderabad|secunderabad|telangana/i.test(`${o.city || ''} ${o.location || ''}`) && o.live) return false;
      if (f.city === 'remote' && o.mode !== 'Remote') return false;
      if (f.level !== 'any' && (o.level || (o.type === 'Internship' ? 'intern' : 'campus')) !== f.level) return false;
      if (f.window && (dl < 0 || dl > f.window)) return false;
      if (f.skills.length && !f.skills.every(s => o.skills.includes(s))) return false;
      if (f.mine && !eligibility(o, p).ok) return false;
      if (q) {
        const hay = [o.title, o.org, o.type, o.mode, o.desc, o.city || '', o.location || '', ...o.skills, ...(o.tags || []), ...(o.keywords || [])].join(' ').toLowerCase();
        if (!q.split(/\s+/).every(t => hay.includes(t))) return false;
      }
      return true;
    })
    .map(o => ({ o, r: scoreOpp(o, p, w, now) }));
  const by = {
    deadline: (a, b) => (a.r.closed - b.r.closed) || cmpNum(a.r.dl, b.r.dl),
    fresh: (a, b) => String(b.o.postedAt || '').localeCompare(String(a.o.postedAt || '')),
    match: (a, b) => b.r.score - a.r.score,
    pay: (a, b) => payMonthly(b.o) - payMonthly(a.o),
    newest: (a, b) => String(b.o.id).localeCompare(String(a.o.id), undefined, { numeric: true })
  };
  return rows.sort(by[f.sort] || by.deadline);
}

/* ---------- Profile ---------- */
function profileStrength(p) {
  const nSkills = Object.values(p.skills).filter(v => v > 0).length;
  return (p.name.trim() ? 10 : 0) + (p.cgpa !== '' && !Number.isNaN(parseFloat(p.cgpa)) ? 10 : 0) + (p.track ? 15 : 0) +
    (p.interests.length ? 10 : 0) + (nSkills >= 4 ? 25 : nSkills * 6) + (p.goal.trim().length > 9 ? 15 : 0) + (p.project.trim() ? 15 : 0);
}
function profileTodo(p) {
  const nSkills = Object.values(p.skills).filter(v => v > 0).length;
  const t = [];
  if (!p.name.trim()) t.push('Add your name');
  if (nSkills < 4) t.push(`Rate ${4 - nSkills} more skill${4 - nSkills === 1 ? '' : 's'}`);
  if (!p.track) t.push('Choose a career track');
  if (!p.interests.length) t.push('Pick what you are interested in');
  if (!p.cgpa) t.push('Add your CGPA for eligibility checks');
  if (p.goal.trim().length <= 9) t.push('Write a one-line goal');
  if (!p.project.trim()) t.push('Describe one project');
  return t;
}

function readiness(o, app) {
  const list = CHECKLISTS[o.type] || [];
  const done = ((app && app.ck) || []).filter(i => i < list.length).length;
  return list.length ? Math.round((done / list.length) * 100) : 0;
}

/* ---------- Cover letter ---------- */
function coverLetter(o, p, { tone = 'professional', project = '' } = {}) {
  const name = p.name.trim() || '[Your name]';
  const matched = o.skills.filter(s => (p.skills[s] || 0) > 0);
  const fallback = Object.keys(p.skills).filter(s => p.skills[s] > 0);
  const top = (matched.length ? matched : fallback).slice(0, 3);
  const skillTxt = joinList(top) || 'problem solving and learning quickly';
  const proj = (project || p.project || '').trim();
  const goal = lowerFirst(p.goal.trim()).replace(/^to /, '');
  const ask = {
    Placement: `apply for the ${o.title} drive`,
    Internship: `apply for the ${o.title} position`,
    Hackathon: `register for ${o.title}`,
    Workshop: `request a seat at ${o.title}`,
    Research: `apply for ${o.title}`,
    Club: `join the ${o.title}`
  }[o.type];
  const who = `${name}, a ${ordinal(Number(p.year))}-year ${p.branch} student at Hyderabad Institute of Technology and Management`;

  if (tone === 'concise') {
    return [
      `Dear ${o.org},`,
      '',
      `I am ${who}, and I would like to ${ask}.`,
      `Relevant strengths: ${skillTxt}.${proj ? ` Recent work: ${proj}.` : ''}`,
      `${goal ? `I want to ${goal}. ` : ''}I can share my resume and project links on request.`,
      '',
      `Regards,`,
      name
    ].join('\n');
  }
  if (tone === 'warm') {
    return [
      `Hello ${o.org} team,`,
      '',
      `I am ${name}, a ${ordinal(Number(p.year))}-year ${p.branch} student at HITAM, and I was really glad to see ${o.title} on the board. I would love to ${ask}.`,
      '',
      `I have been building my skills in ${skillTxt}, and ${proj ? `lately I put them to work on ${proj}. That project taught me more than any lecture could.` : 'I learn best by making things and getting feedback.'}${goal ? ` What I am working towards is simple: I want to ${goal}.` : ''}`,
      '',
      `I would be grateful for the chance to learn from you and to contribute. Thank you for reading this!`,
      '',
      `Warm regards,`,
      name
    ].join('\n');
  }
  return [
    'Dear Hiring Team,',
    '',
    `I am ${who}, writing to ${ask} with ${o.org}.`,
    '',
    `My strongest areas for this opportunity are ${skillTxt}.${proj ? ` Most recently I built ${proj}, which taught me to take an idea from a rough sketch to something people can use.` : ''}${goal ? ` My goal is to ${goal}, and this opportunity is a direct step toward it.` : ''}`,
    '',
    'I would welcome the chance to discuss how I can contribute, and to share my resume and project links.',
    '',
    'Thank you for your time and consideration.',
    '',
    'Sincerely,',
    name
  ].join('\n');
}

function resumeBullets(o, p) {
  const have = o.skills.filter(s => (p.skills[s] || 0) > 0);
  const s1 = have[0] || o.skills[0];
  const s2 = have[1] || o.skills[1] || 'a clear process';
  return [
    `Built a ${s1} project that [result you achieved]; shipped to [number] users and documented in a README.`,
    `Used ${s1} and ${s2} to [what you did], reducing [metric] by [n]% in testing.`,
    `Led a team of [n] to deliver [thing] in [time], presenting to a panel of faculty.`,
    `Wrote [n] tests for [thing], raising coverage from [a]% to [b]%.`
  ];
}

/* ---------- ICS export ---------- */
const icsEscape = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const icsDate = d => `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
function buildICS(items) {
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${pad2(now.getUTCMonth() + 1)}${pad2(now.getUTCDate())}T${pad2(now.getUTCHours())}${pad2(now.getUTCMinutes())}${pad2(now.getUTCSeconds())}Z`;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//HITAM Opportunities Intelligence//EN', 'CALSCALE:GREGORIAN'];
  items.forEach(it => {
    const next = new Date(it.date);
    next.setDate(next.getDate() + 1);
    lines.push('BEGIN:VEVENT', `UID:${it.uid}@hitam-opportunities`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(it.date)}`, `DTEND;VALUE=DATE:${icsDate(next)}`,
      `SUMMARY:${icsEscape(it.title)}`, `DESCRIPTION:${icsEscape(it.desc || '')}`,
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:${icsEscape(it.title)}`, 'END:VALARM', 'END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/* ---------- Usability (SUS) ---------- */
function susScore(answers) {
  if (answers.length !== 10 || answers.some(a => !(a >= 1 && a <= 5))) return null;
  const sum = answers.reduce((acc, x, i) => acc + (i % 2 === 0 ? x - 1 : 5 - x), 0);
  return sum * 2.5;
}
const susGrade = s => (s >= 80 ? 'Excellent' : s >= 68 ? 'Above average' : s >= 51 ? 'Below average' : 'Needs work');

if (typeof module !== 'undefined') {
  module.exports = { postedDaysAgo, freshLabel, isUnpaid, deadlineOf, daysLeft, eligibility, scoreOpp, rankOpps, skillGaps, filterOpps, DEFAULT_FILTERS, profileStrength, coverLetter, buildICS, susScore, susGrade, payLabel, fmtYears, countdown, similarTo, readiness, isPaid };
}
