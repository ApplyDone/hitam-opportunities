/* ============================================================
   assistant.js — rule-based opportunity assistant.
   Pure: takes a question + context, returns structured data
   ({text, opps, plan, actions, follow}). The UI renders it, so
   deadlines are always fresh when a chat is reopened.
   ============================================================ */
'use strict';

const TYPE_SYN = {
  Job: ['job', 'jobs', 'full-time', 'full time', 'off-campus', 'fresher role'],
  Placement: ['placement', 'campus drive', 'recruit', 'drive'],
  Internship: ['internship', 'intern'],
  Hackathon: ['hackathon', 'hack-a-thon', 'ctf', 'competition', 'challenge'],
  Workshop: ['workshop', 'bootcamp', 'training', 'crash course', 'clinic'],
  Research: ['research', 'fellowship', 'lab ', 'apprenticeship'],
  Club: ['club', 'core team', 'ambassador', 'volunteer', 'e-cell']
};
const SKILL_ALIAS = {
  js: 'JavaScript', ml: 'AI/ML', ai: 'AI/ML', 'machine learning': 'AI/ML', dl: 'Deep Learning', 'neural': 'Deep Learning',
  ui: 'UI/UX', ux: 'UI/UX', design: 'UI/UX', cyber: 'Cybersecurity', security: 'Cybersecurity', embedded: 'Embedded C',
  github: 'Git', analytics: 'Data Analysis', data: 'Data Analysis', robot: 'Robotics', writing: 'Technical Writing', speaking: 'Public Speaking', web: 'Web Dev'
};
const TITLE_STOP = new Set(['the', 'and', 'for', 'with', 'intern', 'campus', 'drive', 'internship', 'basics', 'essentials', 'intro', 'engineering', 'engineer']);

const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasWord = (q, w) => new RegExp(`(^|[^a-z0-9+])${reEsc(w)}([^a-z0-9+]|$)`, 'i').test(q);

function extractEntities(q, opps) {
  const types = TYPES.filter(t => TYPE_SYN[t].some(s => q.includes(s)));
  const skills = new Set();
  SKILLS.filter(s => s.length > 1).forEach(s => { if (hasWord(q, s.toLowerCase())) skills.add(s); });
  Object.entries(SKILL_ALIAS).forEach(([a, s]) => { if (hasWord(q, a)) skills.add(s); });
  if (/\bc programming\b|\bin c\b/.test(q)) skills.add('C');
  const mode = hasWord(q, 'remote') || hasWord(q, 'online') ? 'Remote' : hasWord(q, 'hybrid') ? 'Hybrid' : /on-?campus|\bcampus\b/.test(q) && !/campus drive/.test(q) ? 'On-campus' : null;
  const paid = /\bpaid\b|stipend|\bsalary\b|\bearn/.test(q);
  const unpaid = /\bunpaid\b|\bfree\b/.test(q);

  const found = opps.map(o => {
    const words = o.title.toLowerCase().split(/[^a-z0-9+&]+/).filter(w => w.length > 2 && !TITLE_STOP.has(w));
    const hit = words.filter(w => hasWord(q, w)).length;
    return { o, score: q.includes(o.title.toLowerCase()) ? 99 : hit };
  }).filter(x => x.score >= 2).sort((a, b) => b.score - a.score).map(x => x.o);

  let days = null;
  const m = q.match(/(\d+)\s*(day|week)/);
  if (m) days = Number(m[1]) * (m[2] === 'week' ? 7 : 1);
  else if (/\btoday\b/.test(q)) days = 0;
  else if (/\btomorrow\b/.test(q)) days = 1;
  else if (/next week/.test(q)) days = 14;
  else if (/this week|\bweek\b/.test(q)) days = 7;
  else if (/month/.test(q)) days = 30;
  return { types, skills: [...skills], mode, paid, unpaid, opps: found, days };
}

const bold = s => `**${s}**`;
const topReason = r => {
  const best = [...r.parts].sort((a, b) => b.pts - a.pts)[0];
  return best.note;
};

function applyEntityFilters(rows, e) {
  return rows.filter(({ o }) =>
    (!e.types.length || e.types.includes(o.type)) &&
    (!e.skills.length || e.skills.some(s => o.skills.includes(s))) &&
    (!e.mode || o.mode === e.mode || (e.mode !== 'On-campus' && o.mode === 'Hybrid')) &&
    (!e.paid || isPaid(o)) && (!e.unpaid || !isPaid(o)));
}
const describeFilters = e => [
  e.paid ? 'paid' : '', e.unpaid ? 'unpaid' : '', e.mode ? e.mode.toLowerCase() : '',
  e.skills.length ? `${joinList(e.skills)}` : '', e.types.length ? e.types.map(t => t.toLowerCase()).join('/') : 'listings'
].filter(Boolean).join(' ');

