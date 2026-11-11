# HITAM Opportunities Intelligence — Competitive Analysis and Target Architecture

Status: proposal for team review. Written 2026-11-11.

## 1. What this is based on, and its limits

Eight mobile screenshots of the existing college platform, **CDC Explorer** (Career Design Center, `cdc.hitam.org`). Screens seen: Dashboard, Opportunities (Campus Drives tab), listing cards, Tracks, Academic (ERP link), Profile.

Not seen, so not judged: the Home dashboard in full, the CDC tab, the Career Portals tab, and what **Learniverse** does. Anything marked "unknown" below must be checked before we make a claim about it in the lab presentation.

We did not log in as anyone, scrape the site, or touch the ERP. This analysis uses only the screenshots.

## 2. What CDC Explorer does well (observed)

| Area | What the screenshots show |
|---|---|
| Data | 105 campus drives and 173 career portals, "verified by the Career Development Centre". Counters: 63 internships, 28 full-time, "added today". |
| Eligibility | Branch and batch tags on every card, an "Eligible" badge, and "Matches CSE" for the signed-in student. |
| Listing card | Company, role, type tag, location, posted date, deadline, "Closing Soon" flag, **Apply Now** (external link), **Status** dropdown, **Details**. |
| Search and filters | Free-text search plus type, status, branch and batch filters. |
| Tracks | Career tracks (Cloud/DevOps, Data/AI-ML, Embedded/IoT, EV/Power Systems, Mech…) with a focus per track, a 5-semester journey and "Recommended for your branch". |
| Identity | College login (a `@hitam.org` account), role (Student), department. |
| Academic | "Link HITAM ERP Account" for attendance, results and performance bands. |
| Platform | Mobile-first with a bottom nav (Home, Academic, CDC, Opportunities, Tracks, Profile), in-app bug report, and a usability survey banner. |
| Campus windows | Banners for "track selection ended" and "project selection window closed". |

Their real advantages are **authority and data**: CDC verifies the listings, and the platform is tied to college identity and ERP. We cannot out-verify them on day one. We can out-think them.

## 3. Gap matrix

Legend: ✅ have, 🟡 partial, ❌ missing, ❓ unknown.

| Capability | CDC Explorer | Ours today | Target |
|---|---|---|---|
| Large verified listing set | ✅ 278 | 🟡 32 sample | Multi-source aggregation with trust tiers |
| Internship detail (pay, duration, skills) | 🟡 card shows little | ✅ | Internship hub (see §6) |
| Branch and batch eligibility | ✅ | 🟡 branch + year + CGPA | Add batch, backlog rule, CSM and CSD branch codes |
| **Apply link out** | ✅ | ❌ | `applyUrl` on every listing, plus "did you apply?" follow-up |
| Status tracking | 🟡 dropdown | ✅ board, list, calendar | Keep, add push reminders |
| **Ranking by fit** | ❌ eligible or not | ✅ 0–100 score | Keep, extend |
| **Why this match** | ❌ | ✅ breakdown | Keep |
| **Tunable matching** | ❌ | ✅ | Keep |
| **Skill-gap roadmap** | ❓ | ✅ | Tie to Tracks |
| Career tracks with semester journeys | ✅ | 🟡 track chips only | Full semester roadmaps linked to live listings |
| College SSO identity | ✅ | ❌ | Google sign-in restricted to `@hitam.org` |
| ERP / academic data | ✅ | ❌ | Safer route, see §8 |
| Reminders and calendar | ❓ | ✅ `.ics`, in-app | Push and email reminders |
| Prep tools (letter, interview, resume) | ❓ | ✅ | Add resume parser and tailoring |
| Hackathons, workshops, research, clubs | 🟡 hackathons seen | ✅ | Keep, source from clubs and labs |
| Assistant | ❓ (Learniverse?) | 🟡 rule-based | Retrieval over listings, later a language model |
| Insights and analytics | ❌ seen | ✅ | Add cohort view for CDC |
| Feedback and bug report | ✅ | 🟡 SUS only | In-app report and feedback |
| Mobile feel (bottom nav, install) | ✅ | 🟡 responsive only | PWA with bottom nav, offline |
| Coordinator console | ❓ (internal) | 🟡 post form | Full console with verification queue |

## 4. What we adopt, and where we win

**Adopt from them (ordered by value):**
1. Real, verified listing volume. This is the single biggest gap.
2. `Apply Now` outbound link, and close the loop by asking "Did you apply?" when the student returns.
3. Batch-aware eligibility and the CSM and CSD branch codes.
4. Tracks as semester journeys, shown as "recommended for your branch".
5. College identity (SSO).
6. Mobile bottom navigation and installable PWA.
7. In-app bug report and survey.
8. A campus calendar of windows (track selection, project selection, drive weeks).

**Where we beat them:**
1. **Intelligence:** score, explanation, tunable weights, skill-gap roadmap. They show eligible or not; we show *how good a fit* and *what to learn*.
2. **Breadth:** the things that live in WhatsApp groups today (club roles, lab openings, workshops, hackathons), not only company drives.
3. **Workflow:** prepare, track, remind, export, in one loop rather than a status dropdown.
4. **Internships end to end** (see §6).
5. **Transparency:** every score can be inspected; we never ask for an ERP password.

## 5. Target architecture

