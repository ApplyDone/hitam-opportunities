/* ============================================================
   roll.js — read branch and year from a HITAM roll number.
   HITAM student mail is <roll>@hitam.org, e.g. 26E51A05A1:
     26  admission year (2026)    E5  college code (HITAM)
     1A  regular entry (5A = lateral entry, joins year 2)
     05  branch code (JNTUH)      D2  serial
   ============================================================ */
'use strict';

const ALLOWED_DOMAIN = 'hitam.org';
const BRANCH_CODES = { '01': 'CIVIL', '02': 'EEE', '03': 'MECH', '04': 'ECE', '05': 'CSE', '12': 'IT', '66': 'CSM', '67': 'CSD' };
const ROLL_RE = /^(\d{2})E5([15])A(\d{2})[0-9A-Z]{2}$/i;

/** Returns {roll, admitYear, lateral, branch, gradYear, year, alumni} or null if not a student roll. */
function parseRoll(emailOrRoll, now = new Date()) {
  const local = String(emailOrRoll || '').trim().split('@')[0].toUpperCase();
  const m = local.match(ROLL_RE);
  if (!m) return null;
  const admitYear = 2000 + Number(m[1]);
  const lateral = m[2] === '5';
  const gradYear = admitYear + (lateral ? 3 : 4);
  const endYear = now.getMonth() >= 5 ? now.getFullYear() + 1 : now.getFullYear();
  const y = 4 - (gradYear - endYear);
  return { roll: local, admitYear, lateral, branch: BRANCH_CODES[m[3]] || '', gradYear, year: y >= 1 && y <= 4 ? y : null, alumni: y > 4 };
}

const isHitamEmail = email => new RegExp(`@${ALLOWED_DOMAIN.replace('.', '\\.')}$`, 'i').test(String(email || '').trim());

if (typeof module !== 'undefined') module.exports = { parseRoll, isHitamEmail, BRANCH_CODES };
