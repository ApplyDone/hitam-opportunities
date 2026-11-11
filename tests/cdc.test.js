'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const src = ['data.js', 'skills-dict.js', 'cdc-import.js'].map(f => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8')).join('\n');
const ctx = vm.createContext({ module: { exports: {} }, console });
vm.runInContext(`${src}\nthis.api = { parseCdcText };`, ctx);
const { parseCdcText } = ctx.api;
const NOW = new Date(2026, 10, 11);

const SAMPLE = `Opportunities
Campus placements, off-campus drives, internships.
TCS
TCS CodeVita Season 14
Closing Soon
Hackathon
All Branches
All Batches
Eligible
India
Posted on: 15-10-2026
Deadline: 13-11-2026
Status
Details
Apply Now
TCS
TCS HackQuest Season 11
Hackathon
All Branches
Batches: 2023-2027
Pan India
Posted on: 16-10-2026
Deadline: 16-11-2026
Status
Details
Apply Now
Technical Internship 2027
Internship
Branches: ECE, EEE
Batches: 2023-2027
OVERVIEW
Role Summary: We are looking for a Bachelor/Master degree student with Python and embedded skills.
Bangalore, Noida
Posted on: 22-10-2026
Deadline: 20-11-2026
Status
Details
Apply Now
Old Corp
Graduate Trainee
Full-time
All Branches
All Batches
Hyderabad
Posted on: 01-09-2026
Deadline: 01-10-2026
Apply Now`;

test('reads cards copied from CDC Explorer and drops past deadlines', () => {
  const r = parseCdcText(SAMPLE, NOW);
  assert.equal(r.items.length, 3);
  assert.equal(r.skippedPast, 1);
  const [a, b, c] = r.items;
  assert.equal(a.org, 'TCS');
  assert.equal(a.title, 'TCS CodeVita Season 14');
  assert.equal(a.type, 'Hackathon');
  assert.equal(a.deadline, '2026-11-13');
  assert.equal(a.br, 'ALL');
  assert.deepEqual([...a.years], [1, 2, 3, 4]);
  assert.deepEqual([...b.years], [4]);
  assert.equal(c.type, 'Internship');
  assert.deepEqual([...c.br].sort(), ['ECE', 'EEE']);
  assert.match(c.desc, /^From CDC Explorer/);
  assert.ok(c.skills.includes('Python'));
});

test('unreadable text yields nothing instead of garbage', () => {
  const r = parseCdcText('hello world\nthis is not a list', NOW);
  assert.equal(r.items.length, 0);
});

/* ---------- Real CDC format: rolling, closed, pay, several batches ---------- */
const { dmy, parsePay } = ctx.module.exports;
const REAL = `Total Openings
112
Today's Only
My Activity
Acme Labs
Closing Soon
Winter Internship 2026
Internship
Branches: CSE, CSM, ECE
Matches CSE
Batches: 2024-2028, 2023-2027
New Delhi
₹10,000/month
Posted on: 11-11-2026
Deadline: 13-11-2026
Official JD Attachment
View Document
Status
Details
Apply Now
Beta Corp
Data Specialist
Full-time
All Branches
Batches: 2023-2027
Overview
Apply at https://careers.beta.example/jobs/42 before the drive.
Hyderabad
Posted on: 06-11-2026
Deadline: Rolling
Status
Details
Apply Now
Gamma Inc
Apprentice
Internship
Branches: MECH
Batches: 2023-2027
Hyderabad
Posted on: 04-11-2026
Status
Details
Apply Now
Delta
Closed
Embedded Intern
Internship
All Branches
Batches: 2023-2027
Hyderabad
Posted on: 22-10-2026
Deadline: 22 October 2026, 05:07 PM
Status
Details
Apply Now)`;

test('reads the real CDC card format: rolling, closed, pay, batches, links', () => {
  const r = parseCdcText(REAL, NOW);
  assert.equal(r.items.length, 3);
  assert.equal(r.skippedClosed, 1);
  const [a, b, c] = r.items;
  assert.equal(a.org, 'Acme Labs');
  assert.equal(a.title, 'Winter Internship 2026');
  assert.deepEqual([...a.years], [3, 4]);
  assert.deepEqual([...a.pay], ['stipend', 10000]);
  assert.equal(a.location, 'New Delhi');
  assert.equal(b.type, 'Placement');
  assert.equal(b.deadline, '');
  assert.equal(b.rolling, true);
  assert.equal(b.link, 'https://careers.beta.example/jobs/42');
  assert.equal(c.rolling, true);
  assert.deepEqual([...c.br], ['MECH']);
});

test('dates and pay lines in the formats CDC uses', () => {
  assert.equal(dmy('Deadline: 22 October 2026, 05:07 PM'), '2026-10-22');
  assert.equal(dmy('28 Oct 2026'), '2026-10-28');
  assert.deepEqual([...parsePay('₹15,600 per month')], ['stipend', 15600]);
  assert.deepEqual([...parsePay('3.5k pm INR')], ['stipend', 3500]);
  assert.deepEqual([...parsePay('Upto 8 LPA (30000 for first 6 months)', 'Placement')], ['ctc', 8]);
  assert.deepEqual([...parsePay('Unpaid')], ['none']);
  assert.equal(parsePay('Prizes worth ₹6,00,000')[0], 'text');
});