```
SOURCES            INGESTION               CORE                    EXPERIENCE
Public ATS APIs ─┐                                              ┌─ PWA (student)
Govt / hackathon ├─> fetch ─> normalise ─> dedupe ─> classify ─> │   bottom nav, offline,
 feeds           │      (schema)   (fuzzy)   (type, skills,      │   push, share cards
Campus forms ────┤                           eligibility parse)  │
(clubs, labs)    │                                  │            ├─ Coordinator console
Student paste-in ┘                                  v            │   post, CSV, verify,
 (WhatsApp text)                              verify tier ─> DB ─┤   expiry, analytics
                                              expiry check       │
                                                                 └─ Admin / CDC cohort view
                              INTELLIGENCE (services over DB)
                              eligibility · match score · skill gaps · tracks planner
                              reminders · assistant · resume parse · prep copilot · analytics
```

### Layers

1. **Ingestion.** Each source is a small adapter that outputs one common `Opportunity` shape. Pipeline: fetch → normalise → dedupe (company + title + deadline, fuzzy) → classify (type, skills, eligibility parse) → assign trust tier → publish. A nightly check marks listings `expired` when the page is gone or the deadline passed.
2. **Trust tiers** shown on every card: **Verified by CDC** (if CDC shares data), **Official source** (company or government page, link stored), **Campus-submitted** (coordinator or club), **Community** (student paste-in, flagged until confirmed). Anyone can report a listing; reports lower its tier.
3. **Core data (Postgres, e.g. Supabase).**
   - `Opportunity {id, type, title, org, location, mode, pay{kind,amount}, duration, deadline, postedAt, applyUrl, source{kind,url,tier,lastChecked}, eligibility{branches[], batches[], minCgpa, maxBacklogs}, skills[{name, level}], tracks[], selection[], ppo, tags, description, status}`
   - `Student {id, collegeEmail, branch, batch, year, cgpa, skills{}, interests[], track, goal, resumeSkills[]}`
   - `Application {studentId, opportunityId, status, timeline[], notes, interviewAt}`
   - `Track {id, title, branches[], semesters[{n, focus, skills[], milestones[]}]}`
   - `Source {id, kind, url, schedule, lastRun, trust}`
4. **Intelligence services.** The eligibility, scoring and skill-gap engines already exist and are tested (`src/engine.js`). They move server-side unchanged. New: tracks planner, resume parser, reminder scheduler, retrieval assistant, cohort analytics.
5. **Experience.** One installable PWA with a bottom nav (Home, Opportunities, Matches, Track, Profile), push reminders, offline cache, and share cards (a deadline as an image for WhatsApp). A coordinator console and a read-only cohort view for CDC.

### What stays as is
The prototype's stage flow, scoring, assistant, prep and tracker are the product. The architecture above is how they get real data and real identity.

## 6. Internship hub (where we aim to be clearly better)

- **Complete card:** stipend, duration, remote or onsite, skills with required level, selection process, PPO possibility, apply link, trust tier.
- **Fit before you apply:** score, gaps, and "learn X to reach 70+".
- **When to apply:** a hiring-calendar by year ("second-year summer internships usually open in …"). Built from our own data over time, not guessed.
- **Stipend and effort comparator:** side by side, ₹ per hour of effort.
- **Pathway planner:** internship → PPO → placement, laid out by semester using Tracks.
- **Reviews:** short, anonymous notes from past interns, moderated.

## 7. Getting listings legitimately

| Source | How | Check first |
|---|---|---|
| Company career sites | Public job-board APIs (many applicant-tracking systems publish them) | Per-site terms |
| Government and hackathon portals | Official feeds or calendars | Terms and rate limits |
| Campus | Coordinator and club posting forms, CSV import | None, our own data |
| Students | Paste a WhatsApp or email notice, we structure it, mark it Community | Moderation |
| CDC | Ask for a data share or an export. Frame it as a complement, not a rival. | Their agreement |

We do not scrape CDC Explorer or any login-gated page.

## 8. Trust, privacy, and the ERP question

CDC asks students to type their ERP password into a separate site, and the screenshot shows it failing. We should not copy that. Options, in order of preference:
1. **Official API or SSO** if the college IT team will grant it.
2. **Student-entered CGPA** (what we do now), optionally verified later by a coordinator.
3. **Local marksheet upload**, parsed in the browser, never stored.

Data stays student-owned: export and delete in one click, a minimal-data policy, sign-in limited to the college domain.

## 9. Roadmap

| Phase | Scope | Backend? |
|---|---|---|
| 0 (done) | Prototype: profile, database, matching, assistant, prep, tracker, insights, case file, report | No |
| 1 (about 1–2 weeks) | Data model v2 (`applyUrl`, batch, CSM and CSD, source tier, internship fields), Tracks module, Internship hub, PWA with bottom nav, CSV import for real listings, in-app feedback | No |
| 2 | Supabase, Google sign-in restricted to `@hitam.org`, ingestion adapters, coordinator console, push reminders | Yes |
| 3 | Resume parser, retrieval assistant, CDC cohort analytics, alumni referrals, reviews | Yes |

**For the lab demo, Phase 1 is enough** and can be shown honestly with real listings the team enters by hand from public sources.

## 10. Decisions needed from the team

1. Position as **complement to CDC** (recommended for the pitch and for getting data) or as a rival?
2. Which public sources do we load first for Phase 1 (at least 40 real listings)?
3. Do we pursue college SSO now, or stay no-login for the demo?
