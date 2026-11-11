# Programs ingest notes (verified 2026-11-11)

## Method
- Internshala listing pages and Unstop amp pages were fetched with WebFetch.
- Most Unstop items came from Unstop's own public search API (unstop.com/api/public/opportunity/search-result), using registration end dates and event dates from that data. The sourceUrl is the Unstop event page.
- Codeforces and CodeChef contest times came from their official APIs.
- Items hosted on Internshala/Unstop use that listing page as applyUrl, because the organiser's own site was not reachable or not found.

## Skipped: past edition or window closed
- Smart India Hackathon 2026: nomination deadline extended to 9 Oct 2026 (sih.gov.in); closed.
- Amazon ML Challenge 2026: registration closed 20 Sep 2026, finale 7 Oct.
- Flipkart GRiD 8.0: registration closed July 2026.
- Walmart Sparkathon: no 2026 edition found; 2025 closed.
- Build With Bharat 5.0: closed 1 Nov 2026. Tech Horizon 2.0 (GNITC Hyderabad): closed 30 Sep, held 9-10 Oct.
- Namma AI Hackathon (nasscom): registration closed 6 Nov 2026.
- micro1 Eval Hackathon: submission closed 9 Nov 2026 (also not India or student specific).
- Great Indian Hackathon 2026 (Internshala): listing says registration closed 15 Oct.
- NASA Space Apps 2026 (Unstop): listing exists but is a college mirror; not verified as open.
- HackXplore India 2026 (VJIT Hyderabad): April 2026, closed.
- Google Summer of Code: no 2027 timeline published. 2026 dates only (contributor window Mar 16-31, 2026).
- Goldman Sachs 2027 India Summer Analyst: opened 1 Jul 2026; official page could not be read, one aggregator says deadline 4 Oct 2026 (past), others say rolling. Unconfirmed, excluded.
- Google Application Engineering Intern 2027: closed 15 Sep 2026. Google Software Engineering Intern 2027: closed June/Aug 2026. Silicon Engineering PhD intern (30 Apr 2027) is PhD only.
- Microsoft Engage / Explore, JPMorgan, Morgan Stanley, Visa, Mastercard, Intel, Qualcomm, Atlassian, Uber, Adobe: no official page with a confirmed current window could be read.
- IIT Hyderabad SURE 2026 (closed 14 Mar 2026); IIIT Hyderabad winter internship (aggregators give 30 Oct / 6 Nov 2026, past, not official).
- DRDO ARDE Pune paid internship 2026-27: last date 5 Jul 2026. DRDO CVRDE page is empty (archived). ISRO IIRS internship closed 31 May.
- NXP Women in Tech: registration closed 16 Sep 2026 (course launches 16 Nov). Google Girl Hackathon: 2025 edition only. Flipkart Girls Wanna Code: no 2026-27 window found.
- Infosys Springboard Virtual Internship 7.0: closed 31 Mar 2026.
- Social Winter of Code / GSSoC / Hacktoberfest: no current official dates found.

## Skipped: no specific day or cannot confirm
- TCS CodeVita Season 14: official page (codevita.tcsapps.com) shows Register now but no deadline or round dates. Aggregator Internshala says 13 Nov 2026, FreshersHunt says unofficial. Excluded as unconfirmed (worth checking manually; strong candidate).
- Google Student Researcher 2027 (India, remote): an aggregator (freshershunt) reports a 4 Dec 2026 deadline, but the Google Careers page returned only navigation text. Excluded as unconfirmed.
- PayPal AI Hackathon 2026: two Internshala listings conflict (13 Nov vs 15 Dec). Excluded.
- AWS MSP AI Hackathon: limited to AWS Partner Network employees. Excluded.
- Microsoft Imagine Cup: kept; deadline 28 Feb 2027 confirmed on imaginecup.microsoft.com (startup/student founders, not a standard coding contest).
- Winter of Code (Amrita, woc.anokha.amrita.edu): site unreachable, dates unseen.
- Unstop generic internship listings (small unknown firms) skipped as low quality, not verified as real programs.
- Kaggle Gemma 4 page: the official Kaggle page returned only its title via fetch, so dates come from search snippets of kaggle.com plus startupgrantsindia.com (both agree: 25 Nov / 2 Dec 2026).

## Scholarships (not included because the schema has no Scholarship type; dates seen on Internshala listings 2026-11-11)
- Rolls-Royce Wings4Her Scholarship 2026-27: deadline 23 Nov 2026, first/second-year women engineering students, family income up to Rs 4 lakh, Rs 75,000/yr. https://internshala.com/competitions/rolls-royce-wings4her-scholarship-2026-27/
- PwC India Aspiring Women Leaders Scholarship Programme: Unstop listing shows registration to 15 Nov 2026 for engineering undergraduates (not opened in detail).
- WINGS (Women Inspiring Growth in STEM): 30 Nov 2026, Rs 2 lakh per annum, level not confirmed.
- SML Mahindra Scholarship, Satya Scholarship: 15 Nov 2026; eligibility not confirmed for engineering.
- ONGC Merit Scholarship 2026-27, SDEF India Scholarship, Mahindra Saarthi Abhiyaan: 30 Nov 2026; eligibility not confirmed.
- Closed: Energy4Good (27 Sep), Infocepts (30 Oct), Swami Dayanand (31 Oct), Reliance Foundation UG (5 Oct).

## Other
- Two items have the same-day or next-day deadlines (CodeChef Starters 264 on 11 Nov; Internshala/Unstop items closing 12-14 Nov). Display as "closing soon".
- LFX Mentorship (RISC-V) deadline is the mentee application close (7 Feb 2027, AOE); applications open 8 Jan 2027.
