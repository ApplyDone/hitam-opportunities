/* ============================================================
   views-match.js — 03 Discovery & matching, 04 Assistant
   ============================================================ */
'use strict';

function engineHTML() {
  const total = Object.values(S.weights).reduce((a, b) => a + b, 0) || 1;
  const changed = WEIGHT_META.some(m => S.weights[m.key] !== W_DEFAULT[m.key]);
  return `<details class="engine" ${changed ? 'open' : ''}>
  <summary>${icon('sliders')} Tune the matching engine ${changed ? '<span class="pill acc">Customised</span>' : '<span class="pill">Default</span>'}</summary>
  <div class="engine-b">
    <p class="small muted">Eligibility is a hard gate. Everything else is a weighted score. Move a slider and the ranking below updates live.</p>
    ${WEIGHT_META.map(m => `<div class="w-row"><label for="w-${m.key}"><b>${m.label}</b><small>${m.hint}</small></label><input id="w-${m.key}" type="range" min="0" max="100" step="5" value="${S.weights[m.key]}" data-in-weight="${m.key}"><b class="mono" id="wv-${m.key}">${Math.round((S.weights[m.key] / total) * 100)}%</b></div>`).join('')}
    <div><button class="btn sm ghost" data-act="w-reset">Reset to default</button></div>
  </div></details>`;
}

function roadmapHTML() {
  const gaps = skillGaps(allOpps(), S.profile, S.weights);
  if (!gaps.length) return `<p class="muted small">You meet the bar for every skill in your open, eligible listings. Raise levels in your profile to explore stretch roles.</p>`;
  return gaps.slice(0, 6).map(g => {
    const names = g.ids.slice(0, 2).map(id => oppById(id)).filter(Boolean).map(o => esc(o.title));
    return `<div class="gap-card">
    <div class="gn"><b>${esc(g.skill)}</b><span class="delta">+${g.delta} pts</span></div>
    <div class="small">To <b>${LEVELS[g.target].toLowerCase()}</b> · lifts ${g.ids.length} listing${g.ids.length > 1 ? 's' : ''}${g.unlocks ? `, <b>${g.unlocks}</b> into strong-match range` : ''}</div>
    <div class="tiny muted">${names.join(' · ')}${g.ids.length > 2 ? ` +${g.ids.length - 2}` : ''}</div>
    <div class="small" style="color:var(--ink-2)">${esc(g.learn)}</div>
    <div><button class="btn sm ghost" data-act="learn" data-skill="${esc(g.skill)}" data-level="${g.target}">${icon('check')}I’ve reached this level</button></div>
  </div>`;
  }).join('');
}

function matchGroupsHTML() {
  const rk = rankNow().filter(x => !x.r.closed);
  const mine = rk.filter(x => x.r.elig.ok);
  const out = rk.filter(x => !x.r.elig.ok);
  const groups = [
    ['Strong matches', 'Apply to these first', mine.filter(x => x.r.score >= 70)],
    ['Worth a look', 'Good fit with a gap or two', mine.filter(x => x.r.score >= 50 && x.r.score < 70)],
    ['Stretch', 'Learn a skill and these open up', mine.filter(x => x.r.score < 50)]
  ];
  let idx = 0;
  const body = groups.filter(g => g[2].length).map(([t, s, rows]) => `<section><div class="group-title"><h2 class="h2">${t}</h2><span class="eyebrow">${rows.length} · ${s}</span></div><div class="tkts">${rows.map(x => ticket(x.o, x.r, idx++)).join('')}</div></section>`).join('');
  const lead = mine[0];
  const hero = lead ? `<article class="lead-card" data-type="${lead.o.type}" style="margin-bottom:40px">
    <div class="lead-l"><div class="eyebrow"><b>Top pick</b> · ${lead.o.type} · ${esc(countdownLong(lead.r.dl))}</div><h3>${esc(lead.o.title)}</h3><p>${esc(lead.o.org)} · ${esc(payLabel(lead.o.pay))}</p>
    <p>${lead.r.gaps.length ? `To strengthen this: ${joinList(lead.r.gaps.map(g => `${g.skill} to ${LEVELS[g.need].toLowerCase()}`))}.` : 'You meet the skill bar on every requirement.'}</p>
    <div class="row"><button class="btn acc" data-act="open" data-id="${lead.o.id}">Open details ${icon('arrow')}</button><a class="btn ghost" href="#/prepare/${lead.o.id}">Prepare</a></div></div>
    <div class="lead-r"><div class="big">${lead.r.score}<small>% match</small></div><div class="break">${breakRows(lead.r)}</div></div></article>` : '';
  const outHTML = out.length ? `<details class="engine" style="margin-top:44px"><summary>Not open to you yet <span class="pill">${out.length}</span></summary><div class="engine-b"><p class="small muted">Eligibility is set by year, branch and CGPA. These stay visible so you know what is coming.</p><div class="tkts">${out.map((x, i) => ticket(x.o, x.r, i)).join('')}</div></div></details>` : '';
  return mine.length ? hero + body + outHTML : emptyBox('No eligible listings', 'Check your year, branch and CGPA in your profile.', '<a class="btn" href="#/profile">Edit profile</a>') + outHTML;
}

