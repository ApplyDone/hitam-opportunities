'use strict';
/* ============================================================
   sources.js — one adapter per public job-board API. Each
   returns raw jobs in a common shape for normalize.js.
   Only documented, unauthenticated posting APIs are used.
   ============================================================ */
const UA = 'HITAM-Opportunities-Bot/1.0 (student project; daily, low volume)';
const TIMEOUT_MS = 25000;

async function getJson(url, tries = 2) {
  let lastErr;
  for (let i = 0; i < tries; i += 1) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
      await new Promise(r => setTimeout(r, 800 * (i + 1)));
    }
  }
  throw lastErr;
}

const base = c => ({ company: c.name, ats: c.ats, token: c.token, careersUrl: c.careersUrl, sector: c.sector });

async function greenhouse(c) {
  const data = await getJson(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(c.token)}/jobs?content=true`);
  return (data.jobs || []).map(j => ({
    ...base(c), rawId: j.id, title: j.title,
    locations: [j.location && j.location.name, ...(j.offices || []).map(o => `${o.name} ${o.location || ''}`)],
    remote: /remote/i.test((j.location && j.location.name) || ''), employmentType: '',
    postedAt: j.first_published || j.updated_at, url: j.absolute_url, html: j.content
  }));
}

async function lever(c) {
  const data = await getJson(`https://api.lever.co/v0/postings/${encodeURIComponent(c.token)}?mode=json`);
  return (Array.isArray(data) ? data : []).map(j => ({
    ...base(c), rawId: j.id, title: j.text,
    locations: [j.categories && j.categories.location, ...((j.categories && j.categories.allLocations) || [])],
    remote: j.workplaceType === 'remote', employmentType: (j.categories && j.categories.commitment) || '',
    postedAt: j.createdAt, url: j.hostedUrl || j.applyUrl,
    text: [j.descriptionPlain, ...(j.lists || []).map(l => `${l.text}\n${String(l.content || '').replace(/<[^>]+>/g, ' ')}`), j.additionalPlain].filter(Boolean).join('\n')
  }));
}

async function ashby(c) {
  const data = await getJson(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(c.token)}?includeCompensation=true`);
  return (data.jobs || []).filter(j => j.isListed !== false).map(j => ({
    ...base(c), rawId: j.id, title: j.title,
    locations: [j.location, ...((j.secondaryLocations || []).map(s => s.location))],
    remote: Boolean(j.isRemote) || j.workplaceType === 'Remote', employmentType: j.employmentType || '',
    postedAt: j.publishedAt, url: j.jobUrl || j.applyUrl,
    text: j.descriptionPlain || '', html: j.descriptionPlain ? '' : j.descriptionHtml,
    pay: j.compensation && j.compensation.compensationTierSummary
  }));
}

async function smartrecruiters(c) {
  const list = await getJson(`https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(c.token)}/postings?limit=100&country=in`);
  const rows = (list.content || []).filter(j => j.location && /hyderabad|secunderabad|telangana/i.test(`${j.location.city} ${j.location.region || ''}`) || (j.location && j.location.remote));
  const out = [];
  for (const j of rows.slice(0, 40)) {
    let html = '';
    try {
      const d = await getJson(`https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(c.token)}/postings/${encodeURIComponent(j.id)}`, 1);
      const s = (d.jobAd && d.jobAd.sections) || {};
      html = ['jobDescription', 'qualifications', 'additionalInformation'].map(k => (s[k] && s[k].text) || '').join('\n');
    } catch (e) { /* keep the listing with title-only data */ }
    out.push({
      ...base(c), rawId: j.id, title: j.name,
      locations: [`${j.location.city || ''}, ${j.location.region || ''}, ${j.location.country || ''}`],
      remote: Boolean(j.location.remote), employmentType: `${(j.typeOfEmployment && j.typeOfEmployment.label) || ''} ${(j.experienceLevel && j.experienceLevel.label) || ''}`,
      postedAt: j.releasedDate, url: `https://jobs.smartrecruiters.com/${encodeURIComponent(c.token)}/${encodeURIComponent(j.id)}`, html
    });
  }
  return out;
}

const ADAPTERS = { greenhouse, lever, ashby, smartrecruiters };
module.exports = { ADAPTERS, getJson };
