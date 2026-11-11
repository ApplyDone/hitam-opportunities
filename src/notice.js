/* ============================================================
   notice.js — turn a pasted campus notice (WhatsApp / email /
   CDC message) into a structured listing. Pure, deterministic.
   ============================================================ */
'use strict';

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const NOTICE_TYPES = [
  ['Hackathon', /hackathon|hack-?a-?thon|ideathon|codathon|coding contest|ctf\b/i],
  ['Internship', /\bintern(ship)?s?\b/i],
  ['Placement', /campus drive|placement drive|pool drive|off-?campus drive|recruitment drive|hiring|\bdrive\b|ctc|lpa|package/i],
  ['Workshop', /workshop|bootcamp|webinar|seminar|training|session|masterclass/i],
  ['Research', /research|fellowship|paper presentation/i],
  ['Club', /club|recruitment for (the )?core|volunteers?/i]
];
const pad = n => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

function parseDates(text, now) {
  const found = [];
  const re1 = /\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/g; // 13-11-2026 or 13/11/26 (Indian day-first)
  let m;
  while ((m = re1.exec(text))) {
    const y = Number(m[3].length === 2 ? `20${m[3]}` : m[3]);
    const mo = Number(m[2]) - 1; const d = Number(m[1]);
    if (mo >= 0 && mo < 12 && d >= 1 && d <= 31) found.push({ at: m.index, date: iso(y, mo, d) });
  }
  const re2 = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?,?\s*(\d{4})?/gi;
  while ((m = re2.exec(text))) found.push({ at: m.index, date: iso(Number(m[3] || now.getFullYear()), MONTHS[m[2].toLowerCase()], Number(m[1])) });
  const re3 = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/gi;
  while ((m = re3.exec(text))) found.push({ at: m.index, date: iso(Number(m[3] || now.getFullYear()), MONTHS[m[1].toLowerCase()], Number(m[2])) });
  return found.sort((a, b) => a.at - b.at);
}

function pickDeadline(text, dates) {
  if (!dates.length) return '';
  const cue = /(last date|deadline|apply (by|before)|register (by|before)|registration (closes|ends|deadline)|before|due)/i;
  const cued = dates.find(d => cue.test(text.slice(Math.max(0, d.at - 60), d.at)));
  return (cued || dates[0]).date;
}

const field = (text, labels) => {
  const re = new RegExp(`(?:^|\\n)\\s*[*_]*(?:${labels})[*_]*\\s*[:\\-–]\\s*(.+)`, 'i');
  const m = text.match(re);
  return m ? m[1].replace(/[*_]/g, '').trim() : '';
};

function parseNotice(raw, now = new Date()) {
  const text = String(raw || '').replace(/\r/g, '');
  const flat = text.replace(/\s+/g, ' ');
  const type = (NOTICE_TYPES.find(([, re]) => re.test(flat)) || ['Placement'])[0];
  let org = field(text, 'company|organi[sz]ation|organi[sz]er|company name|hosted by|conducted by');
  if (!org) { const m = flat.match(/([A-Z][A-Za-z0-9&.]+(?:\s+[A-Z][A-Za-z0-9&.]+){0,3})\s+(?:is hiring|hiring|campus drive|recruitment drive|off-?campus|pool campus|presents|invites)/); org = m ? m[1] : ''; }
  let title = field(text, 'role|position|designation|job role|profile|event|title|hackathon name');
  if (!title) title = (text.split('\n').map(l => l.replace(/[*_#]/g, '').trim()).find(l => l.length > 6 && l.length < 90 && !/^(dear|hello|hi)\b/i.test(l)) || '');
  const dates = parseDates(text, now);
  const deadline = pickDeadline(text, dates);
  const branches = [...new Set((flat.match(/\b(CSE|CSM|CSD|IT|ECE|EEE|MECH|CIVIL)\b/g) || []).map(b => b.toUpperCase()))];
  const allBranches = /all (branches|streams|departments)|any (branch|stream)/i.test(flat) || !branches.length;
  const batchYears = [...new Set((flat.match(/\b(20[2-3]\d)\s*(?:batch|pass\s*-?outs?|graduates?)/gi) || []).map(s => Number(s.match(/20\d\d/)[0])))];
  const endYear = now.getMonth() >= 5 ? now.getFullYear() + 1 : now.getFullYear();
  const years = batchYears.map(g => 4 - (g - endYear)).filter(y => y >= 1 && y <= 4);
  const cg = flat.match(/(?:cgpa|gpa)\s*(?:of\s*)?(?:>=|≥|above|minimum|min\.?|at least|:)?\s*(\d(?:\.\d{1,2})?)/i);
  const urls = flat.match(/https?:\/\/[^\s)>\]]+/g) || [];
  const applyUrl = urls.find(u => /forms\.gle|docs\.google|careers|apply|register|unstop|devfolio|lnkd|bit\.ly/i.test(u)) || urls[0] || '';
  const pkg = flat.match(/(\d{1,2}(?:\.\d{1,2})?)\s*(?:lpa|lakhs?)/i);
  const stipend = flat.match(/stipend\s*[:\-–]?\s*(?:rs\.?|₹|inr)?\s*([\d,]{4,7})/i);
  const mode = /remote|online|virtual/i.test(flat) ? 'Remote' : /hybrid/i.test(flat) ? 'Hybrid' : 'On-campus';
  const skillsFound = Object.keys(detectSkills(text)).slice(0, 6);
  return {
    type, org: org.slice(0, 60), title: title.slice(0, 90), deadline,
    br: allBranches ? 'ALL' : branches, years: years.length ? years : [1, 2, 3, 4],
    minCgpa: cg && Number(cg[1]) <= 10 ? Number(cg[1]) : null,
    applyUrl, mode,
    pay: pkg ? ['ctc', Number(pkg[1])] : stipend ? ['stipend', Number(stipend[1].replace(/,/g, ''))] : ['unknown'],
    skills: skillsFound.length ? skillsFound : ['Problem Solving', 'Communication'],
    confidence: [org, title, deadline, applyUrl].filter(Boolean).length / 4
  };
}

if (typeof module !== 'undefined') module.exports = { parseNotice, parseDates };
