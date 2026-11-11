/* ============================================================
   views-playbook.js — roadmaps, where to apply, resume guide,
   live Hyderabad market. Guidance is general and labelled so.
   ============================================================ */
'use strict';

const PB = { cat: 'internships', mine: true, track: '' };

const YEAR_PLAN = {
  1: { title: 'Year 1 · Foundations', now: ['Pick one language (Python or C) and solve 40 small problems', 'Create GitHub and LinkedIn profiles, and push one project', 'Join one technical club and attend two workshops', 'Do one beginner hackathon as part of a team'],
    learn: ['Python or C', 'Git and GitHub', 'Basic DSA: arrays, strings, recursion'], build: ['Two small projects with READMEs', 'A personal page on GitHub Pages'], apply: ['Workshops and bootcamps', 'Club roles', 'Beginner hackathons'], where: ['Unstop', 'Devfolio', 'NPTEL'] },
  2: { title: 'Year 2 · Choose a direction', now: ['Choose a career track below and follow its Foundations stage', 'Start a 150-problem DSA plan, three problems a week', 'Build one project that solves a real campus problem', 'Apply to two summer internships or a faculty research project'],
    learn: ['Your track’s core skills', 'DSA: hashing, two pointers, trees', 'SQL'], build: ['One substantial project, deployed', 'One open-source contribution'], apply: ['Summer internships (startups, remote)', 'Faculty research', 'Smart India Hackathon (internal round)'], where: ['Internshala', 'Wellfound', 'AICTE Internship Portal'] },
  3: { title: 'Year 3 · Internships that convert', now: ['Shortlist 20 companies with a Hyderabad presence and follow their careers pages', 'Get your resume to 80+ in Resume Studio', 'Do two mock interviews and fix what they expose', 'Apply early: many large companies open summer internship roles months ahead'],
    learn: ['DSA: graphs, dynamic programming', 'DBMS, OS, networks basics', 'One cloud fundamentals course'], build: ['A portfolio-grade project with tests and a demo', 'A short technical write-up of it'], apply: ['Summer internships with pre-placement offer potential', 'Research fellowships', 'Google Summer of Code'], where: ['Company early-careers pages', 'LinkedIn Jobs', 'CDC campus drives'] },
  4: { title: 'Year 4 · Placements', now: ['Register for every eligible campus drive on time', 'Practise aptitude daily for four weeks before drive season', 'Ask seniors and alumni for referrals to off-campus roles', 'Keep a backup plan: apprenticeships or higher-studies exams'],
    learn: ['Aptitude and reasoning', 'Interview stories in STAR format', 'System design basics'], build: ['Polish two projects you can explain end to end'], apply: ['Campus drives', 'Off-campus fresher roles', 'Apprenticeships (NATS)'], where: ['CDC Explorer', 'Company careers pages', 'Naukri', 'LinkedIn Jobs'] }
};

const TRACK_PATHS = {
  sw: { stages: [['Foundations', ['Python', 'Java', 'DSA', 'Git']], ['Core', ['SQL', 'Web Dev', 'React', 'Node.js']], ['Proof', ['Docker', 'Cloud', 'Testing', 'Linux']]], roles: 'SDE intern, associate software engineer, QA engineer' },
  ai: { stages: [['Foundations', ['Python', 'SQL', 'Excel']], ['Core', ['Data Analysis', 'Power BI', 'AI/ML']], ['Proof', ['Deep Learning', 'Cloud', 'Git']]], roles: 'Data analyst intern, ML intern, business intelligence analyst' },
  ux: { stages: [['Foundations', ['Figma', 'UI/UX', 'Communication']], ['Core', ['Web Dev', 'JavaScript']], ['Proof', ['React', 'Technical Writing']]], roles: 'UI/UX design intern, product design associate' },
  core: { stages: [['Foundations', ['C', 'MATLAB', 'Embedded C']], ['Core', ['IoT', 'CAD', 'VLSI']], ['Proof', ['Robotics', 'Linux', 'Python']]], roles: 'Embedded intern, design engineer trainee, graduate engineer trainee' },
  res: { stages: [['Foundations', ['Python', 'MATLAB', 'Technical Writing']], ['Core', ['Data Analysis', 'AI/ML']], ['Proof', ['Deep Learning', 'Git']]], roles: 'Research intern, project assistant, research fellow' },
  lead: { stages: [['Foundations', ['Communication', 'Excel', 'Public Speaking']], ['Core', ['Data Analysis', 'Leadership']], ['Proof', ['Power BI', 'Technical Writing']]], roles: 'Business analyst intern, associate consultant, product intern' }
};

function liveSkillDemand() {
  const counts = {};
  LIVE.jobs.forEach(j => j.skills.forEach(s => { counts[s] = (counts[s] || 0) + 1; }));
  return counts;
}

