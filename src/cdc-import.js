/* ============================================================
   cdc-import.js — turn text copied from CDC Explorer's
   "Opportunities" page into campus-board listings.
   Card layout seen on CDC Explorer:
     <Company> / [Closing Soon | Closed] / <Role> / <Type> / Branches /
     [Matches CSE] / Batches / [Eligible] / [Overview + text] /
     <Location> / [Pay] / Posted on: dd-mm-yyyy / [Deadline: dd-mm-yyyy | Rolling] /
     [Official JD Attachment / View Document] / Status / Details / Apply Now
   Pure and deterministic. The preview step lets the admin check
   everything before it is published.
   ============================================================ */
'use strict';

const CDC_NOISE = /^(status|details|apply now|closing soon|eligible|not eligible|matches [a-z, ]+|overview|refresh|opportunities|campus drives.*|career portals|engineering career portals|total openings|internships|full-time \(fte\)|added today|search.*|all (types|statuses|branches|batches)|today'?s only|my activity|official jd attachment|view document|\d+\+?|\(|\)|<\/?pasted_content[^>]*>)$/i;
const CDC_TYPES = [
  [/^hackathon$|^contest$|^challenge$|^coding contest$/i, 'Hackathon'],
  [/^internship$|^intern$|^apprenticeship$/i, 'Internship'],
  [/^full[- ]?time$|^fte$|^campus$|^placement$|^job$/i, 'Placement'],
  [/^workshop$|^webinar$|^training$/i, 'Workshop']
];
/* Card markers from the other CDC pages. A block that contains one is cut after it. */
const CDC_FOREIGN_END = /^(visit portal|request project|explore journey|view detailed abstract)$/i;
const CDC_MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** "13-11-2026", "13/11/2026", "22 October 2026" or "28 Oct 2026" to "YYYY-MM-DD". */
function dmy(s) {
  const t = String(s);
  const m = t.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const w = t.match(/(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})/);
  const mi = w ? CDC_MONTHS.indexOf(w[2].slice(0, 3).toLowerCase()) : -1;
  return mi >= 0 ? `${w[3]}-${String(mi + 1).padStart(2, '0')}-${w[1].padStart(2, '0')}` : '';
}

const PAY_RE = /₹|\blpa\b|lakhs?|stipend|\/\s*month|per month|a month|\bpm\b|unpaid|prizes?|ctc|\b\d{4,6}\b.*(fresher|month|probation)/i;
const num = s => Number(String(s).replace(/,/g, ''));
/** Pay line to the app's pay tuple: ['stipend', perMonth] | ['ctc', lpa] | ['none'] | ['text', label] | ['unknown']. */
function parsePay(line, type = '') {
  const t = String(line || '').trim();
  if (!t || /^(na|n\/a|-)$/i.test(t)) return ['unknown'];
  if (/^unpaid$/i.test(t)) return ['none'];
  const lpa = t.match(/([\d.]+)\s*(?:L\b|LPA|lakhs? per annum)/i);
  const month = t.match(/₹?\s*([\d,]{4,7})(?:\/-)?\s*(?:\/\s*month|per month|a month|pm\b|for (?:the )?first|for \d+\s*months)/i)
    || t.match(/(?:at|stipend[^\d₹]*)₹?\s*([\d,]{4,7})/i);
  const k = t.match(/([\d.]+)\s*k\s*(?:pm|\/\s*month|per month)/i);
  if (k) return ['stipend', Math.round(Number(k[1]) * 1000)];
  if (lpa && type === 'Placement') return ['ctc', Number(lpa[1])];
  if (/intern|month|stipend|probation/i.test(t) && month) return ['stipend', num(month[1])];
  if (lpa && !/prize/i.test(t)) return ['ctc', Number(lpa[1])];
  if (month) return ['stipend', num(month[1])];
  return ['text', t.slice(0, 70)];
}

/** Every "20xx-20yy" batch on the line to study years for the current academic year. */
function yearsFromBatches(line, now) {
  const endYear = now.getMonth() >= 5 ? now.getFullYear() + 1 : now.getFullYear();
  const grads = [...String(line).matchAll(/20\d\d\s*[-–]\s*(20\d\d)/g)].map(m => Number(m[1]));
  const ys = [...new Set(grads.map(g => 4 - (g - endYear)))].filter(y => y >= 1 && y <= 4).sort();
  return ys.length ? ys : [1, 2, 3, 4];
}

