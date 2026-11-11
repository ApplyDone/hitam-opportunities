'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseRoll, isHitamEmail } = require('../src/roll.js');

const NOV_2026 = new Date(2026, 10, 11);

test('regular first-year CSE student from email', () => {
  const r = parseRoll('26e51a05d2@hitam.org', NOV_2026);
  assert.equal(r.branch, 'CSE');
  assert.equal(r.admitYear, 2026);
  assert.equal(r.lateral, false);
  assert.equal(r.gradYear, 2030);
  assert.equal(r.year, 1);
});

test('branch codes match real HITAM placement records', () => {
  assert.equal(parseRoll('22E51A0420', NOV_2026).branch, 'ECE');
  assert.equal(parseRoll('22E51A0591', NOV_2026).branch, 'CSE');
  assert.equal(parseRoll('24E51A6612', NOV_2026).branch, 'CSM');
  assert.equal(parseRoll('24E51A6701', NOV_2026).branch, 'CSD');
});

test('CSC and CSO codes match HITAM placement records', () => {
  assert.equal(parseRoll('22E51A6250', NOV_2026).branch, 'CSC');
  assert.equal(parseRoll('22E51A6924', NOV_2026).branch, 'CSO');
});

test('lateral entry graduates a year earlier; finished batches are alumni', () => {
  const r = parseRoll('25E55A0215', NOV_2026);
  assert.equal(r.lateral, true);
  assert.equal(r.branch, 'EEE');
  assert.equal(r.gradYear, 2028);
  assert.equal(r.year, 3);
  assert.equal(parseRoll('21E51A0501', NOV_2026).alumni, true);
});

test('year changes at the start of the academic year in June', () => {
  assert.equal(parseRoll('26E51A0501', new Date(2027, 4, 30)).year, 1);
  assert.equal(parseRoll('26E51A0501', new Date(2027, 5, 1)).year, 2);
});

test('non-student or non-HITAM addresses', () => {
  assert.equal(parseRoll('head.cdc@hitam.org'), null);
  assert.equal(isHitamEmail('26E51A05A1@hitam.org'), true);
  assert.equal(isHitamEmail('someone@gmail.com'), false);
  assert.equal(isHitamEmail('x@hitam.org.evil.com'), false);
});