function rowsFor(ctx, now) {
  return rankOpps(ctx.opps, ctx.profile, ctx.weights, now);
}
const noteFor = ({ o, r }) => `${countdownLong(r.dl)} · ${r.score}% match${r.elig.ok ? '' : ' · not open to you'}`;
const asItems = rows => rows.map(x => ({ id: x.o.id, note: noteFor(x) }));

/* ---------- Intents ---------- */
function replyGreeting(ctx) {
  const n = ctx.profile.name.trim() || 'there';
  return { text: `Hello ${n}. I read your profile and the live listings, so ask me about deadlines, matches, what to learn or how to prepare.`, follow: ['What closes this week?', 'Show my best matches', 'Plan my week'] };
}

function replyDeadlines(ctx, e, now) {
  const win = e.days === null ? 7 : e.days;
  let rows = rowsFor(ctx, now).filter(x => !x.r.closed && x.r.dl <= win);
  rows = applyEntityFilters(rows, e).sort((a, b) => a.r.dl - b.r.dl);
  if (!rows.length) return { text: `Nothing closes in the next ${win === 0 ? 'few hours' : win + ' days'}${e.types.length ? ' for that type' : ''}. A good moment to prepare for what is coming.`, follow: ['Show my best matches', 'Plan my week'] };
  const open = rows.filter(x => x.r.elig.ok).length;
  const label = win === 0 ? 'today' : win === 1 ? 'by tomorrow' : win === 7 ? 'this week' : `within ${win} days`;
  return { text: `${bold(rows.length + ' listing' + (rows.length > 1 ? 's' : ''))} close ${label}. ${open} ${open === 1 ? 'is' : 'are'} open to you.`, opps: asItems(rows.slice(0, 6)), follow: ['Plan my week', 'Which skill should I learn next?'] };
}

function replyBest(ctx, e, now) {
  let rows = rowsFor(ctx, now).filter(x => !x.r.closed && x.r.elig.ok);
  rows = applyEntityFilters(rows, e);
  if (!rows.length) return { text: 'No eligible listings fit that. Try loosening a filter.', follow: ['Show my best matches'] };
  const top = rows[0];
  return {
    text: `Your best ${describeFilters(e) === 'listings' ? 'matches' : describeFilters(e)} right now. ${bold(top.o.title)} leads at ${top.r.score}%: ${lowerFirst(topReason(top.r))}.`,
    opps: asItems(rows.slice(0, 5)), follow: [`Why is ${top.o.title} ranked first?`, 'Which skill should I learn next?']
  };
}

function replyFind(ctx, e, now) {
  let rows = rowsFor(ctx, now).filter(x => !x.r.closed);
  rows = applyEntityFilters(rows, e);
  const okRows = rows.filter(x => x.r.elig.ok);
  const hidden = rows.length - okRows.length;
  if (!rows.length) return { text: `I found no open ${describeFilters(e)}.`, follow: ['Show my best matches'] };
  const shown = (okRows.length ? okRows : rows).sort((a, b) => b.r.score - a.r.score).slice(0, 6);
  return {
    text: `${bold(okRows.length + ' open ' + describeFilters(e))} for you${hidden ? `, plus ${hidden} you are not eligible for` : ''}.`,
    opps: asItems(shown), follow: ['What closes this week?', 'Plan my week']
  };
}

function replyExplain(ctx, e, now) {
  const rows = rowsFor(ctx, now).filter(x => !x.r.closed);
  const row = e.opps.length ? rows.find(x => x.o.id === e.opps[0].id) : rows.find(x => x.r.elig.ok);
  if (!row) return { text: 'I could not find that listing.' };
  const { o, r } = row;
  const lines = r.parts.map(p => `• ${p.label}: ${p.pts}/${p.max}. ${p.note}.`).join('\n');
  const gap = r.gaps.length ? `\nTo close the gap: ${joinList(r.gaps.map(g => `${g.skill} to ${LEVELS[g.need].toLowerCase()}`))}.` : '';
  const elig = r.elig.ok ? '' : `\nNot open to you: ${r.elig.fails.join('; ')}.`;
  return { text: `${bold(o.title)} scores ${bold(r.score + '%')}.\n${lines}${gap}${elig}`, opps: [{ id: o.id, note: noteFor(row) }], follow: ['Which skill should I learn next?', `How do I prepare for ${o.title}?`] };
}

