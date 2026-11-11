'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// data.js and engine.js share one global scope in the browser; mimic that here.
const src = ['data.js', 'engine.js']
  .map(f => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8'))
  .join('\n');
const ctx = vm.createContext({ module: { exports: {} }, console });
vm.runInContext(`${src}\nthis.api = { SEED, PERSONAS, BLANK_PROFILE, W_DEFAULT, SKILLS, SUS_ITEMS, CHECKLISTS, deadlineOf, daysLeft, eligibility, scoreOpp, rankOpps, skillGaps, filterOpps, DEFAULT_FILTERS, profileStrength, coverLetter, buildICS, susScore, susGrade, payLabel, fmtYears, countdown, similarTo, readiness, isPaid };`, ctx);
const A = ctx.api;
const persona = id => ({ ...A.BLANK_PROFILE, ...A.PERSONAS.find(p => p.id === id).profile });
const byId = id => A.SEED.find(o => o.id === id);

test('seed data is internally consistent', () => {
  const ids = new Set(A.SEED.map(o => o.id));
  assert.equal(ids.size, A.SEED.length, 'ids are unique');
  A.SEED.forEach(o => {
    assert.ok(o.skills.length > 0, `${o.title} has skills`);
    o.skills.forEach(s => assert.ok(A.SKILLS.includes(s), `${o.title}: unknown skill ${s}`));
    assert.ok(o.years.length > 0);
  });
});

test('days left is calendar based and closed items are negative', () => {
  assert.equal(A.daysLeft(byId(1)), 6);
  assert.equal(A.daysLeft(byId(31)), 0);
  assert.equal(A.daysLeft(byId(32)), -2);
  assert.equal(A.countdown(0), 'Today');
  assert.equal(A.countdown(-1), 'Closed');
  assert.equal(A.countdown(5), 'D−5');
});

test('eligibility blocks wrong year, branch and CGPA', () => {
  const ananya = persona('explorer');
  assert.equal(A.eligibility(byId(4), ananya).ok, false, 'year-4 drive vs year-1 student');
  assert.equal(A.eligibility(byId(3), ananya).ok, true);
  const kiran = persona('core');
  assert.equal(A.eligibility(byId(3), kiran).ok, false, 'CSE/IT workshop vs MECH');
  const lowCg = { ...persona('placement'), cgpa: '6.0' };
  const res = A.eligibility(byId(4), lowCg);
  assert.equal(res.ok, false);
  assert.match(res.fails.join(' '), /CGPA/);
  const noCg = { ...persona('placement'), cgpa: '' };
  assert.equal(A.eligibility(byId(4), noCg).ok, true);
  assert.equal(A.eligibility(byId(4), noCg).notes.length, 1);
});

test('ineligible listings are capped below the "worth a look" band', () => {
  const r = A.scoreOpp(byId(4), persona('explorer'));
  assert.ok(r.score <= 28);
});

test('score is monotonic in skill level and bounded 0..100', () => {
  const base = persona('explorer');
  const o = byId(3);
  const low = A.scoreOpp(o, { ...base, skills: {} }).score;
  const high = A.scoreOpp(o, { ...base, skills: { Python: 3, 'AI/ML': 3 } }).score;
  assert.ok(high > low);
  [low, high].forEach(s => assert.ok(s >= 0 && s <= 100));
});

test('changing weights changes the ranking order', () => {
  const p = persona('explorer');
  const a = A.rankOpps(A.SEED, p, { skills: 100, track: 0, interests: 0, mode: 0, timing: 0 }).map(x => x.o.id);
  const b = A.rankOpps(A.SEED, p, { skills: 0, track: 0, interests: 0, mode: 0, timing: 100 }).map(x => x.o.id);
  assert.notDeepEqual(a.slice(0, 5), b.slice(0, 5));
});

test('scoring does not mutate its inputs', () => {
  const p = persona('placement');
  const snap = JSON.stringify(p);
  A.rankOpps(A.SEED, p);
  A.skillGaps(A.SEED, p);
  assert.equal(JSON.stringify(p), snap);
});

test('skill-gap analysis only recommends skills that raise scores', () => {
  const gaps = A.skillGaps(A.SEED, persona('explorer'));
  assert.ok(gaps.length > 0);
  gaps.forEach(g => assert.ok(g.delta > 0));
  const p2 = { ...persona('explorer'), skills: { ...persona('explorer').skills, [gaps[0].skill]: gaps[0].target } };
  const before = A.rankOpps(A.SEED, persona('explorer')).filter(x => !x.r.closed && x.r.elig.ok).reduce((a, x) => a + x.r.score, 0);
  const after = A.rankOpps(A.SEED, p2).filter(x => !x.r.closed && x.r.elig.ok).reduce((a, x) => a + x.r.score, 0);
  assert.ok(after > before);
});

test('filters combine and closed listings are hidden by default', () => {
  const p = persona('explorer');
  const f = { ...A.DEFAULT_FILTERS };
  const all = A.filterOpps(A.SEED, f, p);
  assert.ok(all.every(x => !x.r.closed));
  const paidRemote = A.filterOpps(A.SEED, { ...f, pay: 'paid', mode: 'Remote' }, p);
  assert.ok(paidRemote.length > 0);
  assert.ok(paidRemote.every(x => A.isPaid(x.o) && x.o.mode === 'Remote'));
  const search = A.filterOpps(A.SEED, { ...f, q: 'python machine' }, p);
  assert.ok(search.some(x => x.o.id === 3));
  const withClosed = A.filterOpps(A.SEED, { ...f, showClosed: true }, p);
  assert.ok(withClosed.length > all.length);
});

test('profile strength reaches 100 for a complete profile', () => {
  assert.equal(A.profileStrength(A.BLANK_PROFILE), 0);
  assert.equal(A.profileStrength(persona('placement')), 100);
});

test('cover letter uses profile data and tone variants differ', () => {
  const p = persona('placement');
  const o = byId(29);
  const a = A.coverLetter(o, p, { tone: 'professional' });
  const b = A.coverLetter(o, p, { tone: 'concise' });
  const c = A.coverLetter(o, p, { tone: 'warm' });
  [a, b, c].forEach(t => assert.match(t, /Rahul/));
  assert.match(a, /Java/);
  assert.notEqual(a, b);
  assert.notEqual(a, c);
});

test('ICS output is a valid all-day calendar with escaped text', () => {
  const ics = A.buildICS([{ uid: 'x1', date: new Date(2026, 10, 9), title: 'Apply: Hack, Build; Ship', desc: 'line1\nline2' }]);
  assert.match(ics, /^BEGIN:VCALENDAR/);
  assert.match(ics, /DTSTART;VALUE=DATE:20261109/);
  assert.match(ics, /DTEND;VALUE=DATE:20261110/);
  assert.match(ics, /SUMMARY:Apply: Hack\\, Build\\; Ship/);
  assert.match(ics, /END:VCALENDAR$/);
});

test('SUS score matches the standard formula', () => {
  assert.equal(A.susScore([5, 1, 5, 1, 5, 1, 5, 1, 5, 1]), 100);
  assert.equal(A.susScore([1, 5, 1, 5, 1, 5, 1, 5, 1, 5]), 0);
  assert.equal(A.susScore([3, 3, 3, 3, 3, 3, 3, 3, 3, 3]), 50);
  assert.equal(A.susScore([3, 3]), null);
  assert.equal(A.susGrade(82), 'Excellent');
});

test('formatting helpers', () => {
  assert.equal(A.fmtYears([1, 2, 3, 4]), '1–4');
  assert.equal(A.fmtYears([4]), '4');
  assert.equal(A.fmtYears([2, 4]), '2, 4');
  assert.equal(A.payLabel(['stipend', 8000]), '₹8,000 / month');
  assert.equal(A.payLabel(['ctc', 6.5]), '₹6.5 LPA');
});

test('CSE-family branches (CSM, CSD, CSC, CSO) are eligible for CSE listings', () => {
  const p = { ...A.BLANK_PROFILE, branch: 'CSO', year: 3 };
  const o = { id: 'x', type: 'Internship', title: 't', org: 'o', d: 5, skills: ['Python'], lvl: 1, years: [3], br: ['CSE', 'IT'], mode: 'Remote', pay: ['none'] };
  assert.equal(A.eligibility(o, p).ok, true);
  assert.equal(A.eligibility(o, { ...p, branch: 'MECH' }).ok, false);
});
