'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const src = ['data.js', 'engine.js', 'assistant.js']
  .map(f => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8')).join('\n');
const ctxVm = vm.createContext({ module: { exports: {} }, console });
vm.runInContext(`${src}\nthis.api = { SEED, PERSONAS, BLANK_PROFILE, W_DEFAULT, assistantReply, extractEntities };`, ctxVm);
const A = ctxVm.api;
const profile = { ...A.BLANK_PROFILE, ...A.PERSONAS[0].profile };
const ctx = { opps: A.SEED, profile, weights: A.W_DEFAULT, apps: {} };
const ask = q => A.assistantReply(q, ctx);

test('deadline question returns only listings inside the window', () => {
  const r = ask('What closes this week?');
  assert.ok(r.opps.length > 0);
  r.opps.forEach(it => {
    const o = A.SEED.find(x => x.id === it.id);
    assert.ok(o.d >= 0 && o.d <= 7, `${o.title} d=${o.d}`);
  });
});

test('"Paid remote internships" filters by pay, mode and type', () => {
  const r = ask('Paid remote internships');
  assert.ok(r.opps.length > 0);
  r.opps.forEach(it => {
    const o = A.SEED.find(x => x.id === it.id);
    assert.equal(o.type, 'Internship');
    assert.ok(['Remote', 'Hybrid'].includes(o.mode));
    assert.ok(o.pay[0] === 'stipend');
  });
});

test('skill question yields a roadmap with learning advice', () => {
  const r = ask('Which skill should I learn next?');
  assert.match(r.text, /Try:/);
});

test('"why is my top match ranked first" explains the score breakdown', () => {
  const r = ask('Why is my top match ranked first?');
  assert.match(r.text, /Skill fit/);
  assert.equal(r.opps.length, 1);
});

test('named listing is resolved from natural language', () => {
  const e = A.extractEntities('how do i prepare for the cyber ctf night', A.SEED);
  assert.equal(e.opps[0].id, 24);
});

test('plan produces dated lines and no empty days', () => {
  const r = ask('Plan my week');
  assert.ok(r.plan && r.plan.length > 0);
  r.plan.forEach(d => assert.ok(d.lines.length > 0));
});

test('empty tracker and greeting and fallback behave', () => {
  assert.match(ask('where do my applications stand?').text, /not tracking/);
  assert.match(ask('hello').text, /Ananya/);
  assert.match(ask('zzzz qqqq').text, /did not catch/);
});

test('compare needs two listings and picks the better fit', () => {
  const r = ask('compare Data Analyst Intern vs UI/UX Design Intern');
  assert.equal(r.opps.length, 2);
  assert.match(r.text, /fits better/);
});
