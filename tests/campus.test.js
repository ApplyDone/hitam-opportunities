'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const P = require('../ingest/campus-parse.js');

const src = ['data.js', 'skills-dict.js', 'notice.js'].map(f => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8')).join('\n');
const ctx = vm.createContext({ module: { exports: {} }, console });
vm.runInContext(`${src}\nthis.api = { parseNotice };`, ctx);
const { parseNotice } = ctx.api;
const NOW = new Date(2026, 10, 11);

const TABLE = `<h2>Placements 2026</h2><table><tr><td>S.No</td><td>Roll No</td><td>Name of the student</td><td>Branch</td><td>Company Name</td><td>Package (LPA)</td></tr>
<tr><td>1</td><td>22E51A0591</td><td>A Student</td><td>CSE</td><td>TCS</td><td>7</td></tr>
<tr><td>2</td><td>22E51A0592</td><td>B Student</td><td>CSE (AI&amp;ML)</td><td>TCS</td><td>3.6</td></tr>
<tr><td>3</td><td>22E51A0420</td><td>C Student</td><td>ECE</td><td>ORC Engineering Pvt Ltd</td><td>6</td></tr></table>`;

test('placement parser keeps only branch, company, package, year — never names or roll numbers', () => {
  const rows = P.parsePlacementTables(TABLE);
  assert.equal(rows.length, 3);
  assert.deepEqual(Object.keys(rows[0]).sort(), ['branch', 'company', 'pkg', 'year']);
  assert.equal(rows[1].branch, 'CSM');
  assert.equal(rows[2].company, 'ORC Engineering');
  assert.equal(rows[0].year, 2026);
  const json = JSON.stringify(P.aggregatePlacements(rows));
  assert.ok(!/Student|22E51A/.test(json), 'no personal data in output');
});

test('aggregation gives totals per company and overall', () => {
  const agg = P.aggregatePlacements(P.parsePlacementTables(TABLE));
  assert.equal(agg.stats.offers, 3);
  assert.equal(agg.recruiters[0].company, 'TCS');
  assert.equal(agg.recruiters[0].offers, 2);
  assert.equal(agg.recruiters[0].maxPkg, 7);
  assert.equal(agg.stats.medianPkg, 6);
});

test('notice parser reads a typical campus drive message', () => {
  const n = parseNotice(`*Campus Drive - Infosys*
Company: Infosys
Role: Systems Engineer
Eligibility: CSE, IT, CSM, ECE | 2027 batch | CGPA 6.5 and above
Package: 3.6 LPA
Last date to register: 18-11-2026
Register here: https://forms.gle/abc123`, NOW);
  assert.equal(n.type, 'Placement');
  assert.equal(n.org, 'Infosys');
  assert.equal(n.title, 'Systems Engineer');
  assert.equal(n.deadline, '2026-11-18');
  assert.deepEqual([...n.br].sort(), ['CSE', 'CSM', 'ECE', 'IT']);
  assert.deepEqual([...n.years], [4]);
  assert.equal(n.minCgpa, 6.5);
  assert.equal(n.pay[0], 'ctc');
  assert.equal(n.applyUrl, 'https://forms.gle/abc123');
  assert.equal(n.confidence, 1);
});

test('notice parser handles hackathons with month-name dates and all branches', () => {
  const n = parseNotice('Smart Coders Hackathon 2026 conducted by Coding Club. Open to all branches. Teams of 4. Register before 25th Nov 2026 at https://unstop.com/x . Python and web dev tracks.', NOW);
  assert.equal(n.type, 'Hackathon');
  assert.equal(n.deadline, '2026-11-25');
  assert.equal(n.br, 'ALL');
  assert.ok(n.skills.includes('Python'));
});