function viewMatches() {
  const p = S.profile;
  return `
<header class="page-head">
  <div class="eyebrow">Discovery &amp; matching</div>
  <h1 class="h1">Ranked for <em>${esc(p.name.trim() || 'you')}.</em></h1>
  <p class="lede">Each listing gets a score out of 100 from your skill levels, track, interests, mode and timing. You can see exactly why, and change how much each factor counts.</p>
</header>
<div class="cols">
  <div class="stack" style="--g:28px"><div id="engine">${engineHTML()}</div><div id="groups">${matchGroupsHTML()}</div></div>
  <aside class="sticky"><section class="panel">${sectionHead('Skill roadmap', 'what to learn next')}<p class="small muted" style="margin:-4px 0 6px">Computed by raising each skill to the bar and measuring how much your matches improve.</p><div id="roadmap">${roadmapHTML()}</div></section></aside>
</div>`;
}
function refreshMatches() {
  const total = Object.values(S.weights).reduce((a, b) => a + b, 0) || 1;
  WEIGHT_META.forEach(m => { const el = $(`#wv-${m.key}`); if (el) el.textContent = `${Math.round((S.weights[m.key] / total) * 100)}%`; });
  const g = $('#groups'); if (g) g.innerHTML = matchGroupsHTML();
  const r = $('#roadmap'); if (r) r.innerHTML = roadmapHTML();
}

/* ---------- 04 Assistant ---------- */
let assistantTyping = false;

function botBlocks(m, isLast) {
  const d = m.data || {};
  const opps = (d.opps || []).map(it => {
    const o = oppById(it.id);
    if (!o) return '';
    return `<button class="chat-opp" data-type="${o.type}" data-act="open" data-id="${o.id}" style="--tc:var(--t-${o.type.toLowerCase()})"><i></i><span><b>${esc(o.title)}</b><span>${esc(it.note || o.org)}</span></span></button>`;
  }).join('');
  const plan = d.plan ? `<div class="plan">${d.plan.map(day => `<div><b>${esc(day.label)}</b><span>${day.lines.map(l => esc(l)).join('<br>')}</span></div>`).join('')}</div>` : '';
  const actions = (d.actions || []).length ? `<div class="chips">${d.actions.map(a => `<a class="btn sm" href="${esc(a.href)}">${esc(a.label)}</a>`).join('')}</div>` : '';
  const follow = isLast && (d.follow || []).length ? `<div class="chips">${d.follow.map(f => `<button class="chip" data-act="ask" data-q="${esc(f)}">${esc(f)}</button>`).join('')}</div>` : '';
  return `<div class="msg"><span class="who">Assistant</span><div class="bubble">${richText(m.text)}</div>${opps}${plan}${actions}${follow}</div>`;
}

function chatHTML() {
  const last = S.chat.length - 1;
  return S.chat.map((m, i) => m.role === 'me'
    ? `<div class="msg me"><span class="who">You</span><div class="bubble">${esc(m.text)}</div></div>`
    : botBlocks(m, i === last)).join('') + (assistantTyping ? '<div class="msg"><span class="who">Assistant</span><div class="bubble typing"><i></i><i></i><i></i></div></div>' : '');
}

function assistantContext() { return { opps: allOpps(), profile: S.profile, weights: S.weights, apps: S.apps }; }

function seedChat() {
  if (S.chat.length) return;
  const g = assistantReply('hello', assistantContext());
  commit({ chat: [{ role: 'bot', text: g.text, data: { follow: g.follow } }] });
}

function viewAssistant() {
  seedChat();
  return `
<header class="page-head">
  <div class="eyebrow">Opportunity assistant</div>
  <h1 class="h1">Ask in plain words. <em>Get a straight answer.</em></h1>
  <p class="lede">It reads your profile and the live listings. It is a rule-based assistant that runs entirely in your browser, so it never guesses outside the data.</p>
</header>
<div class="cols">
  <div class="chat-wrap"><div class="chat" id="chat" aria-live="polite">${chatHTML()}</div>
    <form class="chat-form" id="chat-form"><label class="sr" for="chat-in">Your question</label><input id="chat-in" type="text" placeholder="Try: paid remote internships" autocomplete="off" data-autofocus><button class="btn acc" type="submit">${icon('send')}Send</button></form></div>
  <aside class="stack" style="--g:22px">
    <section class="panel">${sectionHead('Try asking')}<div class="prompt-list">${ASSISTANT_PROMPTS.map(q => `<button data-act="ask" data-q="${esc(q)}">${esc(q)}${icon('arrow')}</button>`).join('')}</div></section>
    <section class="panel"><div class="eyebrow">It knows</div><p class="small" style="margin-top:8px">${esc(S.profile.name.trim() || 'Student')} · ${S.profile.branch} year ${S.profile.year} · ${Object.keys(S.profile.skills).length} skills · ${Object.keys(S.apps).length} tracked</p><button class="btn sm ghost" style="margin-top:12px" data-act="chat-clear">Clear conversation</button></section>
  </aside>
</div>`;
}
function refreshChat(scroll = true) {
  const c = $('#chat'); if (!c) return;
  c.innerHTML = chatHTML();
  if (scroll) c.scrollTop = c.scrollHeight;
}
function askAssistant(q) {
  const text = q.trim();
  if (!text || assistantTyping) return;
  commit({ chat: [...S.chat, { role: 'me', text }].slice(-40) });
  assistantTyping = true;
  refreshChat();
  setTimeout(() => {
    const d = assistantReply(text, assistantContext());
    assistantTyping = false;
    commit({ chat: [...S.chat, { role: 'bot', text: d.text, data: { opps: d.opps, plan: d.plan, actions: d.actions, follow: d.follow } }].slice(-40) });
    refreshChat();
  }, 420);
}
