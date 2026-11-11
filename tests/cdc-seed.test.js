'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const src = ['data.js', 'skills-dict.js', 'cdc-import.js', 'cdc-seed.js'].map(f => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8')).join('\n');
const ctx = vm.createContext({ module: { exports: {} }, console });
vm.runInContext(`${src}\nconst isHttpUrl = u => ['http:', 'https:'].includes((() => { try { return new URL(u).protocol; } catch (e) { return ''; } })()); const CAMPUS_SOURCES = { cdcApp: 'https://cdc.hitam.org/' };\nthis.api = { parseCdcAll, cdcItemToOpp, projectFit, trackFit };`, ctx);
const { parseCdcAll, cdcItemToOpp, projectFit, trackFit } = ctx.api;
const NOW = new Date(2026, 10, 11);

const PAGES = `Multi-Stack Institutional Flagships
Projects
30
CDC-02
Readiness Index System
Hard
Challenge / Problem Statement
Full Abstract
CDC needs one readiness score per student.
Key Deliverables & Scope
Scores, dashboards, reports.
Technologies & Tools
Python
SQL
Power BI
View Detailed Abstract
Request Project
CDC-01
Showcase Portal
Medium
Full Abstract
Students need a portfolio site.
Key Deliverables & Scope
Portfolios and search.
Technologies & Tools
MERN Stack
View Detailed Abstract
Request Project
Engineering Career Portals
All Portals (181)
AM
Amazon
Portal #1
Tailored for CSE
Software, IT, AI, Data & Cloud
Focus Areas
Software, data, cloud
Copy URL
Visit Portal
SS
SmartSoC Solutions
Semiconductors, ECE, EEE & Electronic Design
Focus Areas
VLSI, RTL, firmware
Copy URL
Visit Portal
Explore Learning Tracks
Full Stack Developer
Focus: Programming Foundations + DSA Basics + Git + Web Introduction
5 Semesters
Preferably for: CSE, CSM, CSD
Recommended for your branch
Explore Journey
Design / CAE / Manufacturing Engineer
Focus: Fabrication and CAD Foundations
5 Semesters
Preferably for: Mech
Explore Journey`;

test('detects projects, portals and tracks in one paste', () => {
  const r = parseCdcAll(PAGES, NOW);
  assert.equal(r.opps.items.length, 0);
  assert.deepEqual([...r.projects.map(p => p.code)], ['CDC-01', 'CDC-02']);
  const p2 = r.projects[1];
  assert.equal(p2.level, 'Hard');
  assert.deepEqual([...p2.stack], ['Python', 'SQL', 'Power BI']);
  assert.ok(p2.skills.includes('Python') && p2.skills.includes('Power BI'));
  assert.ok(r.projects[0].skills.includes('React'), 'MERN expands to React');
  assert.equal(r.portals.length, 2);
  assert.equal(r.portals[0].name, 'Amazon');
  assert.equal(r.portals[0].forCse, true);
  assert.ok(r.portals[1].br.includes('ECE'));
  assert.equal(r.tracks.length, 2);
  assert.deepEqual([...r.tracks[1].br], ['MECH']);
  assert.equal(r.tracks[0].semesters, 5);
});

test('fit scores reward matching skills and branch', () => {
  const r = parseCdcAll(PAGES, NOW);
  const strong = { branch: 'CSE', year: 3, skills: { Python: 2, SQL: 2, 'Power BI': 2 } };
  const weak = { branch: 'CSE', year: 1, skills: {} };
  assert.ok(projectFit(r.projects[1], strong).score >= 90);
  assert.ok(projectFit(r.projects[1], weak).score < 30);
  assert.ok(trackFit(r.tracks[0], weak).score > trackFit(r.tracks[1], weak).score);
});

test('stored CDC items become safe listings with stable ids', () => {
  const a = cdcItemToOpp({ type: 'Internship', title: 'Intern', org: 'Acme', deadline: '', br: ['CSE'], years: [3, 4], pay: ['stipend', 5000], location: 'Remote', link: 'javascript:alert(1)', skills: ['Python', 'Nope'] });
  const b = cdcItemToOpp({ type: 'Internship', title: 'Intern', org: 'Acme' });
  assert.equal(a.id, b.id);
  assert.equal(a.deadline, undefined);
  assert.equal(a.mode, 'Remote');
  assert.equal(a.applyUrl, 'https://cdc.hitam.org/');
  assert.deepEqual([...a.skills], ['Python']);
  assert.equal(cdcItemToOpp({ type: 'Bogus', title: 'x' }), null);
});
