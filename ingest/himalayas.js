'use strict';
/* ============================================================
   himalayas.js — remote internships open to India, from the
   free public Himalayas API (https://himalayas.app/api).
   Terms we follow: show on our own site only, credit Himalayas
   with a visible link, send people to the supplied applicationLink,
   never pass the data on. Output (data/remote.json) is therefore
   NOT committed to git; it is published only with the site build.
   ============================================================ */
const { getJson } = require('./sources.js');
const { normalizeJob, dedupe } = require('./normalize.js');

const BASE = 'https://himalayas.app/jobs/api/search?employment_type=Intern&country=IN&limit=20';
const MAX_PAGES = 15;
/* This feed covers every profession. Keep what an engineering student can use. */
const TECH_RE = /engineer|develop|software|devops|\bsre\b|data|machine learning|\bml\b|\bai\b|llm|research|analyst|design|\bux\b|\bui\b|cloud|security|cyber|\bqa\b|test|embedded|firmware|hardware|electronics|mechanical|robotic|cad\b|programmer|python|java|react|full ?stack|front ?end|back ?end|technical|it support|systems|network|blockchain|quant/i;
const NON_TECH_RE = /graphic|motion design|video edit|animator|hotel|hospitality|cleft|education & training|teaching|nurs|clinical|medical|legal|law\b|sales|hr\b|human|recruit|account|tax|journalis|writer|editor|translator|real estate|property/i;

const toMs = v => { const n = Number(v); if (Number.isFinite(n) && n > 0) return n < 1e12 ? n * 1000 : n; const t = Date.parse(v); return Number.isFinite(t) ? t : null; };

function payText(j) {
  if (!j.minSalary && !j.maxSalary) return '';
  const cur = j.currency || '';
  const per = String(j.salaryPeriod || '').toLowerCase();
  const range = j.minSalary && j.maxSalary && j.minSalary !== j.maxSalary ? `${j.minSalary.toLocaleString('en-US')}–${j.maxSalary.toLocaleString('en-US')}` : (j.maxSalary || j.minSalary).toLocaleString('en-US');
  return `${cur} ${range}${per ? ` / ${per.replace(/ly$/, '')}` : ''}`.trim();
}

function toRaw(j) {
  const posted = toMs(j.pubDate);
  const expires = toMs(j.expiryDate);
  if (expires && expires < Date.now()) return null;
  return {
    rawId: String(j.guid || `${j.companySlug}-${j.title}`).replace(/[^a-z0-9]+/gi, '-').slice(-60),
    company: j.companyName, ats: 'himalayas', token: 'india', sector: 'Remote internship',
    careersUrl: 'https://himalayas.app/jobs',
    title: j.title, locations: ['Remote, India'], remote: true, employmentType: 'Intern',
    postedAt: posted ? new Date(posted).toISOString() : null,
    url: j.applicationLink, html: j.description, pay: payText(j)
  };
}

async function collectHimalayas() {
  const raws = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const data = await getJson(`${BASE}&page=${page}`);
    if (!data.jobs || !data.jobs.length) break;
    data.jobs.forEach(j => { const r = toRaw(j); if (r) raws.push(r); });
    if (data.jobs.length < 20) break;
  }
  const kept = [];
  const reasons = {};
  raws.forEach(r => {
    const { job, reason } = normalizeJob(r);
    reasons[reason] = (reasons[reason] || 0) + 1;
    if (job && TECH_RE.test(job.title) && !NON_TECH_RE.test(job.title)) kept.push({ ...job, remoteSource: 'Himalayas', source: { ...job.source, ats: 'himalayas', careersUrl: 'https://himalayas.app/jobs' } });
  });
  return { jobs: dedupe(kept), fetched: raws.length, reasons };
}

module.exports = { collectHimalayas, toRaw, payText, toMs };
