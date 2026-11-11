# Next steps: simplify after login (agreed with user, not yet built)

User feedback: after sign-in it is too clumsy. Everyone is a fresher. Focus on HITAM campus: placement history, upcoming and live internships, events, hackathons, clubs. Off-campus Hyderabad jobs: optional only.

## 1. Navigation: 5 items only
Home, Opportunities, Placements, Resume, Applications. Profile via the user card. Keep other routes (matches, prepare, assistant, playbook, insights) but remove them from the sidebar, tab bar and command palette. Link Prepare from the opportunity drawer.

## 2. Opportunities (one page, tabs)
All, Internships, Campus drives, Hackathons, Clubs and events. Default sort: best match. Few filters (search, only open to me). Toggle "Include off-campus company jobs", default OFF.

## 3. Fresher-only collector
In `ingest/normalize.js` `classifyLevel`: drop level `early` (keep only `intern` and `fresher`). Remove the "0-2 years" filter chip. Accept India-wide internships (not just Hyderabad/remote) and label the city.

## 4. Placements page (real data, already collected)
Source: hitam.org `placement-lists` (221 offers, 43 companies). Add branch codes CSC (cyber security) and CSO (IoT) to `BRANCH_CODES` (src/roll.js), `BRANCHES` (src/data.js) and `ingest/campus-parse.js`; the page also uses these labels. Show: companies hiring each branch, packages, offers per branch. Page has only 2026 records (no older years found).

## 5. Home: use HITAM's own Career Calendar
Official text at hitam.org/training-programs-2 ("Employability Guaranteed, 4 Year Career Calendar"): per-semester training programs I-I to IV-II. Show "This semester" card by the student's year. Also real clubs from hitam.org/clubs-and-societies (26+ affinity clubs, Hackathon Club, Toastmasters, SSG, NCC, GCSP, SSDC, Hack Your Path).

## 6. Honest gaps
Upcoming drives live inside CDC Explorer (login-gated, not collected). Use the paste-a-notice board and link to cdc.hitam.org. Do not invent dates.

Then: run tests, `node build.js`, push to GitHub (workflow redeploys).
