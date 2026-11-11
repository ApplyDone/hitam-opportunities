# Companies registry notes (verified 2026-11-11)

## Method
- Probed ~2,000 (company, token, ATS) combinations against the four public job-board APIs (Greenhouse boards-api, Lever v0 postings, Ashby posting-api, SmartRecruiters v1 postings with country=in). No login, no HTML scraping.
- Token guesses came from the candidate list plus web-search hints (netbrain, valgenesis, keyloop, trackmind, egen, etc.). web search `site:` operators were mostly ignored by the search tool, so brute-force token guessing found most entries.
- Hyderabad match = location text contains hyderabad/secunderabad/telangana/hitec/gachibowli/madhapur (Lever: also allLocations; Ashby: also secondaryLocations).
- hydEntryLevel is deliberately lenient per spec: a Hyderabad job counts if its title is NOT senior/sr/lead/principal/staff/manager/director/head/architect/vp (or has an entry keyword). Expect noise (e.g. sales/support roles); a stricter filter should be applied downstream for students.
- SmartRecruiters entries are India-only (country=in), so totalJobs there is India total, not global.
- hyderabad:false entries (6) have 0 Hyderabad jobs but >=1 India/remote posting whose title says intern/new grad/graduate/trainee (see extra field indiaInternOrNewGrad). Extra field only present on those.
- Probe concurrency was initially too high and silently dropped some responses; re-ran with retries and lower concurrency, then re-verified every kept entry in a final pass.

## Tried and FAILED / dropped
- No public board found on any of the 4 ATS under guessed tokens (they use Workday/custom ATS): Arcesium, Invesco, F5, Providence, Amgen, Novartis, Pega, Salesforce, Uber, Darwinbox, Keka, Phenom, Razorpay, PhonePe, Zomato, Postman, BrowserStack, Chargebee, Rippling, Atlassian, Wells Fargo, Visa, Gartner, Chubb, Synchrony, Optum, Micron, Qualcomm, AMD, MediaTek, NVIDIA, Intel, Cyient, Infor, Sanofi, Electronic Arts, Ivanti, Oracle Health, Nutanix, plus most IT-services/banks/semis tried.
- Board exists but 0 Hyderabad jobs today: Twilio, Okta, MongoDB, Databricks, Figma, Stripe (Bengaluru only), Rubrik, Groww, Meesho, Hevo, Workato, Anthropic, OpenAI, Datadog, Elastic, GitLab, Toast, Samsara, Pure Storage, Tekion, Netradyne, Inmobi, Mindtickle, Anaplan, Fivetran, Netskope and others.
- Okta and Groww: no real intern/new-grad titles (only "Internal Audit" false matches), dropped.
- Wrong token / ambiguous: Hevo (token hevodata, not hevo), Freshworks and Swiggy only on SmartRecruiters, not Lever/Greenhouse. Lever tokens are case-sensitive (BlueMatrix).

## Surprising
- Very few big Hyderabad employers use these 4 ATSs; most mainstream GCCs use Workday/Taleo/custom. Yield is mostly mid-size SaaS/product firms.
- HighRadius, Zenoti, Keyloop, Wise, Sutherland, Veeva and ServiceNow dominate Hyderabad volume.
- Many "entry-level" matches are non-engineering (sales, collections, support).
- Genuine intern/new-grad postings are scarce today in the Hyderabad set; the best intern signals are on hyderabad:false boards (Stripe, Rubrik, Hevo, HackerRank, Glance, CloudSEK, India roles).
- Wise's SmartRecruiters India feed is all Hyderabad (31/31).