function yearSection() {
  const y = Number(S.profile.year) || 1;
  const p = YEAR_PLAN[y];
  return `<section id="pb-now" class="panel ink" style="margin-bottom:34px"><div class="eyebrow"><b>Your next 90 days</b> · ${esc(S.profile.name.trim() || 'you')}, year ${y}</div>
    <ol class="pb-now">${p.now.map(n => `<li>${esc(n)}</li>`).join('')}</ol>
    <div class="row"><a class="btn sm acc" href="#/resume">Review my resume</a><a class="btn sm ghost" href="#/explore/internships">See my matches</a></div></section>
  <section id="pb-years">${sectionHead('Year by year', 'general pattern, confirm dates with your placement office')}
    <div class="pb-years">${[1, 2, 3, 4].map(n => { const x = YEAR_PLAN[n]; return `<article class="pb-year ${n === y ? 'on' : ''}"><div class="eyebrow">${n === y ? '<b>You are here</b>' : `Year ${n}`}</div><h3 class="h3" style="font:400 1.45rem/1.1 var(--f-display)">${esc(x.title.split(' · ')[1])}</h3>
      ${[['Learn', x.learn], ['Build', x.build], ['Apply for', x.apply], ['Where', x.where]].map(([k, v]) => `<div class="pb-k">${k}</div><ul>${v.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`).join('')}</article>`; }).join('')}</div></section>`;
}

function trackSection() {
  const id = PB.track || S.profile.track || 'sw';
  const t = TRACK_PATHS[id];
  const demand = liveSkillDemand();
  const have = s => (S.profile.skills[s] || 0) > 0;
  const liveOnTrack = rankOpps(LIVE.jobs.filter(j => (j.track || []).includes(id)), S.profile, S.weights).slice(0, 4);
  return `<section id="pb-tracks">${sectionHead('Career tracks', 'skills in order, with live demand')}
    <div class="chips" style="margin-bottom:18px">${TRACKS.map(x => `<button class="chip ${x.id === id ? 'on' : ''}" data-act="pb-track" data-id="${x.id}">${esc(x.label)}</button>`).join('')}</div>
    <div class="pb-path">${t.stages.map(([name, skills], i) => `<div class="pb-stage"><div class="pb-n">${i + 1}</div><div><div class="h3">${name}</div><div class="chips" style="margin-top:8px">${skills.map(s => `<span class="tag ${have(s) ? 'have' : ''}" title="${demand[s] ? `${demand[s]} live listings ask for this` : 'Not seen in live listings yet'}">${esc(s)}${demand[s] ? ` · ${demand[s]}` : ''}</span>`).join('')}</div>
      <p class="small muted" style="margin-top:8px">${skills.filter(s => !have(s)).slice(0, 1).map(s => `Next: ${esc(LEARN[s] || s)}.`).join('') || 'You have these. Move to the next stage.'}</p></div></div>`).join('')}
    <div class="pb-stage"><div class="pb-n">4</div><div><div class="h3">Apply</div><p class="small">Typical entry roles: ${esc(t.roles)}.</p>
      ${liveOnTrack.length ? `<div style="margin-top:8px">${liveOnTrack.map(x => miniRow(x.o, x.r, `${x.o.org} · ${x.o.city}`)).join('')}</div>` : '<p class="small muted">No live roles on this track right now.</p>'}</div></div></div>
    <p class="tiny muted" style="margin-top:10px">Green = you already have it. Numbers = how many live listings mention the skill today.</p></section>`;
}

function directorySection() {
  if (typeof DIRECTORY === 'undefined') return '';
  const y = Number(S.profile.year) || 1;
  const rows = DIRECTORY.filter(d => d.cat === PB.cat && (!PB.mine || d.years.includes(y)));
  const cat = DIRECTORY_CATS.find(c => c.id === PB.cat);
  return `<section id="pb-where">${sectionHead('Where to apply', `${DIRECTORY.length} checked links`)}
    <div class="row between" style="margin-bottom:16px"><div class="chips">${DIRECTORY_CATS.map(c => `<button class="chip ${c.id === PB.cat ? 'on' : ''}" data-act="pb-cat" data-id="${c.id}">${esc(c.label)}<span class="ct">${DIRECTORY.filter(d => d.cat === c.id).length}</span></button>`).join('')}</div>
    <label class="cmp"><input type="checkbox" data-act="pb-mine" ${PB.mine ? 'checked' : ''}> Only what suits year ${y}</label></div>
    ${cat ? `<p class="small muted" style="margin:-4px 0 14px">${esc(cat.blurb)}</p>` : ''}
    <div class="pb-dir">${rows.map(d => `<article class="pb-link"><div class="row between"><b>${esc(d.name)}</b>${d.verified === 'http-200' ? '' : '<span class="pill" title="Could not auto-check this link; confirm it in your browser">check link</span>'}</div>
      <p class="small">${esc(d.what)}</p><p class="small muted">${esc(d.tip)}</p>
      <div class="row between" style="margin-top:auto"><div class="chips">${d.bestFor.map(b => `<span class="tag">${esc(b)}</span>`).join('')}</div><a class="btn sm ghost" href="${esc(d.url)}" target="_blank" rel="noopener noreferrer">Open${icon('external')}</a></div></article>`).join('') || '<p class="muted small">Nothing in this category for your year. Untick the filter to see all.</p>'}</div></section>`;
}