function replyEligibility(ctx, e, now) {
  if (e.opps.length) {
    const o = e.opps[0];
    const el = eligibility(o, ctx.profile);
    return { text: el.ok ? `Yes, ${bold(o.title)} is open to you.${el.notes.length ? ' ' + el.notes.join(' ') : ''}` : `Not yet. ${bold(o.title)}: ${el.fails.join('; ')}.`, opps: [{ id: o.id, note: countdownLong(daysLeft(o, now)) }] };
  }
  const open = ctx.opps.filter(o => !isClosed(o, now));
  const ok = open.filter(o => eligibility(o, ctx.profile).ok).length;
  return { text: `As a ${ordinal(Number(ctx.profile.year))}-year ${ctx.profile.branch} student you can apply to ${bold(ok + ' of ' + open.length)} open listings. Name one and I will check it.`, follow: ['Show my best matches'] };
}

function replyGaps(ctx, now) {
  const gaps = skillGaps(ctx.opps, ctx.profile, ctx.weights, now).slice(0, 4);
  if (!gaps.length) return { text: 'You already meet the bar for the skills in your open, eligible listings. Raise your levels in your profile for stretch roles.', follow: ['Show my best matches'] };
  const lines = gaps.map((g, i) => `${i + 1}. ${bold(g.skill)} to ${LEVELS[g.target].toLowerCase()}: +${g.delta} points across ${g.ids.length} listing${g.ids.length > 1 ? 's' : ''}${g.unlocks ? `, moves ${g.unlocks} into strong-match territory` : ''}.\n   Try: ${g.learn}.`).join('\n');
  return { text: `These skills lift your matches the most:\n${lines}`, actions: [{ label: 'Open skill roadmap', href: '#/explore/internships' }], follow: ['Show my best matches'] };
}

function replyPrep(ctx, e, now) {
  if (/resume|\bcv\b/.test(e.raw)) {
    return { text: `Resume checklist:\n• One page, projects before coursework.\n• Each project: what you built, the tools, and one measurable result.\n• GitHub and LinkedIn links that work.\n• Clubs, workshops and certificates in a short last section.\nThe Prepare page has bullet templates tuned to each listing.`, actions: [{ label: 'Open Prepare', href: '#/prepare' }] };
  }
  const o = e.opps[0];
  const type = o ? o.type : e.types[0];
  if (!type) return { text: 'Tell me which listing or type (internship, hackathon, placement…) and I will list what to do first.', follow: ['How do I prepare for an internship?', 'How do I prepare for a hackathon?'] };
  const list = (CHECKLISTS[type] || []).slice(0, 4).map(x => `• ${x}`).join('\n');
  const qs = (QBANK[type] || []).slice(0, 2).map(x => `• ${x}`).join('\n');
  return {
    text: `${bold(o ? o.title : type)}: start here.\n${list}\n\nExpect questions like:\n${qs}`,
    opps: o ? [{ id: o.id, note: countdownLong(daysLeft(o, now)) }] : undefined,
    actions: [{ label: o ? 'Open preparation' : 'Open Prepare', href: o ? `#/prepare/${o.id}` : '#/prepare' }]
  };
}

function replyTracker(ctx, now) {
  const ids = Object.keys(ctx.apps);
  if (!ids.length) return { text: 'You are not tracking anything yet. Save a listing and I will keep an eye on its deadline.', actions: [{ label: 'Browse listings', href: '#/explore' }], follow: ['Show my best matches'] };
  const counts = COLUMNS.map(c => [c, ids.filter(i => ctx.apps[i].st === c).length]).filter(x => x[1]);
  const attention = ids.map(i => ({ o: ctx.opps.find(x => String(x.id) === String(i)), a: ctx.apps[i] })).filter(x => x.o && x.a.st === 'Saved' && daysLeft(x.o, now) >= 0 && daysLeft(x.o, now) <= 5);
  return {
    text: `You are tracking ${bold(ids.length + (ids.length > 1 ? ' listings' : ' listing'))}: ${counts.map(c => c[1] + ' ' + c[0].toLowerCase()).join(', ')}.${attention.length ? `\n${attention.length} saved listing${attention.length > 1 ? 's close' : ' closes'} within five days.` : ''}`,
    opps: attention.map(x => ({ id: x.o.id, note: `Still only saved · ${countdownLong(daysLeft(x.o, now))}` })),
    actions: [{ label: 'Open tracker', href: '#/track' }]
  };
}

