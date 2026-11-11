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
