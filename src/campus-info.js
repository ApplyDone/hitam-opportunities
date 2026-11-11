/* ============================================================
   campus-info.js — facts copied from HITAM's official pages.
   Sources: https://hitam.org/training-programs-2/ (Career Calendar)
            https://hitam.org/clubs-and-societies/
   Re-check these pages each semester; they are not auto-collected.
   ============================================================ */
'use strict';

const CAMPUS_SOURCES = { calendar: 'https://hitam.org/training-programs-2/', clubs: 'https://hitam.org/clubs-and-societies/', cdc: 'https://hitam.org/career-design-centre/', cdcApp: 'https://cdc.hitam.org/' };

/* "Employability Guaranteed: 4 Year Career Calendar". Key: year-semester. */
const CAREER_CALENDAR = {
  '1-1': { label: 'Year 1 · Semester I', do: ['Get to know the Career Design Centre (CDC)', 'Learn what careers open up after engineering', 'Meet your Career Mentors (academic and career counsellors)'], train: ['Awareness on career opportunities', 'Orientation on your Individual Development Plan', 'Orientation on the Student Progression Framework', 'Psychometric assessment'] },
  '1-2': { label: 'Year 1 · Semester II', do: ['Take the skill assessment', 'Register on global skill-building platforms', 'Meet industry mentors and attend industry talks', 'Start your resume and your online profile'], train: ['Basics of aptitude and reasoning', 'Awareness on industry expectations', 'Industry-pattern skill assessment', 'Registration on global platforms', 'Resume building: basics'] },
  '2-1': { label: 'Year 2 · Semester I', do: ['Train on aptitude and reasoning', 'Take skill assessments and work on weak areas', 'Attend Industry Mentoring Sessions', 'Build your network with industry experts'], train: ['Advanced aptitude and reasoning I', 'Technical skills I', 'Career mentoring by industry experts I'] },
  '2-2': { label: 'Year 2 · Semester II', do: ['Train on technical skills', 'Build your profile on global coding platforms and join hackathons and codathons', 'Secure an internship (online or offline), start projects, get certifications', 'Attend resume, interview and etiquette workshops'], train: ['Advanced aptitude and reasoning II', 'Technical skills II', 'Career mentoring by industry experts II'] },
  '3-1': { label: 'Year 3 · Semester I', do: ['Practise aptitude and technical sessions', 'Run a skill-gap analysis through industry-pattern assessments', 'Do advanced certifications; join a co-op or industry-sponsored project', 'Choose electives that match your career aim'], train: ['Industry-pattern test practice (aptitude and technical) I', 'Soft skills', 'Career mentoring by industry experts III'] },
  '3-2': { label: 'Year 3 · Semester II', do: ['Practise industry-pattern aptitude and technical tests', 'Update your resume with internships and projects, get it reviewed and checked against an ATS', 'Do mock interviews and group discussions with experts or alumni'], train: ['Industry-pattern test practice II', 'IELTS training', 'Confidence building', 'Career mentoring by industry experts IV'] },
  '4-1': { label: 'Year 4 · Semester I', do: ['Take company-specific training', 'Sit industry-pattern assessments', 'Do a longer internship or co-op and a strong final-year project', 'List target employers and check the Placement Office for upcoming drives', 'Attend campus drives; use the alumni network for referrals'], train: ['Company-specific training', 'Mock group discussions by alumni and industry experts', 'Mock interviews by alumni and industry experts', 'Career mentoring by industry experts V'] },
  '4-2': { label: 'Year 4 · Semester II', do: ['Use need-based placement support', 'Keep practising mock group discussions and interviews'], train: ['Need-based placement support', 'Mock group discussions by alumni and industry experts', 'Mock interviews by alumni and industry experts'] }
};

/** Odd semester runs roughly Jun to Nov, even semester Dec to May. An approximation, shown as such. */
const currentSemester = (now = new Date()) => (now.getMonth() >= 5 && now.getMonth() <= 10 ? 1 : 2);

/* Clubs and programmes named on HITAM's clubs page. `jobs` marks the ones that help a job search. */
const HITAM_CLUBS = [
  { name: 'Hackathon Club', jobs: true, note: 'Runs hackathons such as Hack Your Path 5.0 (December 2023, 30+ teams).' },
  { name: 'Toastmasters Club', jobs: true, note: 'Public speaking and leadership. Over 100 meetings held.' },
  { name: 'Student Skill Development Centre (SSDC)', jobs: true, note: 'Branch-wise tool courses: AutoCAD, Creo, Revit (Mech); Oracle, MSBI, Python (CSE); MATLAB, PLC, Arduino (EEE); Raspberry Pi, IoT (ECE).' },
  { name: 'Grand Challenges Scholars Program (GCSP)', jobs: true, note: 'Research, entrepreneurship and multidisciplinary projects. HITAM says it was the first institute in India to adopt it.' },
  { name: 'Student Self Governance (SSG)', jobs: true, note: 'Student leadership roles and a seat in management review meetings.' },
  { name: 'TEDx HITAM', jobs: false, note: 'Talks and speaker events on campus.' },
  { name: 'Project Expo', jobs: true, note: 'Showcase your projects. Good material for your resume.' },
  { name: 'Unnat Bharat Abhiyaan', jobs: false, note: 'Community and rural outreach.' },
  { name: 'NCC Army Wing', jobs: false, note: 'Established 2022, 36 cadets.' },
  { name: 'Wellness Club', jobs: false, note: 'Counselling and group activities for student well-being.' },
  { name: 'Affinity clubs (26+)', jobs: false, note: 'Literary Intellects, Cultural, Photography, Yoga and more.' }
];
