'use strict';
/* Dev tool: find company job feeds that currently have student-level roles.
   node ingest/probe.js            probe the built-in candidate list
   node ingest/probe.js --write    also add the hits to ingest/companies.json
   Uses the same public APIs and filters as the daily collector. */
const fs = require('node:fs');
const path = require('node:path');
const { normalizeJob } = require('./normalize.js');

const CANDIDATES = `razorpay postman juspay hasura browserstack chargebee druva sprinklr moengage clevertap cleartax udaan cars24 spinny mpl dream11 sharechat pinelabs mobikwik policybazaar unacademy upgrad vedantu meesho cred phonepe groww zerodha upstox slice jupiter fi navi kreditbee lendingkart zepto blinkit swiggy zomato rapido ola olaelectric urbancompany lenskart nykaa myntra flipkart mindtickle whatfix yellowai gupshup exotel freshworks zoho kissflow innovaccer qure practo pharmeasy healthifyme byjus eruditus simplilearn coursera udemy duolingo canva atlassian gitlab github cloudflare datadog elastic mongodb snowflake databricks confluent hashicorp twilio okta zscaler crowdstrike paloaltonetworks fortinet nutanix vmware intuit adobe nvidia amd arm cadence synopsys siemens bosch honeywell abb schneider lamresearch appliedmaterials micron westerndigital seagate netapp purestorage commvault cohesity thoughtspot workato uipath automationanywhere celonis sap workday salesforce hubspot zendesk freshdesk clickup asana notion airtable figma miro slack zoom dropbox box docusign stripe adyen revolut plaid brex ramp rippling deel remote gusto toast doordash uber lyft airbnb pinterest snap reddit discord spotify netflix roblox unity epicgames ea zynga glance inmobi appsflyer moloco apna cutshort instahyre wellfound turing toptal andela upwork fiverr bharatpe cashfree setu open razorpayx perfios signzy idfy digio leadsquared zeta paytm infra.market ofbusiness oxyzo bluestone caratlane pepperfry livspace homelane nobroker magicbricks housing squareyards smallcase ind-money kuvera scripbox vauld coindcx wazirx mudrex giottus unocoin pocketfm kukufm dailyhunt josh moj sharechat koo hike gameskraft winzo games24x7 nazara zupee junglee probo bighaat dehaat ninjacart waycool country-delight licious freshtohome milkbasket bigbasket jiomart tata1mg curefit cult mensa-brands honasa mamaearth sugar boat noise fireboltt ather simple-energy bounce yulu vogo zoomcar revv drivezy turno cardekho carwale olx quikr sulekha justdial indiamart tradeindia zetwerk bizongo moglix udaan jumbotail infra eloelo tata-digital tcs infosys wipro hcl techmahindra cognizant capgemini accenture deloitte kpmg ey pwc mckinsey bcg bain oracle ibm microsoft google amazon meta apple`.split(/\s+/);

const UA = 'HITAM-Opportunities-Bot/1.0 (student project; probe)';
async function get(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(12000) });
    return res.ok ? await res.json() : null;
  } catch (e) { return null; }
}

const ADAPT = {
  greenhouse: async t => { const d = await get(`https://boards-api.greenhouse.io/v1/boards/${t}/jobs?content=true`); return d && d.jobs ? d.jobs.map(j => ({ rawId: j.id, title: j.title, locations: [j.location && j.location.name], remote: false, employmentType: '', postedAt: j.first_published, url: j.absolute_url, html: j.content })) : null; },
  lever: async t => { const d = await get(`https://api.lever.co/v0/postings/${t}?mode=json`); return Array.isArray(d) ? d.map(j => ({ rawId: j.id, title: j.text, locations: [j.categories && j.categories.location, ...((j.categories && j.categories.allLocations) || [])], remote: j.workplaceType === 'remote', employmentType: (j.categories && j.categories.commitment) || '', postedAt: j.createdAt, url: j.hostedUrl, text: j.descriptionPlain })) : null; },
  ashby: async t => { const d = await get(`https://api.ashbyhq.com/posting-api/job-board/${t}`); return d && d.jobs ? d.jobs.map(j => ({ rawId: j.id, title: j.title, locations: [j.location, ...((j.secondaryLocations || []).map(s => s.location))], remote: Boolean(j.isRemote), employmentType: j.employmentType || '', postedAt: j.publishedAt, url: j.jobUrl, text: j.descriptionPlain || '' })) : null; }
};

async function probe(token) {
  const hits = [];
  for (const [ats, fn] of Object.entries(ADAPT)) {
    const raw = await fn(token);
    if (!raw) continue;
    let kept = 0; let interns = 0;
    raw.forEach(r => { const { job } = normalizeJob({ ...r, company: token, ats, token }); if (job) { kept += 1; if (job.type === 'Internship') interns += 1; } });
    if (kept) hits.push({ name: token, ats, token, kept, interns, total: raw.length });
  }
  return hits;
}

async function main() {
  const known = new Set(JSON.parse(fs.readFileSync(path.join(__dirname, 'companies.json'), 'utf8')).map(c => `${c.ats}:${c.token}`));
  const list = [...new Set(CANDIDATES)];
  const out = [];
  let i = 0;
  await Promise.all(Array.from({ length: 10 }, async () => {
    while (i < list.length) { const t = list[i]; i += 1; (await probe(t)).forEach(h => out.push(h)); }
  }));
  const fresh = out.filter(h => !known.has(`${h.ats}:${h.token}`)).sort((a, b) => b.kept - a.kept);
  console.log(`Probed ${list.length} names. New feeds with student-level roles: ${fresh.length}`);
  fresh.forEach(h => console.log(`  ${h.name.padEnd(18)} ${h.ats.padEnd(11)} kept ${String(h.kept).padStart(3)}  interns ${String(h.interns).padStart(3)}  (of ${h.total})`));
  if (process.argv.includes('--write')) {
    const file = path.join(__dirname, 'companies.json');
    const cur = JSON.parse(fs.readFileSync(file, 'utf8'));
    const add = fresh.map(h => ({ name: h.name.charAt(0).toUpperCase() + h.name.slice(1), ats: h.ats, token: h.token, hyderabad: false, totalJobs: h.total, hydJobs: 0, hydEntryLevel: 0, careersUrl: '', sector: 'Company feed', verifiedAt: new Date().toISOString().slice(0, 10) }));
    fs.writeFileSync(file, JSON.stringify([...cur, ...add], null, 2));
    console.log(`Added ${add.length} companies to companies.json`);
  }
}
main().catch(err => { console.error(err); process.exit(1); });
