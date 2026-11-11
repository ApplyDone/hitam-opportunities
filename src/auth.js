/* ============================================================
   auth.js — HITAM account sign-in (Google Workspace, @hitam.org)
   and cloud sync via Firebase. The web config is public by
   design; access is enforced by firebase/firestore.rules.
   ============================================================ */
'use strict';

const FB_LIBS = [
  ['https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js', 'sha384-ZaR6mWzmJtrRibZ1Vm7SoHFr8OXjyAuGAXalGDKqbxFT18oi/z+oZLIRFkpeNor1'],
  ['https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js', 'sha384-I1LYojsZ5RM1cOda44Z2h42Qa6YfsQ1XkXxREnhp4ueYBR/4d1pG1K+NZM537Vsj'],
  ['https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js', 'sha384-Ke0FJhH7LyRqDxZ0wt+/OXV38yfQVu7g9VPEEGjYmB4RVOY/ta04uecRhsMwT7V3']
];
const AUTH = { state: 'loading', error: '', user: null };
let NOTICES = [];
const isLocalHost = () => location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

const AUTH_ERRORS = {
  'auth/popup-closed-by-user': 'The sign-in window was closed before finishing.',
  'auth/cancelled-popup-request': 'Another sign-in window is already open.',
  'auth/network-request-failed': 'No connection. Check your internet and try again.',
  'auth/unauthorized-domain': 'This web address is not yet allowed for sign-in. Ask the admin to add it in Firebase.',
  'auth/operation-not-allowed': 'Google sign-in is not switched on in Firebase yet.'
};

async function loadFirebase() {
  for (const [src, sri] of FB_LIBS) await loadScript({ src, sri }); // sequential: app must load first
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
/* The admin's personal Google account. Only a hash ships in the page; firestore.rules enforce the real check. */
async function isAdminEmail(email) {
  if (!APP_CONFIG.adminHash || !email || !window.crypto || !crypto.subtle) return false;
  try { return (await sha256Hex(String(email).trim().toLowerCase())) === APP_CONFIG.adminHash; } catch (err) { return false; }
}
const isAdmin = () => Boolean(AUTH.user && AUTH.user.admin);

async function setUser(u, onChange) {
  if (!u) { AUTH.user = null; AUTH.state = 'signedout'; onChange(); return; }
  const admin = u.emailVerified && await isAdminEmail(u.email);
  if (!u.emailVerified || (!isHitamEmail(u.email) && !admin)) {
    AUTH.state = 'denied';
    AUTH.error = `${u.email || 'That account'} is not a HITAM account. Use your @hitam.org email.`;
    firebase.auth().signOut();
    onChange();
    return;
  }
  AUTH.user = { uid: u.uid, email: u.email, name: u.displayName || '', photo: u.photoURL || '', admin };
  AUTH.state = 'signedin';
  AUTH.error = '';
  onChange();
}

async function initAuth(onChange) {
  if (isLocalHost() && new URLSearchParams(location.search).has('preview')) { startPreview(); return; }
  if (!APP_CONFIG.firebase) { AUTH.state = 'unconfigured'; onChange(); return; }
  try {
    await loadFirebase();
    if (!firebase.apps.length) firebase.initializeApp(APP_CONFIG.firebase);
    firebase.auth().onAuthStateChanged(u => setUser(u, onChange));
  } catch (err) {
    AUTH.state = 'error';
    AUTH.error = 'Could not reach the sign-in service. Check your connection and reload.';
    onChange();
  }
}

async function signInWithHitam(asAdmin = false) {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters(asAdmin ? { prompt: 'select_account' } : { hd: APP_CONFIG.allowedDomain, prompt: 'select_account' });
  AUTH.error = '';
  try {
    await firebase.auth().signInWithPopup(provider);
  } catch (err) {
    if (err.code === 'auth/popup-blocked') { await firebase.auth().signInWithRedirect(provider); return; }
    AUTH.error = AUTH_ERRORS[err.code] || 'Sign-in failed. Please try again.';
    renderGate();
  }
}

function signOutUser() {
  stopCloud();
  if (AUTH.state === 'preview') { AUTH.state = APP_CONFIG.firebase ? 'signedout' : 'unconfigured'; AUTH.user = null; renderApp(); return; }
  firebase.auth().signOut();
}

function startPreview() {
  if (!isLocalHost()) return;
  AUTH.state = 'preview';
  AUTH.user = { uid: 'local-preview', email: '', name: '', photo: '' };
  renderApp();
}

/* ---------- Cloud sync (signed-in only) ---------- */
const CLOUD = { timer: null, unsub: null, cdcUnsub: [], loaded: false };
const SYNC_KEYS = ['profile', 'apps', 'weights', 'filters', 'views'];
const db = () => firebase.firestore();
const userDoc = () => db().collection('users').doc(AUTH.user.uid);

async function cloudLoad() {
  const snap = await userDoc().get();
  if (snap.exists) {
    const d = snap.data();
    const merged = mergeState({ ...S, ...Object.fromEntries(SYNC_KEYS.filter(k => d[k]).map(k => [k, d[k]])) });
    S = { ...merged, resume: S.resume, chat: S.chat };
    try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (err) { /* in-memory only */ }
  }
  CLOUD.loaded = true;
}

function cloudSave() {
  if (AUTH.state !== 'signedin' || !CLOUD.loaded) return;
  clearTimeout(CLOUD.timer);
  CLOUD.timer = setTimeout(() => {
    const data = Object.fromEntries(SYNC_KEYS.map(k => [k, S[k]]));
    userDoc().set({ ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true })
      .catch(() => toast('Could not sync. Your changes are saved on this device.'));
  }, 1200);
}

const NOTICE_FIELDS = ['type', 'title', 'org', 'deadline', 'br', 'years', 'minCgpa', 'mode', 'pay', 'skills', 'applyUrl', 'desc'];
function noticeFromDoc(id, d) {
  if (!d || !TYPES.includes(d.type) || typeof d.title !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d.deadline || '')) return null;
  return {
    id: `fs-${id}`, docId: id, shared: true, notice: true, custom: false,
    type: d.type, title: d.title.slice(0, 90), org: String(d.org || '').slice(0, 60), deadline: d.deadline,
    br: d.br === 'ALL' || Array.isArray(d.br) ? d.br : 'ALL', years: Array.isArray(d.years) && d.years.length ? d.years : [1, 2, 3, 4],
    minCgpa: typeof d.minCgpa === 'number' ? d.minCgpa : undefined, mode: MODES.includes(d.mode) ? d.mode : 'On-campus',
    pay: Array.isArray(d.pay) ? d.pay : ['unknown'], skills: (d.skills || []).filter(s => SKILLS.includes(s)).slice(0, 6).concat((d.skills || []).some(s => SKILLS.includes(s)) ? [] : ['Problem Solving']),
    applyUrl: isHttpUrl(d.applyUrl) ? d.applyUrl : undefined, desc: String(d.desc || '').slice(0, 1200),
    lvl: 1, dur: d.type === 'Placement' ? 'Full-time' : 'See notice', hrs: 0, track: ['sw'], city: 'HITAM',
    postedAt: d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toISOString() : null,
    tags: [String(d.desc || '').startsWith('From CDC Explorer') ? 'From CDC Explorer' : 'Campus notice'], postedBy: String(d.byName || 'A HITAM student').slice(0, 40), mine: AUTH.user && d.by === AUTH.user.uid
  };
}

