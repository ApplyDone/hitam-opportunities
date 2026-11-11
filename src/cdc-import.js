/* ============================================================
   cdc-import.js — turn text copied from the student's own CDC
   Explorer "Opportunities" page into campus-board listings.
   Card layout seen on CDC Explorer:
     <Company> / <Role> / [Closing Soon] / <Type> / Branches / Batches /
     [Eligible] / <Location> / Posted on: dd-mm-yyyy / Deadline: dd-mm-yyyy /
     Status / Details / Apply Now
   Pure and deterministic. The preview step lets the student check
   everything before it is shared.
   ============================================================ */
'use strict';

const CDC_NOISE = /^(status|details|apply now|closing soon|eligible|not eligible|matches [a-z, ]+|overview|refresh|opportunities|campus drives|career portals|total openings|internships|full-time \(fte\)|added today|search.*|all (types|statuses|branches|batches))$/i;
const CDC_TYPES = [
  [/^hackathon$|^contest$|^challenge$|^coding contest$/i, 'Hackathon'],
  [/^internship$|^intern$/i, 'Internship'],
  [/^full[- ]?time$|^fte$|^campus$|^placement$|^job$/i, 'Placement'],
  [/^workshop$|^webinar$|^training$/i, 'Workshop']
];
const dmy = s => { const m = String(s).match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/); return m ? `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}` : ''; };

function parseCdcBlock(lines, now) {
  const body = lines.filter(l => !CDC_NOISE.test(l));
  const iPosted = body.findIndex(l => /^posted on/i.test(l));
  const deadlineLine = body.find(l => /^deadline/i.test(l)) || '';
  const deadline = dmy(deadlineLine);
  const postedOn = iPosted >= 0 ? dmy(body[iPosted]) : '';
  const typeIdx = body.findIndex(l => CDC_TYPES.some(([re]) => re.test(l)));
  if (typeIdx < 1 || !deadline) return null;
  const type = CDC_TYPES.find(([re]) => re.test(body[typeIdx]))[1];
  const org = body[typeIdx - 2] && typeIdx >= 2 ? body[typeIdx - 2] : '';
  const title = body[typeIdx - 1];
  const brLine = body.find(l => /branches?/i.test(l) && l.length < 80) || '';
  const batchLine = body.find(l => /batches?/i.test(l) && l.length < 60) || '';
  const br = /^all branches/i.test(brLine) || !brLine ? 'ALL' : brLine.replace(/^branches?:?\s*/i, '').split(/[,/&]+/).map(x => x.trim().toUpperCase()).filter(Boolean);
  const endYear = now.getMonth() >= 5 ? now.getFullYear() + 1 : now.getFullYear();
  const grad = (batchLine.match(/20\d\d\s*[-–]\s*(20\d\d)/) || [])[1];
  const years = grad ? [4 - (Number(grad) - endYear)].filter(y => y >= 1 && y <= 4) : [1, 2, 3, 4];
  const location = iPosted > 0 ? body[iPosted - 1] : '';
  const overview = body.filter(l => l.length > 40 && !/^posted on|^deadline/i.test(l)).join(' ').slice(0, 600);
  return {
    type, title: title.slice(0, 90), org: (org || title.split(' ')[0]).slice(0, 60), deadline, postedOn,
    br: Array.isArray(br) && !br.length ? 'ALL' : br, years: years.length ? years : [1, 2, 3, 4],
    location: String(location).slice(0, 60),
    desc: `From CDC Explorer${location ? ` · ${location}` : ''}${postedOn ? ` · posted ${postedOn}` : ''}. ${overview}`.trim().slice(0, 1200),
    skills: Object.keys(detectSkills(`${title} ${overview}`)).slice(0, 5)
  };
}

/** Returns {items, skippedPast, skippedUnreadable}. Past deadlines are dropped. */
function parseCdcText(text, now = new Date()) {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const blocks = String(text || '').replace(/\r/g, '').split(/^\s*apply now\s*$/im);
  const items = [];
  let skippedPast = 0;
  let skippedUnreadable = 0;
  blocks.forEach(b => {
    const lines = b.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
    if (lines.length < 4) return;
    const it = parseCdcBlock(lines, now);
    if (!it) { skippedUnreadable += 1; return; }
    if (it.deadline < today) { skippedPast += 1; return; }
    items.push(it);
  });
  return { items, skippedPast, skippedUnreadable };
}

if (typeof module !== 'undefined') module.exports = { parseCdcText, dmy };
