'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const src = ['data.js', 'skills-dict.js', 'engine.js', 'resume.js'].map(f => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8')).join('\n');
const ctx = vm.createContext({ module: { exports: {} }, console });
vm.runInContext(`${src}\nthis.api = { parseResume, scoreResume, bulletFixes, tailorToJob, profileFromResume, BLANK_PROFILE };`, ctx);
const A = ctx.api;
const NOW = new Date(2026, 10, 11);

const GOOD = `Ravi Kumar
ravi.kumar@example.com | +91 98765 43210 | linkedin.com/in/ravikumar | github.com/ravik
EDUCATION
B.Tech in Computer Science and Engineering (AI & ML), HITAM, Hyderabad 2023 - 2027
CGPA: 8.6/10
SKILLS
Python, Java, C, SQL, React, Node.js, Git, Docker, AWS
PROJECTS
Campus Food Ordering App
• Built a React and Node.js app used by 300 students, cutting queue time by 40%.
• Deployed on AWS EC2 with Docker; 99% uptime over 2 months.
Crop Disease Classifier
• Trained a CNN in Python on 5,000 images reaching 92% accuracy.
EXPERIENCE
Software Intern, Acme Labs (May 2026 - Jul 2026)
• Automated report generation in Python, saving 6 hours a week for 4 analysts.
ACHIEVEMENTS
• Ranked 3rd of 120 teams at the HITAM 24h hackathon.`;

const WEAK = `RESUME
Name: Sita
I am a hardworking and passionate student seeking a challenging role.
Skills
MS Office
Projects
• Worked on a website for my college fest
• Responsible for testing the app`;

test('parses contact, links, branch, CGPA and year of study', () => {
  const r = A.parseResume(GOOD, { now: NOW });
  assert.equal(r.name, 'Ravi Kumar');
  assert.match(r.email, /ravi\.kumar@/);
  assert.ok(r.phone);
  assert.match(r.links.linkedin, /linkedin\.com\/in\/ravikumar/);
  assert.match(r.links.github, /github\.com\/ravik/);
  assert.equal(r.branch, 'CSM');
  assert.equal(r.cgpa, '8.6');
  assert.equal(r.gradYear, 2027);
  assert.equal(r.year, 4);
  assert.ok(r.hasInternship);
});

test('infers higher levels for skills used in projects and experience', () => {
  const r = A.parseResume(GOOD, { now: NOW });
  assert.equal(r.skills.C, 1, 'listed only');
  assert.ok(r.skills.React >= 2, 'used in a project');
  assert.equal(r.skills.Python, 3, 'used in experience');
});

test('a strong resume scores well and a weak one scores low with concrete fixes', () => {
  const good = A.scoreResume(A.parseResume(GOOD, { now: NOW }), { demand: ['Python', 'SQL', 'Java'] });
  const weak = A.scoreResume(A.parseResume(WEAK, { now: NOW }), { demand: ['Python', 'SQL', 'Java'] });
  assert.ok(good.score >= 80, `good=${good.score}`);
  assert.ok(weak.score < 40, `weak=${weak.score}`);
  const failed = weak.checks.filter(c => !c.ok).map(c => c.id);
  ['contact', 'linkedin', 'verbs', 'numbers', 'cliches'].forEach(id => assert.ok(failed.includes(id), id));
  weak.checks.forEach(c => assert.ok(c.points <= c.max));
});

test('bullet fixes replace weak openings and ask for a number', () => {
  const fixes = A.bulletFixes(A.parseResume(WEAK, { now: NOW }));
  const f = fixes.find(x => /website/.test(x.before));
  assert.match(f.after, /^Built /);
  assert.ok(f.issues.includes('weak opening'));
  assert.match(f.after, /\[add a result/);
  assert.ok(!/\bmy\b/.test(f.after));
});

test('tailoring reports present and missing keywords', () => {
  const r = A.parseResume(GOOD, { now: NOW });
  const t = A.tailorToJob(r, { skills: ['Java', 'SQL'], keywords: ['Java', 'Kafka', 'microservices'] });
  assert.ok(t.present.includes('Java'));
  assert.ok(t.missing.includes('Kafka'));
  assert.ok(t.pct > 0 && t.pct < 100);
});

test('profile patch raises skills, fills branch/year/CGPA and does not mutate input', () => {
  const profile = { ...A.BLANK_PROFILE, skills: { Python: 1, Java: 3 }, interests: [] };
  const snap = JSON.stringify(profile);
  const { patch, diff } = A.profileFromResume(A.parseResume(GOOD, { now: NOW }), profile);
  assert.equal(patch.skills.Python, 3);
  assert.equal(patch.skills.Java, 3, 'never lowers an existing level');
  assert.equal(patch.branch, 'CSM');
  assert.equal(patch.year, 4);
  assert.equal(patch.cgpa, '8.6');
  assert.ok(diff.length > 3);
  assert.equal(JSON.stringify(profile), snap);
});
