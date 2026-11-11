'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const N = require('../ingest/normalize.js');

const raw = over => ({ rawId: 1, company: 'Acme', ats: 'greenhouse', token: 'acme', title: 'Software Engineer', locations: ['Hyderabad, Telangana, India'], remote: false, employmentType: '', postedAt: '2026-11-08T10:00:00Z', url: 'https://boards.greenhouse.io/acme/jobs/1', text: 'We want 0-2 years of experience with Java, Spring Boot and SQL. Freshers welcome.', ...over });

test('keeps a Hyderabad fresher software role and extracts skills', () => {
  const { job, reason } = N.normalizeJob(raw({}));
  assert.equal(reason, 'kept');
  assert.equal(job.type, 'Job');
  assert.equal(job.level, 'fresher');
  assert.equal(job.city, 'Hyderabad');
  assert.ok(job.skills.includes('Java') && job.skills.includes('SQL'));
  assert.equal(job.live, true);
  assert.deepEqual(job.years, [4]);
});

test('internships are typed Internship and open to every year', () => {
  const { job } = N.normalizeJob(raw({ title: 'Data Science Intern', text: '6 months internship with Python and pandas' }));
  assert.equal(job.type, 'Internship');
  assert.equal(job.dur, '6 months');
  assert.deepEqual(job.years, [1, 2, 3, 4]);
});

test('drops senior titles, 3+ years, unknown experience, wrong city and non-tech roles', () => {
  assert.equal(N.normalizeJob(raw({ title: 'Senior Software Engineer' })).reason, 'seniority');
  assert.equal(N.normalizeJob(raw({ text: 'Requires 5+ years of experience in Java' })).reason, 'seniority');
  assert.equal(N.normalizeJob(raw({ text: 'Build great things in Java.' })).reason, 'seniority');
  assert.equal(N.normalizeJob(raw({ locations: ['London, UK'] })).reason, 'location');
  assert.equal(N.normalizeJob(raw({ title: 'Sales Development Representative', text: 'freshers welcome' })).reason, 'role');
});

test('non-engineering operations roles are dropped even when junior', () => {
  ['KYC Operations Associate Analyst', 'Customer Support II (Voice Process)', 'Commissions Analyst - RevOps', 'Deal Desk Analyst'].forEach(title => {
    assert.equal(N.normalizeJob(raw({ title })).reason, 'role', title);
  });
  assert.equal(N.normalizeJob(raw({ title: 'Associate Security Engineer' })).reason, 'kept');
});

test('India-remote roles are kept, Bengaluru onsite is not', () => {
  assert.equal(N.normalizeJob(raw({ locations: ['Remote - India'], remote: true })).job.city, 'India (remote)');
  assert.equal(N.normalizeJob(raw({ locations: ['Bengaluru, India'] })).reason, 'location');
});

test('internships are kept anywhere in India, fresher jobs only in Hyderabad or remote', () => {
  const i = N.normalizeJob(raw({ title: 'Software Engineering Intern', locations: ['Bengaluru, India'], text: '6 months internship, Python' }));
  assert.equal(i.reason, 'kept');
  assert.equal(i.job.city, 'Bengaluru');
  assert.equal(N.normalizeJob(raw({ locations: ['Pune, India'] })).reason, 'location');
});

test('1-2 years experience roles are not shown (everyone here is a fresher)', () => {
  assert.equal(N.normalizeJob(raw({ text: 'Requires 2 years of experience in Java' })).reason, 'seniority');
});

test('years-of-experience parser', () => {
  assert.equal(N.minYearsExperience('1-3 years of relevant experience'), 1);
  assert.equal(N.minYearsExperience('Minimum 4+ years experience'), 4);
  assert.equal(N.minYearsExperience('Freshers can apply'), 0);
  assert.equal(N.minYearsExperience('no years mentioned'), null);
});

test('HTML from Greenhouse is decoded and stripped', () => {
  assert.equal(N.stripHtml('&lt;p&gt;Hello &amp;amp; welcome&lt;/p&gt;&lt;ul&gt;&lt;li&gt;Java&lt;/li&gt;&lt;/ul&gt;'), 'Hello & welcome\n• Java');
});

test('rejects non-http apply links', () => {
  assert.equal(N.normalizeJob(raw({ url: 'javascript:alert(1)' })).reason, 'no-url');
});

test('dedupe and first-seen tracking are pure', () => {
  const a = N.normalizeJob(raw({})).job;
  const b = { ...a, id: 'other' };
  assert.equal(N.dedupe([a, b]).length, 1);
  const seen = { old: '2026-01-01', keep: '2026-11-01' };
  const next = N.mergeSeen(seen, [a], '2026-11-11');
  assert.equal(next[a.id], '2026-11-11');
  assert.equal(next.keep, '2026-11-01');
  assert.equal(next.old, undefined, 'stale ids are pruned');
  assert.equal(seen.old, '2026-01-01', 'input not mutated');
});