function subscribeNotices(onUpdate) {
  const since = ymd(new Date(Date.now() - 2 * MS_DAY));
  CLOUD.unsub = db().collection('notices').where('deadline', '>=', since).orderBy('deadline').limit(300)
    .onSnapshot(snap => { NOTICES = snap.docs.map(d => noticeFromDoc(d.id, d.data())).filter(Boolean); onUpdate(); },
      () => toast('Could not load the shared campus board.'));
}

async function publishNotice(o) {
  const data = Object.fromEntries(NOTICE_FIELDS.filter(k => o[k] !== undefined).map(k => [k, o[k]]));
  await db().collection('notices').add({ ...data, by: AUTH.user.uid, byName: (AUTH.user.name || '').split(' ')[0] || 'Student', createdAt: firebase.firestore.FieldValue.serverTimestamp() });
}
const deleteNotice = docId => db().collection('notices').doc(docId).delete();

/* ---------- CDC data published by the admin: cdc/{opps|projects|portals|tracks} = { items, count, updatedAt, by } ---------- */
let CDC = { opps: [], projects: [], portals: [], tracks: [], times: {} };
function setCdcData(kind, items, at) {
  if (!CDC_KINDS.includes(kind) || !Array.isArray(items)) return;
  const clean = kind === 'opps' ? items.map(cdcItemToOpp).filter(Boolean) : items.filter(x => x && typeof x === 'object').slice(0, 1000);
  CDC = { ...CDC, [kind]: clean, times: { ...CDC.times, [kind]: at || null } };
}
function subscribeCdc(onUpdate) {
  CLOUD.cdcUnsub = CDC_KINDS.map(kind => db().collection('cdc').doc(kind).onSnapshot(snap => {
    const d = snap.exists ? snap.data() : null;
    setCdcData(kind, d && Array.isArray(d.items) ? d.items : [], d && d.updatedAt && d.updatedAt.toDate ? d.updatedAt.toDate().toISOString() : null);
    onUpdate();
  }, () => { /* not allowed or offline: keep what we have */ }));
}
/** Admin only (enforced by the rules). Replaces one CDC page with today's items. */
async function publishCdc(kind, items) {
  await db().collection('cdc').doc(kind).set({ items, count: items.length, by: AUTH.user.email, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
}

function stopCloud() {
  if (CLOUD.unsub) CLOUD.unsub();
  CLOUD.cdcUnsub.forEach(f => f());
  CLOUD.unsub = null; CLOUD.cdcUnsub = []; CLOUD.loaded = false; NOTICES = [];
  CDC = { opps: [], projects: [], portals: [], tracks: [], times: {} };
}