function replyPlan(ctx, now) {
  const rows = rowsFor(ctx, now).filter(x => !x.r.closed && x.r.elig.ok && x.r.dl <= 10 && ((ctx.apps[x.o.id] && ctx.apps[x.o.id].st === 'Saved') || x.r.score >= 55));
  if (!rows.length) return { text: 'No eligible deadlines in the next ten days. Use the time to raise a skill level.', follow: ['Which skill should I learn next?'] };
  const days = [];
  for (let i = 0; i < 7; i += 1) { const d = startOfDay(now); d.setDate(d.getDate() + i); days.push({ i, label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : fmtShort(d), lines: [] }); }
  rows.forEach(({ o, r }) => {
    const submit = Math.max(0, r.dl - 1);
    const prep = Math.max(0, submit - 2);
    if (days[prep]) days[prep].lines.push(`Start preparing: ${o.title}`);
    if (submit !== prep && days[submit]) days[submit].lines.push(`Submit: ${o.title}${r.dl === 0 ? ' (closes today)' : ''}`);
    else if (days[submit]) days[submit].lines.push(`Submit: ${o.title}`);
  });
  return { text: `Here is a realistic week. I schedule preparation two days before each submission and keep a one-day buffer before every deadline.`, plan: days.filter(d => d.lines.length), actions: [{ label: 'Export to calendar', href: '#/track?export=1' }] };
}

function replyCompare(ctx, e, now) {
  const [a, b] = e.opps;
  const ra = scoreOpp(a, ctx.profile, ctx.weights, now);
  const rb = scoreOpp(b, ctx.profile, ctx.weights, now);
  const win = ra.score >= rb.score ? [a, ra] : [b, rb];
  return { text: `${bold(a.title)}: ${ra.score}% · ${countdownLong(ra.dl)}\n${bold(b.title)}: ${rb.score}% · ${countdownLong(rb.dl)}\nOn your profile, ${bold(win[0].title)} fits better.`, opps: [{ id: a.id, note: `${ra.score}% match` }, { id: b.id, note: `${rb.score}% match` }], actions: [{ label: 'Open full comparison', href: `#/explore?cmp=${a.id},${b.id}` }] };
}

const HELP = { text: 'I can help with:\n• Deadlines: “what closes in 5 days?”\n• Matches: “best paid remote internships”\n• Reasons: “why is Data Analyst Intern ranked first?”\n• Skills: “what should I learn next?”\n• Prep: “how do I prepare for a hackathon?”\n• Planning: “plan my week”\n• Status: “where do my applications stand?”', follow: ['What closes this week?', 'Plan my week', 'Which skill should I learn next?'] };

function assistantReply(question, ctx, now = new Date()) {
  const raw = question.trim().toLowerCase();
  if (!raw) return HELP;
  const e = { ...extractEntities(raw, ctx.opps), raw };
  const has = (re) => re.test(raw);
  const hasEntity = e.types.length || e.skills.length || e.mode || e.paid || e.unpaid;

  if (has(/^(hi|hello|hey|namaste|yo)\b|^good (morning|afternoon|evening)/)) return replyGreeting(ctx);
  if (has(/\b(plan|schedule|organi[sz]e|timetable)\b/) && has(/\b(week|day|days|time|deadlines?)\b/)) return replyPlan(ctx, now);
  if (has(/\bwhy\b/) && (has(/rank|match|top|first|score|recommend|fit/) || e.opps.length)) return replyExplain(ctx, e, now);
  if (has(/compare|\bvs\.?\b|versus|difference between/) && e.opps.length >= 2) return replyCompare(ctx, e, now);
  if (has(/can i apply|am i eligible|eligib|qualif|\bcan i\b/)) return replyEligibility(ctx, e, now);
  if (has(/(learn|upskill|improve|roadmap|skill gap|study)|(which|what) skills?/) && !e.opps.length) return replyGaps(ctx, now);
  if (has(/prepar|\bprep\b|interview|tips|how (do|to|can) i (get|crack|apply)|resume|\bcv\b|cover letter/)) return replyPrep(ctx, e, now);
  if (has(/track|status|pipeline|applied|my applications?|progress|where do/)) return replyTracker(ctx, now);
  if (has(/deadline|clos(e|es|ing)|due|urgent|soon|last date|expir/)) return replyDeadlines(ctx, e, now);
  if (has(/best|top|recommend|suggest|match|for me|fit/)) return replyBest(ctx, e, now);
  if (hasEntity || has(/\b(show|find|list|any|which|what)\b/)) return hasEntity ? replyFind(ctx, e, now) : replyBest(ctx, e, now);
  return { ...HELP, text: `I did not catch that. ${HELP.text}` };
}

if (typeof module !== 'undefined') module.exports = { assistantReply, extractEntities };
