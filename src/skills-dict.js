/* ============================================================
   skills-dict.js — one shared vocabulary for spotting skills and
   keywords in free text (resumes and job descriptions).
   Used in the browser (Resume Studio) and in Node (ingest/).
   ============================================================ */
'use strict';

const SKILL_ALIASES = {
  'Python': ['python', 'django', 'flask', 'fastapi', 'numpy'],
  'Java': ['java(?!\\s*script)', 'spring boot', 'spring', 'hibernate', 'j2ee'],
  'C': [],
  'C++': ['c\\+\\+', 'cpp'],
  'JavaScript': ['javascript', 'js', 'es6', 'jquery'],
  'TypeScript': ['typescript'],
  'SQL': ['sql', 'mysql', 'postgres(?:ql)?', 'sqlite', 'pl/sql', 'oracle database', 'sql server'],
  'DSA': ['data structures', 'algorithms', 'dsa', 'leetcode', 'competitive programming', 'codechef', 'codeforces'],
  'Web Dev': ['html5?', 'css3?', 'web development', 'front[- ]?end', 'full[- ]?stack', 'bootstrap', 'tailwind', 'rest(?:ful)? apis?'],
  'React': ['react(?:\\.js|js)?', 'next\\.?js', 'redux', 'react native'],
  'Node.js': ['node(?:\\.js|js)', 'express(?:\\.js|js)?', 'nest\\.?js'],
  'Cloud': ['aws', 'amazon web services', 'azure', 'gcp', 'google cloud', 'cloud computing', 'ec2', 'lambda'],
  'Docker': ['docker', 'kubernetes', 'k8s', 'containeri[sz]ation'],
  'Linux': ['linux', 'unix', 'bash', 'shell scripting'],
  'Git': ['git', 'github', 'gitlab', 'version control'],
  'Testing': ['unit tests?', 'unit testing', 'jest', 'pytest', 'junit', 'selenium', 'cypress', 'test automation', 'qa'],
  'Data Analysis': ['data analysis', 'data analytics', 'pandas', 'statistics', 'tableau', 'data visuali[sz]ation'],
  'Excel': ['excel', 'spreadsheets?', 'vlookup', 'pivot tables?'],
  'Power BI': ['power ?bi'],
  'AI/ML': ['machine learning', 'ml', 'scikit-learn', 'sklearn', 'artificial intelligence', 'ai', 'nlp', 'computer vision', 'llms?', 'generative ai', 'gen ?ai'],
  'Deep Learning': ['deep learning', 'tensorflow', 'pytorch', 'keras', 'cnns?', 'neural networks?'],
  'IoT': ['iot', 'internet of things', 'arduino', 'raspberry pi', 'esp32'],
  'Embedded C': ['embedded c', 'embedded systems?', 'microcontrollers?', 'firmware', 'rtos', 'stm32', '8051'],
  'VLSI': ['vlsi', 'verilog', 'vhdl', 'fpga', 'asic', 'rtl design'],
  'Robotics': ['robotics', 'ros'],
  'Cybersecurity': ['cyber ?security', 'information security', 'penetration testing', 'ethical hacking', 'owasp', 'ctf', 'network security'],
  'CAD': ['cad', 'autocad', 'solidworks', 'catia', 'creo', 'fusion 360', 'ansys'],
  'MATLAB': ['matlab', 'simulink'],
  'UI/UX': ['ui/ux', 'ux', 'ui design', 'user experience', 'user research', 'wireframes?', 'prototyping'],
  'Figma': ['figma', 'adobe xd'],
  'Communication': ['communication skills', 'communication', 'presentation skills'],
  'Problem Solving': ['problem[- ]solving', 'analytical skills', 'analytical thinking'],
  'Public Speaking': ['public speaking', 'anchoring', 'debate', 'toastmasters'],
  'Leadership': ['leadership', 'team lead', 'led a team', 'captain', 'president', 'coordinator', 'organi[sz]ed'],
  'Technical Writing': ['technical writing', 'documentation', 'technical blog', 'research paper', 'published a paper']
};

/* Extra keywords that matter for applicant-tracking matches but are not profile skills. */
const EXTRA_KEYWORDS = ['microservices', 'agile', 'scrum', 'jira', 'spark', 'hadoop', 'kafka', 'redis', 'mongodb', 'graphql', 'android', 'kotlin', 'swift', 'flutter', 'golang', 'rust', 'scala', 'snowflake', 'airflow', 'etl', 'ci/cd', 'jenkins', 'terraform', 'salesforce', 'sap', 'servicenow', 'oop', 'object oriented', 'system design', 'dbms', 'operating systems', 'computer networks', 'api', 'json', 'bigquery', 'databricks', 'pyspark', 'tableau', 'looker', 'r programming', 'sas', 'opencv', 'langchain', 'prompt engineering'];

const C_PATTERN = /(?<![a-z0-9+#./-])c(?![a-z0-9+#])(?=\s*(?:[,/|)]|\+\+|programming|language|\n|$))/im;
const wordRe = src => new RegExp(`(?<![a-z0-9+#.])(?:${src})(?![a-z0-9+#])`, 'gi');
const SKILL_RES = Object.fromEntries(Object.entries(SKILL_ALIASES).map(([k, list]) => [k, list.map(wordRe)]));
const EXTRA_RES = EXTRA_KEYWORDS.map(k => [k, wordRe(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))]);

/** Count how often each profile skill is mentioned. Returns {skill: count}. */
function detectSkills(text) {
  const t = String(text || '');
  const out = {};
  Object.entries(SKILL_RES).forEach(([skill, res]) => {
    const n = res.reduce((acc, re) => acc + (t.match(re) || []).length, 0);
    if (n) out[skill] = n;
  });
  const c = (t.match(new RegExp(C_PATTERN.source, 'gim')) || []).length;
  if (c) out.C = c;
  return out;
}

/** All canonical keywords (skills + extras) present in a text. */
function extractKeywords(text) {
  const t = String(text || '');
  const found = new Set(Object.keys(detectSkills(t)));
  EXTRA_RES.forEach(([k, re]) => { re.lastIndex = 0; if (re.test(t)) found.add(k); });
  return [...found];
}

if (typeof module !== 'undefined') module.exports = { SKILL_ALIASES, EXTRA_KEYWORDS, detectSkills, extractKeywords };
