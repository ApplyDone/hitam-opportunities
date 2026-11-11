'use strict';
/* ============================================================
   normalize.js — pure functions that turn a raw job from any
   applicant-tracking system into our Opportunity shape, and
   decide whether a HITAM student should see it at all.
   ============================================================ */
const { detectSkills, extractKeywords } = require('../src/skills-dict.js');

const HYD_RE = /hyderabad|secunderabad|telangana|gachibowli|hitec ?city|madhapur|kondapur|nanakramguda|financial district/i;
const INDIA_RE = /\bindia\b|bengaluru|bangalore|pune|chennai|mumbai|delhi|gurugram|gurgaon|noida|kolkata|ahmedabad/i;
const INTERN_RE = /\b(intern|internship|trainee|apprentice(ship)?)\b/i;
const FRESHER_RE = /\b(graduate|new grad|fresher|campus|entry[- ]level|junior|jr\.?|associate (software|engineer|developer|analyst|consultant|data)|(engineer|developer|analyst) (i|1)\b|early career|university)\b/i;
const SENIOR_RE = /\b(senior|sr\.?|lead|principal|staff|manager|director|head|architect|vp|vice president|chief|expert)\b|\b(ii|iii|iv|2|3|4)\s*$/i;
const KEEP_RE = /engineer|developer|software|\bsde\b|data|analyst|scientist|machine learning|\bml\b|\bai\b|cloud|devops|\bsre\b|\bqa\b|test|security|network|design|\bux\b|\bui\b|product|technical|\bit\b|systems|hardware|embedded|firmware|vlsi|electrical|mechanical|research|consultant|programmer|support/i;
const DROP_RE = /\b(sales|account executive|recruit\w*|talent acquisition|human resources|\bhr\b|legal|counsel|payroll|accountant|accounts payable|marketing manager|business development|customer success manager|executive assistant|kyc|voice process|customer support|collections?|commissions?|deal desk|revops|strategic alliances?|paid search|content creator|marketing|seo|ppc|social media|copywriter|business operations|bizops|finance|accounting|audit|growth marketing|brand|public relations|pr executive|telecaller|data entry|virtual assistant|admin(istrative)? assistant)\b/i;

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };
function stripHtml(html) {
  const decoded = String(html || '').replace(/&(amp|lt|gt|quot|#39|nbsp);/g, m => ENTITIES[m]).replace(/&(amp|lt|gt|quot|#39|nbsp);/g, m => ENTITIES[m]);
  return decoded.replace(/<(br|\/p|\/li|\/h\d)\s*\/?>/gi, '\n').replace(/<li[^>]*>/gi, '\n• ').replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
}

/** Smallest "N years" requirement mentioned, or null. */
function minYearsExperience(text) {
  const re = /(\d{1,2})\s*(?:\+|plus)?\s*(?:(?:-|–|to)\s*(\d{1,2}))?\s*\+?\s*(?:years?|yrs?)(?:\s+of)?(?:\s+\w+){0,3}\s+experience/gi;
  let min = null;
  let m;
  while ((m = re.exec(text))) { const n = Number(m[1]); if (n <= 15 && (min === null || n < min)) min = n; }
  if (/\bfreshers?\b|\b0\s*(-|–|to)\s*[12]\s*years?\b|no (prior )?experience (is )?required/i.test(text)) min = 0;
  return min;
}

function classifyLevel(title, employmentType, text) {
  if (INTERN_RE.test(title) || /intern/i.test(employmentType || '')) return 'intern';
  if (SENIOR_RE.test(title)) return null;
  const yrs = minYearsExperience(text);
  if (yrs !== null && yrs >= 3) return null;
  if (FRESHER_RE.test(title) || yrs === 0) return 'fresher';
  return null; // unknown experience on a non-junior title: too risky to show students
}

function inferTrack(title, skills) {
  const t = `${title} ${skills.join(' ')}`.toLowerCase();
  const tracks = [];
  if (/data|analyst|machine learning|\bml\b|\bai\b|scientist|deep learning|power bi/.test(t)) tracks.push('ai');
  if (/design|ux|ui\b|figma/.test(t)) tracks.push('ux');
  if (/embedded|firmware|vlsi|hardware|electrical|mechanical|iot|cad|matlab|robotics/.test(t)) tracks.push('core');
  if (/research|scientist/.test(t)) tracks.push('res');
  if (/product manager|consultant|business analyst/.test(t)) tracks.push('lead');
  if (/software|developer|engineer|sde|devops|cloud|backend|frontend|full ?stack|qa|test|security|java|python|react/.test(t)) tracks.push('sw');
  return [...new Set(tracks.length ? tracks : ['sw'])];
}

function locationInfo(locations, remoteFlag) {
  const all = locations.filter(Boolean).join(' | ');
  const hyd = HYD_RE.test(all);
  const remote = Boolean(remoteFlag) || /\bremote\b/i.test(all);
  const india = INDIA_RE.test(all) || hyd;
  const hybrid = /hybrid/i.test(all);
  return { all, hyd, remote, india, hybrid };
}

const safeUrl = u => { try { const x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : ''; } catch (e) { return ''; } };

/**
 * raw: {rawId, company, ats, token, title, locations[], remote, employmentType, postedAt, url, html|text, pay?, sector?}
 * returns Opportunity or null (filtered out), plus a reason when null.
 */
function normalizeJob(raw) {
  const title = String(raw.title || '').trim();
  if (!title) return { job: null, reason: 'no-title' };
  const text = raw.text ? String(raw.text) : stripHtml(raw.html);
  const loc = locationInfo(raw.locations || [], raw.remote);
  if (DROP_RE.test(title)) return { job: null, reason: 'role' };
  const level = classifyLevel(title, raw.employmentType, text);
  if (!level) return { job: null, reason: 'seniority' };
  // Freshers: Hyderabad or India-remote. Internships: anywhere in India (students can relocate for a summer or work remotely).
  if (!loc.hyd && !(loc.remote && loc.india) && !(level === 'intern' && loc.india)) return { job: null, reason: 'location' };
  const counts = detectSkills(`${title}\n${text}`);
  const skills = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([s]) => s).slice(0, 6);
  if (!KEEP_RE.test(title) && !(level === 'intern' && skills.length)) return { job: null, reason: 'role' };
  const url = safeUrl(raw.url);
  if (!url) return { job: null, reason: 'no-url' };

  const intern = level === 'intern';
  const months = intern ? (text.match(/(\d{1,2})\s*(?:-|–|to)?\s*(?:\d{1,2}\s*)?months?/i) || [])[1] : null;
  const firstPlace = (raw.locations || []).filter(Boolean)[0] || '';
  const city = loc.hyd ? 'Hyderabad' : loc.remote ? 'India (remote)' : String(firstPlace).split(',')[0].trim().slice(0, 30) || 'India';
  return {
    job: {
      id: `${raw.ats}-${raw.token}-${raw.rawId}`,
      live: true,
      type: intern ? 'Internship' : 'Job',
      title: title.slice(0, 120),
      org: raw.company,
      city,
      location: loc.all.slice(0, 160),
      mode: loc.remote ? 'Remote' : loc.hybrid ? 'Hybrid' : 'On-site',
      pay: raw.pay ? ['text', String(raw.pay).slice(0, 60)] : ['unknown'],
      dur: intern ? (months ? `${months} months` : 'Internship') : 'Full-time',
      hrs: 0,
      skills: skills.length ? skills : ['Problem Solving', 'Communication'],
      lvl: intern ? 1 : 2,
      years: intern ? [1, 2, 3, 4] : [4],
      br: 'ALL',
      track: inferTrack(title, skills),
      level,
      tags: [intern ? 'Internship' : level === 'fresher' ? 'Fresher friendly' : '0–2 years', raw.sector || 'Company feed'].filter(Boolean),
      desc: text.slice(0, 1400),
      keywords: extractKeywords(`${title}\n${text}`).slice(0, 25),
      applyUrl: url,
      postedAt: raw.postedAt ? new Date(raw.postedAt).toISOString() : null,
      source: { ats: raw.ats, token: raw.token, careersUrl: raw.careersUrl || '' }
    },
    reason: 'kept'
  };
}

const dedupeKey = j => `${j.org}|${j.title}|${j.city}`.toLowerCase().replace(/\s+/g, ' ');
function dedupe(jobs) {
  const map = new Map();
  jobs.forEach(j => { const k = dedupeKey(j); if (!map.has(k)) map.set(k, j); });
  return [...map.values()];
}

/** Track first-seen dates so the site can show "new today". Pure: returns a new map. */
function mergeSeen(seen, jobs, today, keepDays = 45) {
  const next = {};
  const cutoff = new Date(new Date(today).getTime() - keepDays * 864e5).toISOString().slice(0, 10);
  Object.entries(seen || {}).forEach(([id, d]) => { if (d >= cutoff) next[id] = d; });
  jobs.forEach(j => { if (!next[j.id]) next[j.id] = today; });
  return next;
}

module.exports = { stripHtml, minYearsExperience, classifyLevel, inferTrack, locationInfo, normalizeJob, dedupe, mergeSeen, HYD_RE };