/* Many CDC cards have no description, so the role title is the main skill signal. */
const ROLE_SKILLS = [
  [/(sde|software|developer|programmer|full ?stack|backend|frontend|swe|_sw|engineering intern)/i, ['DSA', 'Problem Solving', 'Git']],
  [/(data|analyst|analytics|business intelligence|bi|insight)/i, ['SQL', 'Python', 'Data Analysis']],
  [/(ai|ml|machine learning|gen ?ai|scientist|research)/i, ['Python', 'AI/ML']],
  [/(devops|cloud|support engineer|systems development|runtime)/i, ['Cloud', 'Linux']],
  [/(ux|ui|product design)/i, ['UI/UX', 'Figma']],
  [/(qa|quality assurance|test)/i, ['Testing']],
  [/(embedded|electronics|hardware|firmware|iot|robotics)/i, ['Embedded C', 'IoT']],
  [/(vlsi|analog|physical design|asic|soc|semiconductor|signal processing|dsp)/i, ['VLSI']],
  [/(mechanical|cad|cae|manufacturing|engine|test cell|battery plant)/i, ['CAD']],
  [/(electrical|power|ev)/i, ['MATLAB']],
  [/(product (manager|ops)|apm|consultant|apprentice)/i, ['Communication', 'Problem Solving']]
];
function roleSkills(title) {
  return [...new Set(ROLE_SKILLS.filter(([re]) => re.test(title)).flatMap(([, sk]) => sk))];
}

function parseCdcBlock(rawLines, now) {
  const cut = rawLines.map(l => CDC_FOREIGN_END.test(l)).lastIndexOf(true);
  const lines = cut >= 0 ? rawLines.slice(cut + 1) : rawLines;
  const closed = lines.some(l => /^closed$/i.test(l));
  const body = lines.filter(l => !CDC_NOISE.test(l) && !/^closed$/i.test(l));
  const iPosted = body.findIndex(l => /^posted on/i.test(l));
  const typeIdx = body.findIndex(l => CDC_TYPES.some(([re]) => re.test(l)));
  if (typeIdx < 1 || iPosted < typeIdx) return null;
  const deadlineLine = body.find(l => /^deadline/i.test(l)) || '';
  const deadline = dmy(deadlineLine);
  const type = CDC_TYPES.find(([re]) => re.test(body[typeIdx]))[1];
  const title = body[typeIdx - 1];
  const org = typeIdx >= 2 ? body[typeIdx - 2] : '';
  const after = body.slice(typeIdx + 1, iPosted);
  const brLine = after.find(l => /^(all branches|branches?:)/i.test(l)) || '';
  const batchLine = after.find(l => /^(all batches|batches?:)/i.test(l)) || '';
  const br = /^all branches/i.test(brLine) || !brLine ? 'ALL' : brLine.replace(/^branches?:?\s*/i, '').split(/[,/&]+/).map(x => x.trim().toUpperCase()).filter(Boolean);
  const rest = after.filter(l => l !== brLine && l !== batchLine);
  const short = rest.filter(l => l.length <= 70);
  const payLine = short.length && PAY_RE.test(short[short.length - 1]) ? short[short.length - 1] : '';
  const location = (payLine ? short[short.length - 2] : short[short.length - 1]) || '';
  const overviewLines = rest.filter(l => l !== payLine && l !== location);
  const overview = overviewLines.join(' ').slice(0, 900);
  const link = (overview.match(/https?:\/\/[^\s)]+/) || [])[0] || '';
  const postedOn = dmy(body[iPosted]);
  return {
    type, title: title.slice(0, 90), org: (org || title.split(' ')[0]).slice(0, 60),
    deadline, rolling: !deadline, closed, postedOn,
    br: Array.isArray(br) && !br.length ? 'ALL' : br, years: /^all batches/i.test(batchLine) ? [1, 2, 3, 4] : yearsFromBatches(batchLine, now),
    location: location.slice(0, 80), pay: parsePay(payLine, type), payText: payLine.slice(0, 90), link,
    desc: `From CDC Explorer${location ? ` · ${location}` : ''}${postedOn ? ` · posted ${postedOn}` : ''}. ${overview}`.trim().slice(0, 1200),
    skills: [...new Set([...Object.keys(detectSkills(`${title} ${overview}`)), ...roleSkills(title)])].slice(0, 6)
  };
}

/** Returns {items, skippedPast, skippedClosed, skippedUnreadable}. Closed cards and past deadlines are dropped; no deadline means rolling. */
function parseCdcText(text, now = new Date()) {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const blocks = String(text || '').replace(/\r/g, '').split(/^\s*apply now\W*$/im);
  const items = [];
  const seen = new Set();
  let skippedPast = 0;
  let skippedClosed = 0;
  let skippedUnreadable = 0;
  blocks.forEach(b => {
    const lines = b.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
    if (lines.length < 4 || !lines.some(l => /^posted on/i.test(l))) return;
    const it = parseCdcBlock(lines, now);
    if (!it) { skippedUnreadable += 1; return; }
    if (it.closed) { skippedClosed += 1; return; }
    if (it.deadline && it.deadline < today) { skippedPast += 1; return; }
    const key = `${it.title}|${it.org}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    items.push(it);
  });
  return { items, skippedPast, skippedClosed, skippedUnreadable };
}

if (typeof module !== 'undefined') module.exports = { parseCdcText, dmy, parsePay };
