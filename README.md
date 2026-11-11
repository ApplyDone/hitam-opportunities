# HITAM Opportunities Intelligence

A campus-first job-search web app for HITAM students. Sign in with your @hitam.org Google account; branch and year are read from your roll number. To go live, follow SETUP.md.

## What students get
| Area | What it does | Data |
|---|---|---|
| **Campus** (home) | Campus board, paste-a-notice reader, official news, who recruits from HITAM | hitam.org (official) + notices students paste |
| Profile | Skills, branch (incl. CSM/CSD), year, CGPA, track | Student |
| **Resume Studio** | Upload PDF/DOCX/TXT → skills/branch/year/CGPA auto-filled, 12-check score, bullet rewrites, keyword match per job | Read in the browser only |
| Database / Matches | Search, filters, 0–100 match score with reasons, skill roadmap | Campus + live company feeds |
| Assistant, Prepare, Track | Q&A, cover letters, interview prep, board, reminders, calendar export | Student |
| **Playbook** | Next 90 days, year-by-year plan, track roadmaps with live demand, 109 checked where-to-apply links, resume guide, Hyderabad market | Curated + live |

## Where the data comes from
- **hitam.org** (WordPress public API; robots.txt allows it): official news/events and the placement-records page. From placements we keep **only company, branch and package totals** — never student names or roll numbers.
- **Company job feeds** (secondary): public job-board APIs (Greenhouse, Lever, Ashby, SmartRecruiters) for 47 verified companies (`ingest/companies.json`). Kept only if Hyderabad or India-remote, internship or 0–2 years, and a technical role.
- **Campus notices**: drives and hackathons announced through CDC/WhatsApp are pasted by students or coordinators and parsed automatically.
- **Not collected**: CDC Explorer (cdc.hitam.org) requires a student login, so it is not scraped. To show CDC drives automatically, ask CDC for an export or API.
- The Placement/Workshop/Club cards marked **Sample** are demo data.

## Commands
```bash
node ingest/run.js        # collect campus + company jobs into data/
node build.js             # build dist/ (single file) and site/ (for hosting)
node --test tests/*.test.js
node serve.js             # preview at http://127.0.0.1:5177
```

## Daily automation
`.github/workflows/daily-jobs.yml` runs every day at 07:00 IST: test → collect → build → commit data → publish `site/` to GitHub Pages. It needs this folder pushed to a GitHub repository with Pages set to "GitHub Actions". `data/digest.txt` (and the "Copy today's WhatsApp post" button) gives a ready-to-paste daily post of new roles.

Students' own data (profile, resume text, tracker) stays in their browser (`localStorage`, key `hoi3`).
