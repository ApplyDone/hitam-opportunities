/* ============================================================
   store.js — single source of truth. State objects are never
   mutated: every change builds a new object and persists it.
   ============================================================ */
'use strict';

const freshState = () => ({
  v: 3,
  theme: '',
  profile: { ...BLANK_PROFILE, skills: {}, interests: [] },
  rollSynced: '',
  weights: { ...W_DEFAULT },
  apps: {},
  custom: [],
  chat: [],
  compare: [],
  filters: { ...DEFAULT_FILTERS },
  views: { explore: 'grid', track: 'board' },
  sus: [],
  evidence: [],
  tested: false,
  resume: null
});

/* Live company jobs: loaded from the embedded snapshot or data/jobs.json, never persisted in localStorage. */
let LIVE = { jobs: [], meta: null };
const isHttpUrl = u => { try { const x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:'; } catch (e) { return false; } };
function setLiveData(data) {
  if (!data || !Array.isArray(data.jobs)) return false;
  const jobs = data.jobs.filter(j => j && j.id && j.title && TYPES.includes(j.type) && Array.isArray(j.skills) && Array.isArray(j.years) && Array.isArray(j.pay) && isHttpUrl(j.applyUrl))
    .map(j => ({ ...j, live: true, skills: j.skills.filter(s => SKILLS.includes(s)).concat(j.skills.some(s => SKILLS.includes(s)) ? [] : ['Problem Solving']) }));
  LIVE = { jobs, meta: { generatedAt: data.generatedAt, counts: data.counts || {}, sources: (data.sources || []).length } };
  return true;
}

let S = freshState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    S = mergeState(JSON.parse(raw));
  } catch (err) {
    S = freshState();
  }
}

/* Validate and merge untrusted JSON (localStorage or an imported backup). */
function mergeState(x) {
  const base = freshState();
  if (!x || typeof x !== 'object' || !x.profile || typeof x.profile !== 'object') throw new Error('Not a valid backup file');
  const p = x.profile;
  const profile = {
    ...base.profile, ...BLANK_PROFILE,
    name: String(p.name || ''), branch: BRANCHES.includes(p.branch) ? p.branch : 'CSE',
    year: [1, 2, 3, 4].includes(Number(p.year)) ? Number(p.year) : 1,
    cgpa: p.cgpa === '' || p.cgpa == null ? '' : String(p.cgpa),
    mode: MODES.includes(p.mode) ? p.mode : 'Any', hours: Math.min(40, Math.max(1, Number(p.hours) || 10)),
    track: TRACKS.some(t => t.id === p.track) ? p.track : '', goal: String(p.goal || ''), project: String(p.project || ''),
    interests: Array.isArray(p.interests) ? p.interests.filter(t => TYPES.includes(t)) : [],
    skills: Object.fromEntries(Object.entries(p.skills || {}).filter(([k, v]) => SKILLS.includes(k) && [1, 2, 3].includes(Number(v))).map(([k, v]) => [k, Number(v)]))
  };
  const weights = { ...W_DEFAULT };
  Object.keys(weights).forEach(k => { if (x.weights && Number.isFinite(Number(x.weights[k]))) weights[k] = Math.min(100, Math.max(0, Number(x.weights[k]))); });
  const apps = {};
  Object.entries(x.apps || {}).forEach(([id, a]) => {
    if (a && COLUMNS.includes(a.st)) apps[id] = { st: a.st, notes: String(a.notes || ''), iv: /^\d{4}-\d{2}-\d{2}$/.test(a.iv || '') ? a.iv : '', ck: Array.isArray(a.ck) ? a.ck.filter(Number.isInteger) : [], log: Array.isArray(a.log) ? a.log.slice(-30) : [] };
  });
  const custom = (Array.isArray(x.custom) ? x.custom : []).filter(o => o && o.title && o.deadline && TYPES.includes(o.type) && Array.isArray(o.skills));
  return {
    ...base, profile, weights, apps, custom,
    theme: x.theme === 'dark' || x.theme === 'light' ? x.theme : '',
    chat: Array.isArray(x.chat) ? x.chat.slice(-40) : [],
    compare: Array.isArray(x.compare) ? x.compare.slice(0, 3) : [],
    filters: { ...DEFAULT_FILTERS, ...(x.filters || {}), q: '' },
    views: { ...base.views, ...(x.views || {}) },
    sus: Array.isArray(x.sus) ? x.sus.filter(r => Array.isArray(r.a) && susScore(r.a) !== null).slice(-50) : [],
    evidence: Array.isArray(x.evidence) ? x.evidence.slice(-60) : [],
    tested: Boolean(x.tested),
    rollSynced: String(x.rollSynced || ''),
    resume: x.resume && typeof x.resume.text === 'string' ? { text: x.resume.text.slice(0, 60000), pages: Number(x.resume.pages) || null, fileName: String(x.resume.fileName || 'resume').slice(0, 80), at: Number(x.resume.at) || Date.now() } : null
  };
}

function persist() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (err) { /* private mode: keep working in memory */ }
  if (typeof cloudSave === 'function') cloudSave();
}
function commit(patch) { S = { ...S, ...patch }; persist(); }
function setProfile(patch) { commit({ profile: { ...S.profile, ...patch } }); }
function setSkill(name, level) {
  const skills = { ...S.profile.skills };
  if (level > 0) skills[name] = level; else delete skills[name];
  setProfile({ skills });
}
function toggleIn(list, v) { return list.includes(v) ? list.filter(x => x !== v) : [...list, v]; }
function setFilters(patch) { commit({ filters: { ...S.filters, ...patch } }); }

const allOpps = () => [...(AUTH.state === 'preview' ? SEED : []), ...S.custom, ...NOTICES, ...LIVE.jobs];
const oppById = id => allOpps().find(o => String(o.id) === String(id));
const personaProfile = id => {
  const p = PERSONAS.find(x => x.id === id).profile;
  return { ...BLANK_PROFILE, ...p, skills: { ...p.skills }, interests: [...p.interests] };
};

/* ---------- Tracker ---------- */
function trackOpp(id, st) {
  const prev = S.apps[id];
  const entry = prev ? { ...prev } : { st, notes: '', iv: '', ck: [], log: [] };
  const changed = !prev || prev.st !== st;
  const log = changed ? [...(entry.log || []), { st, t: Date.now() }].slice(-30) : entry.log;
  commit({ apps: { ...S.apps, [id]: { ...entry, st, log } } });
}
function patchApp(id, patch) {
  if (!S.apps[id]) trackOpp(id, 'Saved');
  commit({ apps: { ...S.apps, [id]: { ...S.apps[id], ...patch } } });
}
function untrack(id) {
  const removed = S.apps[id];
  const apps = { ...S.apps };
  delete apps[id];
  commit({ apps });
  return removed;
}
function restoreApp(id, app) { commit({ apps: { ...S.apps, [id]: app } }); }
function toggleChecklist(id, i) {
  const cur = (S.apps[id] && S.apps[id].ck) || [];
  patchApp(id, { ck: cur.includes(i) ? cur.filter(x => x !== i) : [...cur, i] });
}
