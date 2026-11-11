/* ============================================================
   data.js — constants and sample dataset (no DOM, no state)
   Deadlines are stored as day-offsets from "today" so the demo
   never goes stale.
   ============================================================ */
'use strict';

const STORE_KEY = 'hoi3';

const TYPES = ['Job', 'Internship', 'Placement', 'Hackathon', 'Workshop', 'Research', 'Club'];
const TYPE_CODE = { Job: 'J', Placement: 'P', Internship: 'I', Hackathon: 'H', Workshop: 'W', Research: 'R', Club: 'C' };
const TYPE_BLURB = {
  Job: 'Real off-campus jobs from company career feeds',
  Placement: 'Campus drives, training and mock interviews',
  Internship: 'Short, real projects with a mentor',
  Hackathon: 'Build under a clock, with a team',
  Workshop: 'Learn a skill in a weekend',
  Research: 'Labs, fellowships, mini-projects',
  Club: 'Leadership and community roles'
};

const BRANCHES = ['CSE', 'CSM', 'CSD', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL'];
const MODES = ['Any', 'On-campus', 'Remote', 'Hybrid'];
const LEVELS = ['Not yet', 'Learning', 'Comfortable', 'Strong'];

const TRACKS = [
  { id: 'sw', label: 'Software engineering', hint: 'Backend, frontend, mobile, cloud' },
  { id: 'ai', label: 'Data & AI', hint: 'Analytics, ML, deep learning' },
  { id: 'ux', label: 'Design & product', hint: 'UI/UX, product thinking' },
  { id: 'core', label: 'Core engineering', hint: 'Embedded, CAD, circuits, VLSI' },
  { id: 'res', label: 'Research & higher studies', hint: 'Labs, papers, fellowships' },
  { id: 'lead', label: 'Leadership & startups', hint: 'Clubs, E-Cell, communication' }
];

const SKILL_GROUPS = [
  { name: 'Programming', skills: ['Python', 'Java', 'C', 'C++', 'JavaScript', 'TypeScript', 'SQL', 'DSA'] },
  { name: 'Build', skills: ['Web Dev', 'React', 'Node.js', 'Cloud', 'Docker', 'Linux', 'Git', 'Testing'] },
  { name: 'Data & AI', skills: ['Data Analysis', 'Excel', 'Power BI', 'AI/ML', 'Deep Learning'] },
  { name: 'Systems', skills: ['IoT', 'Embedded C', 'VLSI', 'Robotics', 'Cybersecurity'] },
  { name: 'Core tools', skills: ['CAD', 'MATLAB'] },
  { name: 'Design', skills: ['UI/UX', 'Figma'] },
  { name: 'People', skills: ['Communication', 'Problem Solving', 'Public Speaking', 'Leadership', 'Technical Writing'] }
];
const SKILLS = SKILL_GROUPS.flatMap(g => g.skills);

/* How a learner can actually pick up a skill — names only, no links. */
const LEARN = {
  'Python': 'NPTEL "Programming, Data Structures and Algorithms using Python", then 10 small scripts',
  'Java': 'NPTEL Java course + solve 30 problems on collections and OOP',
  'C': 'Write a linked list, a stack and a file parser from scratch',
  'C++': 'STL practice: 25 problems on vectors, maps and sorting',
  'JavaScript': 'Build a to-do app and a weather app without a framework',
  'SQL': 'Design a 4-table schema and write 20 JOIN / GROUP BY queries',
  'Web Dev': 'Ship one responsive portfolio page on GitHub Pages',
  'React': 'Build a small dashboard with hooks and a fetch call',
  'Cloud': 'Deploy a static site and an API on a free cloud tier',
  'Git': 'Do the Git branching exercises, then open a real pull request',
  'Data Analysis': 'Clean one public CSV and publish a 5-chart notebook',
  'Excel': 'Pivot tables, XLOOKUP and a dashboard from raw data',
  'AI/ML': 'Andrew Ng ML course (audit) + one Kaggle starter notebook',
  'Deep Learning': 'Train a small CNN on MNIST, then fine-tune a pretrained model',
  'IoT': 'Sensor → microcontroller → dashboard mini-project',
  'Embedded C': 'Blink, UART, ADC and one interrupt-driven project',
  'VLSI': 'Verilog basics: gates → adder → FSM on a simulator',
  'Robotics': 'Line-follower robot, then ROS tutorials',
  'Cybersecurity': 'TryHackMe starter path + one beginner CTF',
  'CAD': 'Model 5 parts and one small assembly end to end',
  'MATLAB': 'MATLAB Onramp, then simulate a mass-spring system',
  'UI/UX': 'Redesign one app screen in Figma and write a one-page case study',
  'Communication': 'Record a 2-minute self-intro and review it with a friend',
  'Problem Solving': '3 problems a week on a practice platform, then review',
  'Public Speaking': 'Do a 5-minute talk in a club session',
  'Leadership': 'Own one event end to end in a club',
  'Technical Writing': 'Write a README and a tutorial for one of your projects',
  'TypeScript': 'Convert one JavaScript project to TypeScript with strict mode on',
  'DSA': 'Arrays, hashing, two pointers, trees, graphs: 150 problems over 3 months',
  'Node.js': 'Build a REST API with Express and a database, then deploy it',
  'Docker': 'Containerise one of your projects and run it with docker compose',
  'Linux': 'Use Linux daily for a month; learn shell, permissions, processes, ssh',
  'Testing': 'Add unit tests to one project and get coverage above 80%',
  'Power BI': 'Build one dashboard from a public dataset and publish it',
  'Figma': 'Recreate two real app screens in Figma with auto layout'
};

/* ---------- Sample opportunities ---------- */
const PAY_NONE = ['none'];
const SEED = [
  { id: 1, type: 'Internship', title: 'Web Development Intern', org: 'Industry Tie-up Cell', d: 6, skills: ['Web Dev', 'JavaScript', 'Git'], lvl: 1, years: [1, 2, 3, 4], br: 'ALL', mode: 'Remote', pay: ['stipend', 8000], dur: '8 weeks', hrs: 15, track: ['sw', 'ux'], tags: ['Beginner friendly', 'Certificate'], desc: 'Build and ship small features on a live product with a mentor. Weekly code reviews and a final demo to the team.' },
  { id: 2, type: 'Hackathon', title: 'HITAM Hack-a-thon 24h', org: 'Coding Club', d: 9, skills: ['Python', 'Problem Solving', 'Git'], lvl: 1, years: [1, 2, 3, 4], br: 'ALL', mode: 'On-campus', pay: ['prize', 25000], dur: '24 hours', hrs: 24, team: '2–4 members', track: ['sw', 'ai', 'lead'], tags: ['Team event', 'Prizes'], desc: 'A day-long build sprint on campus. Pick a problem statement, form a team, and demo to a panel of faculty and alumni.' },
  { id: 3, type: 'Workshop', title: 'Intro to Machine Learning', org: 'Dept. of CSE', d: 3, skills: ['Python', 'AI/ML'], lvl: 1, years: [1, 2, 3], br: ['CSE', 'IT'], mode: 'On-campus', pay: PAY_NONE, dur: '3 days', hrs: 6, track: ['ai', 'res'], tags: ['Certificate', 'Hands-on'], desc: 'From linear regression to a first classifier. Every session ends with a notebook you keep.' },
  { id: 4, type: 'Placement', title: 'Campus Drive: Software Engineer', org: 'Placements & Career Cell', d: 21, skills: ['Java', 'Problem Solving', 'SQL'], lvl: 2, years: [4], br: ['CSE', 'IT', 'ECE'], mode: 'On-campus', pay: ['ctc', 6.5], dur: 'Full-time', hrs: 0, minCgpa: 6.5, track: ['sw'], tags: ['Full-time', 'Aptitude + technical rounds'], desc: 'Online aptitude test, a technical round on data structures and SQL, followed by an HR round.' },
  { id: 5, type: 'Research', title: 'Lab Assistant: IoT Projects', org: 'ECE Research Lab', d: 14, skills: ['IoT', 'C', 'Embedded C'], lvl: 2, years: [2, 3, 4], br: ['ECE', 'CSE', 'EEE'], mode: 'On-campus', pay: ['stipend', 5000], dur: '1 semester', hrs: 10, track: ['core', 'res'], tags: ['Lab access', 'Publication scope'], desc: 'Support faculty-led IoT builds: sensor nodes, gateways and dashboards. Strong route into a final-year project or paper.' },
  { id: 6, type: 'Club', title: 'Tech Club Core Team', org: 'Student Organizations', d: 12, skills: ['Communication', 'Leadership', 'Web Dev'], lvl: 1, years: [1, 2, 3, 4], br: 'ALL', mode: 'On-campus', pay: PAY_NONE, dur: 'One academic year', hrs: 5, track: ['lead', 'sw'], tags: ['Leadership', 'Events'], desc: 'Run events, manage the club site, and mentor juniors. Core-team roles open in design, tech, outreach and operations.' },
  { id: 7, type: 'Internship', title: 'Data Analyst Intern', org: 'Industry Partner', d: 18, skills: ['Data Analysis', 'SQL', 'Excel', 'Python'], lvl: 2, years: [2, 3, 4], br: 'ALL', mode: 'Remote', pay: ['stipend', 12000], dur: '10 weeks', hrs: 20, track: ['ai'], tags: ['Portfolio project', 'Certificate'], desc: 'Clean, analyse and present business data. You will own one dashboard from raw data to stakeholder review.' },
  { id: 8, type: 'Workshop', title: 'Cybersecurity Basics Bootcamp', org: 'CSE Department', d: 5, skills: ['Cybersecurity', 'C'], lvl: 1, years: [1, 2, 3, 4], br: ['CSE', 'IT'], mode: 'On-campus', pay: PAY_NONE, dur: '2 days', hrs: 8, track: ['sw', 'core'], tags: ['Hands-on lab', 'Certificate'], desc: 'Threat models, web vulnerabilities and a guided capture-the-flag. Laptops required.' },
  { id: 9, type: 'Hackathon', title: 'Smart India Hackathon (internal round)', org: 'Innovation Cell', d: 25, skills: ['AI/ML', 'Web Dev', 'Problem Solving'], lvl: 2, years: [1, 2, 3, 4], br: 'ALL', mode: 'On-campus', pay: ['prize', 'Qualifies for national round'], dur: '2 days', hrs: 16, team: '6 members', track: ['sw', 'ai', 'lead'], tags: ['National pathway', 'Team of 6'], desc: 'The internal screening for the national hackathon. Teams of six pitch a solution to a government problem statement.' },
  { id: 10, type: 'Internship', title: 'UI/UX Design Intern', org: 'Design Studio, Hyderabad', d: 10, skills: ['UI/UX', 'Communication'], lvl: 1, years: [1, 2, 3, 4], br: 'ALL', mode: 'Hybrid', pay: ['stipend', 10000], dur: '8 weeks', hrs: 20, track: ['ux'], tags: ['Portfolio piece', 'Hybrid'], desc: 'Research, wireframe and prototype with a working design team. You will present a case study at the end.' },
  { id: 11, type: 'Research', title: 'Undergraduate Research Fellowship', org: 'Faculty Research Labs', d: 30, skills: ['Python', 'AI/ML', 'Data Analysis', 'Technical Writing'], lvl: 2, years: [2, 3, 4], br: 'ALL', mode: 'On-campus', pay: ['stipend', 6000], dur: '6 months', hrs: 12, minCgpa: 7.5, track: ['res', 'ai'], tags: ['Paper scope', 'Faculty mentor'], desc: 'Work with a faculty mentor on a defined research question, from literature review to a draft paper.' },
  { id: 12, type: 'Workshop', title: 'Git & GitHub Essentials', org: 'Coding Club', d: 2, skills: ['Git', 'Web Dev'], lvl: 1, years: [1, 2, 3, 4], br: 'ALL', mode: 'On-campus', pay: PAY_NONE, dur: '3 hours', hrs: 3, track: ['sw'], tags: ['Beginner friendly', 'Short'], desc: 'Branching, pull requests and merge conflicts, practised on a real repository.' },
  { id: 13, type: 'Placement', title: 'Aptitude & Soft-skills Training', org: 'Placements & Career Cell', d: 15, skills: ['Communication', 'Problem Solving'], lvl: 1, years: [1, 2, 3, 4], br: 'ALL', mode: 'On-campus', pay: PAY_NONE, dur: '4 weeks', hrs: 6, track: ['lead', 'sw'], tags: ['Prep', 'Open to all'], desc: 'Quantitative aptitude, logical reasoning and communication drills ahead of campus season.' },
  { id: 14, type: 'Internship', title: 'Embedded Systems Intern', org: 'Technology Partner', d: 20, skills: ['Embedded C', 'IoT', 'C'], lvl: 2, years: [2, 3, 4], br: ['ECE', 'EEE', 'CSE'], mode: 'Hybrid', pay: ['stipend', 10000], dur: '10 weeks', hrs: 20, track: ['core'], tags: ['Hardware access', 'Certificate'], desc: 'Firmware bring-up on microcontroller boards, with debugging sessions on real hardware.' },
  { id: 15, type: 'Internship', title: 'CAD & Product Design Intern', org: 'Mechanical Design Firm', d: 16, skills: ['CAD', 'Problem Solving'], lvl: 1, years: [2, 3, 4], br: ['MECH', 'EEE'], mode: 'Hybrid', pay: ['stipend', 7000], dur: '8 weeks', hrs: 20, track: ['core'], tags: ['Design portfolio'], desc: 'Part modelling, assemblies and drawing sheets for real product components.' },
  { id: 16, type: 'Hackathon', title: 'EV Design Challenge', org: 'Mechanical Dept. & SAE Club', d: 22, skills: ['CAD', 'MATLAB', 'Robotics'], lvl: 2, years: [1, 2, 3, 4], br: ['MECH', 'EEE', 'ECE'], mode: 'On-campus', pay: ['prize', 30000], dur: '3 days', hrs: 20, team: '3–5 members', track: ['core'], tags: ['Team event', 'Prizes'], desc: 'Design and simulate a compact electric vehicle subsystem. Judged on feasibility, cost and clarity of analysis.' },
  { id: 17, type: 'Workshop', title: 'MATLAB for Engineers', org: 'Dept. of MECH', d: 7, skills: ['MATLAB'], lvl: 1, years: [1, 2, 3], br: ['MECH', 'CIVIL', 'EEE', 'ECE'], mode: 'On-campus', pay: PAY_NONE, dur: '2 days', hrs: 6, track: ['core', 'res'], tags: ['Hands-on', 'Beginner friendly'], desc: 'Scripts, plots and simple simulations. You leave with a template for lab reports.' },
  { id: 18, type: 'Placement', title: 'Core Engineering Drive: Graduate Trainee', org: 'Placements & Career Cell', d: 28, skills: ['CAD', 'MATLAB', 'Problem Solving'], lvl: 2, years: [4], br: ['MECH', 'CIVIL', 'EEE'], mode: 'On-campus', pay: ['ctc', 4.8], dur: 'Full-time', hrs: 0, minCgpa: 6, track: ['core'], tags: ['Full-time', 'Core roles'], desc: 'Technical interview on core subjects plus a design problem. Trainee roles across manufacturing and infrastructure.' },
  { id: 19, type: 'Internship', title: 'Cloud Support Intern', org: 'Cloud Partner', d: 13, skills: ['Cloud', 'Python', 'Git'], lvl: 2, years: [3, 4], br: ['CSE', 'IT'], mode: 'Remote', pay: ['stipend', 15000], dur: '12 weeks', hrs: 25, track: ['sw'], tags: ['Certification voucher'], desc: 'Triage support tickets, write small automation scripts and shadow deployments.' },
  { id: 20, type: 'Internship', title: 'React Frontend Intern', org: 'Product Startup', d: 11, skills: ['React', 'JavaScript', 'UI/UX'], lvl: 2, years: [2, 3, 4], br: 'ALL', mode: 'Remote', pay: ['stipend', 12000], dur: '10 weeks', hrs: 20, track: ['sw', 'ux'], tags: ['Product team', 'Remote'], desc: 'Build user-facing screens in React with a designer and a senior engineer. Code reviews every week.' },
  { id: 21, type: 'Workshop', title: 'Deep Learning Weekend Lab', org: 'AI Club', d: 8, skills: ['Python', 'Deep Learning'], lvl: 2, years: [2, 3, 4], br: ['CSE', 'IT', 'ECE'], mode: 'On-campus', pay: PAY_NONE, dur: '2 days', hrs: 12, track: ['ai', 'res'], tags: ['Hands-on', 'GPU access'], desc: 'Train and evaluate a small neural network end to end. Bring your laptop; GPU time is provided.' },
  { id: 22, type: 'Club', title: 'Placement Ambassador', org: 'Placements & Career Cell', d: 9, skills: ['Communication', 'Public Speaking', 'Leadership'], lvl: 1, years: [2, 3, 4], br: 'ALL', mode: 'On-campus', pay: PAY_NONE, dur: 'One academic year', hrs: 4, track: ['lead'], tags: ['Leadership', 'Recruiter exposure'], desc: 'Be the student voice between recruiters and campus: coordinate drives, brief juniors, run feedback loops.' },
  { id: 23, type: 'Research', title: 'VLSI Design Mini-Project', org: 'ECE Dept.', d: 19, skills: ['VLSI', 'C'], lvl: 2, years: [3, 4], br: ['ECE', 'EEE'], mode: 'On-campus', pay: PAY_NONE, dur: '1 semester', hrs: 8, track: ['core', 'res'], tags: ['Lab access', 'Mini-project credit'], desc: 'Design, simulate and synthesise a small digital block with faculty supervision.' },
  { id: 24, type: 'Hackathon', title: 'Cyber CTF Night', org: 'Cyber Club', d: 6, skills: ['Cybersecurity', 'Python', 'Problem Solving'], lvl: 2, years: [1, 2, 3, 4], br: 'ALL', mode: 'Remote', pay: ['prize', 10000], dur: '8 hours', hrs: 8, team: '1–3 members', track: ['sw', 'core'], tags: ['Online', 'Prizes'], desc: 'Jeopardy-style capture-the-flag across web, crypto, forensics and reversing.' },
  { id: 25, type: 'Placement', title: 'Pre-placement Talk & Mock Interviews', org: 'Career Cell', d: 4, skills: ['Communication', 'Public Speaking'], lvl: 1, years: [3, 4], br: 'ALL', mode: 'On-campus', pay: PAY_NONE, dur: '1 day', hrs: 6, track: ['lead', 'sw'], tags: ['Feedback', 'Open to all'], desc: 'A recruiter talk followed by one-to-one mock interviews with written feedback.' },
  { id: 26, type: 'Internship', title: 'Technical Writing Intern', org: 'EdTech Startup', d: 17, skills: ['Technical Writing', 'Communication', 'Git'], lvl: 1, years: [1, 2, 3, 4], br: 'ALL', mode: 'Remote', pay: ['stipend', 6000], dur: '8 weeks', hrs: 12, track: ['sw', 'lead'], tags: ['Beginner friendly', 'Published work'], desc: 'Write documentation and tutorials for developer tools, reviewed by engineers.' },
  { id: 27, type: 'Club', title: "E-Cell Founders' Sprint", org: 'Entrepreneurship Cell', d: 24, skills: ['Leadership', 'Communication', 'Problem Solving'], lvl: 1, years: [1, 2, 3, 4], br: 'ALL', mode: 'On-campus', pay: PAY_NONE, dur: '4 weeks', hrs: 8, track: ['lead'], tags: ['Mentors', 'Pitch day'], desc: 'Validate a problem, build a prototype and pitch to mentors in four weekly sprints.' },
  { id: 28, type: 'Research', title: 'Robotics Lab Apprenticeship', org: 'Robotics Lab', d: 26, skills: ['Robotics', 'C++', 'Python'], lvl: 2, years: [2, 3, 4], br: ['ECE', 'EEE', 'MECH', 'CSE'], mode: 'On-campus', pay: ['stipend', 5000], dur: '1 semester', hrs: 12, track: ['core', 'res'], tags: ['Hardware', 'Competition team'], desc: 'Join the robotics team: navigation, perception and control on a mobile platform.' },
  { id: 29, type: 'Internship', title: 'Backend Engineering Intern', org: 'Product Company', d: 12, skills: ['Java', 'SQL', 'Git', 'Problem Solving'], lvl: 2, years: [3, 4], br: ['CSE', 'IT'], mode: 'Hybrid', pay: ['stipend', 25000], dur: '12 weeks', hrs: 30, minCgpa: 7, track: ['sw'], tags: ['PPO possible', 'Hybrid'], desc: 'Build REST services, write tests and work through production incidents with a mentor. Pre-placement offer possible.' },
  { id: 30, type: 'Workshop', title: 'Public Speaking & Pitch Clinic', org: 'Communication Lab', d: 10, skills: ['Public Speaking', 'Communication'], lvl: 1, years: [1, 2, 3, 4], br: 'ALL', mode: 'On-campus', pay: PAY_NONE, dur: '1 day', hrs: 5, track: ['lead'], tags: ['Beginner friendly', 'Feedback'], desc: 'Structure a talk, handle nerves and get filmed feedback on a 3-minute pitch.' },
  { id: 31, type: 'Placement', title: 'Aptitude Mock Test Series', org: 'Placements & Career Cell', d: 0, skills: ['Problem Solving'], lvl: 1, years: [3, 4], br: 'ALL', mode: 'On-campus', pay: PAY_NONE, dur: '3 tests', hrs: 3, track: ['sw', 'lead'], tags: ['Last day today'], desc: 'Timed mock tests that mirror campus-drive aptitude rounds, with a ranked score report.' },
  { id: 32, type: 'Workshop', title: 'Cloud Fundamentals Crash Course', org: 'Industry Tie-up Cell', d: -2, skills: ['Cloud'], lvl: 1, years: [2, 3, 4], br: ['CSE', 'IT'], mode: 'Remote', pay: PAY_NONE, dur: '2 days', hrs: 6, track: ['sw'], tags: ['Closed'], desc: 'Registrations are closed. Watch this space for the next batch.' }
];

const HOW_TO = {
  Job: 'Apply on the company’s own careers page using the link below. Tailor your resume to the keywords in the description first.',
  Placement: 'Register on the placement portal, upload your latest resume, and attend the pre-drive briefing. Carry a printed resume and ID.',
  Internship: 'Send your resume and a 100-word statement of intent to the coordinating cell. Shortlisted students get a short screening call.',
  Hackathon: 'Register your team before the deadline, choose a problem statement and confirm every member’s college ID.',
  Workshop: 'Reserve a seat with your roll number. Seats are first-come, first-served, and attendance earns the certificate.',
  Research: 'Meet the faculty coordinator with a one-page note on why you fit, and bring one project you can demo.',
  Club: 'Fill the interest form, pick up to two roles, and attend the interaction round.'
};

const CHECKLISTS = {
  Job: ['Read the description twice and note the keywords', 'Check the experience asked for is 0–2 years', 'Tailor your resume to this role (Resume Studio)', 'Find someone at the company on LinkedIn for a referral', 'Apply on the official careers page', 'Log it in your tracker and follow up in 10 days'],
  Placement: ['Read the eligibility and the selection rounds', 'Update resume to one page', 'Do two timed aptitude mocks', 'Revise core subjects and data structures', 'Gather marks memos, ID and photos', 'Book a mock interview slot', 'Register on the portal before the deadline'],
  Internship: ['Read the listing and check eligibility', 'Tailor your resume to the role', 'Add GitHub / portfolio links', 'Write a 100-word statement of intent', 'Prepare to discuss two projects', 'Ask a mentor to review your application', 'Submit before the deadline'],
  Hackathon: ['Confirm the team and roles', 'Read the problem statements and rules', 'Set up repo, tools and accounts', 'Pre-decide the stack you will use', 'Plan a 3-minute demo outline', 'Register the team before the deadline'],
  Workshop: ['Check dates and clashes with exams', 'Reserve your seat', 'Install the required software', 'Read the prerequisites', 'Bring a laptop and charger'],
  Research: ['Read two papers from the lab’s area', 'Write a one-page note on your fit', 'Prepare one project to demo', 'Meet the faculty coordinator', 'Confirm time commitment with your timetable', 'Submit the application'],
  Club: ['Pick the roles you want', 'Prepare a short pitch about why you', 'Note one idea you would run as an event', 'Fill the interest form', 'Attend the interaction round']
};

const QBANK = {
  Job: ['Tell me about yourself in under two minutes.', 'Walk me through the hardest bug you have fixed.', 'Why do you want to join us rather than a bigger brand?', 'Where do you see yourself in two years?', 'Explain one project end to end: design, trade-offs, what you would change.'],
  Placement: ['Walk me through your resume in two minutes.', 'Which project are you proudest of, and what was your exact contribution?', 'Explain how a hash map works and when you would not use one.', 'Tell me about a time you worked under a deadline.', 'Why this company, and why this role?'],
  Internship: ['Describe a project you built. What broke, and how did you fix it?', 'How would you approach a task you have never done before?', 'What do you want to be better at after eight weeks?', 'Tell me about feedback you received and what you did with it.'],
  Hackathon: ['What problem would you pick, and who has that problem?', 'How would you split work in a team of four over 24 hours?', 'What would you cut first if you were running out of time?', 'How would you demo this in three minutes?'],
  Workshop: ['What do you hope to build by the end of the workshop?', 'What have you already tried on your own?'],
  Research: ['What question in this area interests you, and why?', 'How would you read a paper you do not fully understand?', 'How do you decide whether a result is trustworthy?', 'How many hours a week can you commit, and when?'],
  Club: ['What would you change about the club in its first 100 days?', 'Describe a time you led without being the one in charge.', 'How would you handle a teammate who stops responding?']
};
const SKILL_Q = {
  'DSA': 'Find the first non-repeating character in a string. What is the time complexity?',
  'Docker': 'What is the difference between an image and a container?',
  'Node.js': 'How does the Node.js event loop handle many requests on one thread?',
  'TypeScript': 'What problem does TypeScript solve that JavaScript does not?',
  'Linux': 'How would you find which process is using port 8080?',
  'Testing': 'What is the difference between a unit test and an integration test?',
  'Python': 'What is the difference between a list and a tuple? When would you use each?',
  'Java': 'Explain the difference between an interface and an abstract class.',
  'C': 'What is a pointer, and what is a dangling pointer?',
  'C++': 'What does RAII mean and why does it matter?',
  'JavaScript': 'What is a closure? Give a real example.',
  'SQL': 'What is the difference between INNER JOIN and LEFT JOIN?',
  'Web Dev': 'What happens between typing a URL and seeing a page?',
  'React': 'When does a component re-render, and how do you avoid needless renders?',
  'Cloud': 'What is the difference between IaaS, PaaS and SaaS?',
  'Git': 'How do you resolve a merge conflict?',
  'Data Analysis': 'How would you check whether a dataset is clean enough to trust?',
  'AI/ML': 'What is overfitting and how do you detect it?',
  'Deep Learning': 'Why do we need activation functions?',
  'IoT': 'How would you send sensor data to a dashboard reliably?',
  'Embedded C': 'What is volatile and when do you need it?',
  'Cybersecurity': 'Explain SQL injection and how to prevent it.',
  'CAD': 'How do you decide on constraints when sketching a part?',
  'MATLAB': 'How do you vectorise a loop in MATLAB?',
  'UI/UX': 'Walk me through how you validated a design decision.'
};

const RESUME_TEMPLATES = [
  'Built {S1} project that {result}; shipped to {users} and documented in a README.',
  'Used {S1} and {S2} to {verb} — cut {metric} by {n}% in testing.',
  'Led a team of {n} to deliver {thing} in {time}, presenting to a panel of faculty.',
  'Wrote {n} automated tests for {thing}, raising coverage from {a}% to {b}%.'
];

/* ---------- Demo personas ---------- */
const PERSONAS = [
  { id: 'explorer', label: 'First-year explorer', blurb: 'CSE · Year 1 · curious, building basics',
    profile: { name: 'Ananya', branch: 'CSE', year: 1, cgpa: '', mode: 'Any', hours: 10, track: 'sw', goal: 'Land an internship at a product-based company', project: 'a weather app in JavaScript', interests: ['Internship', 'Workshop', 'Hackathon'], skills: { 'Python': 1, 'Web Dev': 1, 'Communication': 2 } } },
  { id: 'placement', label: 'Final-year placement seeker', blurb: 'IT · Year 4 · wants an offer this season',
    profile: { name: 'Rahul', branch: 'IT', year: 4, cgpa: '7.8', mode: 'On-campus', hours: 20, track: 'sw', goal: 'Get a software engineer offer through campus placements', project: 'a library management system in Java with SQL', interests: ['Placement', 'Internship'], skills: { 'Java': 3, 'SQL': 2, 'Problem Solving': 3, 'Python': 2, 'Git': 2, 'Communication': 2 } } },
  { id: 'embedded', label: 'Third-year embedded & research', blurb: 'ECE · Year 3 · hardware, labs, papers',
    profile: { name: 'Fatima', branch: 'ECE', year: 3, cgpa: '8.4', mode: 'Any', hours: 15, track: 'core', goal: 'Work in an embedded systems lab and aim for higher studies', project: 'a soil-moisture IoT node with a dashboard', interests: ['Research', 'Internship', 'Workshop'], skills: { 'C': 3, 'Embedded C': 2, 'IoT': 2, 'VLSI': 1, 'Python': 1, 'Technical Writing': 1 } } },
  { id: 'core', label: 'Second-year core engineer', blurb: 'MECH · Year 2 · CAD, MATLAB, design',
    profile: { name: 'Kiran', branch: 'MECH', year: 2, cgpa: '7.2', mode: 'Any', hours: 15, track: 'core', goal: 'Build a design portfolio and win an EV competition', project: 'a gearbox assembly modelled in CAD', interests: ['Hackathon', 'Internship', 'Workshop'], skills: { 'CAD': 2, 'MATLAB': 1, 'Problem Solving': 2, 'Leadership': 1 } } }
];

const BLANK_PROFILE = { name: '', branch: 'CSE', year: 1, cgpa: '', mode: 'Any', hours: 10, track: '', goal: '', project: '', interests: [], skills: {} };

/* ---------- Pipeline ---------- */
const STAGES = ['Applied', 'Interview', 'Offer', 'Rejected'];
const COLUMNS = ['Saved', 'Applied', 'Interview', 'Offer', 'Rejected'];

const WEIGHT_META = [
  { key: 'skills', label: 'Skill fit', hint: 'How well your skill levels meet the listing’s bar' },
  { key: 'track', label: 'Career track', hint: 'Does it sit on the path you chose' },
  { key: 'interests', label: 'Interest in type', hint: 'Placement, internship, hackathon, …' },
  { key: 'mode', label: 'Mode', hint: 'On-campus, remote or hybrid' },
  { key: 'timing', label: 'Timing & load', hint: 'Time left to apply and hours per week' }
];
const W_DEFAULT = { skills: 40, track: 20, interests: 15, mode: 10, timing: 15 };

/* ---------- Design-thinking case file ---------- */
const SUS_ITEMS = [
  'I think that I would like to use this system frequently.',
  'I found the system unnecessarily complex.',
  'I thought the system was easy to use.',
  'I think that I would need the support of a technical person to be able to use this system.',
  'I found the various functions in this system were well integrated.',
  'I thought there was too much inconsistency in this system.',
  'I would imagine that most people would learn to use this system very quickly.',
  'I found the system very cumbersome to use.',
  'I felt very confident using the system.',
  'I needed to learn a lot of things before I could get going with this system.'
];

const JOURNEY = [
  { stage: 'Profile', pain: 'Students rarely write down their skills and goals, so every search starts from zero.', fix: 'Skill levels, track and availability captured once, with demo personas to start fast.' },
  { stage: 'Discover', pain: 'Listings are scattered across notice boards, WhatsApp groups and emails.', fix: 'One searchable database with filters, a calendar view and a closing-soon ticker.' },
  { stage: 'Match', pain: 'No way to tell which listing actually fits, so students apply to everything or nothing.', fix: 'Transparent scoring with tunable weights, and a skill-gap roadmap that shows what to learn next.' },
  { stage: 'Ask', pain: 'Simple questions (what closes this week?) wait on seniors or coordinators.', fix: 'An assistant that answers from your profile and the live listings.' },
  { stage: 'Prepare', pain: 'First-years do not know what a good application looks like.', fix: 'Per-listing checklist, cover letter workshop, interview questions and notes.' },
  { stage: 'Track', pain: 'Deadlines and interview dates slip through the cracks.', fix: 'A pipeline board, reminders, and calendar export to your phone.' }
];

const HMW_LIST = [
  'keep every opportunity in one searchable place?',
  'show a student, honestly, why a listing does or does not fit?',
  'help a first-year see what to learn to qualify later?',
  'make deadlines impossible to miss?',
  'turn preparation from guesswork into clear steps?'
];
const PROBLEM_STATEMENT = 'Students cannot easily find, judge and track the opportunities that fit them, because listings are scattered and nothing tells them whether they are eligible or ready.';

const ASSISTANT_PROMPTS = [
  'What closes this week?',
  'Show my best matches',
  'Plan my week',
  'Paid remote internships',
  'Which skill should I learn next?',
  'Why is my top match ranked first?',
  'How do I prepare for a hackathon?',
  'Where do my applications stand?'
];

if (typeof module !== 'undefined') module.exports = { TYPES, SEED, SKILLS, SKILL_GROUPS, W_DEFAULT, BLANK_PROFILE, PERSONAS, TRACKS, BRANCHES, LEARN, SUS_ITEMS };