function resumeGuideSection() {
  return `<section id="pb-resume">${sectionHead('Resume guide', 'what recruiters scan for')}
    <div class="cols eq"><div class="panel"><div class="eyebrow">One page, in this order</div>
      <ol class="pb-now" style="color:var(--ink)"><li>Name, phone, email, LinkedIn, GitHub</li><li>Education: degree, branch, college, years, CGPA</li><li>Skills: languages, frameworks, tools (6–12 you can defend)</li><li>Projects: 2–3, each with 2 bullets and a link</li><li>Experience: internships, research, freelance</li><li>Achievements: hackathons, ranks, certifications, club roles</li></ol></div>
    <div class="panel"><div class="eyebrow">The bullet formula</div><p class="story" style="font-size:1.35rem;margin:10px 0">Action verb + what you built + how + the result, with a number.</p>
      <div class="bullet">Built a React and Node.js canteen pre-order app used by 300 students, cutting queue time by 40%.</div>
      <div class="bullet">Trained a CNN in Python on 5,000 leaf images, reaching 92% accuracy on a held-out set.</div>
      <p class="tiny muted">Examples show the shape. Use your own real numbers.</p></div></div>
    <div class="cols eq" style="margin-top:20px"><div class="panel"><div class="eyebrow">Do</div><ul class="todo" style="color:var(--ink-2)"><li>Save as a text PDF (not a photo) so screening software can read it</li><li>Mirror the exact skill names used in the job description, if true</li><li>Keep one master resume and tailor a copy per role</li><li>Name the file Firstname-Lastname-Resume.pdf</li></ul></div>
    <div class="panel"><div class="eyebrow">Don’t</div><ul class="todo" style="color:var(--ink-2)"><li>Use tables, text boxes, icons or two columns for key content</li><li>Write an objective full of adjectives</li><li>List every course or every MS Office tool</li><li>Claim a skill you cannot discuss for five minutes</li></ul></div></div>
    <a class="btn acc" style="margin-top:18px" href="#/resume">${icon('upload')}Score my resume now</a></section>`;
}

function marketSection() {
  if (!LIVE.jobs.length) return `<section id="pb-market">${sectionHead('Hyderabad market')}<p class="muted">Live data is not loaded yet. Run the daily collector to see who is hiring.</p></section>`;
  const byOrg = {};
  LIVE.jobs.forEach(j => { byOrg[j.org] = (byOrg[j.org] || 0) + 1; });
  const orgs = Object.entries(byOrg).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const skills = Object.entries(liveSkillDemand()).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const maxO = Math.max(1, ...orgs.map(x => x[1]));
  const maxS = Math.max(1, ...skills.map(x => x[1]));
  const c = LIVE.meta.counts || {};
  return `<section id="pb-market">${sectionHead('Hyderabad market, live', `updated ${esc(String(LIVE.meta.generatedAt).slice(0, 10))}`)}
    <p class="story" style="margin-bottom:22px">Right now: <b>${LIVE.jobs.length}</b> student-level roles, <b>${c.hyderabad || 0}</b> in Hyderabad, <b>${c.internships || 0}</b> internships, from ${c.companies || 0} companies.</p>
    <div class="cols eq"><div class="panel"><div class="eyebrow" style="margin-bottom:12px">Who is hiring</div>${orgs.map(([o, n]) => `<div class="hbar" style="--tc:var(--ink)"><span class="small">${esc(o)}</span><div class="bar"><i style="width:${(n / maxO) * 100}%"></i></div><b class="mono">${n}</b></div>`).join('')}</div>
    <div class="panel"><div class="eyebrow" style="margin-bottom:12px">Skills they ask for</div>${skills.map(([s, n]) => `<div class="hbar" style="--tc:var(--acc)"><span class="small">${esc(s)}${(S.profile.skills[s] || 0) ? ' ✓' : ''}</span><div class="bar"><i style="width:${(n / maxS) * 100}%"></i></div><b class="mono">${n}</b></div>`).join('')}</div></div>
    <p class="tiny muted" style="margin-top:10px">Only from the company feeds we collect, filtered to internships and 0–2 years. It is a sample of the market, not all of it.</p></section>`;
}

function viewPlaybook() {
  return `
<header class="page-head">
  <div class="eyebrow"><b>Playbook</b> · the whole job hunt, in order</div>
  <h1 class="h1">What to do, <em>and where to do it.</em></h1>
  <p class="lede">A plan for your year, the skills for your track with live demand beside each, checked links for where to apply, and a resume guide.</p>
  <div class="chips">${[['pb-now', 'Next 90 days'], ['pb-years', 'Year by year'], ['pb-tracks', 'Career tracks'], ['pb-where', 'Where to apply'], ['pb-resume', 'Resume guide'], ['pb-market', 'Hyderabad market']].map(([id, l]) => `<a class="chip" href="#/playbook" data-act="cf-jump" data-id="${id}">${l}</a>`).join('')}</div>
</header>
${yearSection()}
<div class="stack" style="--g:56px;margin-top:48px">${trackSection()}${directorySection()}${resumeGuideSection()}${marketSection()}</div>`;
}
