#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..', '..', '..');
const apiRoot = path.join(repoRoot, 'apps', 'api');
loadEnv({ path: path.join(repoRoot, 'apps', 'api', '.env'), override: false });

const BOOK_ROOT = path.join(repoRoot, 'apps', 'api', 'data', 'books');
const SNAPSHOT_ROOT = path.join(repoRoot, 'apps', 'api', 'data', 'book-creator', 'snapshots');
const PROGRESS_PATH = path.join(repoRoot, 'apps', 'api', 'data', 'book-creator', 'progress-normalized.json');
const LOG_PATH = path.join(repoRoot, 'apps', 'api', 'data', 'book-creator', 'events-normalized.jsonl');
const GENERATOR_VERSION = 'normalized-learner-first-quality-gated-renderers-2026-07-01-v22';

const COUNTRY_CONFIGS = {
  UGA: {
    name: 'Uganda',
    curriculum: 'NCDC',
    grades: ['P4', 'S1', 'S2', 'S3', 'S4'],
    subjectsByGrade: {
      P4: [
        subject('English', 'english', '#2563EB', 'hare', 'storytelling and reading guide', 'learners reading and speaking in a school library with a friendly hare mascot'),
        subject('Mathematics', 'mathematics', '#047857', 'grey crowned crane', 'problem-solving and pattern guide', 'learners using measuring tools, number cards, and market examples with a grey crowned crane mascot')
      ],
      default: [
        subject('English', 'english', '#2563EB', 'hare', 'storytelling and reading guide', 'secondary learners in a reading and debate club with a friendly hare mascot'),
        subject('Mathematics', 'mathematics', '#047857', 'grey crowned crane', 'problem-solving and pattern guide', 'learners solving real-life mathematics with measuring tools and a grey crowned crane mascot'),
        subject('General Science', 'general-science', '#7C3AED', 'chameleon', 'curiosity and observation guide', 'learners doing a safe science investigation outdoors with a chameleon mascot'),
        subject('Geography', 'geography', '#0E7490', 'Uganda kob', 'maps and landscape guide', 'learners studying maps near a Ugandan landscape with a Uganda kob mascot'),
        subject('History and Political Education', 'history-and-political-education', '#BE123C', 'Uganda kob', 'citizenship and heritage guide', 'learners visiting a heritage site with maps and a Uganda kob mascot'),
        subject('Agriculture', 'agriculture', '#15803D', 'Ankole longhorn cow', 'farm practice guide', 'learners working in a school garden and livestock setting with an Ankole longhorn cow mascot'),
        subject('ICT', 'ict', '#4338CA', 'grey crowned crane', 'digital skills guide', 'learners using tablets and safe digital tools with a grey crowned crane mascot'),
        subject('Kiswahili', 'kiswahili', '#C2410C', 'hare', 'East African language guide', 'learners in a Kiswahili storytelling circle with a friendly hare mascot'),
        subject('Entrepreneurship', 'entrepreneurship', '#B45309', 'Ankole longhorn cow', 'enterprise and livelihood guide', 'learners running a small school market project with an Ankole longhorn cow mascot')
      ]
    }
  },
  ETH: {
    name: 'Ethiopia',
    curriculum: 'ENC',
    coverageCaveat: 'Configured generation currently covers only English for Grades 4-10. Official framework coverage is broader; see apps/api/data/curriculum/expected-matrix/ETH/ENC.json and generated audit apps/api/data/book-creator/ethiopia-coverage-gaps.json before treating Ethiopia as complete.',
    grades: ['Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'],
    subjectsByGrade: {
      default: [
        subject('English', 'english', '#2563EB', 'gelada', 'communication and reading guide', 'learners reading and discussing stories in an Ethiopian school library with a friendly gelada mascot')
      ]
    }
  },
  RWA: {
    name: 'Rwanda',
    curriculum: 'REB-CBC',
    grades: ['P4', 'P5', 'P6', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
    subjectsByGrade: {
      P4: rwandaPrimarySubjects(),
      P5: rwandaPrimarySubjects(),
      P6: rwandaPrimarySubjects(),
      S1: rwandaLowerSecondarySubjects(),
      S2: rwandaLowerSecondarySubjects(),
      S3: rwandaLowerSecondarySubjects(),
      default: rwandaUpperSecondarySubjects()
    }
  },
  TZA: {
    name: 'Tanzania',
    curriculum: 'TIE-BASIC',
    grades: ['Standard IV', 'Standard V', 'Standard VI', 'Form I', 'Form II', 'Form III', 'Form IV'],
    subjectsByGrade: {
      'Standard IV': tanzaniaPrimarySubjects(),
      'Standard V': tanzaniaPrimarySubjects(),
      'Standard VI': tanzaniaPrimarySubjects(),
      default: tanzaniaSecondarySubjects()
    }
  }
};

function subject(title, slug, color, mascotSpecies, mascotRole, scene) {
  return {
    db: title,
    title,
    slug,
    color,
    mascot: {
      species: mascotSpecies,
      role: mascotRole,
      sourceRationale: 'Assigned from the Book Creator mascot registry for country and subject fit.'
    },
    scene
  };
}

function rwandaPrimarySubjects() {
  return [
    subject('English', 'english', '#2563EB', 'hare', 'reading and communication guide', 'learners reading and speaking in a Rwandan school library with a friendly hare mascot'),
    subject('Kinyarwanda', 'kinyarwanda', '#C2410C', 'grey crowned crane', 'language and culture guide', 'learners in a storytelling circle with a grey crowned crane mascot'),
    subject('Mathematics', 'mathematics', '#047857', 'mountain gorilla', 'problem-solving guide', 'learners using counters and measuring tools with a friendly mountain gorilla mascot'),
    subject('Science and Elementary Technology', 'science-and-elementary-technology', '#7C3AED', 'chameleon', 'curiosity and observation guide', 'learners doing a simple science and technology investigation with a chameleon mascot'),
    subject('Social Studies and Religious Education', 'social-studies-and-religious-education', '#BE123C', 'mountain gorilla', 'community and heritage guide', 'learners studying community maps and heritage places with a mountain gorilla mascot'),
    subject('Creative Art', 'creative-art', '#DB2777', 'grey crowned crane', 'creative arts guide', 'learners making art and craft with a grey crowned crane mascot'),
    subject('Physical Education and Sports', 'physical-education-and-sports', '#0E7490', 'impala', 'movement and teamwork guide', 'learners playing sports safely with an impala mascot'),
    subject('French', 'french', '#4338CA', 'hare', 'language practice guide', 'learners practising French dialogue with a friendly hare mascot')
  ];
}

function rwandaLowerSecondarySubjects() {
  return [
    subject('English', 'english', '#2563EB', 'hare', 'reading and communication guide', 'learners in a reading and debate club with a friendly hare mascot'),
    subject('Kinyarwanda', 'kinyarwanda', '#C2410C', 'grey crowned crane', 'language and culture guide', 'learners presenting stories and poems with a grey crowned crane mascot'),
    subject('French', 'french', '#4338CA', 'hare', 'language practice guide', 'learners practising French dialogue with a friendly hare mascot'),
    subject('Mathematics', 'mathematics', '#047857', 'mountain gorilla', 'problem-solving guide', 'learners solving mathematics with charts and measuring tools with a mountain gorilla mascot'),
    subject('Chemistry', 'chemistry', '#7C3AED', 'chameleon', 'science observation guide', 'learners carrying out a safe chemistry observation with a chameleon mascot'),
    subject('Physics', 'physics', '#0E7490', 'mountain gorilla', 'measurement and systems guide', 'learners exploring physics with simple apparatus and a mountain gorilla mascot'),
    subject('Geography and Environment', 'geography-and-environment', '#0E7490', 'mountain gorilla', 'environment and map guide', 'learners studying maps and hillsides with a mountain gorilla mascot'),
    subject('History and Citizenship', 'history-and-citizenship', '#BE123C', 'grey crowned crane', 'heritage and citizenship guide', 'learners visiting a memorial or heritage site with a grey crowned crane mascot'),
    subject('ICT', 'ict', '#4338CA', 'mountain gorilla', 'digital skills guide', 'learners using computers safely with a mountain gorilla mascot'),
    subject('Physical Education and Sports', 'physical-education-and-sports', '#0E7490', 'impala', 'movement and teamwork guide', 'learners training safely on a sports field with an impala mascot')
  ];
}

function rwandaUpperSecondarySubjects() {
  return [
    subject('Core Mathematics', 'core-mathematics', '#047857', 'mountain gorilla', 'problem-solving guide', 'students solving mathematics with graphs and models with a mountain gorilla mascot'),
    subject('Subsidiary Mathematics', 'subsidiary-mathematics', '#059669', 'mountain gorilla', 'applied mathematics guide', 'students solving applied mathematics problems with graphs, models, and a mountain gorilla mascot'),
    subject('Subsidiary Mathematics LFK HLP HGL', 'subsidiary-mathematics-lfk-hlp-hgl', '#0F766E', 'mountain gorilla', 'applied mathematics guide', 'students using applied mathematics for humanities and language combinations with a mountain gorilla mascot'),
    subject('Chemistry', 'chemistry', '#7C3AED', 'chameleon', 'science observation guide', 'students doing safe chemistry work with a chameleon mascot'),
    subject('Geography', 'geography', '#0E7490', 'mountain gorilla', 'maps and environment guide', 'students studying maps and landscapes with a mountain gorilla mascot'),
    subject('History', 'history', '#BE123C', 'grey crowned crane', 'heritage guide', 'students studying timelines and historical sources with a grey crowned crane mascot'),
    subject('Computer Science', 'computer-science', '#4338CA', 'mountain gorilla', 'computing guide', 'students using computers and code safely with a mountain gorilla mascot'),
    subject('Entrepreneurship', 'entrepreneurship', '#B45309', 'impala', 'enterprise guide', 'students planning a small enterprise with an impala mascot'),
    subject('Entrepreneurship Alternate', 'entrepreneurship-alternate', '#92400E', 'impala', 'enterprise guide', 'students planning an alternate entrepreneurship project with an impala mascot'),
    subject('General Studies and Communication Skills', 'general-studies-and-communication-skills', '#2563EB', 'hare', 'communication and citizenship guide', 'students discussing national, ethical, communication, and study-skills issues with a friendly hare mascot'),
    subject('Physical Education and Sports', 'physical-education-and-sports', '#0E7490', 'impala', 'movement and teamwork guide', 'students training safely on a sports field with an impala mascot')
  ];
}

function tanzaniaPrimarySubjects() {
  return [
    subject('Kiswahili', 'kiswahili', '#C2410C', 'giraffe', 'language and storytelling guide', 'learners practising Kiswahili reading and speaking with a giraffe mascot'),
    subject('English', 'english', '#2563EB', 'hare', 'reading and communication guide', 'learners reading English stories with a friendly hare mascot'),
    subject('Hisabati', 'hisabati', '#047857', 'elephant', 'problem-solving guide', 'learners using counters and measuring tools with an elephant mascot'),
    subject('Sayansi', 'sayansi', '#7C3AED', 'chameleon', 'science observation guide', 'learners observing plants and simple experiments with a chameleon mascot'),
    subject('Jiografia na Mazingira', 'jiografia-na-mazingira', '#0E7490', 'giraffe', 'maps and environment guide', 'learners studying maps and landscapes with a giraffe mascot'),
    subject('Historia ya Tanzania na Maadili', 'historia-ya-tanzania-na-maadili', '#BE123C', 'lion', 'heritage and values guide', 'learners visiting a Tanzanian historical site with a lion mascot'),
    subject('Sanaa na Michezo', 'sanaa-na-michezo', '#DB2777', 'zebra', 'arts and movement guide', 'learners making art and playing games safely with a zebra mascot')
  ];
}

function tanzaniaSecondarySubjects() {
  return [
    subject('Kiswahili', 'kiswahili', '#C2410C', 'giraffe', 'language and storytelling guide', 'students discussing Kiswahili texts with a giraffe mascot'),
    subject('English Language', 'english-language', '#2563EB', 'hare', 'communication guide', 'students reading and presenting in English with a friendly hare mascot'),
    subject('Mathematics', 'mathematics', '#047857', 'elephant', 'problem-solving guide', 'students solving mathematics with charts and models with an elephant mascot'),
    subject('Biology', 'biology', '#15803D', 'chameleon', 'life science guide', 'students observing living things safely with a chameleon mascot'),
    subject('Chemistry', 'chemistry', '#7C3AED', 'chameleon', 'science observation guide', 'students doing safe chemistry work with a chameleon mascot'),
    subject('Physics', 'physics', '#0E7490', 'elephant', 'measurement and systems guide', 'students exploring physics with apparatus and an elephant mascot'),
    subject('Geography', 'geography', '#0E7490', 'giraffe', 'maps and environment guide', 'students studying maps and landscapes with a giraffe mascot'),
    subject('History', 'history', '#BE123C', 'lion', 'heritage guide', 'students studying historical sources with a lion mascot'),
    subject('Agriculture', 'agriculture', '#15803D', 'elephant', 'farm practice guide', 'students working in a school garden with an elephant mascot'),
    subject('Computer Science', 'computer-science', '#4338CA', 'giraffe', 'digital skills guide', 'students using computers safely with a giraffe mascot'),
    subject('Business Studies', 'business-studies', '#B45309', 'zebra', 'enterprise guide', 'students running a school business project with a zebra mascot')
  ];
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const raw = arg.slice(2);
    const equalsIndex = raw.indexOf('=');
    if (equalsIndex >= 0) {
      args[raw.slice(0, equalsIndex)] = raw.slice(equalsIndex + 1);
      continue;
    }
    const key = raw;
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
    args[key] = value;
  }
  return args;
}

function nowIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function gradeCode(grade) {
  const trimmed = String(grade).trim();
  if (/^[PS]\d+$/i.test(trimmed)) return trimmed.toUpperCase();
  const number = trimmed.match(/\d+/)?.[0];
  return number ? `G${number}` : slugify(trimmed).toUpperCase();
}

function gradeStageKey(grade) {
  const text = String(grade || '').trim().toLowerCase();
  const roman = {
    i: 1,
    ii: 2,
    iii: 3,
    iv: 4,
    v: 5,
    vi: 6
  };
  const standard = text.match(/^standard\s+(i|ii|iii|iv|v|vi|\d+)$/i);
  if (standard) {
    const n = Number(standard[1]) || roman[standard[1].toLowerCase()];
    if (n) return `P${n}`;
  }
  const form = text.match(/^form\s+(i|ii|iii|iv|v|vi|\d+)$/i);
  if (form) {
    const n = Number(form[1]) || roman[form[1].toLowerCase()];
    if (n) return `S${n}`;
  }
  const gradeMatch = text.match(/^grade\s+(\d+)$/i);
  if (gradeMatch) {
    const n = Number(gradeMatch[1]);
    if (n >= 1 && n <= 6) return `P${n}`;
    if (n >= 7 && n <= 12) return `S${n - 6}`;
  }
  return gradeCode(grade);
}

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function cleanText(value) {
  return String(value || '')
    .replace(/MacramÃ©/g, 'Macrame')
    .replace(/Ã©/g, 'e')
    .replace(/Ã¨/g, 'e')
    .replace(/Ã¡/g, 'a')
    .replace(/Ã¢/g, 'a')
    .replace(/Ã¶/g, 'o')
    .replace(/Ã¼/g, 'u')
    .replace(/\u00c2\u00a9/g, '(c)')
    .replace(/Ã©/g, 'é')
    .replace(/Ã¨/g, 'è')
    .replace(/Ãª/g, 'ê')
    .replace(/Ã /g, 'à')
    .replace(/Ã¢/g, 'â')
    .replace(/Ã§/g, 'ç')
    .replace(/Ã®/g, 'î')
    .replace(/Ã´/g, 'ô')
    .replace(/Ã»/g, 'û')
    .replace(/Ã¹/g, 'ù')
    .replace(/Ã‰/g, 'É')
    .replace(/Ã‡/g, 'Ç')
    .replace(/â€™/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .replace(/â€“/g, '-')
    .replace(/\u00e2\u20ac\u00a2|\u00ef\u20ac\u00ad/g, '-')
    .replace(/\u00e2\u20ac[\u201c\u201d]/g, '-')
    .replace(/\u00e2\u20ac[\u0153\u009d]/g, '"')
    .replace(/\u00e2\u20ac\u2122/g, "'")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function rel(file) {
  return path.relative(repoRoot, file).replace(/\\/g, '/');
}

function countWords(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length;
}

async function readJsonIfExists(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

async function fileExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

function resolveApiRelativePath(value) {
  if (!value) return null;
  const normalized = String(value).replace(/\\/g, '/').replace(/^\/+/, '');
  if (path.isAbsolute(normalized)) return normalized;
  if (normalized.startsWith('apps/api/')) return path.join(repoRoot, normalized);
  return path.join(apiRoot, normalized);
}

function sourceMarkdownCandidates(doc) {
  const metadata = doc.metadata || {};
  return [
    metadata.fullSourceMarkdown?.path,
    metadata.markdownPath
  ].filter(Boolean);
}

async function readSourceMarkdowns(sourceDocuments) {
  const markdowns = [];
  for (const doc of sourceDocuments || []) {
    for (const candidate of sourceMarkdownCandidates(doc)) {
      const file = resolveApiRelativePath(candidate);
      if (!file || !(await fileExists(file))) continue;
      const text = await fs.readFile(file, 'utf8');
      markdowns.push({
        sourceDocumentId: doc.id,
        officialTitle: doc.official_title,
        subject: doc.subject,
        path: rel(file),
        sha256: stableHash(text),
        textLength: text.length,
        text
      });
      break;
    }
  }
  return markdowns;
}

async function writeJsonAtomic(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await replaceFileWithRetry(tmp, file);
}

async function writeTextAtomic(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, value, 'utf8');
  await replaceFileWithRetry(tmp, file);
}

async function replaceFileWithRetry(tmp, file) {
  let lastError;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      await fs.rename(tmp, file);
      return;
    } catch (error) {
      lastError = error;
      if (!['EPERM', 'EACCES', 'EEXIST'].includes(error?.code)) throw error;
      await new Promise(resolve => setTimeout(resolve, 75 * (attempt + 1)));
      if (attempt >= 2) {
        await fs.rm(file, { force: true }).catch(() => {});
      }
    }
  }
  throw lastError;
}

async function appendEvent(event) {
  await fs.mkdir(path.dirname(LOG_PATH), { recursive: true });
  await fs.appendFile(LOG_PATH, `${JSON.stringify({ at: nowIso(), ...event })}\n`, 'utf8');
}

async function loadProgress() {
  try {
    return JSON.parse(await fs.readFile(PROGRESS_PATH, 'utf8'));
  } catch {
    return { schemaVersion: 1, startedAt: nowIso(), jobs: [] };
  }
}

function upsertJob(jobs, job) {
  return [...jobs.filter(existing => existing.key !== job.key), job].sort((a, b) => a.key.localeCompare(b.key));
}

async function saveProgress(progress) {
  await writeJsonAtomic(PROGRESS_PATH, progress);
}

function bookIdFor(country, curriculum, grade, subject) {
  return `kitabu-quest-${country.toLowerCase()}-${curriculum.toLowerCase()}-${slugify(grade)}-${subject.slug}`;
}

function titleFor(grade, subject) {
  return `KITABU QUEST ${grade} ${subject.title}`;
}

function usefulLineFrom(description, fallback) {
  const blocked = /^(the republic|ministry|national curriculum|p\s*\.?o|syllabus|contents|foreword|acknowledg|introduction|\d+|mathematics syllabus|the lower secondary curriculum)$/i;
  const line = String(description || '')
    .split(/\r?\n/)
    .map(cleanText)
    .find(item => item.length >= 8 && item.length <= 90 && !blocked.test(item));
  return line || fallback;
}

function sanitizeOutcome(statement, fallback) {
  const text = normalizeOutcomeText(statement);
  if (!text || text.length > 260) return fallback;
  if (/^(the republic|ministry|national curriculum|p\s*\.?o|syllabus|contents)/i.test(text)) return fallback;
  if (/\b(?:and|or|of|to|with|in|involve|involving|the ability to)\.?$/i.test(text)) return fallback;
  if (/^(?:show the process for solving|develop the ability to)\b/i.test(text)) return fallback;
  if (/\bAppreciate\b/.test(text) && !/^appreciate\b/i.test(text)) return fallback;
  return text;
}

function normalizeOutcomeText(statement) {
  let text = cleanText(statement)
    .replace(/\bbe able to be able to\b/ig, 'be able to')
    .replace(/^by the end\s+(?:of\s+)?(?:this|the)?\s*(?:unit|lesson)?\s*(?:the\s+)?/ig, '')
    .replace(/\bPupils?\s+(?:will|should)\s+be\s+able\s+to\s+/ig, '')
    .replace(/\bLearners?\s+(?:will|should)\s+be\s+able\s+to\s+/ig, '')
    .replace(/\bStudents?\s+(?:will|should)\s+be\s+able\s+to\s+/ig, '')
    .replace(/\bTo\s+be\s+able\s+to\s+/i, '')
    .replace(/^name all place\s+([0-9,]+),/i, 'name place values up to $1')
    .replace(/^define explain and describe\b/i, 'define, explain, and describe')
    .replace(/\brelationship between among\b/ig, 'relationship among')
    .replace(/\bplace numerals\b/ig, 'place values of numerals')
    .replace(/\bapply acquired convert\b/ig, 'convert')
    .replace(/\bapply the of\b/ig, 'apply knowledge of')
    .replace(/\breal-\s*life\b/ig, 'real-life')
    .replace(/\s*\(\s*that is less than or equal\s*\)/ig, '')
    .replace(/[.?!]+\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  text = text.charAt(0).toLowerCase() + text.slice(1);
  return text;
}

function sentenceCase(value) {
  const text = cleanText(value);
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function normalizeFrenchPhrase(value) {
  return cleanText(value)
    .replace(/\bgouts\b/gi, 'goûts')
    .replace(/\bgout\b/gi, 'goût')
    .replace(/\bpasse\b/gi, 'passé')
    .replace(/\becoute\b/gi, 'écoute')
    .replace(/\becouter\b/gi, 'écouter')
    .replace(/\becrire\b/gi, 'écrire')
    .replace(/\blecture et ecriture\b/gi, 'lecture et écriture')
    .replace(/\breponds\b/gi, 'réponds')
    .replace(/\brepondre\b/gi, 'répondre')
    .replace(/\bcomplete\b/gi, 'complète')
    .replace(/\bfrancais\b/gi, 'français')
    .replace(/\bde les\b/gi, 'des')
    .replace(/\bde le\b/gi, 'du')
    .replace(/\bà les\b/gi, 'aux')
    .replace(/\bà le\b/gi, 'au')
    .replace(/\ben Rwanda\b/gi, 'au Rwanda')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeUnitTitleForSubject(subjectTitle, unitTitle) {
  const cleaned = normalizeExtractedTopicTitle(subjectTitle, unitTitle);
  if (subjectTitle === 'French') return normalizeFrenchPhrase(cleaned);
  return cleaned;
}

function numberWordPattern() {
  return '(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\\d+)';
}

function collapseCompressedDuplicateTitle(value) {
  let text = cleanText(value).replace(/([a-z])([A-Z])/g, '$1 $2');
  const compact = text.replace(/\s+/g, '').toLowerCase();
  if (compact.length >= 12 && compact.length % 2 === 0) {
    const half = compact.length / 2;
    if (compact.slice(0, half) === compact.slice(half)) {
      text = text.slice(0, Math.ceil(text.length / 2)).trim();
    }
  }
  return cleanText(text);
}

function normalizeExtractedTopicTitle(subjectTitle, unitTitle) {
  let title = collapseCompressedDuplicateTitle(cleanUnitTitle(unitTitle))
    .replace(new RegExp(`^unit\\s+${numberWordPattern()}\\s*[:.-]?\\s*`, 'i'), '')
    .replace(new RegExp(`^chapter\\s+${numberWordPattern()}\\s*[:.-]?\\s*`, 'i'), '')
    .replace(new RegExp(`^topic\\s+${numberWordPattern()}\\s*[:.-]?\\s*`, 'i'), '')
    .replace(/^unit\s+unit\b/i, 'Unit')
    .replace(/\bunit\s+unit\b/ig, 'Unit')
    .replace(/\s+/g, ' ')
    .trim();

  if (subjectTitle === 'English' || subjectTitle === 'English Language') {
    title = title
      .replace(/^Ethiopian\s+Grade\s+\d+\s*,?\s*English\s+Student\s+Book$/i, '')
      .replace(/^English\s+Student\s+Book$/i, '')
      .replace(/^Student'?s\s+Book$/i, '')
      .replace(/^Unit$/i, '')
      .trim();
  }

  return cleanUnitTitle(title || unitTitle);
}

function isParserArtifactTopicTitle(value) {
  const text = collapseCompressedDuplicateTitle(value).toLowerCase();
  if (!text) return true;
  if (/^unit\s+unit$/.test(text)) return true;
  if (/^(?:english\s+)?student'?s book$/.test(text)) return true;
  if (/^ethiopian\s+grade\s+\d+\s*,?\s*english\s+student\s+book$/.test(text)) return true;
  if (/^unit\s+(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d+)$/.test(text)) return true;
  return false;
}

function countryAdjective(context) {
  const adjectives = {
    ETH: 'Ethiopian',
    KEN: 'Kenyan',
    RWA: 'Rwandan',
    UGA: 'Ugandan',
    TZA: 'Tanzanian'
  };
  return adjectives[context.country] || context.name;
}

function countryExamplePhrase(context) {
  const adjective = countryAdjective(context);
  const article = /^[AEIO]/.test(adjective) ? 'an' : 'a';
  return `${article} ${adjective}`;
}

function keyVocabularyForSubject(subjectTitle, unitTitle) {
  const words = cleanText(unitTitle)
    .split(/\s+/)
    .map(word => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter(word => word.length > 3);
  const base = [unitTitle, ...words];
  const fallbackBySubject = {
    French: ['lire', 'écouter', 'parler', 'écrire', 'phrase', 'sens'],
    Kinyarwanda: ['gusoma', 'kumva', 'kuvuga', 'kwandika', 'interuro', 'igisobanuro'],
    Kiswahili: ['kusoma', 'kusikiliza', 'kuzungumza', 'kuandika', 'sentensi', 'maana'],
    English: ['read', 'listen', 'speak', 'write', 'sentence', 'meaning'],
    'English Language': ['read', 'listen', 'speak', 'write', 'sentence', 'meaning']
  };
  const genericFallback = subjectTitle.includes('Math') || subjectTitle === 'Hisabati'
    ? ['method', 'model', 'unit', 'answer', 'check']
    : subjectTitle.includes('Science') || ['Biology', 'Chemistry', 'Physics', 'Sayansi'].includes(subjectTitle)
      ? ['concept', 'observation', 'evidence', 'safety', 'conclusion']
      : ['idea', 'skill', 'example', 'practice', 'correction'];
  const fallback = fallbackBySubject[subjectTitle] || genericFallback;
  const terms = [...base, ...fallback]
    .map(term => subjectTitle === 'French' ? normalizeFrenchPhrase(term) : cleanText(term))
    .filter(Boolean)
    .filter(term => !['evidence', 'practice'].includes(term.toLowerCase()) || !['French', 'Kinyarwanda', 'Kiswahili'].includes(subjectTitle));
  return [...new Set(terms)].slice(0, 8);
}

function languageModeTitle(subjectTitle, modeKey) {
  const titles = {
    French: {
      reading: 'Lecture',
      vocabulary: 'Vocabulaire',
      speaking: 'Expression orale et écoute',
      grammar: 'Grammaire',
      writing: 'Écriture',
      comprehension: 'Compréhension',
      editing: 'Correction',
      fluency: 'Fluidité'
    },
    Kinyarwanda: {
      reading: 'Gusoma',
      vocabulary: 'Amagambo',
      speaking: 'Kuvuga no gutega amatwi',
      grammar: "Imiterere y'interuro",
      writing: 'Kwandika',
      comprehension: 'Kumva umwandiko',
      editing: 'Gukosora',
      fluency: 'Gusoma neza'
    },
    Kiswahili: {
      reading: 'Kusoma',
      vocabulary: 'Msamiati',
      speaking: 'Kuzungumza na kusikiliza',
      grammar: 'Sarufi',
      writing: 'Kuandika',
      comprehension: 'Ufahamu',
      editing: 'Kusahihisha',
      fluency: 'Ufasaha'
    }
  };
  return titles[subjectTitle]?.[modeKey] || null;
}

function localizedPageTitle(subjectTitle, unitTitle, kind, detail = '') {
  const defaultLabels = {
    title: 'Title Page',
    howTo: 'How To Use This Book',
    skills: 'Learning Skills In This Book',
    toc: 'Table Of Contents',
    opener: 'Lesson Opener',
    learn: 'Learn',
    example: 'Worked Example',
    learnExample: 'Learn And Example',
    activityPractice: 'Activity And Practice',
    vocabulary: 'Vocabulary And Study Skill',
    activity: 'Guided Activity',
    practice: 'Practice And Correction',
    challenge: 'Challenge And Remediation',
    outcome: 'Outcome Check',
    review: 'Review Clinic',
    glossary: 'Glossary',
    answerNotes: 'Answer And Teacher Notes',
    finalProject: 'Final Project'
  };
  const labels = {
    French: {
      title: 'Page de titre',
      howTo: 'Comment utiliser ce livre',
      skills: 'Compétences dans ce livre',
      toc: 'Table des matières',
      opener: 'Ouverture',
      learn: 'Leçon',
      example: 'Modèle',
      learnExample: 'Leçon et modèle',
      activityPractice: 'Activité et entraînement',
      vocabulary: 'Vocabulaire et méthode',
      activity: 'Activité guidée',
      practice: 'Entraînement et correction',
      challenge: 'Aide et défi',
      outcome: "Vérification de l'objectif",
      review: 'Révision',
      glossary: 'Glossaire',
      answerNotes: 'Réponses et notes',
      finalProject: 'Projet final'
    },
    Kinyarwanda: {
      title: "Urupapuro rw'umutwe",
      howTo: 'Uko ukoresha iki gitabo',
      skills: 'Ubumenyi buri muri iki gitabo',
      toc: 'Ibirimo',
      opener: 'Intangiriro',
      learn: 'Isomo',
      example: 'Urugero',
      learnExample: "Isomo n'urugero",
      activityPractice: "Igikorwa n'imyitozo",
      vocabulary: "Amagambo n'uburyo bwo kwiga",
      activity: 'Igikorwa kiyobowe',
      practice: "Imyitozo n'ikosora",
      challenge: "Ubufasha n'umukoro w'inyongera",
      outcome: "Isuzuma ry'intego",
      review: 'Isubiramo',
      glossary: 'Inkoranyamagambo',
      answerNotes: "Ibisubizo n'inama",
      finalProject: 'Umushinga usoza'
    }
  };
  const label = labels[subjectTitle]?.[kind] || defaultLabels[kind];
  if (!label) return detail ? `${unitTitle}: ${detail}` : unitTitle;
  if (['title', 'howTo', 'skills', 'toc', 'glossary', 'answerNotes', 'finalProject'].includes(kind)) return label;
  return `${unitTitle}: ${label}${detail ? ` ${detail}` : ''}`;
}

function fallbackOutcomeFor(subjectTitle, unitTitle) {
  const title = normalizeUnitTitleForSubject(subjectTitle, cleanUnitTitle(unitTitle)).toLowerCase();
  if (subjectTitle === 'Kinyarwanda') return `gusoma, kumva, kuvuga no kwandika ku nsanganyamatsiko ya ${title}`;
  if (subjectTitle === 'French') return `lire, comprendre, parler et écrire sur ${title}`;
  if (subjectTitle === 'Kiswahili') return `kusoma, kuelewa, kuzungumza na kuandika kuhusu ${title}`;
  if (subjectTitle === 'English' || subjectTitle === 'English Language') return `read, speak, listen, write, and edit clearly about ${title}`;
  if (subjectTitle.includes('Math') || subjectTitle === 'Hisabati') return `solve and explain problems about ${title}`;
  if (subjectTitle.includes('Science') || ['Biology', 'Chemistry', 'Physics', 'Sayansi'].includes(subjectTitle)) return `investigate and explain ${title} using evidence`;
  if (subjectTitle.includes('Creative') || subjectTitle.includes('Art') || subjectTitle.includes('Sports') || subjectTitle.includes('Michezo')) return `plan, practise, perform, or create work related to ${title}`;
  return `explain and apply ${title} in a real learning situation`;
}

function fallbackInquiryFor(subjectTitle, unitTitle) {
  const title = normalizeUnitTitleForSubject(subjectTitle, cleanUnitTitle(unitTitle)).toLowerCase();
  if (subjectTitle === 'English' || subjectTitle === 'English Language') return `What evidence, word choice, or sentence control does ${title} require?`;
  if (subjectTitle === 'French') return `Quels mots, phrases et details rendent ${title} clair?`;
  if (subjectTitle === 'Kinyarwanda') return `Ni ayahe magambo n'ingingo bituma ${title} isobanuka neza?`;
  if (subjectTitle === 'Kiswahili') return `Ni maneno na mifano gani hufanya ${title} ieleweke vizuri?`;
  if (subjectTitle.includes('Math') || subjectTitle === 'Hisabati') return `Which model, operation, units, and check fit ${title}?`;
  if (subjectTitle.includes('Science') || ['Biology', 'Chemistry', 'Physics', 'Sayansi'].includes(subjectTitle)) return `What evidence, diagram, safety rule, or data can explain ${title}?`;
  if (subjectTitle === 'ICT') return `Which steps, tools, output checks, and safety rules are needed for ${title}?`;
  if (subjectTitle.includes('Entrepreneurship')) return `Which customer need, resource, cost, risk, and improvement fit ${title}?`;
  if (subjectTitle.includes('Agriculture')) return `Which tools, steps, safety rules, and records are needed for ${title}?`;
  return `Which evidence, example, vocabulary, and correction make ${title} clear?`;
}

async function queryNormalizedCurriculum(client, country, curriculum, grade, subject) {
  const units = await client.query(
    `
      select cu.id as unit_id, cu.local_unit_type, cu.canonical_unit_type, cu.local_code,
             cu.title, cu.description, cu.sequence, cu.term, cu.suggested_periods,
             cu.official_status, cu.source_id,
             coalesce(
               jsonb_agg(distinct jsonb_build_object('id', clo.id, 'text', clo.statement, 'status', clo.official_status))
               filter (where clo.id is not null),
               '[]'::jsonb
             ) as outcomes,
             coalesce(
               jsonb_agg(distinct jsonb_build_object('id', ciq.id, 'text', ciq.question, 'status', ciq.status))
               filter (where ciq.id is not null),
               '[]'::jsonb
             ) as inquiry_questions,
             coalesce(
               jsonb_agg(distinct jsonb_build_object('id', cla.id, 'text', cla.activity, 'type', cla.activity_type))
               filter (where cla.id is not null),
               '[]'::jsonb
             ) as activities
      from curriculum_units cu
      join curriculum_grade_subjects cgs on cgs.id = cu.grade_subject_id
      join curriculum_frameworks cf on cf.id = cgs.framework_id
      join curriculum_grades cg on cg.id = cgs.grade_id
      join curriculum_subject_catalog csc on csc.id = cgs.subject_id
      left join curriculum_learning_outcomes clo on clo.unit_id = cu.id
      left join curriculum_inquiry_questions ciq on ciq.unit_id = cu.id
      left join curriculum_learning_activities cla on cla.unit_id = cu.id
      where cf.country_code = $1
        and cf.code = $2
        and lower(cg.local_name) = lower($3)
        and lower(csc.subject_name) = lower($4)
      group by cu.id
      order by cu.sequence nulls last, cu.local_code, cu.title
    `,
    [country, curriculum, grade, subject.db]
  );

  const sourceDocuments = await client.query(
    `
      select id, country_code, curriculum_code, grade_code, grade_local_level, local_level, subject,
             official_title, extraction_status, review_status, source_url_status, source_url, object_key, metadata
      from curriculum_source_documents
      where country_code = $1
        and curriculum_code = $2
        and (grade_local_level = $3 or local_level = $3 or grade_code = $4)
        and lower(subject) = lower($5)
        and coalesce(review_status, '') <> 'rejected'
        and subject <> '__SOURCE_INVENTORY__'
      order by official_title nulls last
    `,
    [country, curriculum, grade, gradeCode(grade), subject.db]
  );

  return { units: units.rows, sourceDocuments: sourceDocuments.rows };
}

function isNoiseCurriculumTitle(value) {
  const text = cleanText(value).toLowerCase();
  if (!text) return true;
  return [
    /^the united republic of/,
    /^jamhuri ya muungano/,
    /^federal democratic republic/,
    /^ministry\b/,
    /^national curriculum\b/,
    /^english for ethiopia\b/,
    /\bstudent'?s book\b/,
    /^unit\s*\d+\b.*\.{3,}\s*\d+$/,
    /^tanzania institute of education\b/,
    /^taasisi ya elimu tanzania\b/,
    /^list of\b/,
    /^orodha ya\b/,
    /^abbreviations?\b/,
    /^yaliyomo\b/,
    /^shukurani\b/,
    /\(c\)\s*\d{4}/,
    /^©/,
    /copyright/,
    /all rights reserved/,
    /syllabus for/,
    /^foreword\b/,
    /^acknowledg/,
    /^table of contents\b/,
    /^introduction\b/,
    /^utamisemi\b/,
    /^utambulisho\b/,
    /^resources\b/,
    /^assessment\b/,
    /^general objectives?\b/,
    /^specific objectives?\b/,
    /objectives? of (?:primary|secondary|basic) education/,
    /^rwanda competence based curriculum/,
    /^rwanda basic education board/,
    /unesco education strategy/,
    /^to meet these requirements\b/,
    /^uganda curriculum\b/,
    /^the new curriculum\b/,
    /^new curriculum\b/,
    /tanzania basic and secondary education curriculum/,
    /^mtalaa mpya\b/,
    /^stadi za msingi\b/,
    /^badiliko kuu katika mtalaa mpya\b/,
    /^stadi\. fasili sawa\b/,
    /^the review is based\b/,
    /advocates for a\b/,
    /^the national language$/,
    /^na utunzaji endelevu\b/,
    /^\d+(?:\.\d+)*\s*(?:introduction|utambulisho|objectives?|malengo)\b/
  ].some(pattern => pattern.test(text));
}

function isLearnerFacingTopicTitle(value) {
  const text = cleanUnitTitle(value);
  if (isNoiseCurriculumTitle(text)) return false;
  if (isParserArtifactTopicTitle(text)) return false;
  if (text.length < 4 || text.length > 110) return false;
  if (/^(?:topic|unit|chapter|page|lesson)\s*\d*$/i.test(text)) return false;
  if (/^(?:unit|topic|chapter)\s+(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d+)\s*$/i.test(text)) return false;
  if (/\|/.test(text)) return false;
  if (/^(?:and|or|of|to|with|in|for|the|a|an)\b/i.test(text)) return false;
  if (/\b(?:curriculum|syllabus|contents|copyright|foreword|acknowledg|introduction|student'?s book|isbn|ministry of education)\b/i.test(text)) return false;
  if (/^[().,;:\-\s\d]+$/.test(text)) return false;
  return /[\p{L}]/u.test(text);
}

function canonicalTopicKey(value) {
  return cleanUnitTitle(value)
    .replace(/^(?:unit|topic|chapter)\s*\d+\s*/i, '')
    .replace(/\bunit\s*\d+\b/ig, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function dedupeLegacyRows(rows) {
  const seen = new Set();
  return rows.filter(row => {
    const key = canonicalTopicKey(row.sub_strand_title);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function legacyRowsFromUnits(units, subject) {
  return units.map((unit, index) => {
    const fallbackTitle = `${subject.title} Topic ${index + 1}`;
    const title = cleanText(unit.title).match(/^Extracted page/i)
      ? cleanUnitTitle(usefulLineFrom(unit.description, fallbackTitle))
      : cleanUnitTitle(unit.title || fallbackTitle);
    const outcomes = (unit.outcomes || [])
      .map((outcome, outcomeIndex) => ({
        id: outcome.id || `${unit.unit_id}-outcome-${outcomeIndex + 1}`,
        text: sanitizeOutcome(outcome.text, fallbackOutcomeFor(subject.title, title))
      }))
      .filter(outcome => outcome.text);
    return {
      strand_id: unit.unit_id,
      strand_number: unit.local_code || String(index + 1),
      strand_title: title,
      strand_position: unit.sequence ?? index + 1,
      sub_strand_id: unit.unit_id,
      sub_strand_number: unit.local_code || String(index + 1),
      sub_strand_title: title,
      description: cleanText(unit.description).slice(0, 900),
      sub_strand_position: unit.sequence ?? index + 1,
      outcomes: outcomes.length ? outcomes : [{ id: `${unit.unit_id}-outcome-1`, text: fallbackOutcomeFor(subject.title, title) }],
      inquiry_questions: unit.inquiry_questions?.length
        ? unit.inquiry_questions.map((question, questionIndex) => ({ id: question.id || `${unit.unit_id}-question-${questionIndex + 1}`, text: cleanText(question.text) }))
        : [{ id: `${unit.unit_id}-question-1`, text: fallbackInquiryFor(subject.title, title) }],
      activities: unit.activities || [],
      db_pages: []
    };
  }).filter(row => isLearnerFacingTopicTitle(row.sub_strand_title));
}

function gradeFallbackTopicTitles(subjectTitle, grade) {
  const stage = gradeStageKey(grade);
  const title = String(subjectTitle || '');
  const maps = [];

  if (title.includes('Math') || title === 'Hisabati' || title === 'Core Mathematics' || title === 'Subsidiary Mathematics') {
    maps.push({
      P4: ['Whole Numbers And Place Value', 'Addition And Subtraction In Daily Life', 'Multiplication And Division Facts', 'Fractions As Equal Parts', 'Money And Simple Buying', 'Time And Timetables', 'Length Mass And Capacity', 'Shapes Data And Review'],
      P5: ['Large Numbers And Estimation', 'Operations With Multi-Step Problems', 'Fractions And Decimals', 'Percentages In Everyday Situations', 'Angles Lines And Plane Shapes', 'Area Perimeter And Volume Models', 'Tables Graphs And Data', 'Problem Solving Project'],
      P6: ['Integers And Number Patterns', 'Fractions Decimals Percentages And Ratios', 'Algebraic Thinking And Missing Values', 'Geometry Constructions And Symmetry', 'Measurement Area Volume And Capacity', 'Data Handling And Probability', 'Money Rate Time And Scale', 'Primary Mathematics Transition Review'],
      S1: ['Numbers Sets And Place Value', 'Fractions Decimals Percentages And Ratios', 'Algebraic Expressions And Linear Equations', 'Geometry Lines Angles And Polygons', 'Mensuration Of Plane Figures', 'Statistics Tables And Graphs', 'Commercial Arithmetic Basics', 'Form I Mathematics Project'],
      S2: ['Indices Standard Form And Number Patterns', 'Direct And Inverse Proportion', 'Linear Equations And Inequalities', 'Graphs And Coordinate Geometry', 'Similarity Congruence And Geometric Proof', 'Trigonometry Basics', 'Probability And Statistics', 'Form II Applied Revision'],
      S3: ['Quadratic Expressions And Equations', 'Simultaneous Equations And Word Problems', 'Circle Geometry And Constructions', 'Vectors And Transformations', 'Advanced Trigonometry Applications', 'Mensuration Of Solids', 'Data Analysis And Probability', 'Form III Extended Problem Solving'],
      S4: ['Functions Relations And Graphs', 'Matrices And Transformations', 'Linear Programming And Inequalities', 'Trigonometry And Bearing Problems', 'Mensuration And Similarity Review', 'Statistics And Probability For Decisions', 'Commercial Mathematics And Rates', 'Form IV Examination Practice Project']
    });
  }

  if (['English', 'English Language'].includes(title)) {
    maps.push({
      P4: ['Reading Short Stories For Meaning', 'Vocabulary From Home School And Community', 'Speaking Clearly In Pairs', 'Sentence Grammar And Punctuation', 'Writing Short Paragraphs', 'Listening For Main Ideas', 'Editing Simple Work', 'English Language Project'],
      P5: ['Reading Longer Passages', 'Vocabulary And Word Families', 'Speaking With Reasons And Examples', 'Grammar Tenses And Sentence Variety', 'Paragraph Planning And Writing', 'Comprehension With Evidence', 'Editing For Accuracy', 'English Presentation Project'],
      P6: ['Reading To Infer Meaning', 'Vocabulary In Context And Dictionary Skills', 'Discussion Debate And Listening', 'Grammar Revision And Complex Sentences', 'Summary And Functional Writing', 'Comprehension With Text Evidence', 'Editing And Peer Review', 'Upper Primary English Portfolio'],
      S1: ['Reading Narratives And Informational Texts', 'Vocabulary In Context', 'Listening And Speaking For School Tasks', 'Grammar Sentence Control And Tenses', 'Paragraph And Friendly Letter Writing', 'Introduction To Literature', 'Editing And Presentation', 'Form I English Portfolio'],
      S2: ['Reading For Inference And Purpose', 'Vocabulary Word Formation And Meaning', 'Oral Presentation And Active Listening', 'Grammar Clauses And Connectors', 'Descriptive And Narrative Writing', 'Poetry Prose And Drama Response', 'Summary Writing And Editing', 'Form II Language Project'],
      S3: ['Critical Reading And Text Analysis', 'Vocabulary Register And Tone', 'Debate Discussion And Interview Skills', 'Grammar For Accurate Expression', 'Argumentative And Report Writing', 'Literature Themes Character And Setting', 'Summary And Note Making', 'Form III English Portfolio'],
      S4: ['Examination Reading Strategies', 'Vocabulary Precision And Style', 'Formal Speech And Listening Tasks', 'Grammar Revision For Accuracy', 'Essay Functional And Creative Writing', 'Literature Evidence And Interpretation', 'Editing Proofreading And Final Drafts', 'Form IV English Revision Project']
    });
  }

  if (title === 'Kiswahili') {
    maps.push({
      P4: ['Kusoma Hadithi Fupi Kwa Ufahamu', 'Msamiati Wa Nyumbani Shuleni Na Jamii', 'Kusikiliza Na Kuzungumza Kwa Adabu', 'Sarufi Ya Sentensi Rahisi', 'Kuandika Aya Fupi', 'Matamshi Na Mazungumzo', 'Kusahihisha Kazi Rahisi', 'Mradi Wa Kiswahili'],
      P5: ['Kusoma Matini Ndefu', 'Msamiati Na Methali Rahisi', 'Kuwasilisha Maoni Kwa Sababu', 'Sarufi Nyakati Na Viunganishi', 'Kuandika Insha Fupi', 'Ufahamu Na Ushahidi Wa Matini', 'Kuhariri Kwa Usahihi', 'Mradi Wa Uwasilishaji'],
      P6: ['Kusoma Kwa Uchanganuzi', 'Msamiati Katika Muktadha', 'Majadiliano Na Midahalo', 'Sarufi Na Ujenzi Wa Sentensi', 'Muhtasari Na Uandishi Wa Kazi', 'Fasihi Simulizi Na Maadili', 'Uhariri Na Mapitio', 'Mradi Wa Mwisho Wa Msingi'],
      S1: ['Ufahamu Wa Hadithi Na Makala', 'Msamiati Na Matumizi Ya Lugha', 'Kusikiliza Na Kujieleza', 'Sarufi Ya Nomino Vitenzi Na Vivumishi', 'Uandishi Wa Aya Na Barua', 'Fasihi Simulizi', 'Usahihishaji Na Uwasilishaji', 'Mradi Wa Kidato Cha Kwanza'],
      S2: ['Ufahamu Wa Matini Changamano', 'Nahau Methali Na Misemo', 'Mazungumzo Hotuba Na Usikilizaji', 'Sarufi Ya Sentensi Na Viambishi', 'Uandishi Wa Insha Na Taarifa', 'Ushairi Na Hadithi Fupi', 'Muhtasari Na Uhariri', 'Mradi Wa Kidato Cha Pili'],
      S3: ['Uchambuzi Wa Matini Na Hoja', 'Msamiati Rejesta Na Mtindo', 'Mdahalo Mahojiano Na Uwasilishaji', 'Sarufi Kwa Ufasaha', 'Uandishi Wa Hoja Ripoti Na Barua Rasmi', 'Tamthilia Riwaya Na Ushairi', 'Muhtasari Na Nukuu', 'Mradi Wa Kidato Cha Tatu'],
      S4: ['Mikakati Ya Ufahamu Wa Mtihani', 'Usahihi Wa Lugha Na Mtindo', 'Hotuba Rasmi Na Mawasiliano', 'Marudio Ya Sarufi', 'Uandishi Wa Insha Na Kazi Rasmi', 'Uhakiki Wa Fasihi Kwa Ushahidi', 'Uhariri Wa Rasimu Ya Mwisho', 'Mradi Wa Marudio Kidato Cha Nne']
    });
  }

  if (title === 'Biology') {
    maps.push({
      S1: ['Biology As A Science And Laboratory Safety', 'Cells Structure And Microscopes', 'Classification Of Living Things', 'Nutrition In Plants And Animals', 'Respiration And Gas Exchange Basics', 'Movement Support And Coordination', 'Health Hygiene And Disease Prevention', 'Form I Biology Investigation'],
      S2: ['Transport In Plants And Animals', 'Reproduction In Flowering Plants', 'Human Reproduction And Puberty', 'Growth Development And Nutrition', 'Respiration Photosynthesis And Energy Flow', 'Excretion And Homeostasis Basics', 'Ecology And Conservation', 'Form II Biology Project'],
      S3: ['Coordination And Response', 'Genetics Heredity And Variation', 'Evolution And Adaptation', 'Microorganisms And Biotechnology Basics', 'Plant And Animal Physiology', 'Ecology Populations And Ecosystems', 'Human Health And Immunity', 'Form III Biology Fieldwork'],
      S4: ['Cell Biology Revision And Applications', 'Genetics Problems And Biotechnology', 'Evolution Evidence And Classification', 'Ecology Human Impact And Conservation', 'Reproductive Health And Responsible Decisions', 'Disease Prevention And Public Health', 'Experimental Design And Data', 'Form IV Biology Examination Project']
    });
  }

  if (title === 'Chemistry') {
    maps.push({
      S1: ['Chemistry Laboratory Safety And Apparatus', 'Matter Elements Compounds And Mixtures', 'Air Oxygen And Combustion', 'Water Solutions And Separation Methods', 'Acids Bases And Indicators', 'Metals Non-Metals And Simple Reactions', 'Chemical Symbols Formulae And Equations', 'Form I Chemistry Investigation'],
      S2: ['Atomic Structure And Periodic Patterns', 'Chemical Bonding And Properties', 'Mole Concept And Simple Calculations', 'Acids Bases Salts And Neutralisation', 'Oxidation Reduction And Reactivity Series', 'Electrolysis And Applications', 'Organic Chemistry Introduction', 'Form II Chemistry Project'],
      S3: ['Quantitative Chemistry And Stoichiometry', 'Gas Laws And Molar Volume', 'Chemical Energetics And Reaction Rates', 'Equilibrium And Reversible Reactions', 'Organic Families And Functional Groups', 'Industrial Chemistry And Environment', 'Qualitative Analysis', 'Form III Chemistry Practical Review'],
      S4: ['Advanced Mole Calculations', 'Electrochemistry And Redox Applications', 'Organic Chemistry Reactions And Uses', 'Chemical Kinetics And Equilibrium Review', 'Environmental Chemistry And Safety', 'Qualitative Analysis And Practical Skills', 'Data Interpretation In Chemistry', 'Form IV Chemistry Examination Project']
    });
  }

  if (title === 'Physics') {
    maps.push({
      S1: ['Measurement Units And Laboratory Safety', 'Forces Density And Pressure', 'Work Energy And Power Basics', 'Simple Machines And Efficiency', 'Heat Temperature And Expansion', 'Light Reflection And Shadows', 'Magnetism And Simple Circuits', 'Form I Physics Investigation'],
      S2: ['Linear Motion And Graphs', 'Newton Laws And Forces', 'Moments Centre Of Gravity And Stability', 'Waves Sound And Vibrations', 'Electricity Current Voltage And Resistance', 'Lenses Mirrors And Optical Instruments', 'Thermal Energy Transfer', 'Form II Physics Project'],
      S3: ['Current Electricity And Circuit Analysis', 'Electromagnetism And Motors', 'Electronics And Semiconductors Basics', 'Pressure Fluids And Hydraulics', 'Circular Motion And Gravitation Basics', 'Radioactivity And Nuclear Safety', 'Measurement Errors And Data', 'Form III Physics Practical Review'],
      S4: ['Mechanics Momentum And Energy Review', 'Waves Optics And Communication', 'Electricity Magnetism And Applications', 'Heat Thermodynamics And Matter', 'Modern Physics And Radiation Safety', 'Practical Skills And Graph Analysis', 'Physics In Technology And Society', 'Form IV Physics Examination Project']
    });
  }

  if (title.includes('Science') || title === 'Sayansi') {
    maps.push({
      P4: ['Living Things Plants And Animals', 'Water Air And Weather', 'Food Health And Hygiene', 'Materials And Their Uses', 'Forces Movement And Simple Tools', 'Light Sound And Heat Around Us', 'Environment Care And Safety', 'Primary Science Project'],
      P5: ['Human Body Systems And Health', 'Plants Growth And Reproduction', 'Soil Water And Agriculture', 'Energy Electricity And Magnetism', 'Matter Mixtures And Changes', 'Weather Climate And Environment', 'Technology Design And Simple Machines', 'Science Investigation Review'],
      P6: ['Cells Body Systems And Reproductive Health', 'Microorganisms Disease And Prevention', 'Forces Energy And Machines', 'Electricity Circuits And Safe Use', 'Earth Materials Weather And Conservation', 'Food Chains Ecosystems And Human Impact', 'Technology Models And Data', 'Upper Primary Science Transition Project']
    });
  }

  if (title.includes('Geography') || title.includes('Jiografia')) {
    maps.push({
      P4: ['Map Skills And Directions', 'Weather Seasons And Daily Records', 'Landforms Water And Natural Resources', 'People Settlement And Services', 'Transport Communication And Trade', 'Environment Care At School And Home', 'Fieldwork Observation And Drawing', 'Geography Project'],
      P5: ['Reading Maps And Simple Scales', 'Climate And Natural Vegetation', 'Rivers Lakes Mountains And Plains', 'Population And Community Services', 'Farming Mining Fishing And Tourism', 'Environmental Problems And Solutions', 'Collecting And Presenting Field Data', 'Geography Review Project'],
      P6: ['Advanced Map Skills And Location', 'Weather Climate And Climate Change', 'East African Landforms And Resources', 'Population Settlement And Migration', 'Economic Activities And Infrastructure', 'Conservation Disaster Risk And Safety', 'Fieldwork Data And Reports', 'Upper Primary Geography Project'],
      S1: ['Earth As A Planet And Solar System', 'Weather Climate And Recording Instruments', 'Map Reading Scale And Direction', 'Major Landforms And Water Bodies', 'Environment Resources And Conservation', 'Population Settlement And Services', 'Fieldwork Methods', 'Form I Geography Project'],
      S2: ['Climate Regions And Natural Vegetation', 'Soil Water And Land Use', 'Agriculture Mining Fishing And Tourism', 'Transport Trade And Communication', 'Population Growth And Migration', 'Environmental Hazards And Management', 'Map Interpretation And Data', 'Form II Geography Project'],
      S3: ['Africa Physical Geography', 'Tanzania And East Africa Resources', 'Urbanisation Settlement And Planning', 'Economic Development And Regional Trade', 'Environmental Change And Sustainability', 'Research Methods In Geography', 'Map Work And Statistical Diagrams', 'Form III Geography Fieldwork'],
      S4: ['Advanced Map Reading And Survey Skills', 'Climate Change Disaster Risk And Adaptation', 'Population Development And Resources', 'Agriculture Industry And Trade Systems', 'Environmental Management Case Studies', 'Research Report Writing', 'Geography Revision With Data', 'Form IV Geography Examination Project']
    });
  }

  if (title.includes('History') || title.includes('Political Education') || title.includes('Historia') || title.includes('Social Studies')) {
    maps.push({
      P4: ['Family Community And Local History', 'Sources Stories And Timelines', 'Culture Heritage And Values', 'Leadership And Responsibilities', 'Rights Duties And Peaceful Living', 'Important Places And National Symbols', 'Reading Simple Historical Accounts', 'History And Values Project'],
      P5: ['Community Change Over Time', 'Historical Sources And Oral Tradition', 'Culture Unity And Identity', 'Leaders Governance And Participation', 'Rights Responsibilities And Conflict Resolution', 'Trade Migration And Settlement', 'Interpreting Timelines And Maps', 'Social Studies Project'],
      P6: ['Tanzania And East African History', 'Heritage Sites And Historical Evidence', 'Citizenship Constitution And Public Service', 'Colonial Rule And Resistance Basics', 'Independence National Unity And Development', 'Peace Human Rights And Responsibilities', 'Historical Inquiry And Reporting', 'Upper Primary History Project'],
      S1: ['Sources Of History And Time', 'Early Humans And Technology', 'Ancient Societies And Early States', 'Trade Migration And Cultural Exchange', 'African Kingdoms And Leadership', 'Citizenship Values And Community Duties', 'Using Historical Evidence', 'Form I History Project'],
      S2: ['African Societies Before Colonial Rule', 'Long Distance Trade And Contacts', 'Industrial Capitalism And Imperialism', 'Colonial Conquest And Administration', 'African Resistance And Collaboration', 'Social Economic Changes Under Colonialism', 'Historical Sources And Bias', 'Form II History Project'],
      S3: ['Nationalism And Liberation Movements', 'Independence And Nation Building', 'Post-Colonial Social And Economic Change', 'Democracy Governance And Human Rights', 'Regional Cooperation In East Africa', 'World Wars And Global Change', 'Interpreting Historical Arguments', 'Form III History Project'],
      S4: ['Contemporary Tanzania And Africa', 'Globalisation And Development', 'Conflict Peace And International Relations', 'Constitution Citizenship And Accountability', 'Economic Policies And Social Change', 'Historical Research And Source Evaluation', 'Revision Of Major Themes', 'Form IV History Examination Project']
    });
  }

  if (title.includes('Agriculture')) {
    maps.push({
      S1: ['Agriculture Meaning Importance And Safety', 'Soil Formation Properties And Conservation', 'Farm Tools Equipment And Maintenance', 'Crop Production Basics', 'Animal Care And Housing', 'Water Use And Irrigation Basics', 'Farm Records And School Garden Logs', 'Form I Agriculture Project'],
      S2: ['Soil Fertility Manure And Compost', 'Crop Propagation Planting And Spacing', 'Pests Diseases And Safe Control', 'Livestock Feeding Health And Welfare', 'Farm Structures And Storage', 'Agroforestry And Environmental Care', 'Simple Budgets And Records', 'Form II Agriculture Project'],
      S3: ['Advanced Crop Husbandry', 'Animal Breeding And Production Systems', 'Irrigation Drainage And Soil Water Management', 'Farm Power Tools And Machinery Safety', 'Post-Harvest Handling And Value Addition', 'Agribusiness Planning And Marketing', 'Sustainable Agriculture Practices', 'Form III Agriculture Enterprise'],
      S4: ['Farm Management And Decision Making', 'Agricultural Economics And Cooperatives', 'Crop And Livestock Production Review', 'Soil Water And Conservation Planning', 'Pest Disease And Biosecurity Review', 'Records Accounts And Profit Analysis', 'Agriculture Research And Extension', 'Form IV Agriculture Examination Project']
    });
  }

  if (title === 'Computer Science' || title === 'ICT') {
    maps.push({
      S1: ['Computer Systems Hardware And Software', 'Input Output Storage And Device Care', 'Operating Systems And File Management', 'Word Processing For School Work', 'Internet Safety And Responsible Use', 'Algorithms As Step-By-Step Instructions', 'Data Tables And Simple Charts', 'Form I Computing Project'],
      S2: ['Spreadsheets Formulae And Data Tables', 'Presentation Design And Communication', 'Databases Records And Queries Introduction', 'Networks Internet And Communication', 'Web Pages With HTML Basics', 'Problem Solving And Flowcharts', 'Digital Security And Privacy', 'Form II Computing Project'],
      S3: ['Programming Concepts Variables And Control', 'Algorithms Testing And Debugging', 'Database Design Tables And Relationships', 'Web Design HTML CSS And Multimedia', 'Computer Networks And Services', 'Cybersecurity Ethics And Law', 'Systems Analysis Basics', 'Form III Computing Portfolio'],
      S4: ['Advanced Programming And Data Structures Basics', 'Database Queries Reports And Integrity', 'Networking Administration And Troubleshooting', 'Web Applications And User Experience', 'Computer Architecture And Operating Systems', 'ICT In Society Business And Careers', 'Project Documentation And Testing', 'Form IV Computing Examination Project']
    });
  }

  if (title.includes('Entrepreneurship') || title === 'Business Studies') {
    maps.push({
      S1: ['Needs Wants Goods And Services', 'Business Environment And Opportunities', 'Production Resources And Specialisation', 'Trade Markets And Customers', 'Money Saving And Simple Records', 'Responsible Buying Selling And Ethics', 'Communication In Business', 'Form I Business Project'],
      S2: ['Entrepreneurship And Business Ideas', 'Banking Saving Credit And Insurance', 'Transport Communication And Distribution', 'Retail Wholesale And Customer Care', 'Cost Price Profit And Loss Basics', 'Business Risk And Problem Solving', 'Record Keeping And Stock Control', 'Form II Enterprise Project'],
      S3: ['Bookkeeping Source Documents And Ledgers', 'Marketing Product Price Place And Promotion', 'Business Finance Budgeting And Cash Flow', 'Business Ownership And Legal Responsibilities', 'Insurance Risk And Consumer Protection', 'Human Resources And Teamwork', 'Business Plan Writing', 'Form III Business Project'],
      S4: ['Final Accounts And Financial Statements', 'Taxation Public Finance And Responsibility', 'International Trade And Regional Markets', 'Business Management And Leadership', 'Entrepreneurship Innovation And Growth', 'Business Ethics Environment And Society', 'Revision With Business Case Studies', 'Form IV Business Examination Project']
    });
  }

  if (title.includes('Creative') || title.includes('Art') || title.includes('Sports') || title.includes('Sanaa') || title.includes('Michezo')) {
    maps.push({
      P4: ['Drawing Colour And Pattern', 'Music Rhythm And Singing', 'Drama Storytelling And Role Play', 'Craft Using Safe Local Materials', 'Movement Games And Teamwork', 'Health Safety And Fair Play', 'Creative Reflection And Practice', 'Arts And Sports Project'],
      P5: ['Design Elements And Composition', 'Traditional Songs Dances And Instruments', 'Drama Dialogue And Performance', 'Craft Construction And Decoration', 'Athletics Games And Body Control', 'Team Rules Safety And Respect', 'Review Practice And Improvement', 'Creative Performance Project'],
      P6: ['Art Design And Visual Communication', 'Music Dance And Cultural Expression', 'Drama Script And Stage Skills', 'Craft Technology And Product Quality', 'Sports Skills Fitness And Strategy', 'Leadership Safety And Inclusion', 'Portfolio Review And Feedback', 'Upper Primary Creative Project']
    });
  }

  for (const map of maps) {
    if (map[stage]) return map[stage];
  }
  return null;
}

function fallbackTopicTitlesForSubject(subjectTitle, grade) {
  const gradeSpecific = gradeFallbackTopicTitles(subjectTitle, grade);
  if (gradeSpecific) return gradeSpecific;
  if (subjectTitle.includes('Math') || subjectTitle === 'Hisabati') {
    return ['Number Sense And Place Value', 'Operations And Mental Methods', 'Fractions Decimals And Percentages', 'Algebra Patterns And Equations', 'Geometry And Measurement', 'Data Handling And Statistics', 'Money Time And Everyday Measures', 'Problem Solving And Revision'];
  }
  if (subjectTitle === 'ICT') {
    return ['Digital Safety And Device Care', 'Computer Systems And Input Devices', 'File And Folder Management', 'Word Processing For School Work', 'Spreadsheets And Data Tables', 'Internet Research And Communication', 'Problem Solving With Step-By-Step Instructions', 'Digital Project And Review'];
  }
  if (subjectTitle.includes('Science') || ['Biology', 'Chemistry', 'Physics', 'Sayansi'].includes(subjectTitle)) {
    return ['Scientific Investigation And Safety', 'Matter Materials And Their Uses', 'Living Things And Body Systems', 'Energy Forces And Motion', 'Earth Weather And Environment', 'Health Hygiene And Community Safety', 'Technology Design And Models', 'Science Project And Review'];
  }
  if (subjectTitle.includes('Geography')) {
    return ['Map Skills And Location', 'Weather Climate And Seasons', 'Landforms Water And Natural Resources', 'Population Settlement And Services', 'Transport Trade And Communication', 'Environment And Conservation', 'Fieldwork And Data Collection', 'Geography Project And Review'];
  }
  if (subjectTitle.includes('History') || subjectTitle.includes('Political Education')) {
    return ['Sources Timelines And Evidence', 'Family Community And Local History', 'Culture Heritage And Identity', 'Leadership Governance And Citizenship', 'Migration Trade And Change', 'Rights Responsibilities And Peace', 'Interpreting Historical Accounts', 'History Project And Review'];
  }
  if (subjectTitle.includes('Agriculture')) {
    return ['Soil Water And Garden Safety', 'Crop Production And Care', 'Animal Care And Welfare', 'Tools Equipment And Maintenance', 'Farm Records And Simple Budgets', 'Food Security And Storage', 'Agriculture And The Environment', 'School Agriculture Project'];
  }
  if (subjectTitle.includes('Entrepreneurship')) {
    return ['Needs Opportunities And Ideas', 'Customers Products And Services', 'Resources Costs And Pricing', 'Saving Budgeting And Records', 'Marketing Customer Care And Ethics', 'Risk Problem Solving And Improvement', 'Teamwork Communication And Leadership', 'Enterprise Project And Review'];
  }
  if (subjectTitle === 'Kiswahili') {
    return ['Kusikiliza Na Kuzungumza', 'Kusoma Kwa Ufahamu', 'Msamiati Katika Muktadha', 'Sarufi Ya Sentensi', 'Kuandika Aya Fupi', 'Mazungumzo Na Maigizo', 'Utamaduni Na Maadili', 'Mradi Wa Lugha Na Marudio'];
  }
  if (subjectTitle === 'French') {
    return ['Lecture Et Comprehension', 'Vocabulaire En Contexte', 'Expression Orale Et Ecoute', 'Grammaire De La Phrase', 'Ecriture Guidee', 'Dialogue Et Prononciation', 'Culture Et Communication', 'Projet De Langue Et Revision'];
  }
  if (subjectTitle === 'Kinyarwanda') {
    return ['Gusoma No Kumva Umwandiko', 'Amagambo Mu Nteruro', 'Kuvuga No Gutega Amatwi', "Imiterere Y'interuro", 'Kwandika Agace Kinyandiko', 'Ikiganiro Numuco', 'Gukosora No Kunoza', 'Umushinga Wururimi'];
  }
  if (subjectTitle === 'English' || subjectTitle === 'English Language') {
    return ['Reading For Meaning', 'Vocabulary In Context', 'Speaking And Listening', 'Grammar And Sentence Control', 'Paragraph Writing', 'Comprehension And Evidence', 'Editing And Presentation', 'Language Project And Review'];
  }
  return ['Key Ideas And Vocabulary', 'Worked Examples And Models', 'Guided Practice', 'Community Application', 'Evidence And Explanation', 'Problem Solving', 'Review And Correction', 'Final Project'];
}

function fallbackLegacyRowsForSubject(grade, subject) {
  return fallbackTopicTitlesForSubject(subject.title, grade).map((title, index) => {
    const id = `fallback-${gradeCode(grade).toLowerCase()}-${subject.slug}-${index + 1}`;
    return {
      strand_id: id,
      strand_number: String(index + 1),
      strand_title: title,
      strand_position: index + 1,
      sub_strand_id: id,
      sub_strand_number: String(index + 1),
      sub_strand_title: title,
      description: `Fallback topic used because local source extraction did not provide enough clean learner-facing curriculum units for ${grade} ${subject.title}.`,
      sub_strand_position: index + 1,
      outcomes: [{ id: `${id}-outcome-1`, text: fallbackOutcomeFor(subject.title, title) }],
      inquiry_questions: [{ id: `${id}-question-1`, text: fallbackInquiryFor(subject.title, title) }],
      activities: [],
      db_pages: []
    };
  });
}

function gradePatternFor(grade) {
  const code = gradeCode(grade);
  const match = code.match(/^([PS])(\d+)$/i);
  const numberWords = {
    1: 'One',
    2: 'Two',
    3: 'Three',
    4: 'Four',
    5: 'Five',
    6: 'Six',
    7: 'Seven',
    8: 'Eight',
    9: 'Nine',
    10: 'Ten',
    11: 'Eleven',
    12: 'Twelve'
  };
  if (match) {
    const prefix = match[1].toUpperCase();
    const number = match[2];
    if (prefix === 'P') return `(?:P\\.?\\s*${number}|Primary\\s+(?:${number}|${numberWords[number] || number}))`;
    return `(?:S\\.?\\s*${number}|Senior\\s+(?:${number}|${numberWords[number] || number})|Secondary\\s+(?:${number}|${numberWords[number] || number}))`;
  }
  const number = String(grade).match(/\d+/)?.[0];
  if (number) return `(?:Grade|G)\\s*${number}`;
  return String(grade).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
}

function unitHeadingRegexForGrade(grade) {
  return new RegExp(`\\b${gradePatternFor(grade)}\\b.{0,140}?\\bUnit\\s*-?\\s*(\\d+)\\s*(?:[-:]|\\b)\\s*(.+)$`, 'i');
}

const ANY_UNIT_HEADING_RE = /\b(?:(?:P|S)\.?\s*\d+|Primary\s+(?:\d+|One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve)|Senior\s+(?:\d+|One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve)|Secondary\s+(?:\d+|One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve))\b.{0,140}?\bUnit\s*-?\s*\d+\s*(?:[-:]|\.|\b)|^Unit\s*-?\s*\d+\s*(?:[-:]|\.|\b)/i;

function isStructuralSourceLine(line) {
  return /^## Page\b/i.test(line)
    || /^TOPIC AREA\b/i.test(line)
    || /^SUB-?TOPIC AREA\b/i.test(line)
    || /^Key unit competenc/i.test(line)
    || /^Learning objectives\b/i.test(line)
    || /^Content\b/i.test(line)
    || /^Knowledge\b/i.test(line)
    || /^understanding\b/i.test(line)
    || /^Skills\b/i.test(line)
    || /^Attitudes\b/i.test(line)
    || /^values\b/i.test(line);
}

function cleanUnitTitle(value) {
  return cleanText(value)
    .replace(/\bR[ée]vision\s+de\s+qu['’]on\s+a\s+vu\s+appris\b/i, "Révision de ce qu'on a appris")
    .replace(/\b(?:Number|No\.?|N[0o]\.?)\s*of\s*lessons?\s*:?.*$/i, '')
    .replace(/\b(?:Number|No\.?|N[0o]\.?)\s*lessons?\s*:?.*$/i, '')
    .replace(/\b(?:Number|No\.?)\s*of\s*periods?\s*:?.*$/i, '')
    .replace(/\bN[0o]\.?\s*of\s*periods?\s*:?.*$/i, '')
    .replace(/\bN[0o]\.?\s*periods?\s*:?.*$/i, '')
    .replace(/\bNo\.?\s*periods?\s*:?.*$/i, '')
    .replace(/\bNo\s+of\b.*$/i, '')
    .replace(/\bKey\s+(?:Topic|Unit)\s+Competenc(?:e|y)\s*:?.*$/i, '')
    .replace(/\bCompetenc(?:e|y)\s*:?.*$/i, '')
    .replace(/\b(?:General|Specific)\s+objectives?\s*:?.*$/i, '')
    .replace(/\bProject\s+Activity\s*:?.*$/i, '')
    .replace(/\bAssessment\s+criteria\s*:?.*$/i, '')
    .replace(/\bNombre\s+(?:de|des)\s+p[ée]riodes?\s*:?.*$/i, '')
    .replace(/\bUmubare\s+w.*$/i, '')
    .replace(/\bPeriods?\s*:?.*$/i, '')
    .replace(/^\s*[:;.,-]+\s*/g, '')
    .replace(/\s+[0-9]+\s*$/g, '')
    .replace(/[.:;\s]+$/g, '')
    .split(/\s+/)
    .slice(0, 16)
    .join(' ');
}

function extractUnitTitle(lines, index, match) {
  const parts = [match[2]];
  for (let offset = 1; offset <= 3; offset += 1) {
    const next = cleanText(lines[index + offset]);
    if (!next || isStructuralSourceLine(next) || ANY_UNIT_HEADING_RE.test(next) || isAnyLocalizedUnitHeading(next)) break;
    parts.push(next);
    if (/\b(?:number|no\.?)\s*of\s*periods?\b|\bperiods?\s*:|\bNombre\s+(?:de|des)\s+p[ée]riodes?\b|\bUmubare\s+w/i.test(next)) break;
  }
  return cleanUnitTitle(parts.join(' '));
}

function localizedUnitHeading(line, subjectTitle) {
  const text = cleanText(line);
  if (subjectTitle === 'Kinyarwanda') {
    const match = text.match(/^UMUTWE\s+WA\s+(\d+)\s*:?\s*(.*)$/i);
    if (match) return { unitNumber: match[1], titleSeed: match[2] };
  }
  if (subjectTitle === 'French') {
    const labels = {
      reading: 'Lecture',
      vocabulary: 'Vocabulaire',
      speaking: 'Expression orale et écoute',
      grammar: 'Grammaire',
      writing: 'Écriture',
      comprehension: 'Compréhension',
      editing: 'Correction',
      fluency: 'Fluidité'
    };
    const match = text.match(/(?:^|[\s📘])Unit[ée]\s+(\d+)\s*[:.]\s*(.+)$/i);
    if (match) return { unitNumber: match[1], titleSeed: match[2] };
    const contextMatch = text.match(/^Contexte\s+(\d+)\s*:\s*(.+)$/i);
    if (contextMatch) return { unitNumber: contextMatch[1], titleSeed: contextMatch[2] };
  }
  if (subjectTitle === 'Creative Art') {
    const match = text.match(/^Unit\s*-?\s*(\d+)\s*(?:[-:.]|\b)\s*(.+)$/i);
    if (match) return { unitNumber: match[1], titleSeed: match[2] };
  }
  if (/Subsidiary Mathematics LFK HLP HGL|General Studies and Communication Skills/i.test(subjectTitle)) {
    const match = text.match(/^Unit\s*-?\s*(\d+)\s*(?:[-:.]|\b)\s*(.+)$/i);
    if (match) return { unitNumber: match[1], titleSeed: match[2] };
  }
  return null;
}

function isAnyLocalizedUnitHeading(line) {
  return /^UMUTWE\s+WA\s+\d+/i.test(line) || /(?:^|[\s📘])Unit[ée]\s+\d+\s*[:.]/i.test(line) || /^Contexte\s+\d+\s*:/i.test(line) || /^Unit\s+\d+\s*[:.]/i.test(line);
}

function localizedHeadingAllowedForGrade(lines, index, grade, subjectTitle, localizedMatches) {
  if (subjectTitle === 'Kinyarwanda') {
    const lookback = lines.slice(Math.max(0, index - 8), index + 1).join(' ').toLowerCase();
    const code = gradeCode(grade);
    const gradeWord = code === 'P4' ? 'kane' : code === 'P5' ? 'gatanu' : code === 'P6' ? 'gatandatu' : '';
    return gradeWord ? lookback.includes(`umwaka wa ${gradeWord}`) : true;
  }
  if (subjectTitle === 'French') {
    const code = gradeCode(grade);
    const lookback = lines.slice(Math.max(0, index - 8), index + 1).join(' ').toLowerCase();
    if (/^S[123]$/.test(code)) {
      if (code === 'S1') return /1(?:ere|ère)|premi[eè]re/.test(lookback);
      if (code === 'S2') return /2(?:eme|ème)|deuxi[eè]me/.test(lookback);
      if (code === 'S3') return /3(?:eme|ème)|troisi[eè]me/.test(lookback);
    }
    const matchIndex = localizedMatches.length;
    if (/^P[456]$/.test(code)) return Math.floor(matchIndex / 9) === Number(code.slice(1)) - 4;
  }
  if (subjectTitle === 'Creative Art') {
    const code = gradeCode(grade);
    const number = code.match(/^P(\d+)$/)?.[1];
    const words = { 4: 'four', 5: 'five', 6: 'six' };
    const lookback = lines.slice(Math.max(0, index - 10), index + 1).join(' ').toLowerCase();
    return number ? new RegExp(`(?:grade\\s*:\\s*)?primary\\s+(?:${number}|${words[number]})\\b`).test(lookback) : false;
  }
  if (/Subsidiary Mathematics LFK HLP HGL|General Studies and Communication Skills/i.test(subjectTitle)) {
    const code = gradeCode(grade);
    const number = code.match(/^S(\d+)$/)?.[1];
    const words = { 4: 'four', 5: 'five', 6: 'six' };
    const lookback = lines.slice(Math.max(0, index - 12), index + 1).join(' ').toLowerCase();
    return number ? new RegExp(`\\b(?:s\\.?\\s*${number}|senior\\s+${number}|senior\\s+${words[number]})\\b`).test(lookback) : false;
  }
  return true;
}

function makeSyntheticUnitMatch(unitNumber, titleSeed) {
  return [null, unitNumber, titleSeed];
}

function extractKeyCompetency(sectionLines) {
  for (let i = 0; i < sectionLines.length; i += 1) {
    const line = cleanText(sectionLines[i]);
    const match = line.match(/^Key unit competenc(?:y|e)\s*:?\s*(.+)$/i);
    if (!match) continue;
    const parts = [match[1]];
    for (let offset = 1; offset <= 3; offset += 1) {
      const next = cleanText(sectionLines[i + offset]);
      if (!next || isStructuralSourceLine(next) || ANY_UNIT_HEADING_RE.test(next) || isAnyLocalizedUnitHeading(next)) break;
      parts.push(next);
    }
    return cleanText(parts.join(' ')).slice(0, 260);
  }
  return '';
}

function extractBulletObjectives(sectionLines) {
  const objectives = [];
  let current = '';
  let collecting = false;
  for (const rawLine of sectionLines) {
    const line = cleanText(rawLine);
    if (/^Learning objectives\b/i.test(line)) {
      collecting = true;
      continue;
    }
    if (!collecting) continue;
    if (ANY_UNIT_HEADING_RE.test(line) || isAnyLocalizedUnitHeading(line) || /^TOPIC AREA\b/i.test(line)) break;
    if (!line || isStructuralSourceLine(line) || /^(Learning activities|Contents?)\b/i.test(line)) continue;
    const bullet = line.match(/^[-]\s*(.+)$/);
    if (bullet) {
      if (current) objectives.push(cleanText(current));
      current = bullet[1];
    } else if (current && line.length <= 100) {
      current = `${current} ${line}`;
    }
    if (objectives.length >= 5) break;
  }
  if (current) objectives.push(cleanText(current));
  return objectives
    .map(item => item.replace(/\s+/g, ' ').trim())
    .filter(item => item.length >= 20 && item.length <= 220)
    .slice(0, 5);
}

function legacyRowsFromSourceMarkdowns(sourceMarkdowns, grade, subject) {
  const rows = [];
  const seen = new Set();
  const headingForGrade = unitHeadingRegexForGrade(grade);
  for (const markdown of sourceMarkdowns) {
    const lines = markdown.text.split(/\r?\n/).map(line => cleanText(line));
    let topicArea = '';
    let subTopicArea = '';
    const localizedMatches = [];
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (/^TOPIC AREA\s*:/i.test(line)) topicArea = cleanText(line.replace(/^TOPIC AREA\s*:\s*/i, ''));
      if (/^SUB-?TOPIC AREA\s*:/i.test(line)) subTopicArea = cleanText(line.replace(/^SUB-?TOPIC AREA\s*:\s*/i, ''));
      let match = line.match(headingForGrade);
      const localized = localizedUnitHeading(line, subject.title);
      if (!match && localized) {
        if (!localizedHeadingAllowedForGrade(lines, i, grade, subject.title, localizedMatches)) {
          localizedMatches.push(localized);
          continue;
        }
        localizedMatches.push(localized);
        match = makeSyntheticUnitMatch(localized.unitNumber, localized.titleSeed);
      }
      if (!match) continue;
      const unitNumber = match[1];
      const title = extractUnitTitle(lines, i, match);
      if (!isLearnerFacingTopicTitle(title)) continue;
      const dedupeKey = `${unitNumber}:${title.toLowerCase()}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      let end = lines.length;
      for (let j = i + 1; j < lines.length; j += 1) {
        if (ANY_UNIT_HEADING_RE.test(lines[j]) || isAnyLocalizedUnitHeading(lines[j])) {
          end = j;
          break;
        }
      }
      const sectionLines = lines.slice(i, end).filter(Boolean);
      const competency = extractKeyCompetency(sectionLines);
      const objectives = extractBulletObjectives(sectionLines);
      const outcomeTexts = [competency, ...objectives].filter(Boolean);
      const idPrefix = `${markdown.sourceDocumentId}-unit-${unitNumber}`;
      rows.push({
        strand_id: `${idPrefix}-strand`,
        strand_number: unitNumber,
        strand_title: topicArea || subject.title,
        strand_position: Number(unitNumber) || rows.length + 1,
        sub_strand_id: `${idPrefix}-topic`,
        sub_strand_number: unitNumber,
        sub_strand_title: title,
        description: sectionLines.slice(0, 60).join(' ').slice(0, 1600),
        sub_strand_position: Number(unitNumber) || rows.length + 1,
        outcomes: outcomeTexts.length
          ? outcomeTexts.map((text, index) => ({ id: `${idPrefix}-outcome-${index + 1}`, text: sanitizeOutcome(text, fallbackOutcomeFor(subject.title, title)) }))
          : [{ id: `${idPrefix}-outcome-1`, text: fallbackOutcomeFor(subject.title, title) }],
        inquiry_questions: [{ id: `${idPrefix}-question-1`, text: fallbackInquiryFor(subject.title, title) }],
        activities: [],
        topicArea,
        subTopicArea,
        sourceDocumentId: markdown.sourceDocumentId,
        sourceMarkdownPath: markdown.path,
        sourceSectionHash: stableHash(sectionLines.join('\n')),
        db_pages: []
      });
    }
  }
  return rows.sort((a, b) => a.sub_strand_position - b.sub_strand_position);
}

function subjectMethod(subjectTitle) {
  const methods = {
    Mathematics: 'Use objects, drawings, number sentences, and worked examples before independent practice.',
    'Core Mathematics': 'Use models, diagrams, algebra, graphs, and worked examples before independent practice.',
    Hisabati: 'Tumia vielelezo, michoro, sentensi za kihisabati, na mifano iliyofanyiwa kazi kabla ya mazoezi binafsi.',
    English: 'Read, speak, listen, write, and edit in connected language tasks.',
    'English Language': 'Read, speak, listen, write, and edit in connected language tasks.',
    Kiswahili: 'Soma, sikiliza, zungumza, andika, na tumia msamiati katika miktadha halisi.',
    Kinyarwanda: 'Soma, tega amatwi, vuga, andika, kandi ukoreshe amagambo mashya mu bikorwa by’itumanaho n’umuco.',
    French: 'Listen, speak, read, write, and revise short French responses with a clear purpose and audience.',
    'General Science': 'Observe, ask questions, test safely, record evidence, and explain findings.',
    'Science and Elementary Technology': 'Observe, ask questions, design safely, record evidence, and explain findings.',
    Sayansi: 'Chunguza, uliza maswali, jaribu kwa usalama, andika ushahidi, na eleza matokeo.',
    Biology: 'Use labelled diagrams, safe observations, evidence, and explanations about living things.',
    Chemistry: 'Use safe observations, simple models, data tables, and evidence-based explanations.',
    Physics: 'Use measurements, diagrams, models, and step-by-step reasoning about systems and forces.',
    Geography: 'Use maps, field observations, diagrams, and local examples.',
    'Geography and Environment': 'Use maps, field observations, diagrams, environmental evidence, and local examples.',
    'History and Political Education': 'Use timelines, sources, discussion, and citizenship examples.',
    'History and Citizenship': 'Use timelines, sources, discussion, heritage examples, and citizenship decisions.',
    History: 'Use timelines, sources, evidence, and careful explanation of cause, change, and consequence.',
    'Social Studies and Religious Education': 'Use community examples, maps, values, sources, and respectful discussion.',
    Agriculture: 'Learn through garden practice, observation logs, tool safety, and home projects.',
    ICT: 'Practise safe, useful digital skills and explain each step clearly.',
    'Computer Science': 'Practise safe computing, algorithms, data, systems thinking, and clear step-by-step explanations.',
    Entrepreneurship: 'Use real school, home, farm, and market examples to practise enterprise skills.'
  };
  return methods[subjectTitle] || 'Learn through examples, activities, practice, and reflection.';
}

function practicePrompt(subjectTitle, unitTitle, outcomeText, n) {
  if (subjectTitle.includes('Math') || subjectTitle === 'Hisabati') {
    return `${n}. Write a new ${unitTitle.toLowerCase()} question from a school, home, market, transport, farming, or measurement situation. Solve it with labelled steps and explain how the answer shows: ${outcomeText}.`;
  }
  if (['English', 'English Language', 'Kinyarwanda', 'French'].includes(subjectTitle)) {
    return `${n}. Write, say, or act out a short response showing that you can ${outcomeText}.`;
  }
  if (subjectTitle === 'Kiswahili') {
    return `${n}. Andika sentensi au aya fupi inayoonyesha: ${outcomeText}.`;
  }
  if (subjectTitle.includes('Science') || ['Biology', 'Chemistry', 'Physics', 'Sayansi'].includes(subjectTitle)) {
    return `${n}. Plan a safe observation or investigation to show: ${outcomeText}. Record what you would observe.`;
  }
  if (subjectTitle.includes('Geography') || subjectTitle.includes('History') || subjectTitle.includes('Social Studies')) {
    return `${n}. Use an example from your community or country to explain: ${outcomeText}.`;
  }
  if (subjectTitle === 'General Studies and Communication Skills') {
    return `${n}. Use a Rwanda case study for ${unitTitle}: ${outcomeText}. Name the issue, stakeholders, evidence, responsible action, and reflection.`;
  }
  if (subjectTitle === 'ICT') {
    return `${n}. Complete a small digital-skills task for ${unitTitle}: ${outcomeText}. Write the exact steps, safety rule, file or device choice, check result, and one correction.`;
  }
  if (subjectTitle.includes('Entrepreneurship')) {
    return `${n}. Use a school, home, farm, or market enterprise example for ${unitTitle}: ${outcomeText}. Name the customer need, resource, cost, action, risk, and improvement.`;
  }
  if (subjectTitle.includes('Agriculture')) return `${n}. Plan or complete a safe practical task that shows: ${outcomeText}. Name tools, steps, records, and safety checks.`;
  if (subjectTitle.includes('Creative') || subjectTitle.includes('Art') || subjectTitle.includes('Sports') || subjectTitle.includes('Michezo')) return `${n}. Plan, practise, or perform a safe creative or movement task that shows: ${outcomeText}. Explain the choices you made.`;
  return `${n}. Apply ${unitTitle} in a focused task: ${outcomeText}. Use a real example, clear vocabulary, evidence, correction, and one next step.`;
}

function localContextFor(context, subjectTitle, unitTitle) {
  const countryExample = countryExamplePhrase(context);
  const countryAdj = countryAdjective(context);
  if (subjectTitle.includes('Math') || subjectTitle === 'Hisabati') return `${countryExample} school, market, farming, building, transport, or data problem for ${unitTitle}`;
  if (subjectTitle.includes('Science') || subjectTitle === 'Sayansi' || ['Biology', 'Chemistry', 'Physics'].includes(subjectTitle)) return `a safe ${countryAdj} observation, model, data table, or investigation for ${unitTitle}`;
  if (subjectTitle === 'French') return `une activité de lecture, d'écoute, de parole ou d'écriture en ${context.name} pour ${unitTitle}`;
  if (subjectTitle === 'Kinyarwanda') return `igikorwa cyo gusoma, gutega amatwi, kuvuga cyangwa kwandika muri ${context.name} kuri ${unitTitle}`;
  if (isLanguageSubject(subjectTitle)) return `${countryExample} reading, speaking, listening, writing, or discussion task for ${unitTitle}`;
  if (subjectTitle.includes('Geography') || subjectTitle.includes('History') || subjectTitle.includes('Social Studies')) return `${countryExample} map, community, citizenship, culture, environment, or heritage example for ${unitTitle}`;
  if (subjectTitle.includes('Agriculture')) return `${countryExample} school garden, home garden, farm, livestock, soil, water, or food-security example for ${unitTitle}`;
  if (subjectTitle === 'ICT') return `${countryExample} school computer, phone, file, document, spreadsheet, network, or online-safety task for ${unitTitle}`;
  if (subjectTitle.includes('Entrepreneurship')) return `${countryExample} school club, home, farm, cooperative, shop, service, savings, or market example for ${unitTitle}`;
  if (subjectTitle.includes('Creative') || subjectTitle.includes('Art') || subjectTitle.includes('Sports') || subjectTitle.includes('Michezo')) return `a safe ${countryAdj} creative, performance, movement, craft, artwork, or teamwork activity for ${unitTitle}`;
  return `${countryExample} school, home, or community example for ${unitTitle}`;
}

function successCriteriaFor(subjectTitle) {
  if (subjectTitle.includes('Math') || subjectTitle === 'Hisabati') return ['method is clear', 'working is shown step by step', 'answer is checked in context'];
  if (subjectTitle.includes('Science') || ['Biology', 'Chemistry', 'Physics', 'Sayansi'].includes(subjectTitle)) return ['evidence is specific', 'safety is considered', 'conclusion uses the evidence'];
  if (subjectTitle === 'French') return ['le sens est clair', 'les mots du thème sont bien utilisés', 'l’orthographe, les accents, la grammaire et la ponctuation sont vérifiés'];
  if (subjectTitle === 'Kinyarwanda') return ['igisobanuro kirumvikana', 'amagambo y’isomo yakoreshejwe neza', 'imyandikire, utwatuzo n’imiterere y’interuro byasuzumwe'];
  if (isLanguageSubject(subjectTitle)) return ['meaning is clear', 'language choice fits the task', 'spelling, grammar, and structure are checked'];
  if (subjectTitle.includes('Agriculture')) return ['steps are practical', 'tools/materials are named', 'safety and care are included'];
  if (subjectTitle === 'ICT') return ['steps are exact', 'digital safety is included', 'output is saved, checked, or corrected'];
  if (subjectTitle.includes('Entrepreneurship')) return ['customer need is clear', 'costs or resources are realistic', 'risk and improvement are explained'];
  if (subjectTitle.includes('Creative') || subjectTitle.includes('Art') || subjectTitle.includes('Sports') || subjectTitle.includes('Michezo')) return ['idea is planned', 'skill is practised safely', 'creative or movement choices are explained'];
  return ['answer uses a real example', 'reasoning is clear', 'work is checked'];
}

function visualNeedsFor(subjectTitle, unitTitle) {
  if (subjectTitle.includes('Math') || subjectTitle === 'Hisabati') return ['worked-solution panel', 'table/chart/diagram'];
  if (subjectTitle.includes('Science') || ['Biology', 'Chemistry', 'Physics', 'Sayansi'].includes(subjectTitle)) return ['labelled diagram', 'investigation or data table'];
  if (isLanguageSubject(subjectTitle)) return ['reading passage card', 'writing or dialogue checklist'];
  if (subjectTitle.includes('Geography') || subjectTitle.includes('History') || subjectTitle.includes('Social Studies')) return ['map/timeline/community evidence card', 'fieldwork table'];
  if (subjectTitle.includes('Agriculture')) return ['tool/procedure diagram', 'observation log'];
  if (subjectTitle === 'ICT') return ['step-by-step screen or file-flow panel', 'digital safety checklist'];
  if (subjectTitle.includes('Entrepreneurship')) return ['enterprise planning table', 'cost-risk-improvement checklist'];
  return ['process panel', 'reflection checklist'];
}

function sourceRefsFromSnapshot(snapshot) {
  const documents = Array.isArray(snapshot.sourceDocuments) ? snapshot.sourceDocuments : [];
  if (!documents.length) {
    return [{
      type: 'source-snapshot',
      sourceSnapshotHash: snapshot.inputHash,
      country: snapshot.country,
      curriculum: snapshot.curriculum,
      grade: snapshot.grade,
      subject: snapshot.subject
    }];
  }
  return documents.map(doc => ({
    type: 'curriculum-source-document',
    sourceDocumentId: doc.id,
    officialTitle: doc.official_title,
    subject: doc.subject,
    extractionStatus: doc.extraction_status,
    reviewStatus: doc.review_status,
    sourceUrlStatus: doc.source_url_status,
    sourceUrl: doc.source_url,
    objectKey: doc.object_key,
    metadata: doc.metadata,
    sourceSnapshotHash: snapshot.inputHash
  }));
}

function generatedOutlineSourceRef(snapshot, row, unitTitle) {
  return [{
    type: 'generated-outline',
    reason: 'weak-or-incomplete-source-extraction',
    country: snapshot.country,
    curriculum: snapshot.curriculum,
    grade: snapshot.grade,
    subject: snapshot.subject,
    unitTitle,
    generatedTopicId: row.sub_strand_id,
    sourceSnapshotHash: snapshot.inputHash
  }];
}

function compactSourceRefs(sourceRefs) {
  return (sourceRefs || []).map(ref => ({
    type: ref.type,
    reason: ref.reason,
    sourceDocumentId: ref.sourceDocumentId,
    officialTitle: ref.officialTitle,
    sourceSnapshotHash: ref.sourceSnapshotHash,
    sourceMarkdownPath: ref.sourceMarkdownPath,
    sourceSectionHash: ref.sourceSectionHash,
    generatedTopicId: ref.generatedTopicId,
    unitTitle: ref.unitTitle
  }));
}

function visualRefsFor(topic, pageRole) {
  return (topic.visualNeeds || []).slice(0, 2).map((_, index) => `${topic.topicId}:${pageRole}:visual-${index + 1}:planned`);
}

function inferPageType(title) {
  const normalized = String(title || '').toLowerCase();
  if (normalized.includes('title page') || normalized.includes('how to use') || normalized.includes('learning skills') || normalized.includes('table of contents')) return 'front-matter';
  if (normalized.startsWith('chapter:')) return 'chapter-opener';
  if (normalized.includes('lesson opener')) return 'lesson-opener';
  if (normalized.includes('learn and example')) return 'learn-example';
  if (normalized.endsWith(': learn')) return 'explanation';
  if (normalized.includes('worked example')) return 'worked-example';
  if (normalized.includes('activity and practice')) return 'practice';
  if (normalized.includes('activity')) return 'activity';
  if (normalized.includes('outcome check')) return 'assessment';
  if (normalized.includes('review clinic') || normalized.includes('chapter review')) return 'review';
  if (normalized.includes('glossary')) return 'glossary';
  if (normalized.includes('answer')) return 'answer-notes';
  if (normalized.includes('final project')) return 'project';
  return 'lesson';
}

function makePage(bookId, index, title, content, refs = {}) {
  const normalizedTitle = cleanText(title);
  return {
    pageId: `${bookId}-p${String(index).padStart(3, '0')}`,
    title: normalizedTitle,
    content: content.trim(),
    pageType: refs.pageType || inferPageType(normalizedTitle),
    difficulty: refs.difficulty || 'core',
    estimatedMinutes: refs.estimatedMinutes || Math.max(5, Math.ceil(countWords(content) / 90)),
    wordCount: countWords(content),
    imageRefs: refs.imageRefs || [],
    ...refs
  };
}

function appPagesFor(pages) {
  return pages.map(page => {
    const { fullSourceRefs, sourceRefs, ...appPage } = page;
    return appPage;
  });
}

function targetPageCount(subjectTitle, unitCount) {
  const base = subjectTitle === 'English' || subjectTitle === 'Mathematics' ? 140 : 120;
  return Math.max(base, Math.min(190, 12 + unitCount * 10));
}

function buildBookPlan(snapshot, context, grade, subject) {
  const fallbackSourceRefs = sourceRefsFromSnapshot(snapshot);
  const topics = snapshot.legacy.map((row, index) => {
    const rawUnitTitle = cleanText(row.sub_strand_title || `${subject.title} Topic ${index + 1}`).split(/\s+/).slice(0, 14).join(' ');
    const unitTitle = normalizeUnitTitleForSubject(subject.title, rawUnitTitle);
    const learningOutcomes = (row.outcomes || []).map((outcome, outcomeIndex) => ({
      id: outcome.id || `${row.sub_strand_id}-outcome-${outcomeIndex + 1}`,
      text: sanitizeOutcome(outcome.text, fallbackOutcomeFor(subject.title, unitTitle))
    }));
    const isGeneratedFallbackTopic = String(row.sub_strand_id || row.strand_id || '').startsWith('fallback-');
    const topicSourceRefs = isGeneratedFallbackTopic
      ? generatedOutlineSourceRef(snapshot, row, unitTitle)
      : row.sourceDocumentId
      ? [{
          type: 'curriculum-source-section',
          sourceDocumentId: row.sourceDocumentId,
          officialTitle: snapshot.sourceDocuments.find(doc => doc.id === row.sourceDocumentId)?.official_title,
          sourceMarkdownPath: row.sourceMarkdownPath,
          sourceSectionHash: row.sourceSectionHash,
          sourceSnapshotHash: snapshot.inputHash
        }]
      : fallbackSourceRefs;
    return {
      topicId: `${context.country}-${gradeCode(grade)}-${subject.slug}-topic-${String(index + 1).padStart(3, '0')}`,
      grade,
      strandId: row.strand_id,
      subStrandId: row.sub_strand_id,
      parentSubStrandId: row.sub_strand_id,
      strandTitle: unitTitle,
      unitTitle,
      sourceUnitTitle: cleanText(row.sub_strand_title || unitTitle),
      learningOutcomes,
      inquiryQuestions: (row.inquiry_questions || []).map(question => cleanText(question.text)).filter(Boolean).slice(0, 3),
      prerequisites: [
        `Recall one school, home, or community example connected to ${unitTitle}.`,
        `Review key vocabulary from the previous ${subject.title} lesson.`
      ],
      keyVocabulary: keyVocabularyForSubject(subject.title, unitTitle),
      misconceptions: [`giving a general answer about ${unitTitle} without a clear example, method, or evidence`],
      localContext: localContextFor(context, subject.title, unitTitle),
      explanationSequence: [
        'Start with a concrete country or local situation.',
        'Name the important idea in learner-friendly words.',
        'Model one example slowly.',
        'Guide the learner through a similar task.',
        'Ask the learner to apply the idea independently.'
      ],
      practiceTypes: ['guided response', 'independent practice', 'home/community link', 'reflection and correction'],
      successCriteria: successCriteriaFor(subject.title),
      visualNeeds: visualNeedsFor(subject.title, unitTitle).map(item => ({ type: item, description: `${item} for ${unitTitle}`, status: 'deferred-until-cover-visual-phase' })),
      sourceRefs: topicSourceRefs,
      fullSourceRefs: topicSourceRefs,
      sourceDerivation: isGeneratedFallbackTopic ? 'generated-outline-fallback' : 'normalized-source'
    };
  });

  return {
    schemaVersion: 1,
    sourceType: 'normalized-curriculum',
    country: context.country,
    curriculum: context.curriculum,
    grade,
    subject: subject.title,
    generatedAt: snapshot.generatedAt,
    sourceSnapshotHash: snapshot.inputHash,
    writingStandard: {
      voice: 'simple, conversational, purposeful, age-appropriate, and learner-first',
      antiFluff: [
        'No generic filler introductions.',
        'Every page must explain, model, guide practice, assess, review, or support vocabulary.',
        'Every outcome must be covered by explanation, activity/example, and practice.'
      ],
      coversDeferred: true
    },
    sourceDerivation: {
      generatedFallbackTopicCount: topics.filter(topic => topic.sourceDerivation === 'generated-outline-fallback').length,
      normalizedSourceTopicCount: topics.filter(topic => topic.sourceDerivation !== 'generated-outline-fallback').length
    },
    strands: topics.map(topic => ({
      strandId: topic.strandId,
      number: '',
      title: topic.strandTitle,
      topicCount: 1
    })),
    topics
  };
}

function normalizedWorkedExample(context, subjectTitle, topic, grade) {
  const unit = topic.unitTitle;
  if (subjectTitle.includes('Math') || subjectTitle === 'Hisabati') {
    return mathWorkedExample(context, topic);
  }
  if (subjectTitle.includes('Science') || ['Biology', 'Chemistry', 'Physics', 'Sayansi'].includes(subjectTitle)) {
    return scienceWorkedExample(context, topic);
  }
  if (isLanguageSubject(subjectTitle)) {
    return languageWorkedExample(context, subjectTitle, topic);
  }
  if (subjectTitle === 'ICT') {
    return `Worked example for ${unit}: Organize a class assignment file safely.\n\n1. Task: create a folder named class-work on the school computer or approved device.\n2. Inside the folder, create a document called ${slugify(unit) || 'ict-task'}-notes.\n3. Type a clear heading and three short notes about the topic.\n4. Save the file, close it, reopen it, and check that the content is still there.\n5. Apply one safety rule: use only your own file, keep passwords private, and ask before using shared devices.\n\nAnswer check: the folder name is clear, the file opens correctly, and the learner can explain every step without guessing.`;
  }
  if (subjectTitle.includes('Entrepreneurship')) {
    return `Worked example for ${unit}: Plan a small school enterprise decision.\n\n1. Need: learners want affordable exercise-book covers before exams.\n2. Resource: one group can buy manila paper, reuse clean packaging, and borrow scissors under supervision.\n3. Cost: estimate material cost, selling price, and expected surplus before starting.\n4. Risk: covers may tear if material is weak, so the group tests one sample first.\n5. Improvement: ask two customers for feedback and change the design or price.\n\nAnswer check: a strong enterprise answer names the customer need, resource, cost, risk, action, and improvement.`;
  }
  if (subjectTitle.includes('Agriculture')) {
    return `Practical model for ${unit}: Complete the task safely.\n\n1. Purpose: state what the task should improve, such as soil, water use, growth, feeding, storage, or records.\n2. Materials: list exact safe tools and materials.\n3. Steps: do one step at a time under teacher or adult guidance where needed.\n4. Safety: name sharp tools, chemicals, animals, hygiene, or weather risks.\n5. Record: write date, condition observed, action taken, and result.\n\nQuality criteria: correct tools, safe handling, care for living things, and useful records.`;
  }
  return `Evidence model for ${unit}: Teach a real example clearly.\n\n1. Name the place, group, object, source, skill, or issue.\n2. Give two facts or observations from the lesson.\n3. Explain why the example matters in ${context.name}.\n4. Add one responsible action, improvement, or reflection.\n5. Check that your response uses the exact vocabulary from ${subjectTitle}.`;
}

function normalizedPracticeBlock(context, subjectTitle, topic, outcomes, compactMode) {
  const unit = topic.unitTitle;
  const criteria = topic.successCriteria.map(item => `- ${item}`).join('\n');
  if (subjectTitle.includes('Math') || subjectTitle === 'Hisabati') return mathPracticeBlock(context, topic, outcomes);
  if (subjectTitle.includes('Science') || ['Biology', 'Chemistry', 'Physics', 'Sayansi'].includes(subjectTitle)) return sciencePracticeBlock(context, topic, outcomes);
  if (isLanguageSubject(subjectTitle)) return languagePracticeBlock(context, subjectTitle, topic, outcomes);
  if (subjectTitle === 'ICT') {
    const prompts = outcomes.slice(0, compactMode ? 2 : 4).map((outcome, index) => practicePrompt(subjectTitle, unit, outcome.text, index + 1)).join('\n');
    return `Digital practice for ${unit}:\n\n${prompts || `1. Name the digital task.\n2. List the exact device, software, file, data, or safety steps.\n3. Complete a small output and check it.`}\n\nQuality checklist:\n${criteria}\n\nEvidence to show:\n- a clear file name, table, document, diagram, algorithm, screenshot description, or step list\n- one safety or privacy rule\n- one test or correction\n\nHome link: describe one safe digital habit someone at home or school should follow.`;
  }
  if (subjectTitle.includes('Entrepreneurship')) {
    const prompts = outcomes.slice(0, compactMode ? 2 : 4).map((outcome, index) => practicePrompt(subjectTitle, unit, outcome.text, index + 1)).join('\n');
    return `Enterprise practice for ${unit}:\n\n${prompts || `1. Choose one school, home, farm, service, or market need.\n2. Plan a small action that responds to the need.\n3. Check cost, risk, customer value, and improvement.`}\n\nQuality checklist:\n${criteria}\n\nEvidence to show:\n- customer or user need\n- resources and cost estimate\n- action steps\n- risk and responsible decision\n- improvement after feedback\n\nHome link: ask a trusted adult about one small enterprise decision and write what made it responsible.`;
  }
  const prompts = outcomes.slice(0, compactMode ? 2 : 4).map((outcome, index) => practicePrompt(subjectTitle, unit, outcome.text, index + 1)).join('\n');
  return `${compactMode ? `Activity for ${unit}: Review the worked example and apply the same routine to the tasks below.\n\n` : `Practice for ${unit}:\n\n`}${prompts || `1. Explain the main idea in ${unit}.\n2. Give one real example from ${context.name}.\n3. Check your answer against the success criteria.`}\n\nCorrection check:\n${criteria}\n\nReflection: What was clear? What needs more practice? What question will you ask your teacher or study partner?\n\nHome link: Ask someone at home for one safe example related to ${unit.toLowerCase()} and write two useful sentences about it.`;
}

function topicWords(topic) {
  return `${topic.unitTitle} ${(topic.learningOutcomes || []).map(outcome => outcome.text).join(' ')}`.toLowerCase();
}

function mathDomain(topic) {
  const title = String(topic.unitTitle || '').toLowerCase();
  const text = topicWords(topic);
  if (/direct proportion|proportion|ratio|rate/.test(title)) return 'proportion';
  if (/cuboid|cube|cylinder|solid|3d|three-dimensional|net/.test(title)) return 'solid-geometry';
  if (/circle|radius|diameter|circumference/.test(title)) return 'circle-geometry';
  if (/decimal/.test(title)) return 'decimals';
  if (/fraction/.test(title)) return 'fractions';
  if (/mass|weight/.test(title)) return 'mass';
  if (/capacity|litre|liquid/.test(title)) return 'capacity';
  if (/length|perimeter/.test(title)) return 'length';
  if (/area|land/.test(title)) return 'area';
  if (/\btime\b|clock|calendar|duration/.test(title)) return 'time';
  if (/pattern|sequence/.test(title)) return 'patterns';
  if (/missing number|unknown/.test(title)) return 'missing-numbers';
  if (/shape|plane|2d|triangle|rectangle|quadrilateral/.test(title)) return 'shapes';
  if (/line|angle/.test(title)) return 'lines-angles';
  if (/data|table|bar chart|statistics/.test(title)) return 'data';
  if (/chance|probability|likely/.test(title)) return 'chance';
  if (/multiple|factor|prime|classifying numbers|types of numbers/.test(title)) return 'factors';
  if (/integer|positive and negative/.test(title)) return 'integers';
  if (/whole number|100,?000|addition|subtraction|multiplication|division|operations? on whole/.test(title)) return 'whole-numbers';
  if (/integer|positive and negative/.test(text)) return 'integers';
  if (/direct proportion|proportion|ratio|rate/.test(text)) return 'proportion';
  if (/cuboid|cube|cylinder|solid|3d|three-dimensional|net/.test(text)) return 'solid-geometry';
  if (/circle|radius|diameter|circumference/.test(text)) return 'circle-geometry';
  if (/multiple|factor|prime|classifying numbers|types of numbers/.test(text)) return 'factors';
  if (/fraction|denominator|numerator/.test(text)) return 'fractions';
  if (/decimal|place values? up to/.test(text)) return 'decimals';
  if (/length|metre|kilometre|centimetre/.test(text)) return 'length';
  if (/capacity|litre|liquid container/.test(text)) return 'capacity';
  if (/mass|kilogram|gram|weigh/.test(text)) return 'mass';
  if (/area|land|square unit/.test(text)) return 'area';
  if (/\btime\b|clock|hours?|minutes?|calendar/.test(text)) return 'time';
  if (/pattern|sequence/.test(text)) return 'patterns';
  if (/missing number|unknown/.test(text)) return 'missing-numbers';
  if (/line|angle/.test(text)) return 'lines-angles';
  if (/shape|plane|2d|triangle|rectangle/.test(text)) return 'shapes';
  if (/data|table|bar chart|statistics/.test(text)) return 'data';
  if (/chance|probability|likely/.test(text)) return 'chance';
  if (/trigonom/.test(text)) return 'trigonometry';
  if (/matrix|matrices|determinant/.test(text)) return 'matrices';
  if (/differentiation|integration|limit|function/.test(text)) return 'calculus';
  if (/vector/.test(text)) return 'vectors';
  if (/equation|inequal|algebra/.test(text)) return 'algebra';
  if (/whole number|place value|100,?000|addition|subtraction|multiplication|division|operations? on whole/.test(text)) return 'whole-numbers';
  return 'general-math';
}

function mathConceptLesson(context, topic, vocabulary) {
  const unit = topic.unitTitle;
  const domain = mathDomain(topic);
  const lessons = {
    'whole-numbers': `${unit} teaches you to read, write, compare, and calculate with large whole numbers.\n\nCore idea:\n- A digit has value because of its position: ones, tens, hundreds, thousands, ten-thousands, and hundred-thousands.\n- Compare numbers from left to right, starting with the greatest place value.\n- For addition and subtraction, align place values before calculating.\n- For multiplication or division, check whether the answer should be bigger or smaller than the starting number.\n\n${context.name} example: class enrolment, harvest records, market stock, and school budget totals can all use whole-number operations.\n\nKey words:\n${vocabulary}`,
    integers: `${unit} teaches numbers below, at, and above zero.\n\nCore idea:\n- Positive numbers are greater than zero.\n- Negative numbers are less than zero.\n- Zero is the turning point.\n- A number line helps you compare and order integers.\n\n${context.name} example: temperature changes, money owed, points gained or lost in a game, and height above or below a reference point can use integers.\n\nKey words:\n${vocabulary}`,
    factors: `${unit} helps you break numbers into useful groups.\n\nCore idea:\n- A factor divides a number exactly.\n- A multiple is made by multiplying a number by 1, 2, 3, and so on.\n- Prime numbers have exactly two factors: 1 and the number itself.\n- Classification is easier when you test divisibility carefully.\n\nKey words:\n${vocabulary}`,
    fractions: `${unit} teaches how parts of a whole are named and combined.\n\nCore idea:\n- The denominator tells how many equal parts make one whole.\n- The numerator tells how many of those parts are being used.\n- Fractions with the same denominator can be added or subtracted by working with the numerators.\n- The denominator stays the same because the size of the parts has not changed.\n\nKey words:\n${vocabulary}`,
    decimals: `${unit} teaches another way to write parts of a whole using place value.\n\nCore idea:\n- The first digit after the decimal point shows tenths.\n- The second digit shows hundredths.\n- Decimal numbers are compared from left to right, just like whole numbers.\n- Money and measurements often use decimals.\n\nKey words:\n${vocabulary}`,
    length: `${unit} teaches how to measure distance or how long something is.\n\nCore idea:\n- Choose the unit that fits the object: millimetres, centimetres, metres, or kilometres.\n- Convert by knowing the relationship between units.\n- Estimate before measuring so you can notice unreasonable answers.\n\nKey words:\n${vocabulary}`,
    capacity: `${unit} teaches how much liquid or material a container can hold.\n\nCore idea:\n- Capacity is measured with units such as millilitres and litres.\n- Compare containers by reading the scale or using the same measuring container.\n- Always state the unit with the number.\n\nKey words:\n${vocabulary}`,
    mass: `${unit} teaches how heavy objects are.\n\nCore idea:\n- Mass is measured with units such as grams and kilograms.\n- A balance or scale helps compare mass fairly.\n- Convert units before adding or comparing if the units are different.\n\nKey words:\n${vocabulary}`,
    area: `${unit} teaches how much flat surface is covered.\n\nCore idea:\n- Area is counted in square units.\n- Rectangles can be found by length x width.\n- Land and floor measurements need clear units and a labelled diagram.\n\nKey words:\n${vocabulary}`,
    time: `${unit} teaches how to read, write, convert, and use time.\n\nCore idea:\n- Time can be shown on analogue clocks, digital clocks, calendars, and timetables.\n- 60 seconds make 1 minute, and 60 minutes make 1 hour.\n- Timetables help you find start time, end time, and duration.\n\nKey words:\n${vocabulary}`,
    patterns: `${unit} teaches how numbers change in a regular way.\n\nCore idea:\n- Look at how each term changes to the next term.\n- A pattern can add, subtract, multiply, divide, or combine steps.\n- Write the rule before extending the pattern.\n\nKey words:\n${vocabulary}`,
    proportion: `${unit} teaches how two quantities change together at the same rate.\n\nCore idea:\n- In direct proportion, when one quantity is multiplied, the other quantity is multiplied by the same factor.\n- A table helps you compare matching values.\n- The unit rate tells the value for one item, one litre, one metre, one hour, or one learner.\n- Always check that the relationship is consistent before using proportion.\n\nKey words:\n${vocabulary}`,
    'lines-angles': `${unit} teaches how lines and angles describe shapes and directions.\n\nCore idea:\n- A line can be straight, parallel, perpendicular, horizontal, vertical, or slanting.\n- An angle is a turn between two lines.\n- Draw and label diagrams carefully before measuring or classifying.\n\nKey words:\n${vocabulary}`,
    'circle-geometry': `${unit} teaches the parts and measurements of circles.\n\nCore idea:\n- The centre is the fixed middle point of a circle.\n- A radius goes from the centre to the circle.\n- A diameter passes through the centre and is twice the radius.\n- Circumference is the distance around the circle.\n- A labelled diagram prevents mixing up radius and diameter.\n\nKey words:\n${vocabulary}`,
    'solid-geometry': `${unit} teaches properties of three-dimensional shapes such as cubes, cuboids, and cylinders.\n\nCore idea:\n- Solid shapes have faces, edges, and vertices.\n- A cuboid has rectangular faces.\n- A cube has six equal square faces.\n- A cylinder has two circular faces and one curved surface.\n- Nets show how flat faces fold to make a solid.\n\nKey words:\n${vocabulary}`,
    shapes: `${unit} teaches properties of two-dimensional shapes.\n\nCore idea:\n- Shapes can be classified by sides, corners, lines of symmetry, and angles.\n- A labelled sketch helps you compare shapes accurately.\n- Use correct names such as triangle, rectangle, square, and circle.\n\nKey words:\n${vocabulary}`,
    data: `${unit} teaches how to collect, organize, read, and explain information.\n\nCore idea:\n- Data must answer a clear question.\n- Tables, tally charts, pictographs, and bar charts make data easier to read.\n- A good conclusion says what the data shows.\n\nKey words:\n${vocabulary}`,
    chance: `${unit} teaches how likely an event is.\n\nCore idea:\n- Some events are certain, likely, unlikely, or impossible.\n- A simple experiment can help you compare chances.\n- Record results before making a conclusion.\n\nKey words:\n${vocabulary}`
  };
  return lessons[domain] || `${unit} teaches a mathematical idea by using a clear model, a labelled representation, step-by-step working, and a final check.\n\nKey words:\n${vocabulary}`;
}

function mathWorkedExample(context, topic) {
  const unit = topic.unitTitle;
  const domain = mathDomain(topic);
  const examples = {
    'whole-numbers': `Worked example for ${unit}: A school library has 23,475 storybooks and 18,320 revision books. How many books are there altogether?\n\n1. Align place values.\n2. Add ones, tens, hundreds, thousands, and ten-thousands.\n3. 23,475 + 18,320 = 41,795.\n4. Estimate: 23,000 + 18,000 = 41,000, so 41,795 is reasonable.\n\nAnswer: 41,795 books.`,
    integers: `Worked example for ${unit}: The morning temperature is 3 degrees above zero. At night it drops by 7 degrees. What is the night temperature?\n\n1. Start at +3 on a number line.\n2. Move 7 steps left because the temperature drops.\n3. +3 - 7 = -4.\n\nAnswer: 4 degrees below zero.`,
    factors: `Worked example for ${unit}: List all factors of 24.\n\n1. Test factor pairs: 1 x 24, 2 x 12, 3 x 8, 4 x 6.\n2. No whole-number factor pair is missing between 4 and 6.\n3. Write the factors in order.\n\nAnswer: 1, 2, 3, 4, 6, 8, 12, 24.`,
    fractions: `Worked example for ${unit}: A learner eats 2/8 of a pineapple in the morning and 3/8 in the afternoon. What fraction is eaten?\n\n1. The denominators are the same, so the parts are equal-sized eighths.\n2. Add the numerators: 2 + 3 = 5.\n3. Keep the denominator: 8.\n\nAnswer: 5/8 of the pineapple was eaten.`,
    decimals: `Worked example for ${unit}: Compare 4.35 and 4.5.\n\n1. Write 4.5 as 4.50 so both numbers show hundredths.\n2. Compare whole numbers: both are 4.\n3. Compare tenths: 3 tenths is less than 5 tenths.\n\nAnswer: 4.35 is less than 4.5.`,
    length: `Worked example for ${unit}: A classroom is 8 m long and a corridor is 350 cm long. Which is longer?\n\n1. Convert 8 m to centimetres: 8 m = 800 cm.\n2. Compare 800 cm and 350 cm.\n3. 800 cm is greater than 350 cm.\n\nAnswer: The classroom is longer.`,
    capacity: `Worked example for ${unit}: A jerrycan holds 20 litres. A bottle holds 2 litres. How many full bottles fill the jerrycan?\n\n1. Use division because equal bottles fill one container.\n2. 20 litres / 2 litres = 10.\n3. Check: 10 bottles x 2 litres = 20 litres.\n\nAnswer: 10 bottles.`,
    mass: `Worked example for ${unit}: A bag of beans has a mass of 3 kg. A small packet has a mass of 500 g. What is the total mass in grams?\n\n1. Convert 3 kg to grams: 3 kg = 3000 g.\n2. Add 3000 g + 500 g = 3500 g.\n\nAnswer: 3500 g.`,
    area: `Worked example for ${unit}: A rectangular garden is 9 m long and 4 m wide. Find its area.\n\n1. Draw a rectangle and label length 9 m and width 4 m.\n2. Area of a rectangle = length x width.\n3. 9 x 4 = 36.\n\nAnswer: 36 square metres.`,
    time: `Worked example for ${unit}: A lesson starts at 8:10 and ends at 8:50. How long is the lesson?\n\n1. Count from 8:10 to 8:50.\n2. 10 minutes to 8:20, 20 more to 8:40, 10 more to 8:50.\n3. Total time = 40 minutes.\n\nAnswer: 40 minutes.`,
    patterns: `Worked example for ${unit}: Continue the pattern 6, 12, 18, 24, __, __.\n\n1. Compare terms: 12 - 6 = 6, 18 - 12 = 6.\n2. Rule: add 6 each time.\n3. 24 + 6 = 30, 30 + 6 = 36.\n\nAnswer: 30, 36.`,
    proportion: `Worked example for ${unit}: If 3 exercise books cost 900 francs, how much do 5 exercise books cost at the same price?\n\n1. Find the cost of 1 book: 900 / 3 = 300 francs.\n2. Multiply by 5 books: 300 x 5 = 1500 francs.\n3. Check: more books should cost more money.\n\nAnswer: 5 exercise books cost 1500 francs.`,
    'missing-numbers': `Worked example for ${unit}: Find the missing number: 45 + __ = 73.\n\n1. Use subtraction to undo addition.\n2. 73 - 45 = 28.\n3. Check: 45 + 28 = 73.\n\nAnswer: 28.`,
    'lines-angles': `Worked example for ${unit}: A shape has one right angle. How can you show it clearly?\n\n1. Draw the two meeting lines.\n2. Mark the square corner to show a right angle.\n3. Label it 90 degrees.\n4. Name a classroom example, such as a book corner.\n\nAnswer: A right angle is a quarter turn, 90 degrees.`,
    'circle-geometry': `Worked example for ${unit}: A circle has radius 7 cm. Find its diameter.\n\n1. Diameter = 2 x radius.\n2. Radius = 7 cm.\n3. 2 x 7 cm = 14 cm.\n4. Check the diagram: the diameter must pass through the centre.\n\nAnswer: The diameter is 14 cm.`,
    'solid-geometry': `Worked example for ${unit}: Name the faces of a cuboid.\n\n1. Look at the solid shape.\n2. A cuboid has 6 faces.\n3. Each face is a rectangle.\n4. Opposite faces are equal in size.\n\nAnswer: A cuboid has 6 rectangular faces, 12 edges, and 8 vertices.`,
    shapes: `Worked example for ${unit}: Classify a shape with 4 equal sides and 4 right angles.\n\n1. Four sides means it is a quadrilateral.\n2. Equal sides and right angles match a square.\n3. Check the name and properties.\n\nAnswer: The shape is a square.`,
    data: `Worked example for ${unit}: A class records favourite fruits: mango 8, banana 12, pineapple 6. Which fruit is most popular?\n\n1. Read the table values.\n2. Compare 8, 12, and 6.\n3. 12 is the greatest number.\n\nAnswer: Banana is most popular.`,
    chance: `Worked example for ${unit}: A bag has 4 red counters and 1 blue counter. Which colour is more likely to be picked?\n\n1. Compare the number of counters.\n2. Red has 4 chances; blue has 1 chance.\n3. More red counters means red is more likely.\n\nAnswer: Red is more likely.`
  };
  return examples[domain] || `Worked example for ${unit}: Read the task, choose a representation, solve one step at a time, and check the answer in context.\n\nModel:\n1. Name what is known.\n2. Choose a diagram, table, equation, or model.\n3. Complete the calculation or reasoning.\n4. Check the result with estimation or inverse reasoning.\n\nUse a ${context.name} classroom, market, garden, transport, or home example.`;
}

function mathPracticeBlock(context, topic, outcomes) {
  const unit = topic.unitTitle;
  const domain = mathDomain(topic);
  const tasks = {
    fractions: ['Draw one whole divided into 8 equal parts. Shade 3/8.', 'Calculate 2/7 + 4/7 and explain why the denominator stays 7.', 'Write one story problem using fractions with the same denominator, then solve it.'],
    decimals: ['Write 3 tenths as a decimal.', 'Order 2.05, 2.5, and 2.15 from smallest to largest.', 'Use a money or measurement example to compare two decimal numbers.'],
    time: ['Read a clock showing 7:30 and write the time in words.', 'Convert 2 hours to minutes.', 'A trip starts at 9:15 and ends at 10:00. Find the duration.'],
    area: ['Draw a rectangle that is 6 units long and 3 units wide.', 'Find its area in square units.', 'Explain why area uses square units.'],
    length: ['Estimate the length of a desk, then choose a suitable unit.', 'Convert 4 m to centimetres.', 'Solve: a path is 120 m and another is 75 m. What is the total length?'],
    capacity: ['Name two containers measured in litres.', 'Convert 3 litres to millilitres.', 'A bucket holds 15 litres. How many 5-litre containers fill it?'],
    mass: ['Name two objects measured in grams and two measured in kilograms.', 'Convert 2 kg to grams.', 'Compare 1500 g and 2 kg. Which is heavier?'],
    patterns: ['Continue the pattern 5, 10, 15, 20, __, __.', 'Write the rule for the pattern.', 'Create a similar pattern that increases by 4 each time.'],
    proportion: ['Complete the table: 1 pen = 200 francs, 2 pens = __, 5 pens = __.', 'A cyclist travels 18 km in 2 hours at the same speed. How far in 5 hours?', 'Write the unit rate used in each answer.'],
    'missing-numbers': ['Find the missing number: 36 + __ = 81.', 'Find the missing number: __ - 18 = 47.', 'Check each answer using the inverse operation.'],
    'lines-angles': ['Draw one right angle and label it 90 degrees.', 'Name one pair of parallel lines in the classroom.', 'Use a ruler to draw a straight line segment and label its endpoints.'],
    'circle-geometry': ['Draw a circle and label the centre, radius, and diameter.', 'If the radius is 6 cm, find the diameter.', 'Name one circular object at school or home and describe its radius or diameter.'],
    'solid-geometry': ['Draw or model a cube, cuboid, and cylinder.', 'Count faces, edges, and vertices where they apply.', 'Sketch a simple net for a cube or cuboid.'],
    shapes: ['Draw a triangle, rectangle, and square.', 'Write two properties for each shape.', 'Circle the shape that has four equal sides and four right angles.'],
    data: ['Ask 10 learners a simple question and make a tally table.', 'Draw a bar chart from the tally table.', 'Write one conclusion from the data.'],
    chance: ['Write one certain event, one likely event, and one impossible event.', 'Toss a coin 10 times and record heads/tails.', 'Use your results to say what happened more often.']
  };
  const answerChecks = {
    fractions: 'Answers: 2/7 + 4/7 = 6/7. The denominator stays 7 because the equal parts are sevenths.',
    decimals: 'Answers: 3 tenths = 0.3. Order: 2.05, 2.15, 2.5.',
    time: 'Answers: 2 hours = 120 minutes. 9:15 to 10:00 is 45 minutes.',
    area: 'Answer: a 6 by 3 rectangle has area 18 square units.',
    length: 'Answer: 4 m = 400 cm. 120 m + 75 m = 195 m.',
    capacity: 'Answer: 3 litres = 3000 millilitres. 15 litres / 5 litres = 3 containers.',
    mass: 'Answer: 2 kg = 2000 g, so 2 kg is heavier than 1500 g.',
    patterns: 'Answers: 25, 30. Rule: add 5 each time.',
    proportion: 'Answers: 2 pens = 400 francs; 5 pens = 1000 francs. The cyclist travels 45 km in 5 hours because 18 / 2 = 9 km per hour.',
    'missing-numbers': 'Answers: 45 and 65. Checks: 36 + 45 = 81; 65 - 18 = 47.',
    'lines-angles': 'Answer check: the right angle should show a square corner; parallel lines stay the same distance apart.',
    'circle-geometry': 'Answer: if radius = 6 cm, diameter = 12 cm. A correct diagram shows the radius from centre to circle and diameter through the centre.',
    'solid-geometry': 'Answer check: cube has 6 equal square faces; cuboid has 6 rectangular faces; cylinder has circular faces and a curved surface.',
    shapes: 'Answer: the square has four equal sides and four right angles.',
    data: 'Answer check: totals in the tally table and bar chart should match.',
    chance: 'Answer check: certain means must happen; impossible means cannot happen.'
  };
  const selected = tasks[domain] || [
    `Solve one ${unit.toLowerCase()} question using labelled steps.`,
    'Show your method with a drawing, table, number sentence, or diagram.',
    'Check your answer and write one sentence explaining it.'
  ];
  const outcomeLine = outcomes[0]?.text ? `Main outcome: ${outcomes[0].text}.` : `Main outcome: practise ${unit.toLowerCase()} accurately.`;
  return `Practice for ${unit}:\n\n${outcomeLine}\n\n${selected.map((task, index) => `${index + 1}. ${task}`).join('\n')}\n\nAnswer check:\n${answerChecks[domain] || 'Your answer should show a clear model, correct method, correct labels, and a final sentence.'}\n\nCorrection check:\n- Did you show the method?\n- Did you use the correct unit or label?\n- Did you check whether the answer is reasonable?\n\nHome link: Find one ${context.name} home, school, shop, garden, road, game, or timetable example connected to ${unit.toLowerCase()} and solve it.`;
}

function scienceDomain(topic) {
  const title = String(topic.unitTitle || '').toLowerCase();
  const text = topicWords(topic);
  if (/html|css|multimedia|algorithm|programming|c\+\+|java|visual basic|database|sql|network|security|operating system|array|function|pointer|software|hardware|computer architecture/.test(title)) return 'computer-science';
  if (/word processing|spreadsheet|document|computer|keyboard|row|column|cell|formula|worksheet/.test(title)) return 'ict-productivity';
  if (/newton/.test(title)) return 'newtons-laws';
  if (/chemical bond|bonding|ionic|covalent|metallic/.test(title)) return 'chemical-bonding';
  if (/\bmole\b|molar|avogadro|gas law|boyle|charles|ideal gas/.test(title)) return 'mole-gas-laws';
  if (/benzene|aromatic/.test(title)) return 'benzene';
  if (/radioactiv|nuclear|half-life|isotope/.test(title)) return 'radioactivity';
  if (/reproductive|reproduction|puberty|human reproductive/.test(title)) return 'reproductive-health';
  if (/soil|erosion|humus|fertility/.test(title)) return 'soil';
  if (/muscle|movement|joint|skeleton/.test(title)) return 'muscles';
  if (/laboratory|measurement|physical quantities|safety/.test(title)) return 'measurement-safety';
  if (/linear motion|motion|kinematic/.test(title)) return 'motion';
  if (/newton|force/.test(title)) return 'force';
  if (/centre of gravity|center of gravity|stability/.test(title)) return 'gravity';
  if (/work|power|energy/.test(title)) return 'energy';
  if (/simple machine|lever|pulley|inclined plane/.test(title)) return 'machines';
  if (/kinetic theory|states of matter|solid|liquid|gas/.test(title)) return 'matter';
  if (/heat|temperature|thermometry/.test(title)) return 'heat';
  if (/magnet/.test(title)) return 'magnetism';
  if (/electrostatic|charge/.test(title)) return 'electrostatics';
  if (/current electricity|electricity|circuit/.test(title)) return 'electricity';
  if (/light|reflection|rectilinear/.test(title)) return 'light';
  if (/html|css|multimedia|algorithm|programming|c\+\+|java|visual basic|database|sql|network|security|operating system|array|function|pointer|software|hardware|computer architecture/.test(text)) return 'computer-science';
  if (/word processing|spreadsheet|document|computer|keyboard|row|column|cell|formula|worksheet/.test(text)) return 'ict-productivity';
  if (/newton/.test(text)) return 'newtons-laws';
  if (/chemical bond|bonding|ionic|covalent|metallic/.test(text)) return 'chemical-bonding';
  if (/\bmole\b|molar|avogadro|gas law|boyle|charles|ideal gas/.test(text)) return 'mole-gas-laws';
  if (/benzene|aromatic/.test(text)) return 'benzene';
  if (/radioactiv|nuclear|half-life|isotope/.test(text)) return 'radioactivity';
  if (/reproductive|reproduction|puberty|human reproductive/.test(text)) return 'reproductive-health';
  if (/soil|erosion|humus|fertility/.test(text)) return 'soil';
  if (/muscle|movement|joint|skeleton/.test(text)) return 'muscles';
  if (/soil|plant|animal|body|health|water|air|weather|energy|material/.test(text)) return 'general-science';
  return 'investigation';
}

function scienceConceptLesson(context, subjectTitle, topic, vocabulary) {
  const unit = topic.unitTitle;
  const lessons = {
    'computer-science': `${unit} is learned by connecting a computing concept to a clear problem, exact steps, and a checked output.\n\nCore idea:\n- Name the computing object first: data, algorithm, program, web page, database, network, device, or security control.\n- Break the task into steps before using a computer.\n- Use correct technical vocabulary such as input, process, output, variable, file, table, tag, command, or protocol where it fits.\n- Test the result with a small example and correct one error.\n- Save or present the work in a way another learner can inspect.\n\nKey words:\n${vocabulary}`,
    'ict-productivity': `${unit} teaches useful computer work through exact steps, not guessing.\n\nCore idea:\n- Word processing is used to create, edit, format, save, and print text documents.\n- A spreadsheet organizes data in rows, columns, and cells.\n- A cell can hold text, a number, or a formula.\n- Formatting should make work clearer, not just more decorative.\n- Good digital work is saved with a clear file name and checked before sharing.\n\nLearner task link: create a class list, simple budget, marks table, timetable, or short report using safe school devices.\n\nKey words:\n${vocabulary}`,
    'newtons-laws': `${unit} explains how forces affect motion using Newton's laws.\n\nCore idea:\n- First law: an object stays at rest or keeps moving in a straight line unless an unbalanced force acts on it.\n- Second law: a larger force causes a larger acceleration, while a larger mass is harder to accelerate.\n- Third law: when one object exerts a force on another, the second object exerts an equal and opposite force.\n- Force diagrams help you show direction and balance.\n\nKey words:\n${vocabulary}`,
    'chemical-bonding': `${unit} explains why atoms join and how bonds affect properties.\n\nCore idea:\n- Ionic bonding happens when electrons transfer, often between metals and non-metals.\n- Covalent bonding happens when atoms share electrons, usually between non-metals.\n- Metallic bonding has metal ions in a sea of delocalized electrons.\n- Bonding helps explain melting point, conductivity, solubility, and hardness.\n- Dot-and-cross or particle diagrams make bonding easier to compare.\n\nKey words:\n${vocabulary}`,
    'mole-gas-laws': `${unit} connects particle number, amount of substance, mass, volume, pressure, and temperature.\n\nCore idea:\n- One mole contains Avogadro's number of particles.\n- Molar mass links mass and moles: moles = mass / molar mass.\n- Gas laws describe how pressure, volume, and temperature change when other conditions are controlled.\n- Always list known values, formula, substitution, unit, and final answer.\n\nKey words:\n${vocabulary}`,
    'reproductive-health': `${unit} teaches the human reproductive system with correct vocabulary, respect, privacy, and health awareness.\n\nCore idea:\n- Reproductive organs have specific structures and functions.\n- Puberty brings physical and emotional changes that should be discussed respectfully.\n- Personal hygiene, safety, consent, and seeking trusted adult or health-worker support are important.\n- Diagrams should be labelled scientifically and handled with maturity.\n\nKey words:\n${vocabulary}`,
    soil: `${unit} explains soil as a living natural resource that supports plants, animals, and people.\n\nCore idea:\n- Soil is made from weathered rock, humus, air, water, and living organisms.\n- Sandy, clay, and loam soils feel different, hold water differently, and suit different uses.\n- Healthy soil supports plant roots, stores water, and provides nutrients.\n- Soil can be damaged by erosion, burning, pollution, and careless farming.\n- Learners can compare soil samples safely by colour, texture, water retention, and visible organic matter.\n\nKey words:\n${vocabulary}`,
    muscles: `${unit} explains how muscles help the body move and stay active.\n\nCore idea:\n- Muscles pull on bones to create movement at joints.\n- Muscles usually work in pairs: one contracts while the other relaxes.\n- Exercise, rest, clean food, and safe posture help muscles remain healthy.\n- Sudden heavy work, poor warm-up, and unsafe movement can injure muscles.\n- A labelled body diagram helps learners connect muscle action with daily movement.\n\nKey words:\n${vocabulary}`,
    benzene: `${unit} introduces benzene as an aromatic hydrocarbon with a special ring structure.\n\nCore idea:\n- Benzene has six carbon atoms and six hydrogen atoms in a ring.\n- Its bonding is represented by alternating double bonds or a circle inside the ring to show delocalised electrons.\n- Benzene reactions are often substitution reactions rather than simple addition reactions.\n- Benzene and many organic solvents must be handled only through teacher-approved demonstrations because safety matters.\n- Structure, formula, properties, and safe-use rules should be connected, not memorised separately.\n\nKey words:\n${vocabulary}`,
    radioactivity: `${unit} explains radioactivity as the process where unstable nuclei emit radiation to become more stable.\n\nCore idea:\n- Alpha, beta, and gamma radiation differ in charge, mass, penetration, and shielding.\n- Half-life is the time taken for half of a radioactive sample or count rate to remain.\n- Radioactivity can be useful in medicine, industry, agriculture, dating, and research when controlled safely.\n- Radiation can also damage living tissue, so distance, shielding, time limits, and trained supervision are essential.\n- Learners should interpret simple count-rate data and avoid unsafe experiments.\n\nKey words:\n${vocabulary}`,
    'general-science': `${unit} is learned by asking a clear question, observing carefully, recording evidence, and explaining what the evidence means.\n\nCore idea:\n- Start with the object, organism, material, body part, force, energy change, or environmental feature being studied.\n- Use safe observations, labelled diagrams, simple measurements, or comparison tables.\n- Keep evidence separate from guesses: evidence is what you saw, measured, read from a table, or labelled correctly.\n- A conclusion should answer the question and mention one limit or next observation.\n- Local examples from home, school, farms, water sources, weather, health, and the environment make the science useful.\n\nKey words:\n${vocabulary}`,
    'measurement-safety': `${unit} begins with safe behaviour and accurate measurement.\n\nCore idea:\n- Physics uses measurements such as length, mass, time, temperature, and volume.\n- A measurement is useful only when the number and unit are both written.\n- Safety rules protect learners, equipment, and results.\n- Read scales at eye level and record values immediately.\n\nLocal link: in ${context.name}, careful measurement helps in health, building, farming, weather records, transport, and school laboratory work.\n\nKey words:\n${vocabulary}`,
    motion: `${unit} explains how position changes with time.\n\nCore idea:\n- Motion means an object changes position compared with a reference point.\n- Distance tells how far an object moves.\n- Time tells how long the motion takes.\n- Speed compares distance and time.\n- A distance-time table or graph can show whether motion is slow, fast, or changing.\n\nKey words:\n${vocabulary}`,
    force: `${unit} explains pushes, pulls, and changes in motion.\n\nCore idea:\n- A force can start motion, stop motion, change speed, change direction, or change shape.\n- Forces are measured in newtons.\n- Balanced forces do not change motion.\n- Unbalanced forces can make an object accelerate, slow down, or turn.\n\nKey words:\n${vocabulary}`,
    gravity: `${unit} explains balance and stability.\n\nCore idea:\n- Centre of gravity is the point where the weight of an object seems to act.\n- A low centre of gravity usually makes an object more stable.\n- A wide base of support helps an object resist toppling.\n- You can investigate balance using safe objects such as rulers, cardboard shapes, and books.\n\nKey words:\n${vocabulary}`,
    energy: `${unit} connects work, power, and energy changes.\n\nCore idea:\n- Work is done when a force moves an object through a distance.\n- Energy is the ability to do work.\n- Power describes how quickly work is done or energy is transferred.\n- Energy can change form, such as chemical to movement, electrical to light, or potential to kinetic.\n\nKey words:\n${vocabulary}`,
    machines: `${unit} shows how tools make work easier.\n\nCore idea:\n- A simple machine changes the size or direction of a force.\n- Levers, pulleys, wheels and axles, inclined planes, wedges, and screws are simple machines.\n- A machine does not remove work; it helps you use force more conveniently.\n- Compare effort force, load, and distance moved.\n\nKey words:\n${vocabulary}`,
    matter: `${unit} explains particles in solids, liquids, and gases.\n\nCore idea:\n- Matter is made of tiny particles.\n- In solids, particles are close and vibrate in fixed positions.\n- In liquids, particles are close but can slide past each other.\n- In gases, particles are far apart and move freely.\n- Heating usually makes particles move faster.\n\nKey words:\n${vocabulary}`,
    heat: `${unit} explains thermal energy and temperature.\n\nCore idea:\n- Temperature tells how hot or cold something is.\n- Heat moves from a hotter object to a cooler object.\n- Thermometers must be read carefully and safely.\n- Different scales, such as Celsius and Kelvin, can describe temperature.\n\nKey words:\n${vocabulary}`,
    magnetism: `${unit} explains magnetic and non-magnetic materials.\n\nCore idea:\n- Magnets attract some materials, especially iron and steel.\n- A magnet has north and south poles.\n- Like poles repel and unlike poles attract.\n- Magnetic force can act without touching the object.\n\nKey words:\n${vocabulary}`,
    electrostatics: `${unit} explains electric charges at rest.\n\nCore idea:\n- Some materials become charged when rubbed.\n- Charged objects can attract or repel other charged objects.\n- Like charges repel; unlike charges attract.\n- Dry materials often show static effects more clearly than wet materials.\n\nKey words:\n${vocabulary}`,
    electricity: `${unit} explains moving electric charge in circuits.\n\nCore idea:\n- A complete circuit is needed for current to flow.\n- Cells, wires, switches, and bulbs can show current effects safely.\n- Electricity can produce light, heat, sound, movement, and magnetism.\n- Safety matters: never experiment with mains electricity.\n\nKey words:\n${vocabulary}`,
    light: `${unit} explains how light travels and reflects.\n\nCore idea:\n- Light travels in straight lines through a uniform medium.\n- Shadows form when an opaque object blocks light.\n- Reflection occurs when light bounces from a surface.\n- Smooth, shiny surfaces reflect light more regularly than rough surfaces.\n\nKey words:\n${vocabulary}`
  };
  return lessons[scienceDomain(topic)] || `${unit} is learned by turning the topic into a clear, safe, evidence-based science task.\n\nCore idea:\n- Name the science idea before starting: structure, process, material, force, energy, organism, environment, or system.\n- Use a diagram, data table, labelled model, safe observation, or teacher-approved investigation.\n- Record what is seen or measured, not what is guessed.\n- Explain the result using the vocabulary from this topic.\n- Finish with one conclusion and one question for further study.\n\nKey words:\n${vocabulary}`;
}

function scienceWorkedExample(context, topic) {
  const unit = topic.unitTitle;
  const examples = {
    'computer-science': `Worked example for ${unit}: Build a small checked computing output.\n\n1. Define the task in one sentence.\n2. List the inputs needed, such as text, numbers, records, tags, commands, or devices.\n3. Write the steps before using the computer.\n4. Create a small version of the output: a web page, algorithm trace, table, query, program fragment, network diagram, or security checklist.\n5. Test with one example and correct one error.\n\nAnswer check: the output should match the task, use correct vocabulary, and be easy for another learner to inspect.`,
    'ict-productivity': `Worked example for ${unit}: Make a simple spreadsheet for class garden harvest.\n\n1. Open a blank worksheet.\n2. In row 1, type headings: Crop, Week 1, Week 2, Total.\n3. Enter beans, maize, and tomatoes in the Crop column.\n4. Type harvest numbers for Week 1 and Week 2.\n5. In the Total column, use a formula such as =B2+C2.\n6. Save the file with a clear name, for example garden-harvest-p6.\n\nQuality check: headings are clear, numbers are in the correct cells, formulas give sensible totals, and the file is saved.`,
    'newtons-laws': `Worked example for ${unit}: Explain why a football at rest starts moving when kicked.\n\n1. Before the kick, the ball is at rest.\n2. The foot applies an unbalanced force on the ball.\n3. Because of Newton's first law, the ball changes its state of motion only when the force acts.\n4. The ball also pushes back on the foot with an equal and opposite force, showing Newton's third law.\n\nConclusion: the kick changes the motion because it provides an unbalanced force.`,
    'chemical-bonding': `Model for ${unit}: Compare sodium chloride and a simple covalent molecule.\n\n1. Sodium transfers one electron to chlorine, forming ions.\n2. Opposite charges attract, so an ionic bond forms.\n3. In a covalent molecule, atoms share electrons instead of transferring them.\n4. Ionic compounds often conduct electricity when molten or dissolved; simple covalent substances usually do not.\n\nConclusion: the type of bond helps explain properties.`,
    'mole-gas-laws': `Worked example for ${unit}: Find moles in 18 g of water. Use molar mass of water = 18 g/mol.\n\n1. Formula: moles = mass / molar mass.\n2. Substitute: moles = 18 g / 18 g/mol.\n3. Calculate: 1 mol.\n4. Unit: mol.\n\nAnswer: 18 g of water is 1 mol.`,
    'reproductive-health': `Model for ${unit}: Label and explain a reproductive-system diagram respectfully.\n\n1. Use the scientific diagram provided by the teacher or book.\n2. Label the main structures with correct vocabulary.\n3. Write one function for each labelled structure.\n4. Add one health or hygiene point.\n5. Keep discussion respectful and private.\n\nConclusion: correct labels and respectful explanation help learners understand body systems safely.`,
    soil: `Investigation model for ${unit}: Compare two soil samples safely.\n\n1. Collect two small teacher-approved soil samples, such as garden soil and sandy soil.\n2. Observe colour and texture without putting soil near the mouth or eyes.\n3. Add a small amount of water and compare how each sample holds water.\n4. Record results in a table: sample, colour, texture, water retention, visible organic matter.\n5. Explain which sample may support plant growth better and why.\n\nConclusion: soil properties affect plant growth and land use.`,
    muscles: `Model for ${unit}: Explain how the arm bends.\n\n1. Hold one arm out and bend it slowly.\n2. Feel the upper-arm muscle shorten as the elbow bends.\n3. Straighten the arm and notice the movement changes.\n4. Draw a simple arm diagram with bone, joint, and muscle labels.\n5. Add one safety note about warm-up or avoiding sudden heavy lifting.\n\nConclusion: muscles pull on bones at joints to make movement.`,
    benzene: `Worked example for ${unit}: Interpret a benzene ring diagram.\n\n1. Count six carbon positions in the ring.\n2. Add one hydrogen attached to each carbon to give C6H6.\n3. Explain that the ring can be drawn with alternating double bonds or a circle showing delocalised electrons.\n4. State one reaction idea: benzene often undergoes substitution reactions.\n5. Add one safety rule for aromatic compounds and solvents.\n\nConclusion: benzene's ring structure explains why its reactions differ from many alkenes.`,
    radioactivity: `Worked example for ${unit}: Use half-life data.\n\nA sample has a count rate of 80 counts per minute. Its half-life is 5 minutes.\n\n1. After 5 minutes, half remains: 40 counts per minute.\n2. After 10 minutes, half of 40 remains: 20 counts per minute.\n3. After 15 minutes, half of 20 remains: 10 counts per minute.\n4. Shielding and distance must be controlled by trained adults.\n\nAnswer: after 15 minutes, the count rate is 10 counts per minute.`,
    'measurement-safety': `Investigation model for ${unit}: Measure the length of a desk safely.\n\n1. Choose a metre rule or tape measure.\n2. Place zero at one end of the desk.\n3. Read the scale at eye level.\n4. Record the value with the unit, for example 120 cm.\n5. Repeat once and compare readings.\n\nConclusion: a useful measurement includes a number, a unit, and a careful method.`,
    motion: `Worked example for ${unit}: A cart moves 12 metres in 4 seconds. Find its speed.\n\n1. Speed = distance / time.\n2. Distance = 12 m and time = 4 s.\n3. 12 / 4 = 3.\n\nAnswer: the cart moves at 3 m/s.`,
    force: `Worked example for ${unit}: A learner pushes a box, and the box starts moving.\n\nObservation: the push is an unbalanced force.\n\nExplanation:\n1. The box was at rest.\n2. The push acted on the box.\n3. The box changed its motion, so the force had an effect.\n\nConclusion: forces can change the motion of objects.`,
    gravity: `Investigation model for ${unit}: Balance a ruler on one finger.\n\n1. Place a ruler across one finger.\n2. Move your finger slowly until the ruler balances.\n3. Mark the balance point.\n4. Add a small rubber on one side and observe the new balance point.\n\nConclusion: adding mass changes where the centre of gravity acts.`,
    energy: `Worked example for ${unit}: A learner lifts a book from the floor to a desk.\n\n1. The learner applies an upward force.\n2. The book moves upward through a distance.\n3. Work is done on the book.\n4. The book gains gravitational potential energy.\n\nConclusion: work can transfer energy to an object.`,
    machines: `Investigation model for ${unit}: Use a ruler as a lever.\n\n1. Place a small object as the load.\n2. Put a pencil under the ruler as the pivot.\n3. Press the other end gently.\n4. Move the pivot and compare the effort needed.\n\nConclusion: the position of the pivot changes how a lever helps lift a load.`,
    matter: `Model for ${unit}: Compare particles in solids, liquids, and gases.\n\n1. Draw solid particles close together in a fixed pattern.\n2. Draw liquid particles close but uneven, able to slide.\n3. Draw gas particles far apart.\n4. Add arrows to show particle movement.\n\nConclusion: particle arrangement explains shape, flow, and expansion.`,
    heat: `Investigation model for ${unit}: Read water temperature safely.\n\n1. Put warm water in a beaker under teacher guidance.\n2. Place a thermometer bulb in the water without touching the bottom.\n3. Wait for the reading to stop changing.\n4. Read the Celsius scale at eye level.\n\nConclusion: careful thermometer use gives a reliable temperature.`,
    magnetism: `Investigation model for ${unit}: Test materials with a magnet.\n\n1. Collect a nail, coin, plastic ruler, paper clip, and wood piece.\n2. Bring a magnet near each object.\n3. Record attracted or not attracted.\n4. Group the materials as magnetic or non-magnetic.\n\nConclusion: iron and steel objects are usually attracted by magnets.`,
    electrostatics: `Investigation model for ${unit}: Observe static attraction.\n\n1. Rub a plastic ruler with dry cloth.\n2. Bring it near small paper pieces.\n3. Record what happens without touching the paper first.\n4. Repeat after waiting one minute.\n\nConclusion: rubbing can charge materials and cause attraction.`,
    electricity: `Circuit model for ${unit}: Light a bulb safely.\n\n1. Use a cell, two wires, a switch, and a small bulb.\n2. Connect a complete circuit.\n3. Close the switch and observe the bulb.\n4. Open the switch and observe again.\n\nConclusion: current flows only when the circuit is complete.`,
    light: `Investigation model for ${unit}: Show that light travels in straight lines.\n\n1. Make small holes in three cards.\n2. Place a torch behind the first card.\n3. Align the holes so light reaches a screen.\n4. Move one card sideways and observe the screen.\n\nConclusion: the light path is blocked when the holes are not in a straight line.`
  };
  return examples[scienceDomain(topic)] || `Investigation model for ${unit}: Turn the topic into a safe, clear classroom investigation or model.\n\n1. Question: write one question that can be answered by observing, comparing, classifying, measuring, modelling, or reading data.\n2. Materials: list safe classroom materials, diagrams, samples, cards, tables, or teacher-approved apparatus.\n3. Method: do one step at a time and keep one condition fair where comparison is needed.\n4. Safety: name any heat, glass, sharp tool, chemical, hygiene, electrical, or body-safety rule before starting.\n5. Record: use a labelled table, diagram, or sentence notes.\n6. Conclusion: state what the evidence shows and one limit of the investigation.\n\nAnswer check: a strong response names the concept, uses correct vocabulary, records evidence, and does not claim more than the evidence supports.`;
}

function sciencePracticeBlock(context, topic, outcomes) {
  const unit = topic.unitTitle;
  const tasks = {
    'computer-science': ['Write the purpose of the computing task in one sentence.', 'Create a small algorithm, code fragment, table, diagram, web page structure, database record, or network/security checklist.', 'Test it with one example and write one correction.'],
    'ict-productivity': ['Create a document or worksheet with a clear title and headings.', 'Enter five rows of useful class, garden, timetable, budget, or marks data.', 'Format the work neatly, save it with a clear file name, and explain one formula or formatting choice.'],
    'newtons-laws': ['State Newton’s first, second, and third laws in your own words.', 'Draw a force diagram for a pushed box or kicked ball.', 'Explain which law is shown when the object starts moving, speeds up, or pushes back.'],
    'chemical-bonding': ['Complete a table comparing ionic, covalent, and metallic bonding.', 'Draw a simple electron-transfer or sharing model.', 'Match each bond type with one property such as conductivity, melting point, or hardness.'],
    'mole-gas-laws': ['Calculate moles from a given mass and molar mass.', 'State one gas-law relationship using pressure, volume, or temperature.', 'Show formula, substitution, answer, unit, and one reasonableness check.'],
    'reproductive-health': ['Label a teacher-approved reproductive-system diagram.', 'Write one function for three labelled parts.', 'List two respectful health, hygiene, privacy, or safety points.'],
    soil: ['Compare two safe soil samples by colour, texture, and water retention.', 'Record observations in a table.', 'Explain which soil may support plant growth better and why.'],
    muscles: ['Draw and label a simple joint and muscle action.', 'Explain how a muscle helps movement by pulling.', 'List two habits that protect muscles during work or exercise.'],
    benzene: ['Draw or interpret a benzene ring representation.', 'State the formula C6H6 and one feature of delocalised electrons.', 'Explain one safe handling rule for organic compounds or solvents.'],
    radioactivity: ['Compare alpha, beta, and gamma radiation in a table.', 'Solve one half-life count-rate question.', 'Write two radiation safety rules involving time, distance, or shielding.'],
    'general-science': ['Write one clear science question for the topic.', 'Use a labelled diagram, observation table, or model to record evidence.', 'Write a conclusion that answers the question and uses topic vocabulary.'],
    'measurement-safety': ['Name three laboratory safety rules.', 'Measure one classroom object and record the value with a unit.', 'Explain one error that can make a measurement unreliable.'],
    motion: ['A bicycle moves 30 m in 6 s. Calculate its speed.', 'Draw a two-row table for distance and time.', 'Explain what happens to speed if the same distance takes more time.'],
    force: ['Name two pushes and two pulls from daily life.', 'State one effect of force on a moving object.', 'Draw arrows to show forces on a box being pushed.'],
    gravity: ['Balance a safe flat object and mark the balance point.', 'Explain why a wide base improves stability.', 'Name one object designed to avoid toppling.'],
    energy: ['Give two examples of energy transformation.', 'Explain when work is done on an object.', 'Compare work and power in one sentence.'],
    machines: ['Name three simple machines.', 'Identify the load, effort, and pivot in a lever.', 'Explain how changing the pivot changes the effort.'],
    matter: ['Draw particles in a solid, liquid, and gas.', 'Explain why gases fill containers.', 'State what heating does to particle movement.'],
    heat: ['Read a thermometer diagram or classroom thermometer safely.', 'State the direction heat flows between hot and cold objects.', 'Compare heat and temperature in one sentence.'],
    magnetism: ['Test five safe materials with a magnet.', 'Record attracted/not attracted in a table.', 'State what happens when like poles are brought together.'],
    electrostatics: ['Describe how to charge a plastic ruler safely.', 'State whether like charges attract or repel.', 'Name one situation where static charge is noticed.'],
    electricity: ['Draw a complete circuit with a cell, switch, and bulb.', 'Explain why a broken circuit stops current.', 'List two electrical safety rules.'],
    light: ['Draw a straight ray of light from a torch.', 'Explain how a shadow forms.', 'Name one smooth reflector and one rough surface.']
  };
  const domain = scienceDomain(topic);
  const selected = tasks[domain] || ['Write one safe investigation question.', 'Name materials and observations needed.', 'Use the evidence to write a conclusion.'];
  const outcomeLine = outcomes[0]?.text ? `Main outcome: ${outcomes[0].text}.` : `Main outcome: investigate and explain ${unit.toLowerCase()} using evidence.`;
  return `Practice for ${unit}:\n\n${outcomeLine}\n\n${selected.map((task, index) => `${index + 1}. ${task}`).join('\n')}\n\nAnswer check:\nA strong science answer names the idea, uses correct units or labels where needed, records evidence, and writes a conclusion that follows from the evidence.\n\nSafety check: use only teacher-approved materials and never test mains electricity, heat, sharp tools, or chemicals without direct supervision.`;
}

function mathOutcomeCheckBlock(topic, outcome, criteria) {
  const unit = topic.unitTitle;
  const outcomeText = sentenceCase(outcome.text);
  const checks = {
    decimals: ['Write 6 tenths as a decimal.', 'Compare 3.08 and 3.8 using place value.', 'Explain why your comparison is correct.'],
    fractions: ['Draw 5/8 on a fraction strip.', 'Calculate 3/9 + 4/9.', 'Explain why the denominator does not change.'],
    mass: ['Convert 4 kg to grams.', 'Compare 2500 g and 3 kg.', 'Write the heavier mass with a reason.'],
    capacity: ['Convert 5 litres to millilitres.', 'Solve: a 12-litre container is filled by 3-litre bottles. How many bottles?', 'Check the answer by multiplication.'],
    length: ['Convert 6 m to centimetres.', 'Find the total length of 45 m and 38 m.', 'State the unit clearly.'],
    area: ['Find the area of a rectangle 7 units by 5 units.', 'Explain why the answer uses square units.', 'Draw a quick labelled sketch.'],
    time: ['Convert 3 hours to minutes.', 'Find the duration from 8:20 to 9:05.', 'Write the answer in minutes.'],
    patterns: ['Continue 7, 14, 21, 28, __, __.', 'Write the rule.', 'Create one new pattern with the same rule.'],
    proportion: ['A recipe uses 2 cups of flour for 6 cakes. How many cups for 18 cakes?', 'Write the unit rate or scale factor.', 'Check that both quantities changed by the same factor.'],
    'missing-numbers': ['Find 52 + __ = 90.', 'Find __ - 25 = 46.', 'Check both answers with inverse operations.'],
    'lines-angles': ['Draw and label one right angle.', 'Name one pair of parallel lines.', 'Explain how you know.'],
    'circle-geometry': ['Draw and label a circle centre, radius, and diameter.', 'If radius is 4 cm, find diameter.', 'Explain why diameter is twice the radius.'],
    'solid-geometry': ['Name the faces of a cuboid.', 'Count edges and vertices of a cube.', 'Describe one difference between a cuboid and a cylinder.'],
    shapes: ['Draw a square and a rectangle.', 'Write two properties they share.', 'Write one property that is different.'],
    factors: ['List all factors of 18.', 'List the first five multiples of 6.', 'Circle any prime numbers in 2, 3, 4, 5, 6.'],
    integers: ['Place -3, 0, and +4 on a number line.', 'Which number is greatest?', 'Find the distance from -3 to +4.'],
    'whole-numbers': ['Add 34,785 and 21,406.', 'Estimate the answer to check it.', 'Explain one place-value step.']
  };
  const tasks = checks[mathDomain(topic)] || ['Write one clear example from the topic.', 'Solve it with labelled steps.', 'Check the answer in context.'];
  return `Outcome check for ${unit}: ${outcomeText}.\n\n${tasks.map((task, index) => `${index + 1}. ${task}`).join('\n')}\n\nSuccess criteria:\n${criteria}`;
}

function scienceOutcomeCheckBlock(topic, outcome, criteria) {
  const unit = topic.unitTitle;
  const outcomeText = sentenceCase(outcome.text);
  const checks = {
    'computer-science': ['State the computing task or problem.', 'Show the algorithm, code fragment, table, web page structure, database object, diagram, or security control.', 'Test with one example and write one correction.'],
    'ict-productivity': ['Create a two-column table or worksheet for a real class task.', 'Use one correct heading, formula, save step, or formatting step.', 'Explain how the digital file can be checked for errors.'],
    'newtons-laws': ['State one Newton law correctly.', 'Apply it to a moving or resting object.', 'Draw or describe the force direction.'],
    'chemical-bonding': ['Compare ionic and covalent bonding in one table.', 'State whether electrons are transferred or shared.', 'Link one bond type to one property.'],
    'mole-gas-laws': ['Calculate moles using mass / molar mass.', 'Write the formula and unit.', 'State one controlled condition in a gas-law example.'],
    'reproductive-health': ['Label three structures on a teacher-approved diagram.', 'Write one function for each.', 'Add one respectful health or hygiene point.'],
    soil: ['Name two soil components.', 'Compare two soil properties.', 'Explain one way to protect soil from damage.'],
    muscles: ['State how muscles create movement.', 'Name one joint or body movement example.', 'Write one habit that keeps muscles healthy.'],
    benzene: ['Draw or identify the benzene ring.', 'State the formula C6H6.', 'Link ring structure to one reaction or safety point.'],
    radioactivity: ['Distinguish alpha, beta, and gamma radiation.', 'Use half-life in one simple calculation.', 'Write one radiation safety rule.'],
    'general-science': ['State the science question.', 'Show the evidence with a labelled diagram, table, model, or observation.', 'Write a conclusion that follows from the evidence.'],
    motion: ['Calculate the speed of an object that moves 20 m in 5 s.', 'State the formula used.', 'Write the unit.'],
    force: ['Name one push and one pull.', 'State one effect of an unbalanced force.', 'Draw an arrow to show force direction.'],
    gravity: ['Explain why a low, wide object is more stable.', 'Name one example.', 'Use the term centre of gravity correctly.'],
    energy: ['Give one example of energy changing form.', 'Explain when work is done.', 'Compare work and power in one sentence.'],
    machines: ['Name one simple machine.', 'Identify load, effort, and pivot or contact point.', 'Explain how it makes work easier.'],
    matter: ['Compare particles in a solid and a gas.', 'Draw a simple particle diagram.', 'Explain what heating changes.'],
    heat: ['State the direction heat flows.', 'Describe safe thermometer reading.', 'Use the word temperature correctly.'],
    magnetism: ['Name two magnetic materials.', 'State what happens with like poles.', 'Describe a fair magnet test.'],
    electrostatics: ['Describe how rubbing can charge an object.', 'State whether like charges attract or repel.', 'Give one safe classroom observation.'],
    electricity: ['Draw a complete circuit.', 'Explain why a switch can stop current.', 'Write one electrical safety rule.'],
    light: ['Draw a straight light ray.', 'Explain how a shadow forms.', 'Describe reflection from a smooth surface.']
  };
  const tasks = checks[scienceDomain(topic)] || ['State a safe investigation question.', 'Name the evidence needed.', 'Write a conclusion from the evidence.'];
  return `Outcome check for ${unit}: ${outcomeText}.\n\n${tasks.map((task, index) => `${index + 1}. ${task}`).join('\n')}\n\nSuccess criteria:\n${criteria}`;
}

function isLanguageSubject(subjectTitle) {
  return ['English', 'Kiswahili', 'Kinyarwanda', 'French', 'English Language'].includes(subjectTitle);
}

function isCreativePracticalSubject(subjectTitle) {
  return subjectTitle.includes('Creative') || subjectTitle.includes('Art') || subjectTitle.includes('Sports') || subjectTitle.includes('Michezo');
}

function languageDomain(topic) {
  const text = topicWords(topic);
  if (/school|timetable|subject|ishuri|école|ecole|matière|matiere/.test(text)) return 'school';
  if (/friend|my friends|themselves/.test(text)) return 'friends';
  if (/district|community|village|town/.test(text)) return 'district';
  if (/weather|climate|ikirere|pluie|rain|soleil/.test(text)) return 'weather';
  if (/job|role|profession|market/.test(text)) return 'jobs';
  if (/animal|wild/.test(text)) return 'animals';
  if (/right|responsibilit|need/.test(text)) return 'rights';
  if (/past|history|yesterday|event/.test(text)) return 'past';
  if (/country|river|architecture|world|ibidukikije|environment|rwanda/.test(text)) return 'places';
  if (/health|body|ubuzima|santé|sante/.test(text)) return 'health';
  if (/transport|orient|direction/.test(text)) return 'directions';
  if (/food|meal|repas/.test(text)) return 'food';
  if (/itumanaho|ikoranabuhanga|technology|communication|iterambere|development/.test(text)) return 'communication';
  return 'communication';
}

function isEnglishSubjectTitle(subjectTitle) {
  return subjectTitle === 'English' || subjectTitle === 'English Language';
}

function englishSkillFocus(topic) {
  const text = topicWords(topic);
  if (/vocabulary|word|meaning|dictionary|context/.test(text)) return 'vocabulary';
  if (/speaking|listening|debate|discussion|interview|presentation|speech|oral/.test(text)) return 'speaking';
  if (/grammar|sentence|tense|clause|connector|punctuation/.test(text)) return 'grammar';
  if (/writing|paragraph|letter|essay|report|summary|functional|creative/.test(text)) return 'writing';
  if (/comprehension|evidence|infer|inference|purpose|reading|narrative|text|literature|poetry|prose|drama/.test(text)) return 'reading';
  if (/editing|proofreading|revision|accuracy|final draft/.test(text)) return 'editing';
  return 'communication';
}

function englishMiniPassage(context, topic, variant = 0) {
  const unit = topic.unitTitle;
  const gradeMove = languageGradeFocus('English', topic.grade);
  const countryExample = countryExamplePhrase(context);
  const focus = englishSkillFocus(topic);
  const topicLabel = unit.toLowerCase();
  const pick = items => items[Math.abs(variant) % items.length];
  const passages = {
    reading: [
      `Mini passage:\nIn ${countryExample} classroom, a learner reads a short text about ${topicLabel}. The first paragraph introduces the idea, the middle paragraph gives two actions or details, and the final paragraph shows what changed. A careful reader marks the main idea, underlines two details, and explains how the details support the answer.`,
      `Mini passage:\nA class group studies a short article linked to ${topicLabel}. One learner writes the main idea too quickly, but another asks, Which sentence proves it? The group returns to the text, chooses two exact details, and changes the answer so it is based on evidence, not guessing.`,
      `Mini passage:\nDuring silent reading, a learner notices that the title, first sentence, and final sentence all point to ${topicLabel}. She writes a short summary, then checks whether every sentence in her answer can be traced back to the passage. This is how careful readers avoid unsupported opinions.`
    ],
    vocabulary: [
      `Mini passage:\nA learner meets an unfamiliar word in a passage about ${topicLabel}. The sentence before it gives a clue, and the sentence after it shows an example. The learner tests a meaning, checks whether the sentence still makes sense, and then writes a new sentence using the word correctly.`,
      `Mini word study:\nThe class builds a word bank for ${topicLabel}. For each word, learners write a simple meaning, a sentence from the topic, and one related word. A word is not truly learned until the learner can use it naturally in speech or writing.`,
      `Mini passage:\nA learner chooses three words from ${topicLabel} and sorts them into known, partly known, and new. She asks a partner to test one meaning, then improves her example sentence so the word is clear from context.`
    ],
    speaking: [
      `Mini dialogue:\nA: What point should our group make about ${topicLabel}?\nB: We should give one clear idea and one reason.\nA: What if someone disagrees?\nB: We listen first, then answer politely with evidence or an example.\nA: That will make the discussion stronger.`,
      `Mini situation:\nA learner prepares a short talk about ${topicLabel}. He writes three cue words, practises the first sentence, and checks his voice with a partner. When he speaks, he looks up, gives one example, and answers a follow-up question calmly.`,
      `Mini dialogue:\nA: I think the strongest answer is the one with a reason.\nB: I agree, but it also needs a clear example from ${topicLabel}.\nA: Let us combine both ideas.\nB: Good. Then our group answer will be clearer.`
    ],
    grammar: [
      `Mini passage:\nClear grammar helps the reader follow ${topicLabel}. In the sentence The class discusses the passage before writing, the subject is The class, the verb is discusses, and the time phrase is before writing. A strong sentence keeps subject, verb, tense, punctuation, and meaning together.`,
      `Mini grammar check:\nA learner writes: The group read the text and writes answer. The class improves it to: The group reads the text and writes an answer. The correction keeps the tense consistent and completes the noun phrase.`,
      `Mini passage:\nWhen a sentence about ${topicLabel} is too long, the reader can lose the meaning. A learner splits one long sentence into two shorter ones, adds a full stop, and checks that each sentence has a subject and a verb.`
    ],
    writing: [
      `Mini model:\nA useful paragraph about ${topicLabel} has one controlling idea. It begins with a topic sentence, adds two connected details, and ends by answering the task. The writer removes any sentence that does not support the main idea.`,
      `Mini writing plan:\nBefore writing, a learner lists the audience, purpose, and three details for ${topicLabel}. She chooses the strongest two details, writes a topic sentence, and leaves time to revise one weak sentence after reading aloud.`,
      `Mini model:\nThe first draft gives ideas; the second draft makes them clear. A learner writing about ${topicLabel} checks whether the paragraph has a beginning, useful details, and a closing sentence that answers the question directly.`
    ],
    editing: [
      `Mini passage:\nFirst draft: my group read about ${topicLabel} it was interesting we answer questions. Improved draft: My group read about ${topicLabel} and answered three questions. The improved sentence uses a capital letter, a full stop, correct tense, and a clearer order of ideas.`,
      `Mini editing note:\nA learner circles one unclear sentence about ${topicLabel}. She checks capital letters, punctuation, tense, and word choice. Then she rewrites only the weak sentence and explains why the new version is easier to understand.`,
      `Mini passage:\nEditing is not decoration. When learners edit a response about ${topicLabel}, they ask: Is the meaning clear? Is the tense correct? Are important words spelled correctly? Does the sentence answer the task?`
    ],
    communication: [
      `Mini situation:\nA learner prepares a short answer about ${topicLabel}. First, she names the topic. Next, she gives one exact detail from the text or discussion. Then she explains why the detail matters. Finally, she reads her answer aloud and fixes one unclear sentence.`,
      `Mini situation:\nA group message about ${topicLabel} becomes clearer after learners remove repeated words, add one useful detail, and place ideas in order. Communication improves when the listener or reader can follow the message without guessing.`,
      `Mini situation:\nA learner listens to a partner explain ${topicLabel}. Before replying, he repeats the main idea in his own words. This shows careful listening and helps both learners correct misunderstandings before writing the final answer.`
    ]
  };
  return `${pick(passages[focus] || passages.communication)}\n\n${gradeMove}`;
}

function englishLesson(context, topic, vocabulary) {
  const unit = topic.unitTitle;
  const focus = englishSkillFocus(topic);
  const focusGuides = {
    reading: `This topic is about reading for meaning. Read in layers: first find what the text is mostly about, then collect two details, then explain how those details prove your answer. Do not copy a whole paragraph when one exact phrase or event is enough.`,
    vocabulary: `This topic is about building word power. A strong reader uses clues before and after a word, checks the word family, tests the meaning in the sentence, and then uses the word in a new sentence that still sounds natural.`,
    speaking: `This topic is about spoken communication. Prepare one clear idea, give a reason, listen to the other speaker, and respond politely. Good speaking is organised thinking in a voice others can follow.`,
    grammar: `This topic is about sentence control. A correct sentence has a clear subject, a matching verb, accurate tense, useful punctuation, and a word order that helps the reader follow the meaning.`,
    writing: `This topic is about writing with purpose. Plan before you write, keep each paragraph on one idea, support the idea with details, and revise the sentence that feels vague or unfinished.`,
    editing: `This topic is about improving a draft. Editing checks meaning first, then sentence order, tense, spelling, punctuation, and word choice. A good edit makes the answer easier to understand without changing the task.`,
    communication: `This topic is about making meaning clear. Whether you read, listen, speak, or write, begin with the exact task, choose one useful detail, and check that your final answer can be understood by another learner.`
  };
  return `${focusGuides[focus] || focusGuides.communication}\n\n${englishMiniPassage(context, topic)}\n\nWhat to notice in ${unit}:\n- Start with the exact task, not a general answer.\n- Use a detail from the text, talk, example, or situation.\n- Choose words that match the audience and purpose.\n- Write or speak in complete, connected sentences.\n- Revise one weak sentence after feedback.\n\nKey words:\n${vocabulary}`;
}

function englishWorkedExample(context, topic) {
  const unit = topic.unitTitle;
  const focus = englishSkillFocus(topic);
  const gradeNumber = Number(String(topic.grade || '').match(/\d+/)?.[0] || 0);
  const topicLabel = unit.toLowerCase();
  const grammarExamples = [
    `Worked example for ${unit}: Improve a weak sentence.\n\nWeak sentence: The group read about ${topicLabel} and writes answer.\n\nImproved sentence: The group reads about ${topicLabel} and writes an answer.\n\nWhy it works:\n- The tense is consistent.\n- The noun phrase an answer is complete.\n- The sentence keeps one clear idea.`,
    `Worked example for ${unit}: Improve a weak sentence.\n\nWeak sentence: A learner explain ${topicLabel} but forget the full stop.\n\nImproved sentence: A learner explains ${topicLabel} and uses a full stop.\n\nWhy it works:\n- The verb agrees with the subject.\n- The correction keeps the idea simple.\n- The punctuation marks the end of the sentence.`,
    `Worked example for ${unit}: Improve a weak sentence.\n\nWeak sentence: We was discussing ${topicLabel} before we writes notes.\n\nImproved sentence: We were discussing ${topicLabel} before we wrote notes.\n\nWhy it works:\n- The verb form matches the subject.\n- The time relationship is clearer.\n- The sentence now sounds natural when read aloud.`
  ];
  const examples = {
    reading: `Worked example for ${unit}: Answer a comprehension question with evidence.\n\nQuestion: Why did the group succeed?\n\nModel answer:\nThe group succeeded because each learner took a clear role. One learner read the instructions, another recorded ideas, and another checked the final answer. This evidence shows teamwork, not luck.\n\nWhy it works:\n- It answers the question directly.\n- It gives two details.\n- It explains how the details prove the answer.`,
    vocabulary: `Worked example for ${unit}: Work out a word from context.\n\nSentence: The monitor arranged the books neatly, so the teacher praised the orderly shelf.\n\nModel answer:\nOrderly means neat and well arranged. I know this because the sentence says the monitor arranged the books neatly.\n\nTry the method:\n1. Read before and after the word.\n2. Guess the meaning.\n3. Check whether the sentence still makes sense.`,
    speaking: `Worked example for ${unit}: Give a short oral contribution.\n\nPrompt: Suggest one way to improve group reading.\n\nModel answer:\nOur group should let each learner read one paragraph aloud. This gives everyone practice and helps us notice pronunciation mistakes kindly.\n\nWhy it works:\n- It is polite.\n- It gives one clear suggestion.\n- It adds a reason.`,
    grammar: grammarExamples[gradeNumber % grammarExamples.length],
    writing: `Worked example for ${unit}: Build a paragraph.\n\nTopic sentence: A school library helps learners become confident readers.\nDetail 1: Learners meet new words in stories and information texts.\nDetail 2: They can borrow books and practise reading at home.\nClosing sentence: Regular library reading improves vocabulary and confidence.\n\nFinal paragraph:\nA school library helps learners become confident readers. Learners meet new words in stories and information texts. They can borrow books and practise reading at home. Regular library reading improves vocabulary and confidence.`,
    editing: `Worked example for ${unit}: Edit for clarity.\n\nDraft: in our class we read story and it help us speak good\n\nEdited answer:\nIn our class, we read a story and used it to practise clear speaking.\n\nCorrection notes:\n- Added capital letter and comma.\n- Added a before story.\n- Replaced speak good with clear speaking.\n- Kept the meaning focused.`
  };
  return examples[focus] || `Worked example for ${unit}: Make a clear response.\n\nTask: Explain one idea from the topic.\n\nModel answer:\n${unit} helps me communicate more clearly because I can choose the right words, give one useful detail, and check whether my sentence makes sense to the reader or listener.\n\nWhy it works:\n- It names the skill.\n- It gives a reason.\n- It explains how the skill is used in real communication.`;
}

function englishPracticeBlock(context, topic, outcomes) {
  const unit = topic.unitTitle;
  const focus = englishSkillFocus(topic);
  const outcomeLine = outcomes[0]?.text ? `Main outcome: ${outcomes[0].text}.` : `Main outcome: communicate clearly about ${unit.toLowerCase()}.`;
  const tasksByFocus = {
    reading: ['Read a short text silently.', 'Write the main idea in one sentence.', 'Quote or describe two details that support the answer.', 'Explain how one detail changes your understanding.'],
    vocabulary: ['Choose five words from the topic.', 'Explain each word using your own words.', 'Write one sentence for each word.', 'Exchange sentences with a partner and correct unclear meanings.'],
    speaking: ['Prepare a two-sentence opinion about the topic.', 'Give one reason and one example.', 'Listen to a partner and repeat their main idea before replying.', 'Improve your answer using one stronger word.'],
    grammar: ['Write three sentences linked to the topic.', 'Underline the subject and verb in each sentence.', 'Check tense, punctuation, and word order.', 'Rewrite one weak sentence more clearly.'],
    writing: ['Plan a paragraph with a topic sentence, two details, and a closing sentence.', 'Write the paragraph in six to eight lines.', 'Circle one vague word and replace it.', 'Read the paragraph aloud and revise one sentence.'],
    editing: ['Find one sentence from your previous work.', 'Check capital letters, punctuation, tense, spelling, and word choice.', 'Rewrite the sentence.', 'Write a correction note explaining what improved.'],
    communication: ['State the exact task.', 'Give one detail from a text, talk, example, or local situation.', 'Write or say a complete answer.', 'Check whether the answer matches the success criteria.']
  };
  const tasks = tasksByFocus[focus] || tasksByFocus.communication;
  return `Practice for ${unit}:\n\n${outcomeLine}\n\n${tasks.map((task, index) => `${index + 1}. ${task}`).join('\n')}\n\nCorrection check:\n- Is the meaning clear?\n- Does the answer use topic vocabulary?\n- Is there evidence, a reason, or a useful example?\n- Have spelling, punctuation, grammar, and sentence order been checked?\n\nHome link: Ask someone at home one question connected to ${unit.toLowerCase()} and turn their answer into two clear sentences.`;
}

function englishSkillExpansionBlock(context, topic, mode, cycle) {
  const unit = topic.unitTitle;
  const taskNumber = cycle + 1;
  const miniText = englishMiniPassage(context, topic, cycle + mode.key.length);
  const instructions = {
    reading: ['Read the mini passage twice.', 'Write the main idea.', 'Find two details and explain what they prove.', 'Write one question a careful reader should ask.'],
    vocabulary: ['Choose four useful words.', 'Write a learner-friendly meaning for each word.', 'Use each word in a sentence about school, home, community, or reading.', 'Replace one vague word with a stronger topic word.'],
    speaking: ['Prepare a short answer with one reason.', 'Say it to a partner clearly.', 'Listen to the partner and ask one follow-up question.', 'Repeat your answer with better word choice.'],
    grammar: ['Write one short sentence.', 'Add a reason, time phrase, place phrase, or description.', 'Check subject-verb agreement and tense.', 'Correct punctuation.'],
    writing: ['Plan a paragraph before writing.', 'Add two connected details.', 'Write a closing sentence that answers the task.', 'Revise one weak sentence after reading aloud.'],
    comprehension: ['What is the main idea?', 'Which two details support it?', 'What word or phrase needs context clues?', 'What question remains after reading?'],
    editing: ['Choose one sentence to improve.', 'Correct spelling, punctuation, tense, and word order.', 'Replace one vague word.', 'Read the final sentence aloud.'],
    fluency: ['Read the passage smoothly.', 'Practise the hardest sentence three times.', 'Say a new sentence without looking.', 'Ask whether the meaning was easy to follow.']
  };
  const selected = instructions[mode.key] || instructions.reading;
  return `Session ${taskNumber}: ${unit} - ${mode.title}\n\n${miniText}\n\nTasks:\n${selected.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n\nQuality check: stay on the topic, use exact words, give evidence or a reason, and improve one sentence after feedback.`;
}

function englishVocabularyStudyBlock(context, topic, vocabulary) {
  return `Use these words before you practise ${topic.unitTitle}. In English, vocabulary is useful only when you can understand it in context and use it in your own sentence.\n\nKey words:\n${vocabulary}\n\nStudy routine:\n1. Choose three key words.\n2. Find or create a sentence where each word makes sense.\n3. Explain each word in learner-friendly language.\n4. Add one synonym, opposite, word family member, or example where possible.\n5. Use one word in a spoken answer and one word in a written answer.\n\nCommon mistake to avoid: ${topic.misconceptions[0]}.`;
}

function languageLesson(context, subjectTitle, topic, vocabulary) {
  const unit = topic.unitTitle;
  const domain = languageDomain(topic);
  if (isEnglishSubjectTitle(subjectTitle)) {
    return englishLesson(context, topic, vocabulary);
  }
  if (subjectTitle === 'French') {
    return `${unit} aide l'apprenant à utiliser un français simple dans une situation réelle.\n\n${languageMiniText(context, subjectTitle, topic)}\n\nÀ retenir:\n- Écoute ou lis l'idée principale avant d'écrire.\n- Utilise des phrases courtes, puis ajoute un détail utile.\n- Vérifie les accents, l'orthographe, la ponctuation et le sens.\n\nMots clés:\n${vocabulary}`;
  }
  if (subjectTitle === 'Kinyarwanda') {
    return `${unit} ifasha umunyeshuri gusoma, kumva, kuvuga no kwandika mu Kinyarwanda kiboneye.\n\n${languageMiniText(context, subjectTitle, topic)}\n\nIbyo kwitaho:\n- Vuga igitekerezo k'ingenzi mu magambo yawe.\n- Koresha amagambo ajyanye na ${unit.toLowerCase()}.\n- Kosora interuro kugira ngo yumvikane neza.\n\nAmagambo y'ingenzi:\n${vocabulary}`;
  }
  if (subjectTitle === 'French') {
    return `${unit} aide l'apprenant à utiliser un français simple dans une situation réelle.\n\nPetit texte:\nJ'étudie le thème : ${unit}. Je lis ou j'écoute d'abord pour comprendre l'idée principale. Je repère les mots importants, puis je réponds avec une phrase complète. Mon partenaire écoute, pose une question simple, et nous corrigeons la prononciation, les accents, la ponctuation et le sens.\n\nÀ retenir:\n- Écoute l'idée principale avant d'écrire.\n- Utilise des phrases courtes, puis ajoute un détail utile.\n- Vérifie les accents, l'orthographe, la ponctuation et le sens.\n\nMots clés:\n${vocabulary}`;
  }
  if (subjectTitle === 'Kinyarwanda') {
    return `${unit} ifasha umunyeshuri gusoma, kumva, kuvuga no kwandika mu Kinyarwanda kiboneye.\n\nUmwandiko mugufi:\nUmunyeshuri asoma umutwe w'isomo, agashaka igitekerezo k'ingenzi n'amagambo y'ingenzi, hanyuma agasubiza mu nteruro yuzuye. Mugenzi we amutega amatwi, akamubaza ikibazo kimwe, maze bombi bagakosora imyandikire, utwatuzo n'igisobanuro.\n\nIbyo kwitaho:\n- Vuga igitekerezo k'ingenzi mu magambo yawe.\n- Koresha amagambo ajyanye na ${unit.toLowerCase()}.\n- Kosora interuro kugira ngo yumvikane neza.\n\nAmagambo y'ingenzi:\n${vocabulary}`;
  }
  if (subjectTitle === 'Kiswahili') {
    return `${unit} humsaidia mwanafunzi kusoma, kuzungumza, kusikiliza, na kuandika kwa uwazi.\n\nKifungu kifupi:\nMwanafunzi anasoma mada, anatambua maneno muhimu, kisha anaandika jibu kwa sentensi kamili. Mwenzake anasikiliza, anauliza swali moja, na wote wawili wanakagua tahajia, alama za uandishi, na maana.\n\nZingatia:\n- Eleza wazo kuu kwa maneno yako.\n- Tumia msamiati unaofaa mada.\n- Sahihisha sentensi moja ili iwe wazi zaidi.\n\nKey words:\n${vocabulary}`;
  }
  const lessons = {
    school: `${unit} teaches learners to talk and write about school life.\n\nMini passage:\nMy name is Aline. I study Mathematics on Monday morning and English after break. Our timetable helps us arrive on time. My favourite subject is Science because I enjoy asking questions.\n\nLanguage focus:\n- Use present simple verbs: I study, we read, they play.\n- Use time words: morning, afternoon, Monday, after break.\n- Use quantity words when needed: many books, some pencils, a few questions.\n\nKey words:\n${vocabulary}`,
    friends: `${unit} teaches learners to describe themselves and friends kindly.\n\nMini dialogue:\nMutesi: Who is your friend?\nEric: My friend is Keza. She is helpful and likes reading.\nMutesi: What do you do together?\nEric: We revise after class and play netball during break.\n\nLanguage focus:\n- Use describing words kindly.\n- Use first person and third person correctly: I am, she is, he likes, we play.\n- Add one reason or example.\n\nKey words:\n${vocabulary}`,
    district: `${unit} teaches learners to describe places in a district.\n\nMini passage:\nOur district has schools, health centres, farms, roads, shops, and offices. The market is near the bus stop. The health centre is behind the school. People work together to keep the district clean.\n\nLanguage focus:\n- Use place words: near, behind, beside, between, opposite.\n- Name real places clearly.\n- Use complete sentences.\n\nKey words:\n${vocabulary}`,
    weather: `${unit} teaches learners to describe weather and keep a simple weather diary.\n\nMini diary:\nMonday: It was cloudy in the morning. It rained after lunch. We carried umbrellas and kept our books dry.\nTuesday: It was sunny. The class watered the young plants after school.\n\nLanguage focus:\n- Use weather words: sunny, rainy, cloudy, windy, cold, hot.\n- Use past or present tense carefully.\n- Add what people did because of the weather.\n\nKey words:\n${vocabulary}`,
    jobs: `${unit} teaches learners to talk about jobs and roles at home and in the community.\n\nMini passage:\nAt home, my brother fetches water and I sweep the compound. In our community, a nurse helps sick people, a farmer grows food, and a driver carries passengers safely.\n\nLanguage focus:\n- Name the job or role.\n- Say what the person does.\n- Use respectful language for all work.\n\nKey words:\n${vocabulary}`,
    animals: `${unit} teaches learners to read, describe, and write about animals.\n\nMini passage:\nA giraffe has a long neck and eats leaves. A lion is strong and hunts for food. A gorilla lives in a group and cares for its young. Wild animals need safe habitats.\n\nLanguage focus:\n- Use describing words.\n- Write facts, not guesses.\n- Use has/have and is/are correctly.\n\nKey words:\n${vocabulary}`,
    rights: `${unit} teaches learners to discuss rights, responsibilities, and needs.\n\nMini passage:\nChildren need food, safety, education, health care, and love. A right protects what a child must receive. A responsibility is something a child should do, such as respecting others and caring for shared materials.\n\nLanguage focus:\n- Explain a right in simple words.\n- Match each right with a responsibility.\n- Use polite discussion words.\n\nKey words:\n${vocabulary}`,
    past: `${unit} teaches learners to speak and write about past events.\n\nMini passage:\nYesterday our class visited the library. We read a story, asked questions, and borrowed books. After the visit, I wrote three new words in my notebook.\n\nLanguage focus:\n- Use past-tense verbs: visited, read, asked, borrowed, wrote.\n- Put events in order.\n- Add when and where the event happened.\n\nKey words:\n${vocabulary}`,
    places: `${unit} teaches learners to describe countries, rivers, and important structures.\n\nMini passage:\nRwanda is in East Africa. The Nyabarongo River is important for people and the environment. Famous structures around the world show how people use design, materials, and teamwork.\n\nLanguage focus:\n- Use capital letters for names of places.\n- Use descriptive words and facts.\n- Compare two places respectfully.\n\nKey words:\n${vocabulary}`
  };
  return lessons[domain] || `${unit} teaches learners to understand a message and respond clearly.\n\nMini task:\nRead or listen to a short text. Say the main idea. Name two details. Use the details to write or speak a clear answer.\n\nLanguage focus:\n- Use complete sentences.\n- Choose words that fit the situation.\n- Check spelling, punctuation, grammar, and meaning.\n\nLocal link: use examples from ${context.name} school, home, community, culture, environment, and daily responsibilities.\n\nKey words:\n${vocabulary}`;
}

function languageWorkedExample(context, subjectTitle, topic) {
  const unit = topic.unitTitle;
  const domain = languageDomain(topic);
  if (isEnglishSubjectTitle(subjectTitle)) {
    return englishWorkedExample(context, topic);
  }
  if (subjectTitle === 'French') {
    const examples = {
      school: `Modèle pour ${unit}: Écris deux phrases sur ton emploi du temps.\n\nRéponse modèle:\nLe lundi matin, j'étudie les mathématiques. Après la pause, je lis un texte en français et je souligne les mots nouveaux.\n\nPourquoi c'est correct:\n- Les phrases disent quand.\n- Elles nomment les matières.\n- Elles utilisent un vocabulaire scolaire.`,
      friends: `Modèle pour ${unit}: Présente une amie avec respect.\n\nRéponse modèle:\nMon amie s'appelle Keza. Elle est patiente et elle aide le groupe à lire les mots difficiles.\n\nPourquoi c'est correct:\n- La réponse nomme la personne.\n- Elle utilise deux qualités.\n- Elle donne un exemple concret.`,
      weather: `Modèle pour ${unit}: Décris le temps et une action.\n\nRéponse modèle:\nCe matin, il faisait frais et le ciel était couvert. Nous avons gardé les cahiers au sec parce que la pluie approchait.\n\nPourquoi c'est correct:\n- La réponse décrit le temps.\n- Elle ajoute ce que les élèves ont fait.\n- Elle explique la raison.`,
      past: `Modèle pour ${unit}: Raconte un événement au passé.\n\nRéponse modèle:\nHier, notre groupe a visité la bibliothèque. Nous avons lu une histoire, puis nous avons écrit trois mots nouveaux.\n\nPourquoi c'est correct:\n- Les verbes sont au passé.\n- Les actions sont dans l'ordre.\n- Le lieu est clair.`
    };
    return examples[domain] || `Modèle pour ${unit}: Lis le mini-texte, trouve l'idée principale et réponds clairement.\n\nRéponse modèle:\nLe texte parle de ${unit.toLowerCase()}. Un détail important est _____. Ce détail aide le lecteur à comprendre le thème parce qu'il donne un exemple précis. Je peux utiliser cette idée quand je parle avec un partenaire, quand j'écris un court paragraphe ou quand je prépare une présentation.\n\nPourquoi c'est correct:\n- La réponse reste sur le thème.\n- Elle utilise un détail du texte.\n- Elle explique comment utiliser l'idée.`;
  }
  if (subjectTitle === 'Kinyarwanda') {
    const examples = {
      school: `Urugero kuri ${unit}: Andika interuro ebyiri ku ngengabihe y'ishuri.\n\nIgisubizo cy'icyitegererezo:\nKu wa mbere mu gitondo niga imibare. Nyuma y'akaruhuko nsoma umwandiko nkandika amagambo mashya.\n\nImpamvu ari cyiza:\n- Kivuga igihe.\n- Kivuga amasomo.\n- Gikoresha amagambo yo ku ishuri.`,
      friends: `Urugero kuri ${unit}: Sobanura inshuti mu mvugo yubaha.\n\nIgisubizo cy'icyitegererezo:\nInshuti yanjye yitwa Keza. Ategana amatwi kandi afasha itsinda gusoma amagambo agoye.\n\nImpamvu ari cyiza:\n- Kivuga izina.\n- Gitanga imico ibiri.\n- Gitanga urugero rufatika.`,
      weather: `Urugero kuri ${unit}: Sobanura ikirere n'igikorwa.\n\nIgisubizo cy'icyitegererezo:\nMu gitondo hari hakonje kandi ikirere cyijimye. Twarinze amakaye kuko imvura yari hafi kugwa.\n\nImpamvu ari cyiza:\n- Gisobanura ikirere.\n- Kivuga icyo abanyeshuri bakoze.\n- Gitanga impamvu.`,
      past: `Urugero kuri ${unit}: Vuga ibyabaye mu gihe cyashize.\n\nIgisubizo cy'icyitegererezo:\nEjo itsinda ryacu ryasuye isomero. Twasomye inkuru, hanyuma twandika amagambo mashya atatu.\n\nImpamvu ari cyiza:\n- Ibikorwa biri ku murongo.\n- Aho byabereye harasobanutse.\n- Interuro ziruzuye.`
    };
    return examples[domain] || `Urugero kuri ${unit}: Soma umwandiko mugufi, shaka igitekerezo k'ingenzi, hanyuma usubize mu nteruro yuzuye.\n\nIgisubizo cy'icyitegererezo:\nUmwandiko uvuga kuri ${unit.toLowerCase()}. Ingingo imwe y'ingenzi ni _____. Iyo ngingo ifasha umusomyi kumva umutwe kuko itanga urugero rusobanutse. Nabikoresha igihe nganira na mugenzi wanjye, nandika agace k'inyandiko cyangwa ntegura ikiganiro kigufi.\n\nImpamvu ari cyiza:\n- Igisubizo kiguma ku nsanganyamatsiko.\n- Gikoresha ingingo yo mu mwandiko.\n- Kigaragaza uko igitekerezo cyakoreshwa.`;
  }
  if (subjectTitle === 'French') {
    return `Modèle de langue pour ${unit}:\n\nCourt dialogue:\nA: Bonjour. Comment tu t'appelles?\nB: Je m'appelle Aline.\nA: Où habites-tu?\nB: J'habite au Rwanda.\n\nComment utiliser le modèle:\n1. Lis le dialogue à haute voix.\n2. Remplace le nom et le lieu par tes propres informations.\n3. Entraîne-toi avec un partenaire.\n4. Écris deux nouvelles phrases et vérifie les accents, la ponctuation et le sens.`;
  }
  if (subjectTitle === 'Kinyarwanda') {
    return `Urugero rwo kwiga ${unit}:\n\nUmwandiko mugufi:\nUmunyeshuri asoma umwandiko bucece, ashaka amagambo mashya, hanyuma agasubiza ibibazo mu nteruro zuzuye. Iyo atumva ijambo, arisobanurisha amagambo akikije interuro.\n\nUko wakora:\n1. Soma umutwe w'umwandiko.\n2. Shaka igitekerezo k'ingenzi.\n3. Andika amagambo mashya abiri.\n4. Subiza ikibazo ukoresheje interuro yuzuye.\n5. Kosora imyandikire n'utwatuzo.`;
  }
  const examples = {
    school: `Worked example for ${unit}: Write three sentences about your timetable.\n\nModel answer:\nI study Mathematics on Monday morning. I read English after break. My favourite subject is Science because I like experiments.\n\nWhy it works:\n- It names subjects.\n- It uses time expressions.\n- It gives one reason.`,
    friends: `Worked example for ${unit}: Describe a friend kindly.\n\nModel answer:\nMy friend is Diane. She is patient and helpful. We read together after class, and she explains difficult words kindly.\n\nWhy it works:\n- It names the friend.\n- It uses describing words.\n- It gives a real example.`,
    weather: `Worked example for ${unit}: Write a weather diary sentence.\n\nModel answer:\nOn Tuesday morning, it was cloudy and cool. We wore sweaters and kept our exercise books dry.\n\nWhy it works:\n- It says when.\n- It describes weather.\n- It explains what people did.`,
    past: `Worked example for ${unit}: Write about yesterday.\n\nModel answer:\nYesterday we visited the school garden. We watered beans, counted young plants, and wrote notes in groups.\n\nWhy it works:\n- It uses past-tense verbs.\n- It puts actions in order.\n- It says where the event happened.`
  };
  return examples[domain] || `Worked example for ${unit}: Read a short text, find the main idea, and answer clearly.\n\nModel answer frame:\nThe text is about _____. One important detail is _____. Another detail is _____. I think _____ because _____.`;
}

function languagePracticeBlock(context, subjectTitle, topic, outcomes) {
  const unit = topic.unitTitle;
  const domain = languageDomain(topic);
  if (isEnglishSubjectTitle(subjectTitle)) {
    return englishPracticeBlock(context, topic, outcomes);
  }
  if (subjectTitle === 'French') {
    const outcomeLine = outcomes[0]?.text ? `Objectif principal: ${outcomes[0].text}.` : `Objectif principal: lire, parler et écrire au sujet de ${unit.toLowerCase()}.`;
    return `Entraînement pour ${unit}:\n\n${outcomeLine}\n\n1. Lis le mini-texte à haute voix.\n2. Choisis quatre mots importants et explique leur sens simplement.\n3. Écris trois phrases complètes sur ${unit.toLowerCase()}.\n4. Pose une question à un partenaire et réponds à sa question.\n5. Corrige les accents, la ponctuation et le sens.\n\nVérification:\n- Les phrases sont-elles complètes?\n- Les mots du thème sont-ils utilisés correctement?\n- La réponse correspond-elle au sujet?\n\nLien maison: demande à quelqu'un un exemple lié à ${unit.toLowerCase()} et écris deux phrases en français.`;
  }
  if (subjectTitle === 'Kinyarwanda') {
    const outcomeLine = outcomes[0]?.text ? `Intego nyamukuru: ${outcomes[0].text}.` : `Intego nyamukuru: gusoma, kuvuga no kwandika ku nsanganyamatsiko ya ${unit.toLowerCase()}.`;
    return `Imyitozo kuri ${unit}:\n\n${outcomeLine}\n\n1. Soma umwandiko mugufi uranguruye ijwi.\n2. Hitamo amagambo ane y'ingenzi uyasobanure mu magambo yawe.\n3. Andika interuro eshatu zuzuye zijyanye na ${unit.toLowerCase()}.\n4. Baza mugenzi wawe ikibazo kimwe, na we agusubize.\n5. Kosora imyandikire, utwatuzo n'igisobanuro.\n\nIsuzuma:\n- Interuro ziruzuye?\n- Amagambo y'isomo yakoreshejwe neza?\n- Igisubizo kijyanye n'umutwe?\n\nIhuriro ryo mu rugo: baza umuntu urugero rujyanye na ${unit.toLowerCase()}, wandike interuro ebyiri.`;
  }
  const tasksByDomain = {
    school: ['Make a two-column timetable for three school subjects.', 'Write four sentences about when you study those subjects.', 'Ask a partner: What is your favourite subject? Write the answer.'],
    friends: ['List three kind describing words.', 'Write four sentences about yourself and a friend.', 'Read your sentences aloud and check pronouns.'],
    district: ['Draw a simple map with school, market, road, and health centre.', 'Write five sentences using near, behind, beside, between, or opposite.', 'Tell a partner how to move from school to the market.'],
    weather: ['Keep a three-day weather diary.', 'Write one sentence for each day.', 'Add one action people took because of the weather.'],
    jobs: ['Name five jobs or home roles.', 'Write what each person does.', 'Interview one adult or classmate about a role and report two details.'],
    animals: ['Choose one wild animal and write four facts.', 'Underline describing words.', 'Write one sentence about protecting habitats.'],
    rights: ['Match three rights with three responsibilities.', 'Write a polite classroom rule.', 'Discuss why the rule helps everyone.'],
    past: ['Write five past-tense verbs.', 'Use three of them in sentences about yesterday.', 'Put the sentences in time order.'],
    places: ['Name two countries and two rivers.', 'Write one fact about each.', 'Use capital letters correctly.']
  };
  const tasks = tasksByDomain[domain] || ['Read or listen to a short text.', 'Say the main idea.', 'Write three clear sentences with correct punctuation.'];
  const outcomeLine = outcomes[0]?.text ? `Main outcome: ${outcomes[0].text}.` : `Main outcome: communicate clearly about ${unit.toLowerCase()}.`;
  return `Practice for ${unit}:\n\n${outcomeLine}\n\n${tasks.map((task, index) => `${index + 1}. ${task}`).join('\n')}\n\nCorrection check:\n- Are the sentences complete?\n- Are spelling and punctuation checked?\n- Does the answer match the topic?\n\nHome link: Ask someone at home one question about ${unit.toLowerCase()} and write their answer in two clear sentences.`;
}

function languageExpansionModes() {
  return [
    { key: 'reading', title: 'Reading Practice', pageType: 'practice' },
    { key: 'vocabulary', title: 'Vocabulary Builder', pageType: 'explanation' },
    { key: 'speaking', title: 'Speaking And Listening', pageType: 'activity' },
    { key: 'grammar', title: 'Grammar Focus', pageType: 'explanation' },
    { key: 'writing', title: 'Writing Workshop', pageType: 'practice' },
    { key: 'comprehension', title: 'Comprehension Check', pageType: 'assessment' },
    { key: 'editing', title: 'Editing And Correction', pageType: 'practice' },
    { key: 'fluency', title: 'Fluency Practice', pageType: 'activity' }
  ];
}

function languageGradeFocus(subjectTitle, grade) {
  const code = gradeStageKey(grade || '');
  const english = {
    P4: 'Learner move: use short complete sentences, clear topic words, and one simple example.',
    P5: 'Learner move: add reasons, sequence words, and two useful details.',
    P6: 'Learner move: compare ideas, use evidence from the text, and revise for accuracy.',
    S1: 'Learner move: move from simple answers to short paragraphs with clear evidence.',
    S2: 'Learner move: compare two ideas, explain cause or purpose, and improve word choice.',
    S3: 'Learner move: analyse the message, support claims with details, and edit for precision.',
    S4: 'Learner move: prepare longer responses, organise evidence, and edit for assessment clarity.'
  };
  if (subjectTitle === 'French') {
    const french = {
      P4: 'Niveau: ecris des phrases courtes, utilise les mots du theme et ajoute un exemple simple.',
      P5: 'Niveau: ajoute une raison, des mots de liaison et deux details utiles.',
      P6: 'Niveau: compare deux idees, cite un detail du texte et corrige ta reponse.',
      S1: 'Niveau S1: passe de phrases simples a un court paragraphe avec des details clairs.',
      S2: 'Niveau S2: compare deux idees, explique une cause ou un but, et ameliore le vocabulaire.',
      S3: 'Niveau S3: analyse le message, justifie avec des details, et corrige avec precision.'
    };
    return french[code] || 'Niveau: utilise le theme, le vocabulaire et une correction claire.';
  }
  if (subjectTitle === 'Kinyarwanda') {
    const kinyarwanda = {
      P4: "Urwego: andika interuro ngufi, ukoreshe amagambo y'isomo kandi utange urugero rworoshye.",
      P5: 'Urwego: ongeraho impamvu, amagambo ahuza ibitekerezo n ingingo ebyiri z ingirakamaro.',
      P6: 'Urwego: gereranya ibitekerezo bibiri, ukoreshe ingingo yo mu mwandiko kandi ukosore igisubizo.',
      S1: 'Urwego S1: va ku nteruro zoroshye ugere ku gace k inyandiko gafite ingingo zisobanutse.',
      S2: 'Urwego S2: gereranya ibitekerezo bibiri, usobanure impamvu cyangwa intego, kandi unoze amagambo.',
      S3: 'Urwego S3: sesengura ubutumwa, ushyigikire igitekerezo ukoresheje ingingo, kandi ukosore witonze.'
    };
    return kinyarwanda[code] || "Urwego: koresha insanganyamatsiko, amagambo y'isomo n ikosora risobanutse.";
  }
  if (subjectTitle === 'Kiswahili') return english[code] || 'Grade focus: use the topic, vocabulary, and a clear correction.';
  return english[code] || 'Grade focus: use the topic, vocabulary, evidence, and a clear correction.';
}

function languageMiniText(context, subjectTitle, topic) {
  const unit = topic.unitTitle;
  const domain = languageDomain(topic);
  const gradeFocus = languageGradeFocus(subjectTitle, topic.grade);
  if (subjectTitle === 'French') {
    const texts = {
      school: `Mini-texte:\nDans mon école, chaque matière a une place dans l'emploi du temps. Le matin, je prépare mon cahier, je lis la consigne et je réponds avec une phrase complète. Après la leçon, mon groupe compare les réponses et corrige une erreur.`,
      friends: `Mini-texte:\nAline présente son amie Keza. Keza écoute avec patience, partage ses livres et aide le groupe à lire les mots difficiles. Aline explique pourquoi une bonne amie respecte les autres et parle avec gentillesse.`,
      district: `Mini-texte:\nNotre district a une école, un marché, un centre de santé et des routes. Je décris le chemin avec des mots précis: près de, derrière, devant et entre. Mon partenaire dessine le trajet pendant que je parle.`,
      weather: `Mini-texte:\nLundi, le ciel était couvert et la pluie a commencé après midi. La classe a protégé les cahiers et les jeunes plantes. Mardi, il a fait soleil, alors nous avons observé les ombres dans la cour.`,
      jobs: `Mini-texte:\nAu marché, chaque personne a un rôle. La vendeuse compte les tomates, le conducteur transporte les passagers et l'infirmier aide les malades. Je choisis un métier et j'explique son importance en deux phrases.`,
      animals: `Mini-texte:\nLe gorille vit en groupe et protège ses petits. La girafe mange des feuilles hautes. Quand je décris un animal, je donne des faits, pas des devinettes, et j'utilise des mots précis.`,
      rights: `Mini-texte:\nUn enfant a droit à la sécurité, à l'éducation et aux soins. Il a aussi des responsabilités: respecter les autres, garder le matériel propre et écouter pendant les discussions.`,
      past: `Mini-texte:\nHier, notre classe a visité la bibliothèque. Nous avons lu une histoire, posé des questions et noté trois mots nouveaux. Ensuite, j'ai écrit un court paragraphe au passé.`,
      places: `Mini-texte:\nLe Rwanda se trouve en Afrique de l'Est. Quand je parle d'un pays, d'une rivière ou d'un bâtiment important, j'écris les noms propres avec des majuscules et j'ajoute un fait utile.`,
      communication: `Mini-texte:\nPour travailler le thème ${unit}, je lis d'abord la consigne. Ensuite, je choisis les mots importants, je prépare une phrase claire, puis je demande à un partenaire si le sens est facile à comprendre.`
    };
    return `${normalizeFrenchPhrase(texts[domain] || texts.communication)}\n\n${gradeFocus}`;
  }
  if (subjectTitle === 'Kinyarwanda') {
    const texts = {
      school: `Umwandiko mugufi:\nKu ishuri, buri somo rifite igihe cyaryo. Umunyeshuri ategura ikaye, agasoma amabwiriza, hanyuma agasubiza mu nteruro yuzuye. Nyuma y'isomo, itsinda rigereranya ibisubizo rigakosora ikosa rimwe.`,
      friends: `Umwandiko mugufi:\nKeza ni inshuti itega amatwi kandi igafasha abandi gusoma amagambo agoye. Iyo tuvuga ku nshuti nziza, dutanga urugero rw'icyo ikora kandi tugakoresha imvugo yubaha abandi.`,
      district: `Umwandiko mugufi:\nAkarere kacu gafite ishuri, isoko, ivuriro n'imihanda. Nsobanura inzira nkoresheje amagambo nka hafi ya, inyuma ya, imbere ya no hagati ya. Mugenzi wanjye ashushanya inzira numva avuga.`,
      weather: `Umwandiko mugufi:\nKu wa mbere ikirere cyari cyijimye, imvura igwa nyuma ya saa sita. Twarinze amakaye n'ingemwe. Ku wa kabiri hari izuba, tureba igicucu mu kibuga.`,
      jobs: `Umwandiko mugufi:\nKu isoko, abantu bafite imirimo itandukanye. Umucuruzi abara imboga, umushoferi atwara abagenzi, umuganga agafasha abarwayi. Hitamo umurimo umwe usobanure akamaro kawo.`,
      animals: `Umwandiko mugufi:\nIngagi iba mu itsinda kandi irinda abana bayo. Iyo dusobanura inyamaswa, dutanga ibintu bifatika, tugakoresha amagambo asobanutse aho gukeka.`,
      rights: `Umwandiko mugufi:\nUmwana afite uburenganzira bwo kwiga, kuvuzwa no kurindwa. Afite n'inshingano zo kubaha abandi, gufata neza ibikoresho no gutega amatwi mu biganiro.`,
      past: `Umwandiko mugufi:\nEjo ishuri ryacu ryasuye isomero. Twasomye inkuru, tubaza ibibazo, twandika amagambo mashya atatu. Nyuma nanditse agace k'inyandiko mu gihe cyashize.`,
      places: `Umwandiko mugufi:\nIyo tuvuga u Rwanda, imigezi cyangwa ahantu h'ingenzi, twandika amazina bwite neza kandi tugatanga ingingo ifatika. Igisubizo cyiza kivuga aho hantu n'impamvu hafite akamaro.`,
      communication: `Umwandiko mugufi:\nIyo niga ${unit}, mbanza gusoma amabwiriza, ngahitamo amagambo y'ingenzi, ngategura interuro yumvikana, hanyuma nkabaza mugenzi wanjye niba igisobanuro gisobanutse.`
    };
    return `${texts[domain] || texts.communication}\n\n${gradeFocus}`;
  }
  if (subjectTitle === 'French') {
    return `Mini-texte:\nBonjour, je m'appelle Aline. J'étudie le thème : ${unit}. Je lis le texte, je cherche les mots nouveaux, puis je réponds avec une phrase complète. Quand je ne comprends pas, je demande : Que veut dire ce mot? Ensuite, je corrige ma phrase avec mon partenaire.`;
  }
  if (subjectTitle === 'Kinyarwanda') {
    return `Umwandiko mugufi:\nUmunyeshuri yiga ${unit.toLowerCase()} asoma yitonze, agashaka igitekerezo k'ingenzi, hanyuma agasubiza mu nteruro zuzuye. Iyo abonye ijambo rishya, arisobanurisha amagambo arikikije interuro. Nyuma yo kwandika, asubiramo agakosora imyandikire n'utwatuzo.`;
  }
  if (subjectTitle === 'Kiswahili') {
    return `Kifungu kifupi:\nMwanafunzi anasoma kuhusu ${unit.toLowerCase()}, anatambua wazo kuu, kisha anaandika majibu kwa sentensi kamili. Akipata neno jipya, anatumia maneno yaliyolizunguka ili kuelewa maana. Baada ya kuandika, anakagua tahajia, alama za uandishi, na maana.\n\n${gradeFocus}`;
  }
  const setting = domain === 'weather' ? 'weather diary' : domain === 'school' ? 'school timetable' : domain === 'places' ? `${context.name} map` : 'class discussion';
  return `Mini passage:\nOur class is learning ${unit.toLowerCase()} through a ${setting}. First, we read the text silently. Then we say the main idea in our own words. We choose useful vocabulary, answer in complete sentences, and improve one sentence after feedback. A strong answer is clear, kind, accurate, and linked to the topic.\n\n${gradeFocus}`;
}

function languageSkillExpansionBlock(context, subjectTitle, topic, mode, cycle) {
  const unit = topic.unitTitle;
  const vocabulary = (topic.keyVocabulary || []).slice(0, 6).join(', ');
  const miniText = languageMiniText(context, subjectTitle, topic);
  const learnerLine = subjectTitle === 'French'
    ? 'Read aloud slowly, then repeat with better pronunciation and confidence.'
    : subjectTitle === 'Kinyarwanda'
      ? 'Soma buhoro, usobanure igitekerezo kingenzi, hanyuma usubize mu nteruro yuzuye.'
      : subjectTitle === 'Kiswahili'
        ? 'Soma kwa sauti, eleza wazo kuu, kisha jibu kwa sentensi kamili.'
        : 'Read aloud, say the main idea, and answer with a complete sentence.';
  const taskNumber = cycle + 1;

  if (isEnglishSubjectTitle(subjectTitle)) {
    return englishSkillExpansionBlock(context, topic, mode, cycle);
  }

  if (subjectTitle === 'French') {
    const labels = {
      reading: 'Lecture',
      vocabulary: 'Vocabulaire',
      speaking: 'Expression orale et écoute',
      grammar: 'Grammaire',
      writing: 'Écriture',
      comprehension: 'Compréhension',
      editing: 'Correction',
      fluency: 'Fluidité'
    };
    const instructions = {
      reading: ['Lis le mini-texte deux fois.', "Dis l'idée principale en une phrase.", 'Trouve deux détails qui prouvent ta réponse.', 'Explique le lien avec le thème.'],
      vocabulary: ['Choisis quatre mots du thème.', 'Explique chaque mot simplement.', 'Écris une phrase avec chaque mot.', 'Ajoute un dessin, un synonyme ou un exemple.'],
      speaking: ['Pose une question simple à un partenaire.', 'Réponds avec deux phrases complètes.', "Répète l'idée de ton partenaire pour montrer que tu as écouté.", 'Améliore une phrase.'],
      grammar: ['Écris une phrase courte.', 'Ajoute un lieu, un temps, une description ou une raison.', "Vérifie l'accord sujet-verbe.", 'Corrige les accents et la ponctuation.'],
      writing: ["Prépare une phrase d'ouverture.", 'Ajoute deux détails utiles.', 'Écris une phrase de conclusion.', 'Relis et corrige une phrase faible.'],
      comprehension: ["Quelle est l'idée principale?", 'Quels deux détails la prouvent?', 'Que signifie un mot important?', 'Quelle question veux-tu encore poser?'],
      editing: ['Entoure une phrase à améliorer.', "Corrige l'orthographe et les accents.", 'Remplace un mot vague par un mot du thème.', 'Lis la phrase finale à voix haute.'],
      fluency: ['Lis le mini-texte avec calme.', 'Répète la phrase la plus difficile.', 'Dis une nouvelle phrase sans regarder.', 'Demande à un partenaire si le sens est clair.']
    };
    const selected = instructions[mode.key] || instructions.reading;
    return `Séance ${taskNumber}: ${unit} - ${labels[mode.key] || mode.title}\n\n${miniText}\n\nActivités:\n${selected.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n\nVérification: parle clairement, reste sur le thème, utilise les mots nouveaux, puis corrige au moins une phrase.`;
  }

  if (subjectTitle === 'Kinyarwanda') {
    const labels = {
      reading: 'Gusoma',
      vocabulary: 'Amagambo',
      speaking: 'Kuvuga no gutega amatwi',
      grammar: "Imiterere y'interuro",
      writing: 'Kwandika',
      comprehension: 'Kumva umwandiko',
      editing: 'Gukosora',
      fluency: 'Gusoma neza'
    };
    const instructions = {
      reading: ['Soma umwandiko inshuro ebyiri.', "Vuga igitekerezo k'ingenzi mu nteruro imwe.", 'Shaka ingingo ebyiri zishyigikira igisubizo cyawe.', "Sobanura aho bihuriye n'umutwe."],
      vocabulary: ["Hitamo amagambo ane y'isomo.", 'Sobanura buri jambo mu magambo yawe.', 'Koresha buri jambo mu nteruro nshya.', 'Tanga urugero rwo ku ishuri cyangwa mu rugo.'],
      speaking: ['Baza mugenzi wawe ikibazo kimwe.', 'Subiza ukoresheje interuro ebyiri zuzuye.', 'Subiramo igitekerezo cya mugenzi wawe kugira ngo werekane ko wateze amatwi.', 'Kosora interuro imwe.'],
      grammar: ['Andika interuro ngufi.', 'Ongeraho aho, igihe, ibisobanuro cyangwa impamvu.', 'Reba niba interuro yumvikana.', "Kosora imyandikire n'utwatuzo."],
      writing: ['Tegura interuro ibanza.', "Ongeraho ingingo ebyiri z'ingirakamaro.", 'Andika interuro isoza.', 'Ongera usome ukosore interuro idasobanutse.'],
      comprehension: ["Igitekerezo k'ingenzi ni iki?", 'Ni izihe ngingo ebyiri zibigaragaza?', "Ijambo ry'ingenzi risobanura iki?", 'Ni ikihe kibazo ugifite?'],
      editing: ['Hitamo interuro yo gukosora.', "Kosora imyandikire n'utwatuzo.", "Simbuza ijambo ridasobanutse ijambo ry'isomo.", 'Soma interuro ya nyuma uranguruye ijwi.'],
      fluency: ['Soma umwandiko utuje.', 'Subiramo interuro igoye kurusha izindi.', 'Vuga interuro nshya udasoma.', 'Baza mugenzi wawe niba igisobanuro cyumvikanye.']
    };
    const selected = instructions[mode.key] || instructions.reading;
    return `Isomo ${taskNumber}: ${unit} - ${labels[mode.key] || mode.title}\n\n${miniText}\n\nImyitozo:\n${selected.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n\nIsuzuma: vuga neza, guma ku nsanganyamatsiko, koresha amagambo mashya, hanyuma ukosore nibura interuro imwe.`;
  }

  if (subjectTitle === 'French') {
    const labels = {
      reading: 'Lecture',
      vocabulary: 'Vocabulaire',
      speaking: 'Expression orale et écoute',
      grammar: 'Grammaire',
      writing: 'Écriture',
      comprehension: 'Compréhension',
      editing: 'Correction',
      fluency: 'Fluidité'
    };
    const instructions = {
      reading: ['Lis le mini-texte deux fois.', 'Dis l’idée principale en une phrase.', 'Trouve deux détails qui prouvent ta réponse.', 'Explique le lien avec le thème.'],
      vocabulary: ['Choisis quatre mots du thème.', 'Explique chaque mot simplement.', 'Écris une phrase avec chaque mot.', 'Ajoute un dessin, un synonyme ou un exemple.'],
      speaking: ['Pose une question simple à un partenaire.', 'Réponds avec deux phrases complètes.', 'Répète l’idée de ton partenaire pour montrer que tu as écouté.', 'Améliore une phrase.'],
      grammar: ['Écris une phrase courte.', 'Ajoute un lieu, un temps, une description ou une raison.', 'Vérifie l’accord sujet-verbe.', 'Corrige les accents et la ponctuation.'],
      writing: ['Prépare une phrase d’ouverture.', 'Ajoute deux détails utiles.', 'Écris une phrase de conclusion.', 'Relis et corrige une phrase faible.'],
      comprehension: ['Quelle est l’idée principale?', 'Quels deux détails la prouvent?', 'Que signifie un mot important?', 'Quelle question veux-tu encore poser?'],
      editing: ['Entoure une phrase à améliorer.', 'Corrige l’orthographe et les accents.', 'Remplace un mot vague par un mot du thème.', 'Lis la phrase finale à voix haute.'],
      fluency: ['Lis le mini-texte avec calme.', 'Répète la phrase la plus difficile.', 'Dis une nouvelle phrase sans regarder.', 'Demande à un partenaire si le sens est clair.']
    };
    const selected = instructions[mode.key] || instructions.reading;
    return `Séance ${taskNumber}: ${unit} - ${labels[mode.key] || mode.title}\n\n${miniText}\n\nActivités:\n${selected.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n\nVérification: parle clairement, reste sur le thème, utilise les mots nouveaux, puis corrige au moins une phrase.`;
  }

  if (subjectTitle === 'Kinyarwanda') {
    const labels = {
      reading: 'Gusoma',
      vocabulary: 'Amagambo',
      speaking: 'Kuvuga no gutega amatwi',
      grammar: 'Imiterere y’interuro',
      writing: 'Kwandika',
      comprehension: 'Kumva umwandiko',
      editing: 'Gukosora',
      fluency: 'Gusoma neza'
    };
    const instructions = {
      reading: ['Soma umwandiko inshuro ebyiri.', 'Vuga igitekerezo k’ingenzi mu nteruro imwe.', 'Shaka ingingo ebyiri zishyigikira igisubizo cyawe.', 'Sobanura aho bihuriye n’umutwe.'],
      vocabulary: ['Hitamo amagambo ane y’isomo.', 'Sobanura buri jambo mu magambo yawe.', 'Koresha buri jambo mu nteruro nshya.', 'Tanga urugero rwo ku ishuri cyangwa mu rugo.'],
      speaking: ['Baza mugenzi wawe ikibazo kimwe.', 'Subiza ukoresheje interuro ebyiri zuzuye.', 'Subiramo igitekerezo cya mugenzi wawe kugira ngo werekane ko wateze amatwi.', 'Kosora interuro imwe.'],
      grammar: ['Andika interuro ngufi.', 'Ongeraho aho, igihe, ibisobanuro cyangwa impamvu.', 'Reba niba interuro yumvikana.', 'Kosora imyandikire n’utwatuzo.'],
      writing: ['Tegura interuro ibanza.', 'Ongeraho ingingo ebyiri z’ingirakamaro.', 'Andika interuro isoza.', 'Ongera usome ukosore interuro idasobanutse.'],
      comprehension: ['Igitekerezo k’ingenzi ni iki?', 'Ni izihe ngingo ebyiri zibigaragaza?', 'Ijambo ry’ingenzi risobanura iki?', 'Ni ikihe kibazo ugifite?'],
      editing: ['Hitamo interuro yo gukosora.', 'Kosora imyandikire n’utwatuzo.', 'Simbuza ijambo ridasobanutse ijambo ry’isomo.', 'Soma interuro ya nyuma uranguruye ijwi.'],
      fluency: ['Soma umwandiko utuje.', 'Subiramo interuro igoye kurusha izindi.', 'Vuga interuro nshya udasoma.', 'Baza mugenzi wawe niba igisobanuro cyumvikanye.']
    };
    const selected = instructions[mode.key] || instructions.reading;
    return `Isomo ${taskNumber}: ${unit} - ${labels[mode.key] || mode.title}\n\n${miniText}\n\nImyitozo:\n${selected.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n\nIsuzuma: vuga neza, guma ku nsanganyamatsiko, koresha amagambo mashya, hanyuma ukosore nibura interuro imwe.`;
  }

  if (mode.key === 'reading') {
    return `Session ${taskNumber}: ${unit} reading practice\n\n${miniText}\n\nDo this:\n1. ${learnerLine}\n2. Underline three words that carry the meaning of the text.\n3. Say the main idea in one sentence.\n4. Find one detail that supports the main idea.\n5. Explain how the text connects to a real learner in ${context.name}.\n\nCheck: your answer should use the topic, not a memorised sentence from another lesson.`;
  }
  if (mode.key === 'vocabulary') {
    return `Session ${taskNumber}: ${unit} vocabulary builder\n\nUseful words: ${vocabulary || unit}.\n\nBuild meaning:\n1. Choose four words from the list.\n2. Say each word in simple words.\n3. Use each word in a new sentence connected to ${unit.toLowerCase()}.\n4. Add one synonym, opposite, translation, picture clue, or real example where possible.\n5. Read the sentences aloud and check that each word is used correctly.\n\nMini challenge ${taskNumber}: create a small word bank for a younger learner and include one example from ${context.name}.`;
  }
  if (mode.key === 'speaking') {
    return `Session ${taskNumber}: ${unit} speaking and listening\n\nPair task:\n1. Partner A asks one clear question about ${unit.toLowerCase()}.\n2. Partner B answers in two complete sentences.\n3. Partner A repeats the main idea to show listening.\n4. Swap roles and improve one answer.\n5. Present the stronger answer to a small group.\n\nGood speaking is not shouting or guessing. Speak clearly, stay on topic, listen to the answer, and ask a follow-up question that helps the speaker explain more.`;
  }
  if (mode.key === 'grammar') {
    return `Session ${taskNumber}: ${unit} grammar focus\n\nUse this page to make accurate sentences.\n\n1. Write one short sentence about ${unit.toLowerCase()}.\n2. Add one describing word, place word, time word, connector, or reason.\n3. Check the subject and verb agree.\n4. Check punctuation and capital letters.\n5. Rewrite the sentence so it is clearer but still simple.\n\nModel frame:\nThe learner _____ because _____. In ${context.name}, this can be seen when _____.`;
  }
  if (mode.key === 'writing') {
    return `Session ${taskNumber}: ${unit} writing workshop\n\nPlan before writing:\n1. Topic sentence: say what the paragraph is about.\n2. Detail one: give a fact, example, event, or reason.\n3. Detail two: add another useful detail.\n4. Closing sentence: answer the task directly.\n5. Correction: read your paragraph aloud and fix one weak sentence.\n\nWrite six to eight lines. Keep the language simple and exact. Do not add ideas that are not connected to ${unit.toLowerCase()}.`;
  }
  if (mode.key === 'comprehension') {
    return `Session ${taskNumber}: ${unit} comprehension check\n\nUse the mini text or a teacher-selected passage.\n\n1. What is the main idea?\n2. Which two details prove your answer?\n3. What does one important word mean in this passage?\n4. What can a learner in ${context.name} do with this idea?\n5. Write one question you still have.\n\nA complete answer uses evidence from the passage and your own words.`;
  }
  if (mode.key === 'editing') {
    return `Session ${taskNumber}: ${unit} editing and correction\n\nTake one answer you wrote earlier and improve it.\n\n1. Circle the sentence that is hardest to understand.\n2. Check spelling or accents where your language uses them.\n3. Add missing punctuation.\n4. Replace one vague word with a stronger topic word.\n5. Read the final answer aloud.\n\nCorrection note: write what you changed and why the new version is clearer.`;
  }
  return `Session ${taskNumber}: ${unit} fluency practice\n\nFluency means you can use the language without stopping at every word.\n\n1. Read the mini text twice.\n2. Practise the hardest sentence three times.\n3. Say a new sentence about ${unit.toLowerCase()} without looking.\n4. Record or perform the sentence for a partner.\n5. Ask the partner whether the meaning was clear.\n\nFinish by writing the sentence neatly and correcting one small error.`;
}

function guidedActivityBlock(context, subjectTitle, topic) {
  const unit = topic.unitTitle;
  if (subjectTitle.includes('Math') || subjectTitle === 'Hisabati') {
    return `Guided activity for ${unit}:\n\n1. Work with a partner and read the worked example.\n2. Make a similar question using ${context.name} classroom, home, market, garden, transport, or timetable details.\n3. Draw a model: table, number line, diagram, place-value chart, shape, or equation.\n4. Solve the question step by step.\n5. Swap work with another pair and check the method, units, labels, and final sentence.\n\nTeacher check: the model should match the topic, not just any calculation.`;
  }
  if (subjectTitle === 'French') {
    return `Activité guidée pour ${unit}:\n\n1. Lis le mini-texte ou le dialogue à haute voix.\n2. Souligne trois mots ou expressions utiles.\n3. Réponds oralement à une question sur le texte.\n4. Écris trois à cinq phrases liées à ${unit}.\n5. Lis ta réponse à un partenaire et améliore une phrase.\n\nVérification: la réponse doit utiliser le vocabulaire du thème et des phrases complètes.`;
  }
  if (subjectTitle === 'Kinyarwanda') {
    return `Igikorwa kiyobowe kuri ${unit}:\n\n1. Soma umwandiko cyangwa ikiganiro uranguruye ijwi.\n2. Ca akarongo ku magambo cyangwa imvugo eshatu z'ingenzi.\n3. Subiza mu magambo ikibazo kimwe kijyanye n'umwandiko.\n4. Andika interuro eshatu kugeza kuri eshanu zijyanye na ${unit}.\n5. Somera mugenzi wawe igisubizo, mukosore interuro imwe.\n\nIsuzuma: igisubizo gikoreshe amagambo y'isomo kandi kigire interuro zuzuye.`;
  }
  if (isEnglishSubjectTitle(subjectTitle)) {
    const focus = englishSkillFocus(topic);
    const focusTask = {
      reading: `Each learner reads the same short text, marks the main idea, and chooses two details that support it. The group then agrees on the strongest evidence and explains why it proves the answer.`,
      vocabulary: `Each learner chooses two topic words, explains them in simple language, and tests the meaning in a new sentence. The group rejects sentences where the word sounds forced or unclear.`,
      speaking: `Each learner prepares a two-sentence response, gives it to the group, listens to one question, and improves the answer before presenting again.`,
      grammar: `Each learner writes two sentences linked to the topic, underlines the subject and verb, checks tense and punctuation, and explains one correction to the group.`,
      writing: `Each learner plans one paragraph with a topic sentence, two supporting details, and a closing sentence. The group checks whether every sentence belongs to the same idea.`,
      editing: `Each learner brings one draft sentence, reads it aloud, and receives one clear suggestion about meaning, punctuation, tense, or word choice before rewriting it.`,
      communication: `Each learner states the task, gives one exact detail, and explains the idea in a complete sentence. The group checks whether the answer would make sense to a reader or listener.`
    };
    return `Guided English activity for ${unit}:\n\n${focusTask[focus] || focusTask.communication}\n\nSteps:\n1. Read or listen to the task twice and underline the command word.\n2. Work in pairs so one learner gives the answer and the other checks evidence, vocabulary, grammar, or organisation.\n3. Improve the answer using one specific suggestion, not a vague comment such as make it better.\n4. Share the improved answer with another pair and ask what is now clearer.\n5. Write a correction note: I changed _____ because _____.\n\nTeacher check: the final answer should match ${unit.toLowerCase()}, use complete sentences, and show one visible improvement after feedback.`;
  }
  if (isLanguageSubject(subjectTitle)) {
    return `Guided activity for ${unit}:\n\n1. Read the mini passage or dialogue aloud.\n2. Underline three useful words or expressions.\n3. Answer one oral question about the text.\n4. Write three to five sentences linked to ${unit}.\n5. Read your answer to a partner and improve one sentence.\n\nTeacher check: the answer should use the topic vocabulary and complete sentences.`;
  }
  if (subjectTitle === 'ICT') {
    return `Guided digital activity for ${unit}:\n\n1. Read the task and name the exact output: file, table, document, diagram, message, algorithm, or safety checklist.\n2. List the device, software, data, and safety rule needed before starting.\n3. Complete the output in small steps and say each step aloud to a partner.\n4. Save, reopen, test, proofread, or inspect the output.\n5. Write one correction you made and one rule that protects privacy or shared equipment.\n\nTeacher check: the learner should explain the process, not only show a finished screen.`;
  }
  if (subjectTitle.includes('Entrepreneurship')) {
    return `Guided enterprise activity for ${unit}:\n\n1. Choose one real need from school, home, farm, cooperative, shop, service, or market life.\n2. Name the customer or user and why the need matters.\n3. List available resources, estimated costs, possible income or value, and one risk.\n4. Decide on one responsible action and explain why it is fair and useful.\n5. Share the plan with a partner, receive feedback, and improve one detail.\n\nTeacher check: the plan should connect customer need, resources, cost, risk, and improvement.`;
  }
  return `Work with a partner or small group.\n\n1. Read the inquiry question again.\n2. Choose one real situation linked to ${topic.localContext}.\n3. Decide what evidence, method, vocabulary, tool, text, map, diagram, movement, or example is needed.\n4. Complete the task together and explain each step aloud.\n5. Compare your answer with another group.\n6. Improve one part after feedback.\n\nGroup role check: one learner reads the task, one records ideas, one checks vocabulary or working, and one reports the answer.`;
}

function subjectApplicationWorkshop(context, subjectTitle, topic, index) {
  const unit = topic.unitTitle;
  const gradeMove = subjectGradeFocus(subjectTitle, topic.grade).replace(/^Progression focus:\s*/i, 'Grade move: ');
  if (subjectTitle.includes('Math') || subjectTitle === 'Hisabati') {
    return `Application workshop ${index} for ${unit}.\n\n${gradeMove}\n\nUse this page to turn the skill into a complete problem, not a single short answer.\n\n1. Create one problem from ${context.name} school, home, shop, garden, transport, sport, or timetable life.\n2. Write the known information and what must be found.\n3. Choose a model: table, number line, diagram, equation, graph, shape, or place-value chart.\n4. Solve step by step and keep units or labels clear.\n5. Check the answer using estimation, inverse operation, substitution, or a second method.\n6. Write one sentence explaining why the answer makes sense.\n\nExtension: change one number in the problem and solve the new version.`;
  }
  if (subjectTitle.includes('Science') || ['Biology', 'Chemistry', 'Physics', 'Sayansi'].includes(subjectTitle)) {
    return `Application workshop ${index} for ${unit}.\n\n${gradeMove}\n\nUse this page to deepen the science idea with evidence.\n\n1. Write one question that can be answered by observation, model, measurement, classification, or data reading.\n2. Name safe materials, diagrams, samples, tables, or apparatus that would help.\n3. Predict what you expect and explain why.\n4. Record evidence in a labelled table, diagram, or sentence notes.\n5. Write a conclusion that answers the question without adding unsupported guesses.\n6. Add one safety rule and one limitation of the evidence.\n\nExtension: suggest one improved investigation for a future lesson.`;
  }
  if (subjectTitle === 'ICT') {
    return `Digital application workshop ${index} for ${unit}.\n\n${gradeMove}\n\nUse this page to make the digital skill practical and checkable.\n\n1. Define the task and output: document, table, folder, message, search result, algorithm, diagram, or safety checklist.\n2. List the device, software, file name, data, and safety rule needed.\n3. Write the exact steps before using the device.\n4. Create or describe the output clearly enough for another learner to inspect.\n5. Test the result by reopening, checking, proofreading, tracing, or comparing with the task.\n6. Record one correction and one digital-safety habit.\n\nExtension: explain how the same skill could help a class project.`;
  }
  if (subjectTitle.includes('Entrepreneurship')) {
    return `Enterprise application workshop ${index} for ${unit}.\n\n${gradeMove}\n\nUse this page to turn the idea into a responsible enterprise decision.\n\n1. Name a real customer need from school, home, farm, service, cooperative, or market life.\n2. Describe the product, service, record, calculation, or action that responds to the need.\n3. Estimate resources, cost, time, and possible value.\n4. Identify one risk and one fair way to reduce it.\n5. Ask for feedback and write one improvement.\n6. Decide whether the idea should continue, change, or stop, and give a reason.\n\nExtension: create a simple record table for the decision.`;
  }
  if (isLanguageSubject(subjectTitle)) {
    return `Language application workshop ${index} for ${unit}.\n\n${gradeMove}\n\nUse this page to practise the language in a complete task.\n\n1. Read or listen to a short text about ${unit.toLowerCase()}.\n2. Say the main idea in your own words.\n3. Choose four useful words and use them in new sentences.\n4. Write a short paragraph, dialogue, oral answer, or presentation note.\n5. Check spelling, punctuation, grammar, pronunciation, and meaning.\n6. Improve one sentence after feedback.\n\nExtension: prepare one question for a partner and answer your partner's question clearly.`;
  }
  return `Application workshop ${index} for ${unit}.\n\n${gradeMove}\n\nUse this page to make the topic useful beyond one short answer.\n\n1. Name the exact idea, skill, value, process, source, tool, or example from this topic.\n2. Connect it to a real situation in ${context.name} school, home, community, environment, sport, art, market, or fieldwork.\n3. Explain the steps, evidence, vocabulary, or choices needed.\n4. Complete a clear response, table, drawing, plan, paragraph, performance note, or checklist.\n5. Ask for feedback and improve one part.\n6. Write what the improved answer now shows.\n\nExtension: create one question another learner can answer.`;
}

function outcomeCheckBlock(subjectTitle, topic, outcome, criteria) {
  const unit = topic.unitTitle;
  const outcomeText = sentenceCase(outcome.text);
  if (subjectTitle.includes('Math') || subjectTitle === 'Hisabati') {
    return mathOutcomeCheckBlock(topic, outcome, criteria);
  }
  if (subjectTitle.includes('Science') || ['Biology', 'Chemistry', 'Physics', 'Sayansi'].includes(subjectTitle)) {
    return scienceOutcomeCheckBlock(topic, outcome, criteria);
  }
  if (isLanguageSubject(subjectTitle)) {
    if (subjectTitle === 'French') {
      return `Vérification de l’objectif pour ${unit}: ${outcomeText}.\n\n1. Lis, écoute, parle ou écris une réponse courte liée au thème.\n2. Utilise au moins trois mots du thème correctement.\n3. Écris des phrases complètes.\n4. Vérifie les accents, l’orthographe, la ponctuation et le sens.\n5. Améliore une phrase après le feedback.\n\nCritères de réussite:\n${criteria}`;
    }
    if (subjectTitle === 'Kinyarwanda') {
      return `Isuzuma ry'intego kuri ${unit}: ${outcomeText}.\n\n1. Soma, tega amatwi, vuga cyangwa wandike igisubizo kigufi kijyanye n'isomo.\n2. Koresha nibura amagambo atatu y'isomo neza.\n3. Andika interuro zuzuye.\n4. Reba imyandikire, utwatuzo n'igisobanuro.\n5. Kosora interuro imwe nyuma yo guhabwa inama.\n\nIbipimo byo gutsinda:\n${criteria}`;
    }
    if (isEnglishSubjectTitle(subjectTitle)) {
      const focus = englishSkillFocus(topic);
      const evidencePrompt = {
        reading: 'use the text as evidence and explain how the evidence supports your answer',
        vocabulary: 'show the meaning of topic words through context, explanation, and original sentences',
        speaking: 'give a clear oral answer, listen to a response, and improve the next answer',
        grammar: 'write accurate sentences and explain one grammar correction',
        writing: 'produce a planned paragraph or functional text and revise one weak sentence',
        editing: 'improve a draft and name the exact correction made',
        communication: 'make the message clear for a reader or listener using evidence, order, and complete sentences'
      };
      return `Outcome check for ${unit}: ${outcomeText}.\n\nShow that you can ${evidencePrompt[focus] || evidencePrompt.communication}.\n\n1. Restate the task in your own words so the purpose is clear.\n2. Produce a short answer, paragraph, dialogue note, vocabulary explanation, or edited sentence linked to ${unit.toLowerCase()}.\n3. Add one piece of evidence, reason, example, or correction note.\n4. Read the answer aloud and check whether the meaning is complete.\n5. Improve one sentence after feedback and write what changed.\n\nSuccess criteria:\n${criteria}`;
    }
    return `Outcome check for ${unit}: ${outcomeText}.\n\n1. Read, listen, speak, or write a short response linked to this topic.\n2. Use at least three topic words correctly.\n3. Use complete sentences.\n4. Check spelling, punctuation, grammar, and meaning.\n5. Improve one sentence after feedback.\n\nSuccess criteria:\n${criteria}`;
  }
  if (subjectTitle === 'ICT') {
    return `Outcome check for ${unit}: ${outcomeText}.\n\n1. State the digital task and the intended output.\n2. List the exact device, software, file, data, or network step needed.\n3. Create or describe the output in a way another learner can inspect.\n4. Test the output and write one correction.\n5. Add one privacy, password, copyright, ergonomics, or shared-device safety rule.\n\nSuccess criteria:\n${criteria}`;
  }
  if (subjectTitle.includes('Entrepreneurship')) {
    return `Outcome check for ${unit}: ${outcomeText}.\n\n1. State the customer need or enterprise problem.\n2. Name the product, service, record, calculation, or decision required.\n3. Show costs, resources, action steps, or a simple record where relevant.\n4. Identify one risk and one responsible way to reduce it.\n5. Write one improvement after feedback.\n\nSuccess criteria:\n${criteria}`;
  }
  return `Show that you can ${outcome.text}.\n\nBefore answering, reread the topic title and choose the exact vocabulary, method, evidence, tool, diagram, or example that fits this outcome.\n\n1. State the main idea in one clear sentence.\n2. Give one example, method, source, observation, or piece of evidence from this topic.\n3. Complete a short task that applies the idea.\n4. Check your answer against the success criteria.\n5. Write one correction or next step.\n\nSuccess criteria:\n${criteria}`;
}

function topicExplanation(context, subjectTitle, topic, vocabulary) {
  const unit = topic.unitTitle;
  const vocabList = vocabulary;
  if (subjectTitle.includes('Math') || subjectTitle === 'Hisabati') {
    return mathConceptLesson(context, topic, vocabList);
  }
  if (subjectTitle.includes('Science') || ['Biology', 'Chemistry', 'Physics', 'Sayansi'].includes(subjectTitle)) {
    return scienceConceptLesson(context, subjectTitle, topic, vocabList);
  }
  if (isLanguageSubject(subjectTitle)) {
    return languageLesson(context, subjectTitle, topic, vocabList);
  }
  if (subjectTitle === 'ICT') {
    return `${unit} is a practical digital skill. Learn it by naming the task, following exact steps, checking the output, and using devices safely.\n\nCore idea:\n- Start with the purpose: communication, data handling, file management, research, creation, or problem solving.\n- Name the tool: device, keyboard, folder, document, spreadsheet, browser, network, software, or file.\n- Follow steps in order and avoid random clicking.\n- Protect privacy, passwords, shared devices, and other people's files.\n- Check the result by reopening, testing, proofreading, or asking whether the output matches the task.\n\nKey words:\n${vocabList}`;
  }
  if (subjectTitle.includes('Entrepreneurship')) {
    return `${unit} is learned through real enterprise decisions, not memorised definitions.\n\nCore idea:\n- Entrepreneurship begins with a need or problem people care about.\n- A useful idea must match customers, resources, cost, time, and skills.\n- Good planning names the product or service, who it helps, what it costs, what can go wrong, and how to improve it.\n- Responsible enterprise is honest, lawful, fair, and useful to the community.\n- Records help learners compare plans with what actually happened.\n\nKey words:\n${vocabList}`;
  }
  return `${unit} becomes easier when you connect the idea to a real situation, name the important vocabulary, and practise one step at a time.\n\nLearning routine:\n1. Look at a real situation in ${context.name}.\n2. Name the exact idea or skill.\n3. Explain it in simple words.\n4. Work through one model example.\n5. Try a similar task independently.\n6. Correct your answer using the success criteria.\n\nKey words:\n${vocabList}`;
}

function lessonOpenerBlock(context, subjectTitle, topic, outcomeList, inquiryList, criteria) {
  if (subjectTitle === 'French') {
    return `Point d'apprentissage: ${topic.unitTitle}\n\nLien avec le pays: ${topic.localContext}.\n\nÀ la fin de ce thème, tu devrais pouvoir:\n${outcomeList}\n\nQuestions de recherche:\n${inquiryList}\n\nCritères de réussite:\n${criteria}`;
  }
  if (subjectTitle === 'Kinyarwanda') {
    return `Icyo wiga: ${topic.unitTitle}\n\nIhuriro n'igihugu: ${topic.localContext}.\n\nNyuma y'iri somo, ugomba kuba ushobora:\n${outcomeList}\n\nIbibazo bigufasha gutekereza:\n${inquiryList}\n\nIbipimo byo gutsinda:\n${criteria}`;
  }
  if (subjectTitle === 'Kiswahili') {
    return `Lengo la kujifunza: ${topic.unitTitle}\n\nUhusiano na nchi: ${topic.localContext}.\n\nMwisho wa mada hii, unapaswa kuweza:\n${outcomeList}\n\nMaswali ya uchunguzi:\n${inquiryList}\n\nVigezo vya mafanikio:\n${criteria}`;
  }
  if (isEnglishSubjectTitle(subjectTitle)) {
    const focus = englishSkillFocus(topic);
    const focusLine = {
      reading: 'Read for meaning, evidence, and inference before writing the answer.',
      vocabulary: 'Build word meaning from context, word families, examples, and accurate sentences.',
      speaking: 'Prepare, speak clearly, listen carefully, and respond with a reason.',
      grammar: 'Control sentence structure so meaning is accurate and easy to follow.',
      writing: 'Plan, draft, organise, and revise a response for a real reader.',
      editing: 'Improve a draft by checking meaning, grammar, spelling, punctuation, and word choice.',
      communication: 'Make the message clear through exact words, complete sentences, and feedback.'
    };
    return `Learning focus: ${topic.unitTitle}\n\nThis English topic connects to ${topic.localContext}. ${focusLine[focus] || focusLine.communication}\n\n${subjectGradeFocus(subjectTitle, topic.grade)}\n\nBy the end of this topic, you should be able to:\n${outcomeList}\n\nInquiry questions:\n${inquiryList}\n\nSuccess criteria:\n${criteria}\n\nBefore moving on, make one short answer stronger by adding evidence, improving a sentence, or choosing a clearer word.`;
  }
  return `Learning focus: ${topic.unitTitle}\n\nCountry link: ${topic.localContext}.\n\n${subjectGradeFocus(subjectTitle, topic.grade)}\n\nBy the end of this topic, you should be able to:\n${outcomeList}\n\nInquiry questions:\n${inquiryList}\n\nSuccess criteria:\n${criteria}`;
}

function localizedInquiryQuestion(context, subjectTitle, question, unitTitle) {
  const text = cleanText(question);
  const isEnglishShell = !text || /^How can\b/i.test(text) || /help you solve a real problem/i.test(text);
  if (!isEnglishShell) return text;
  if (subjectTitle === 'French') {
    return `Comment utiliser ${normalizeFrenchPhrase(unitTitle).toLowerCase()} dans une situation reelle au ${context.name}?`;
  }
  if (subjectTitle === 'Kinyarwanda') {
    return `Wakoresha ute ${unitTitle.toLowerCase()} mu buzima busanzwe muri ${context.name}?`;
  }
  if (subjectTitle === 'Kiswahili') {
    return `Unawezaje kutumia ${unitTitle.toLowerCase()} katika maisha halisi ya ${context.name}?`;
  }
  return text || fallbackInquiryFor(subjectTitle, unitTitle);
}

function subjectGradeFocus(subjectTitle, grade) {
  const code = gradeStageKey(grade || '');
  const stageByGrade = {
    P4: 'build concrete foundations using simple examples and teacher-guided correction',
    P5: 'add reasons, compare examples, and explain choices more independently',
    P6: 'prepare for upper-primary transition by using evidence, accuracy, and reflection',
    S1: 'build lower-secondary foundations with clear vocabulary and guided application',
    S2: 'connect ideas across topics and explain causes, methods, or consequences',
    S3: 'apply ideas to unfamiliar situations and justify decisions with evidence',
    S4: 'prepare for assessment and real-world use through extended tasks and correction',
    S5: 'analyse more complex cases and make reasoned academic or practical decisions',
    S6: 'synthesise ideas, evaluate evidence, and prepare independent final responses'
  };
  const stage = stageByGrade[code] || 'use the topic accurately, apply it, and improve after feedback';
  if (subjectTitle.includes('Math') || subjectTitle === 'Hisabati') return `Progression focus: ${stage}; show methods, units, checks, and a final explanation.`;
  if (subjectTitle.includes('Science') || ['Biology', 'Chemistry', 'Physics', 'Sayansi'].includes(subjectTitle)) return `Progression focus: ${stage}; connect evidence, diagrams, safety, and conclusions.`;
  if (subjectTitle === 'ICT') return `Progression focus: ${stage}; produce a checkable digital output and explain safe steps.`;
  if (subjectTitle.includes('Entrepreneurship')) return `Progression focus: ${stage}; connect customer need, resources, cost, risk, and improvement.`;
  if (subjectTitle.includes('Geography')) return `Progression focus: ${stage}; use maps, places, data, and environmental evidence.`;
  if (subjectTitle.includes('History') || subjectTitle.includes('Political Education')) return `Progression focus: ${stage}; use sources, timelines, citizenship ideas, and careful explanation.`;
  if (subjectTitle.includes('Agriculture')) return `Progression focus: ${stage}; link practical steps, safety, records, and care for living things.`;
  return `Progression focus: ${stage}.`;
}

function vocabularyStudyBlock(context, subjectTitle, topic, vocabulary) {
  if (isEnglishSubjectTitle(subjectTitle)) {
    return englishVocabularyStudyBlock(context, topic, vocabulary);
  }
  if (subjectTitle === 'French') {
    return `Utilise ces mots avant de t'entraîner sur ${topic.unitTitle}.\n\nMots clés:\n${vocabulary}\n\nMéthode d'étude:\n1. Choisis trois mots.\n2. Explique chaque mot avec tes propres mots.\n3. Donne un exemple simple du Rwanda ou de ton école.\n4. Utilise chaque mot dans une phrase correcte.\n5. Demande à un partenaire de vérifier le sens.\n\nErreur à éviter: répondre sans utiliser le vocabulaire du thème.`;
  }
  if (subjectTitle === 'Kinyarwanda') {
    return `Koresha aya magambo mbere yo gukora imyitozo kuri ${topic.unitTitle}.\n\nAmagambo y'ingenzi:\n${vocabulary}\n\nUburyo bwo kwiga:\n1. Hitamo amagambo atatu.\n2. Sobanura buri jambo mu magambo yawe.\n3. Tanga urugero rwo mu Rwanda, ku ishuri cyangwa mu rugo.\n4. Koresha buri jambo mu nteruro iboneye.\n5. Saba mugenzi wawe kugenzura niba igisobanuro cyumvikana.\n\nIkosa wirinda: gusubiza udakoresheje amagambo y'isomo.`;
  }
  return `Use these words and study moves before you practise ${topic.unitTitle}. Good vocabulary helps you read the question, choose the right method, and explain your answer clearly.\n\nKey words:\n${vocabulary}\n\nStudy skill:\n1. Choose three key words.\n2. Say each word in your own words.\n3. Give one example from ${context.name}.\n4. Use each word in a correct sentence, calculation step, diagram label, or oral answer.\n5. Ask a partner to check whether your example matches the topic.\n\nCommon mistake to avoid: ${topic.misconceptions[0]}.`;
}

function challengeRemediationBlock(context, subjectTitle, topic, criteria) {
  if (subjectTitle === 'French') {
    return `Utilise cette page après l'entraînement.\n\nSi tu as besoin d'aide:\n1. Relis les critères de réussite.\n2. Reprends le modèle étape par étape.\n3. Remplace les détails par des idées liées à ${topic.unitTitle}.\n4. Pose une question claire sur ce qui reste difficile.\n\nSi tu es prêt pour un défi:\n1. Crée une nouvelle petite tâche de lecture, d'écoute, de parole ou d'écriture.\n2. Utilise le vocabulaire correct.\n3. Explique pourquoi ta réponse est claire.\n4. Écris une question pour un camarade.\n\nVérifie:\n${criteria}`;
  }
  if (subjectTitle === 'Kinyarwanda') {
    return `Koresha uru rupapuro nyuma y'imyitozo.\n\nNiba ukeneye ubufasha:\n1. Ongera usome ibipimo byo gutsinda.\n2. Kurikiza urugero intambwe ku yindi.\n3. Simbuza ibisobanuro ibitekerezo bijyanye na ${topic.unitTitle}.\n4. Baza ikibazo gisobanutse ku kikugora.\n\nNiba witeguye umukoro w'inyongera:\n1. Tegura akazi gato ko gusoma, kumva, kuvuga cyangwa kwandika.\n2. Koresha amagambo y'isomo neza.\n3. Sobanura impamvu igisubizo cyawe cyumvikana.\n4. Andikira mugenzi wawe ikibazo.\n\nSuzuma:\n${criteria}`;
  }
  if (isEnglishSubjectTitle(subjectTitle)) {
    const focus = englishSkillFocus(topic);
    const supportMove = {
      reading: 'go back to the passage, mark the sentence that gives the answer, and write why it matters',
      vocabulary: 'read the sentence before and after the word, test a possible meaning, and write a fresh sentence',
      speaking: 'plan your first sentence, give one reason, and practise the answer aloud before sharing it',
      grammar: 'find the subject and verb, check tense, add punctuation, and read the sentence aloud',
      writing: 'return to your plan, remove any sentence that does not support the topic, and add one useful detail',
      editing: 'choose one sentence, fix one problem at a time, and explain the correction',
      communication: 'state the exact message, add one detail, and check whether a partner understands it'
    };
    return `Support and challenge for ${topic.unitTitle}.\n\nIf you need support:\n1. Re-read the task and underline the command word.\n2. ${supportMove[focus] || supportMove.communication}.\n3. Compare your answer with the worked example and copy only the structure, not the words.\n4. Ask a specific question: Which word, sentence, detail, or step is still confusing?\n\nIf you are ready for a challenge:\n1. Create a new reading, vocabulary, speaking, grammar, writing, or editing task connected to ${topic.unitTitle.toLowerCase()}.\n2. Answer it in a way another learner can check.\n3. Add one reason, evidence line, correction note, or improved sentence.\n4. Exchange with a partner and improve the task after feedback.\n\nCheck:\n${criteria}`;
  }
  return `Use this page after practice.\n\nIf you need support:\n1. Re-read the success criteria.\n2. Copy the worked example steps as headings.\n3. Replace the model details with details from ${topic.unitTitle}.\n4. Ask one clear question about the step that is confusing.\n\nIf you are ready for a challenge:\n1. Create a new task from school, home, community, environment, technology, sport, art, market, or fieldwork.\n2. Solve or answer it using correct vocabulary.\n3. Explain why your answer is reasonable.\n4. Write one extension question for a classmate.\n\nCheck:\n${criteria}`;
}

function buildPages(snapshot, context, grade, subject, bookPlan) {
  const bookId = bookIdFor(context.country, context.curriculum, grade, subject);
  const title = titleFor(grade, subject);
  const pages = [];
  let index = 1;
  const topics = bookPlan.topics;
  const compactMode = topics.length >= 32;

  const add = (pageTitle, content, refs = {}) => {
    pages.push(makePage(bookId, index, pageTitle, content, refs));
    index += 1;
  };

  const titlePageText = subject.title === 'French'
    ? `${title}\n\nLivre de l'apprenant ${context.name} ${context.curriculum}\n\nMascotte: ${subject.mascot.species}\n\nCe livre KITABU QUEST transforme le programme en leçons courtes, modèles, activités guidées, entraînements, révisions et liens avec la maison.`
    : subject.title === 'Kinyarwanda'
      ? `${title}\n\nIgitabo cy'umunyeshuri cya ${context.name} ${context.curriculum}\n\nMascot: ${subject.mascot.species}\n\nIki gitabo KITABU QUEST gihindura integanyanyigisho mo amasomo magufi, ingero, ibikorwa biyobowe, imyitozo, isubiramo n'ihuriro ryo mu rugo.`
      : `${title}\n\n${context.name} ${context.curriculum} learner book\n\nMascot: ${subject.mascot.species}\n\nThis KITABU QUEST book turns the curriculum into short lessons, worked examples, guided activities, practice, review, and home links for ${context.name} learners.`;
  const howToText = subject.title === 'French'
    ? `Ce livre aide les apprenants de ${grade} à étudier ${subject.title} thème par thème.\n\n1. Commence par la question du thème.\n2. Lis la leçon lentement et marque les mots nouveaux.\n3. Essaie le modèle avant de regarder l'aide.\n4. Fais l'activité et l'entraînement.\n5. Corrige ta réponse avec les critères de réussite.\n6. Demande de l'aide si le sens reste flou.\n\nMéthode: ${subjectMethod(subject.title)}`
    : subject.title === 'Kinyarwanda'
      ? `Iki gitabo gifasha abanyeshuri ba ${grade} kwiga ${subject.title} umutwe ku wundi.\n\n1. Tangira n'ikibazo cy'isomo.\n2. Soma buhoro ushyire akamenyetso ku magambo mashya.\n3. Gerageza urugero mbere yo kureba igisubizo.\n4. Kora igikorwa n'imyitozo.\n5. Kosora igisubizo ukoresheje ibipimo byo gutsinda.\n6. Saba ubufasha niba igisobanuro kitumvikana.\n\nUburyo: ${subjectMethod(subject.title)}`
      : `This book helps ${grade} learners study ${subject.title} one teachable topic at a time.\n\n1. Start with the inquiry question and say what you already know.\n2. Read the Learn section slowly and mark new words.\n3. Try the worked example before reading the full solution.\n4. Complete the activity and practice tasks.\n5. Correct your answer using the success criteria.\n6. Ask for support when your answer is still unclear.\n\nSubject method: ${subjectMethod(subject.title)}`;
  const skillsText = subject.title === 'French'
    ? `Chaque thème développe la compréhension, l'expression orale, l'écoute, la lecture, l'écriture, la collaboration et la confiance.\n\nÉtudie activement: lis à haute voix, utilise les mots nouveaux, parle avec un partenaire, écris des phrases complètes et corrige après feedback.\n\nUne bonne réponse est claire. Elle reste sur le thème, utilise le vocabulaire juste et montre une correction.`
    : subject.title === 'Kinyarwanda'
      ? `Buri mutwe utezimbere gusoma, kumva, kuvuga, kwandika, gukorana n'abandi no kwigirira icyizere.\n\nIga ukora: soma uranguruye ijwi, koresha amagambo mashya, ganira na mugenzi wawe, andika interuro zuzuye kandi ukosore nyuma yo guhabwa inama.\n\nIgisubizo cyiza kirumvikana. Kiguma ku nsanganyamatsiko, gikoresha amagambo aboneye kandi kigaragaza ikosora.`
      : `Each topic builds knowledge, skill, values, communication, collaboration, critical thinking, creativity, digital awareness, and self-confidence.\n\nStudy actively: speak answers aloud, draw when useful, show your working, cite evidence, use local examples, and correct mistakes after feedback.\n\nA strong answer is specific. It names the idea, gives evidence or method, applies it to the task, and checks whether it answers the question.`;
  const tocText = subject.title === 'French'
    ? `Utilise cette table pour avancer thème par thème. Chaque thème propose une ouverture, une leçon, un modèle, une activité guidée, un entraînement et une vérification.\n\n${topics.map((topic, i) => `${i + 1}. ${topic.unitTitle}`).join('\n')}\n\nAprès chaque thème, reviens aux critères de réussite et corrige une réponse.`
    : subject.title === 'Kinyarwanda'
      ? `Koresha uru rutonde ugende umutwe ku wundi. Buri mutwe ufite intangiriro, isomo, urugero, igikorwa kiyobowe, imyitozo n'isuzuma.\n\n${topics.map((topic, i) => `${i + 1}. ${topic.unitTitle}`).join('\n')}\n\nNurangiza buri mutwe, subira ku bipimo byo gutsinda ukosore igisubizo kimwe.`
      : `Use this table to move through the book one topic at a time. Each topic has a lesson opener, clear teaching, a model or example, guided work, practice, and checks for understanding.\n\n${topics.map((topic, i) => `${i + 1}. ${topic.unitTitle}`).join('\n')}\n\nAs you finish each topic, return to the success criteria and correct one answer before moving on.`;
  add(localizedPageTitle(subject.title, '', 'howTo'), howToText, { pageType: 'front-matter', difficulty: 'support' });
  add(localizedPageTitle(subject.title, '', 'skills'), skillsText, { pageType: 'front-matter', difficulty: 'support' });
  add(localizedPageTitle(subject.title, '', 'toc'), tocText, { pageType: 'front-matter', difficulty: 'support' });

  for (const topic of topics) {
    const outcomes = topic.learningOutcomes || [];
    const questions = (topic.inquiryQuestions || [])
      .map(question => localizedInquiryQuestion(context, subject.title, question, topic.unitTitle))
      .filter(Boolean);
    const refs = {
      strandIds: [topic.strandId].filter(Boolean),
      unitIds: [topic.subStrandId].filter(Boolean),
      parentUnitIds: [topic.parentSubStrandId].filter(Boolean),
      outcomeIds: outcomes.map(outcome => outcome.id).filter(Boolean),
      sourceRefs: compactSourceRefs(topic.sourceRefs || sourceRefsFromSnapshot(snapshot)),
      fullSourceRefs: topic.fullSourceRefs || topic.sourceRefs || sourceRefsFromSnapshot(snapshot),
      imageRefs: visualRefsFor(topic, 'unit')
    };
    const fallbackOutcome = subject.title === 'French'
      ? `- Lire, comprendre, parler et écrire sur ${normalizeFrenchPhrase(topic.unitTitle).toLowerCase()}.`
      : subject.title === 'Kinyarwanda'
        ? `- Gusoma, kumva, kuvuga no kwandika ku nsanganyamatsiko ya ${topic.unitTitle.toLowerCase()}.`
        : `- Explain and apply ${topic.unitTitle.toLowerCase()} in a real learning situation.`;
    const outcomeList = outcomes.map(outcome => `- ${outcome.text}`).join('\n') || fallbackOutcome;
    const fallbackInquiry = subject.title === 'French'
      ? `- Comment utiliser ${normalizeFrenchPhrase(topic.unitTitle).toLowerCase()} dans une situation réelle au Rwanda?`
      : subject.title === 'Kinyarwanda'
        ? `- Wakoresha ute ${topic.unitTitle.toLowerCase()} mu buzima busanzwe mu Rwanda?`
        : `- ${fallbackInquiryFor(subject.title, topic.unitTitle)}`;
    const inquiryList = questions.length ? questions.map(question => `- ${question}`).join('\n') : fallbackInquiry;
    const vocabulary = topic.keyVocabulary.map(word => `- ${word}`).join('\n');
    const criteria = topic.successCriteria.map(item => `- ${item}`).join('\n');
    const learnText = lessonOpenerBlock(context, subject.title, topic, outcomeList, inquiryList, criteria);
    const explanation = topicExplanation(context, subject.title, topic, vocabulary);
    const example = normalizedWorkedExample(context, subject.title, topic, grade);

    add(localizedPageTitle(subject.title, topic.unitTitle, 'opener'), learnText, { ...refs, pageType: 'lesson-opener', difficulty: 'support', imageRefs: visualRefsFor(topic, 'opener') });
    if (compactMode) {
      add(localizedPageTitle(subject.title, topic.unitTitle, 'learnExample'), `${explanation}\n\n${example}`, { ...refs, pageType: 'learn-example', imageRefs: visualRefsFor(topic, 'example') });
    } else {
      add(localizedPageTitle(subject.title, topic.unitTitle, 'learn'), explanation, { ...refs, pageType: 'explanation', imageRefs: visualRefsFor(topic, 'learn') });
      add(localizedPageTitle(subject.title, topic.unitTitle, 'example'), example, { ...refs, pageType: 'worked-example', imageRefs: visualRefsFor(topic, 'example') });
    }
    if (compactMode) {
      add(localizedPageTitle(subject.title, topic.unitTitle, 'activityPractice'), normalizedPracticeBlock(context, subject.title, topic, outcomes, compactMode), { ...refs, pageType: 'practice', imageRefs: visualRefsFor(topic, 'practice') });
    } else {
      add(localizedPageTitle(subject.title, topic.unitTitle, 'vocabulary'), vocabularyStudyBlock(context, subject.title, topic, vocabulary), { ...refs, pageType: 'explanation', difficulty: 'support', imageRefs: visualRefsFor(topic, 'vocabulary') });
      add(localizedPageTitle(subject.title, topic.unitTitle, 'activity'), guidedActivityBlock(context, subject.title, topic), { ...refs, pageType: 'activity', imageRefs: visualRefsFor(topic, 'activity') });
      add(localizedPageTitle(subject.title, topic.unitTitle, 'practice'), normalizedPracticeBlock(context, subject.title, topic, outcomes, false), { ...refs, pageType: 'practice', imageRefs: visualRefsFor(topic, 'practice') });
      add(localizedPageTitle(subject.title, topic.unitTitle, 'challenge'), challengeRemediationBlock(context, subject.title, topic, criteria), { ...refs, pageType: 'review', imageRefs: visualRefsFor(topic, 'remediation') });
    }
    if (!compactMode) {
      for (const outcome of outcomes.slice(0, 2)) {
        add(localizedPageTitle(subject.title, topic.unitTitle, 'outcome'), outcomeCheckBlock(subject.title, topic, outcome, criteria), { ...refs, pageType: 'assessment', outcomeIds: [outcome.id].filter(Boolean), imageRefs: visualRefsFor(topic, 'assessment') });
      }
    }
  }

  if (isLanguageSubject(subject.title) && topics.length > 0 && topics.length < 10 && !compactMode) {
    const expansionModes = languageExpansionModes();
    const expansionTarget = Math.min(104, Math.max(82, targetPageCount(subject.title, topics.length) - 16));
    const maxExpansionPages = topics.length * 24;
    let expansionIndex = 0;
    while (pages.length < expansionTarget && expansionIndex < maxExpansionPages) {
      const topic = topics[expansionIndex % topics.length];
      const mode = expansionModes[expansionIndex % expansionModes.length];
      const refs = {
        strandIds: [topic.strandId].filter(Boolean),
        unitIds: [topic.subStrandId].filter(Boolean),
        parentUnitIds: [topic.parentSubStrandId].filter(Boolean),
        outcomeIds: (topic.learningOutcomes || []).map(outcome => outcome.id).filter(Boolean),
        sourceRefs: compactSourceRefs(topic.sourceRefs || sourceRefsFromSnapshot(snapshot)),
        fullSourceRefs: topic.fullSourceRefs || topic.sourceRefs || sourceRefsFromSnapshot(snapshot),
        imageRefs: visualRefsFor(topic, `language-${mode.key}`)
      };
      const cycle = Math.floor(expansionIndex / topics.length);
      const modeTitle = languageModeTitle(subject.title, mode.key) || mode.title;
      add(`${topic.unitTitle}: ${modeTitle} ${cycle + 1}`, languageSkillExpansionBlock(context, subject.title, topic, mode, cycle), { ...refs, pageType: mode.pageType });
      expansionIndex += 1;
    }
  }

  if (isCreativePracticalSubject(subject.title) && topics.length > 0 && !compactMode) {
    const creativeModes = ['Plan', 'Materials And Safety', 'Skill Practice', 'Create Or Perform', 'Peer Feedback', 'Improve And Reflect'];
    const expansionTarget = Math.max(82, Math.min(110, targetPageCount(subject.title, topics.length) - 12));
    const maxExpansionPages = topics.length * 8;
    let expansionIndex = 0;
    while (pages.length < expansionTarget && expansionIndex < maxExpansionPages) {
      const topic = topics[expansionIndex % topics.length];
      const mode = creativeModes[expansionIndex % creativeModes.length];
      const refs = {
        strandIds: [topic.strandId].filter(Boolean),
        unitIds: [topic.subStrandId].filter(Boolean),
        parentUnitIds: [topic.parentSubStrandId].filter(Boolean),
        outcomeIds: (topic.learningOutcomes || []).map(outcome => outcome.id).filter(Boolean),
        sourceRefs: compactSourceRefs(topic.sourceRefs || sourceRefsFromSnapshot(snapshot)),
        fullSourceRefs: topic.fullSourceRefs || topic.sourceRefs || sourceRefsFromSnapshot(snapshot),
        imageRefs: visualRefsFor(topic, `creative-${slugify(mode)}`)
      };
      add(`${topic.unitTitle}: ${mode}`, `Practical workshop for ${topic.unitTitle}: ${mode}.\n\n1. Read the task and name the exact creative, craft, music, movement, design, display, or performance skill.\n2. List safe materials, tools, body movement, space, or instruments needed.\n3. Practise one small part slowly before doing the full work.\n4. Check quality: control, neatness, rhythm, balance, expression, teamwork, care of materials, and safety.\n5. Ask a partner for one kind observation and one improvement idea.\n6. Improve the work and write what changed.\n\nReflection: What skill improved? What evidence shows improvement? What will you practise next time?`, { ...refs, pageType: 'activity' });
      expansionIndex += 1;
    }
  }

  const maxReviewClinics = Math.max(4, Math.min(10, Math.ceil(topics.length * 0.2)));
  for (let reviewSet = 1; pages.length < targetPageCount(subject.title, topics.length) && reviewSet <= maxReviewClinics; reviewSet += 1) {
    const topic = topics[(reviewSet - 1) % Math.max(1, topics.length)];
    const refs = topic ? {
      strandIds: [topic.strandId].filter(Boolean),
      unitIds: [topic.subStrandId].filter(Boolean),
      outcomeIds: (topic.learningOutcomes || []).map(outcome => outcome.id).filter(Boolean),
      sourceRefs: compactSourceRefs(topic.sourceRefs || sourceRefsFromSnapshot(snapshot)),
      fullSourceRefs: topic.fullSourceRefs || topic.sourceRefs || sourceRefsFromSnapshot(snapshot),
      imageRefs: visualRefsFor(topic, 'review')
    } : {};
    const reviewContent = subject.title === 'French'
      ? `Utilise cette révision pour renforcer ${subject.title} sans copier tes anciennes réponses.\n\n1. Choisis une idée difficile dans ${topic?.unitTitle || subject.title}.\n2. Explique l'idée avec tes propres mots.\n3. Écris un nouvel exemple simple du Rwanda, de l'école ou de la maison.\n4. Crée une question de vocabulaire.\n5. Crée une question de lecture, parole ou écriture.\n6. Réponds aux deux questions et corrige ton travail.\n\nDéfi: transforme l'idée en dialogue, court paragraphe, carte de mots ou présentation orale.`
      : subject.title === 'Kinyarwanda'
        ? `Koresha iri subiramo kugira ngo ukomeze ${subject.title} udakopiye ibisubizo bya mbere.\n\n1. Hitamo igitekerezo cyakugoye muri ${topic?.unitTitle || subject.title}.\n2. Gisobanure mu magambo yawe.\n3. Andika urugero rushya rwo mu Rwanda, ku ishuri cyangwa mu rugo.\n4. Tegura ikibazo cy'amagambo.\n5. Tegura ikibazo cyo gusoma, kuvuga cyangwa kwandika.\n6. Subiza ibyo bibazo byombi kandi ukosore umurimo wawe.\n\nUmukoro w'inyongera: hindura icyo gitekerezo ikiganiro, agace k'inyandiko, ikarita y'amagambo cyangwa ikiganiro gito.`
        : `Use this review clinic to strengthen ${subject.title} without copying earlier answers.\n\n1. Choose one idea from ${topic?.unitTitle || subject.title} that was difficult.\n2. Explain the idea in your own words.\n3. Make one new example from ${context.name}.\n4. Create one question that checks knowledge.\n5. Create one question that checks skill or application.\n6. Answer both questions and correct your work.\n\nChallenge: Turn the idea into a drawing, table, map, dialogue, model, demonstration, or worked solution.`;
    const reviewTitle = localizedPageTitle(subject.title, topic?.unitTitle || subject.title, 'review', String(reviewSet));
    add(reviewTitle, reviewContent, { ...refs, pageType: 'review' });
  }

  const minimumContentPages = 82;
  let workshopIndex = 1;
  const maxWorkshopPages = Math.max(48, topics.length * 6);
  while (topics.length > 0 && pages.length < minimumContentPages && workshopIndex <= maxWorkshopPages) {
    const topic = topics[(workshopIndex - 1) % topics.length];
    const refs = {
      strandIds: [topic.strandId].filter(Boolean),
      unitIds: [topic.subStrandId].filter(Boolean),
      parentUnitIds: [topic.parentSubStrandId].filter(Boolean),
      outcomeIds: (topic.learningOutcomes || []).map(outcome => outcome.id).filter(Boolean),
      sourceRefs: compactSourceRefs(topic.sourceRefs || sourceRefsFromSnapshot(snapshot)),
      fullSourceRefs: topic.fullSourceRefs || topic.sourceRefs || sourceRefsFromSnapshot(snapshot),
      imageRefs: visualRefsFor(topic, 'application-workshop')
    };
    add(`${topic.unitTitle}: Application Workshop ${workshopIndex}`, subjectApplicationWorkshop(context, subject.title, topic, workshopIndex), { ...refs, pageType: 'activity', difficulty: workshopIndex % 3 === 0 ? 'challenge' : 'core' });
    workshopIndex += 1;
  }

  const glossaryContent = subject.title === 'French'
    ? `Utilise ce glossaire pour réviser les mots importants en ${subject.title}.\n\n${topics.slice(0, 35).map(topic => `- ${topic.unitTitle}: Explique ce mot ou ce thème avec un exemple du livre, de l'école ou de la maison.`).join('\n')}\n\nAjoute cinq autres mots de tes leçons et écris leur sens avec tes propres mots.`
    : subject.title === 'Kinyarwanda'
      ? `Koresha iyi nkoranyamagambo usubiremo amagambo y'ingenzi muri ${subject.title}.\n\n${topics.slice(0, 35).map(topic => `- ${topic.unitTitle}: Sobanura iri jambo cyangwa uyu mutwe ukoresheje urugero rwo mu gitabo, ku ishuri cyangwa mu rugo.`).join('\n')}\n\nOngeramo andi magambo atanu yo mu masomo yawe wandike ibisobanuro byayo mu magambo yawe.`
      : `Use this glossary to revise important words in ${subject.title}.\n\n${topics.slice(0, 35).map(topic => `- ${topic.unitTitle}: Explain this term using an example from the book, your school, or your community.`).join('\n')}\n\nAdd five more words from your lessons and write your own meanings.`;
  add(localizedPageTitle(subject.title, '', 'glossary'), glossaryContent, { pageType: 'glossary', difficulty: 'support' });
  const answerNotes = subject.title.includes('Math') || subject.title === 'Hisabati'
    ? `A strong ${subject.title} answer shows the model, method, units or labels, final answer, and a check. Use the worked examples and answer checks in each practice page to correct your work. When an answer is wrong, find the first step that changed the meaning and correct that step before trying a new question.`
    : subject.title.includes('Science') || ['Biology', 'Chemistry', 'Physics', 'Sayansi'].includes(subject.title)
      ? `A strong ${subject.title} answer states the idea, uses correct scientific vocabulary, records observations or data, includes units or labels where needed, and writes a conclusion that follows from evidence. Safety rules always come first. If evidence is missing, repeat the observation safely or explain what evidence would be needed.`
      : subject.title === 'French'
        ? `Une bonne réponse en ${subject.title} reste sur le thème, utilise le vocabulaire appris, garde un sens clair, puis vérifie les accents, l'orthographe, la ponctuation, la grammaire et la prononciation après feedback. Si une phrase est faible, réécris-la avec un mot du thème et un détail précis.`
        : subject.title === 'Kinyarwanda'
          ? `Igisubizo cyiza muri ${subject.title} kiguma ku nsanganyamatsiko, gikoresha amagambo yizewe, kigira igisobanuro cyumvikana, kandi kigenzura imyandikire, utwatuzo, imiterere y'interuro n'imvugo nyuma yo guhabwa inama. Niba interuro idasobanutse, yongere uyandike ukoresheje ijambo ry'isomo n'igisobanuro nyacyo.`
      : isLanguageSubject(subject.title)
        ? `A strong ${subject.title} answer matches the task, uses topic vocabulary, keeps meaning clear, and checks spelling, punctuation, grammar, pronunciation, or expression after feedback. Improve one weak sentence by adding a precise detail from the topic.`
        : `A strong ${subject.title} answer responds to the exact task, uses correct vocabulary, gives a clear example or evidence, and shows correction after feedback. For practical work, name materials, safety, process, quality checks, peer feedback, and one improvement made after review.`;
  add(localizedPageTitle(subject.title, '', 'answerNotes'), answerNotes, { pageType: 'answer-notes', difficulty: 'support' });
  const finalProject = subject.title === 'French'
    ? `Crée un projet final en ${subject.title} pour montrer ce que tu peux faire seul.\n\nTon projet doit contenir:\n1. Un titre clair.\n2. Un problème, une question, un texte, un dialogue ou une présentation lié au vrai monde.\n3. Des éléments d'au moins trois leçons de ce livre.\n4. Un dessin, un tableau, une carte de mots, un dialogue, un paragraphe ou une courte présentation.\n5. Une note de correction qui montre une amélioration après feedback.\n6. Une courte réflexion: ce que tu as appris, ce qui était difficile et ce que tu vas pratiquer ensuite.\n\nVérification: écris lisiblement, utilise le vocabulaire correct et prépare-toi à expliquer tes choix.`
    : subject.title === 'Kinyarwanda'
      ? `Tegura umushinga usoza muri ${subject.title} werekane ibyo ushobora gukora wigenga.\n\nUmushinga wawe ugomba kugira:\n1. Umutwe usobanutse.\n2. Ikibazo, umwandiko, ikiganiro cyangwa igitekerezo bifitanye isano n'ubuzima busanzwe.\n3. Ingingo zo mu masomo nibura atatu yo muri iki gitabo.\n4. Igishushanyo, imbonerahamwe, ikarita y'amagambo, ikiganiro, agace k'inyandiko cyangwa ikiganiro kigufi.\n5. Inyandiko y'ikosora igaragaza icyo wahinduye nyuma yo guhabwa inama.\n6. Isubiramo rigufi: ibyo wize, ibyagukomereye n'ibyo uzakomeza kwimenyereza.\n\nIsuzuma: andika neza, koresha amagambo aboneye kandi witegure gusobanurira mugenzi wawe amahitamo yawe.`
      : `Create a final project for ${subject.title} that shows what you can now do independently.\n\nYour project must include:\n1. A clear title.\n2. A real-life problem, question, text, performance, investigation, design, or worked task.\n3. Evidence from at least three lessons in this book.\n4. A drawing, table, map, chart, model, dialogue, paragraph, performance plan, practical product, or worked solution.\n5. A correction note showing one improvement after feedback.\n6. A short reflection explaining what you learned, what was difficult, and what you will practise next.\n\nPresentation check: keep the work neat, label important parts, use correct vocabulary, and be ready to explain your choices to a classmate or teacher.`;
  add(localizedPageTitle(subject.title, '', 'finalProject'), finalProject, { pageType: 'project', difficulty: 'challenge' });

  return pages;
}

function markdownFor(manifest, pages) {
  const frontmatter = [
    '---',
    `title: ${JSON.stringify(manifest.title)}`,
    `book_id: ${JSON.stringify(manifest.bookId)}`,
    `country: ${JSON.stringify(manifest.country)}`,
    `curriculum: ${JSON.stringify(manifest.curriculum)}`,
    `grade: ${JSON.stringify(manifest.grade)}`,
    `subject: ${JSON.stringify(manifest.subject)}`,
    `status: ${JSON.stringify(manifest.status)}`,
    `version: ${JSON.stringify(manifest.version)}`,
    `source_snapshot_hash: ${JSON.stringify(manifest.sourceSnapshotHash)}`,
    '---',
    ''
  ];
  return `${frontmatter.join('\n')}# ${manifest.title}\n\n${pages.map(page => `## ${page.title}\n\n${page.content}`).join('\n\n')}\n`;
}

function sourceMapFor(manifest, pages) {
  return {
    schemaVersion: 1,
    bookId: manifest.bookId,
    sourceSnapshotHash: manifest.sourceSnapshotHash,
    bookPlanHash: manifest.bookPlanHash,
    pages: pages.map(page => ({
      pageId: page.pageId,
      title: page.title,
      pageType: page.pageType,
      strandIds: page.strandIds || [],
      unitIds: page.unitIds || [],
      parentUnitIds: page.parentUnitIds || [],
      outcomeIds: page.outcomeIds || [],
      sourceRefs: page.fullSourceRefs?.length
        ? page.fullSourceRefs
        : (page.sourceRefs?.length ? page.sourceRefs : generatedApparatusSourceRef(manifest, page)),
      imageRefs: page.imageRefs || []
    }))
  };
}

function generatedApparatusSourceRef(manifest, page) {
  return [{
    type: 'generated-book-apparatus',
    reason: 'book-navigation-review-or-learner-support-page',
    country: manifest.country,
    curriculum: manifest.curriculum,
    grade: manifest.grade,
    subject: manifest.subject,
    pageType: page.pageType,
    sourceSnapshotHash: manifest.sourceSnapshotHash
  }];
}

function sourceRefsFor(manifest) {
  const documents = Array.isArray(manifest.sourceDocuments) ? manifest.sourceDocuments : [];
  if (!documents.length) {
    return [{
      type: 'source-snapshot',
      sourceSnapshotHash: manifest.sourceSnapshotHash,
      country: manifest.country,
      curriculum: manifest.curriculum,
      grade: manifest.grade,
      subject: manifest.subject
    }];
  }
  return documents.map(doc => ({
    type: 'curriculum-source-document',
    sourceDocumentId: doc.id,
    officialTitle: doc.officialTitle,
    subject: doc.subject,
    extractionStatus: doc.extractionStatus,
    reviewStatus: doc.reviewStatus,
    sourceUrlStatus: doc.sourceUrlStatus,
    sourceUrl: doc.sourceUrl,
    objectKey: doc.objectKey,
    sourceSnapshotHash: manifest.sourceSnapshotHash
  }));
}

function sourceIsReviewed(docs) {
  return docs.length > 0 && docs.every(doc => ['approved', 'reviewed'].includes(String(doc.review_status || '').toLowerCase()));
}

function shouldUseFallbackLegacy(context, subject, rows) {
  if (rows.length < 4) return true;
  if (context.country === 'ETH' && ['English', 'English Language'].includes(subject.title)) {
    const artifactCount = rows.filter(row => isParserArtifactTopicTitle(row.sub_strand_title)).length;
    return rows.length < 7 || artifactCount > 0;
  }
  return false;
}

async function existingCoverState(outDir, previousManifest) {
  const existingAssets = Array.isArray(previousManifest?.assets) ? previousManifest.assets : [];
  const coverImage = previousManifest?.coverImage || null;
  if (coverImage && await fileExists(path.join(outDir, coverImage.path))) {
    return {
      coverImage,
      assets: existingAssets,
      coverStatus: 'deferred-until-all-content-ready',
      preservedExistingCover: true
    };
  }
  const coverAsset = existingAssets.find(asset => asset?.kind === 'cover' && asset.path);
  if (coverAsset && await fileExists(path.join(outDir, coverAsset.path))) {
    return {
      coverImage: coverAsset,
      assets: existingAssets,
      coverStatus: 'deferred-until-all-content-ready',
      preservedExistingCover: true
    };
  }
  return {
    coverImage: null,
    assets: existingAssets.filter(asset => asset?.kind !== 'cover'),
    coverStatus: 'deferred-until-all-content-ready',
    preservedExistingCover: false
  };
}

async function buildBook(client, context, grade, subject, options) {
  const progress = await loadProgress();
  const key = `${context.country}:${context.curriculum}:${gradeCode(grade)}:${subject.slug}`;
  const existing = progress.jobs.find(job => job.key === key);
  if (existing?.status === 'completed' && existing.generatorVersion === GENERATOR_VERSION && !options.force) return { skipped: true, key };

  const startedAt = nowIso();
  const normalized = await queryNormalizedCurriculum(client, context.country, context.curriculum, grade, subject);
  if (!normalized.units.length) {
    await appendEvent({ type: 'job_skipped_no_units', key });
    return { skipped: true, key, reason: 'no_units' };
  }

  const sourceMarkdowns = await readSourceMarkdowns(normalized.sourceDocuments);
  const sourceRows = legacyRowsFromSourceMarkdowns(sourceMarkdowns, grade, subject);
  if (sourceMarkdowns.length && !sourceRows.length) {
    await appendEvent({ type: 'job_source_parse_warning_fallback', key, grade, subject: subject.title, markdownCount: sourceMarkdowns.length });
  }
  const extractedLegacy = sourceRows.length ? sourceRows : legacyRowsFromUnits(normalized.units, subject);
  const cleanLegacy = dedupeLegacyRows(extractedLegacy.filter(row => isLearnerFacingTopicTitle(row.sub_strand_title)));
  const useFallbackLegacy = shouldUseFallbackLegacy(context, subject, cleanLegacy);
  if (useFallbackLegacy) {
    await appendEvent({ type: 'job_weak_topic_set_fallback', key, grade, subject: subject.title, cleanTopicCount: cleanLegacy.length });
  }
  const legacy = useFallbackLegacy ? fallbackLegacyRowsForSubject(grade, subject) : cleanLegacy;
  const snapshot = {
    schemaVersion: 1,
    sourceType: 'normalized-curriculum',
    country: context.country,
    curriculum: context.curriculum,
    grade,
    subject: subject.title,
    generatedAt: startedAt,
    units: normalized.units,
    legacy,
    sourceMarkdowns: sourceMarkdowns.map(markdown => ({
      sourceDocumentId: markdown.sourceDocumentId,
      officialTitle: markdown.officialTitle,
      subject: markdown.subject,
      path: markdown.path,
      sha256: markdown.sha256,
      textLength: markdown.textLength,
      extractedUnitCount: legacy.filter(row => row.sourceDocumentId === markdown.sourceDocumentId).length
    })),
    sourceDocuments: normalized.sourceDocuments
  };
  const hash = stableHash(snapshot);
  snapshot.inputHash = hash;

  const bookId = bookIdFor(context.country, context.curriculum, grade, subject);
  const outDir = path.join(BOOK_ROOT, context.country, context.curriculum, gradeCode(grade), subject.slug);
  const previousManifest = await readJsonIfExists(path.join(outDir, 'manifest.json'));
  const coverState = await existingCoverState(outDir, previousManifest);
  const snapshotPath = path.join(SNAPSHOT_ROOT, context.country, context.curriculum, gradeCode(grade), `${bookId}-${hash.slice(0, 12)}.json`);

  await writeJsonAtomic(snapshotPath, snapshot);
  await saveProgress({
    ...progress,
    updatedAt: nowIso(),
    jobs: upsertJob(progress.jobs, { key, country: context.country, curriculum: context.curriculum, grade, subject: subject.title, slug: subject.slug, status: 'running', generatorVersion: GENERATOR_VERSION, contentStatus: 'content-building', coverStatus: coverState.coverStatus, startedAt, snapshotPath: rel(snapshotPath), snapshotHash: hash })
  });
  await appendEvent({ type: 'job_started', key, generatorVersion: GENERATOR_VERSION, snapshotHash: hash });

  const bookPlan = buildBookPlan(snapshot, context, grade, subject);
  const bookPlanHash = stableHash(bookPlan);
  const pages = buildPages(snapshot, context, grade, subject, bookPlan);
  const appPages = appPagesFor(pages);
  const sourceReviewed = sourceIsReviewed(normalized.sourceDocuments);
  const contentStatus = sourceReviewed ? 'content-draft-source-reviewed' : 'content-draft-review-needed';
  const generatedFallbackTopicCount = bookPlan.sourceDerivation?.generatedFallbackTopicCount || 0;
  const normalizedSourceTopicCount = bookPlan.sourceDerivation?.normalizedSourceTopicCount || 0;
  const derivationNote = generatedFallbackTopicCount
    ? `Generated from fallback teaching outlines because source extraction did not provide enough clean learner-facing curriculum units. Replace with normalized source-derived topics and review source extraction before publication.`
    : `Generated from normalized extracted curriculum rows. Review source extraction before publication.`;
  const manifest = {
    schemaVersion: 1,
    bookId,
    title: titleFor(grade, subject),
    country: context.country,
    curriculum: context.curriculum,
    grade,
    subject: subject.title,
    subjectSlug: subject.slug,
    subjectColor: subject.color,
    version: `draft-${startedAt.slice(0, 10)}`,
    generatorVersion: GENERATOR_VERSION,
    status: contentStatus,
    contentStatus,
    coverStatus: coverState.coverStatus,
    generatedAt: startedAt,
    sourceSnapshotHash: hash,
    bookPlanHash,
    pageCount: appPages.length,
    wordCount: appPages.reduce((sum, page) => sum + page.wordCount, 0),
    contentQuality: {
      strategy: 'learner-first-topic-cluster',
      voice: 'simple, conversational, age-appropriate, evidence-based, and anti-fluff',
      coversDeferred: true,
      topicCount: bookPlan.topics.length,
      outcomeCount: bookPlan.topics.reduce((sum, topic) => sum + topic.learningOutcomes.length, 0),
      generatedFallbackTopicCount,
      normalizedSourceTopicCount,
      sourceDerivationStatus: generatedFallbackTopicCount
        ? 'generated-outline-fallback-review-required'
        : 'normalized-source-derived',
      antiFluffChecks: [
        'No generic filler introductions.',
        'Every page must explain, model, guide practice, assess, review, or support vocabulary.',
        'Every outcome must be covered by explanation, activity/example, and practice.'
      ],
      localContextRequired: true,
      sourceMapRequired: true
    },
    mascot: { country: context.country, subject: subject.title, ...subject.mascot },
    cover: {
      scene: subject.scene,
      prompt: `Create vibrant realistic school textbook cover artwork for ${context.name} ${context.curriculum} ${grade} ${subject.title}. Scene: ${subject.scene}. Include a friendly ${subject.mascot.species} mascot near the title area, looking inviting and helpful. Show learners in a subject-relevant setting, bright commercial learner-book style, no readable text, no logos, portrait 4:5.`
    },
    coverAssetStatus: coverState.preservedExistingCover ? 'existing-cover-preserved-for-library-display' : 'cover-not-started',
    coverImage: coverState.coverImage || undefined,
    assets: coverState.assets,
    downloads: {
      markdown: `${bookId}.md`,
      bookPlan: 'book-plan.json',
      pagesJson: 'pages.json',
      sourceMap: 'source-map.json',
      pdf: `${bookId}.pdf`
    },
    sourceQuality: {
      status: sourceReviewed ? 'draft-source-reviewed' : 'draft-source-review-needed',
      reviewStatus: sourceReviewed ? 'reviewed' : 'review_needed',
      coverageCaveat: context.coverageCaveat || undefined,
      notes: generatedFallbackTopicCount
        ? `${derivationNote}${context.coverageCaveat ? ` ${context.coverageCaveat}` : ''}`
        : sourceReviewed
        ? `Generated from normalized extracted curriculum rows whose attached source documents are reviewed or approved.${context.coverageCaveat ? ` ${context.coverageCaveat}` : ''}`
        : `${derivationNote}${context.coverageCaveat ? ` ${context.coverageCaveat}` : ''}`
    },
    sourceDocuments: normalized.sourceDocuments.map(doc => ({
      id: doc.id,
      subject: doc.subject,
      officialTitle: doc.official_title,
      countryCode: doc.country_code,
      curriculumCode: doc.curriculum_code,
      gradeCode: doc.grade_code,
      gradeLocalLevel: doc.grade_local_level,
      localLevel: doc.local_level,
      extractionStatus: doc.extraction_status,
      reviewStatus: doc.review_status,
      sourceUrlStatus: doc.source_url_status,
      sourceUrl: doc.source_url,
      objectKey: doc.object_key,
      metadata: doc.metadata
    }))
  };

  await fs.mkdir(outDir, { recursive: true });
  await writeJsonAtomic(path.join(outDir, 'book-plan.json'), bookPlan);
  await writeJsonAtomic(path.join(outDir, 'manifest.json'), manifest);
  await writeJsonAtomic(path.join(outDir, 'pages.json'), appPages);
  await writeJsonAtomic(path.join(outDir, 'source-map.json'), sourceMapFor(manifest, pages));
  await writeTextAtomic(path.join(outDir, `${bookId}.md`), markdownFor(manifest, appPages));
  await writeJsonAtomic(path.join(outDir, `${bookId}.pages.json`), { ...manifest, pages: appPages });

  const pdf = spawnSync('python', [path.join(__dirname, 'render-book-package-pdf.py'), '--dir', outDir], { cwd: repoRoot, encoding: 'utf8' });
  if (pdf.status !== 0) throw new Error(`PDF render failed for ${key}: ${pdf.stderr || pdf.stdout}`);

  const completedAt = nowIso();
  const nextProgress = await loadProgress();
  await saveProgress({
    ...nextProgress,
    updatedAt: completedAt,
    jobs: upsertJob(nextProgress.jobs, { key, country: context.country, curriculum: context.curriculum, grade, subject: subject.title, slug: subject.slug, status: 'completed', generatorVersion: GENERATOR_VERSION, contentStatus, coverStatus: coverState.coverStatus, startedAt, completedAt, snapshotPath: rel(snapshotPath), snapshotHash: hash, bookPlanHash, outDir: rel(outDir), pageCount: appPages.length, wordCount: manifest.wordCount })
  });
  await appendEvent({ type: 'job_completed', key, generatorVersion: GENERATOR_VERSION, pageCount: appPages.length, wordCount: manifest.wordCount, bookPlanHash });
  return { key, outDir, pageCount: appPages.length, wordCount: manifest.wordCount };
}

function buildQueue(args) {
  const requestedCountries = (args.countries || args.country || 'RWA,UGA,TZA,ETH').split(',').map(value => value.trim().toUpperCase()).filter(Boolean);
  const queue = [];
  for (const country of requestedCountries) {
    const config = COUNTRY_CONFIGS[country];
    if (!config) throw new Error(`Unsupported normalized country: ${country}`);
    const context = { country, name: config.name, curriculum: args.curriculum || config.curriculum };
    const gradeFilter = args.grades ? new Set(args.grades.split(',').map(value => value.trim().toLowerCase())) : null;
    const subjectFilter = args.subjects ? new Set(args.subjects.split(',').map(value => value.trim().toLowerCase())) : null;
    for (const grade of config.grades) {
      if (gradeFilter && !gradeFilter.has(grade.toLowerCase()) && !gradeFilter.has(gradeCode(grade).toLowerCase())) continue;
      const subjects = config.subjectsByGrade[grade] || config.subjectsByGrade.default;
      for (const subject of subjects) {
        if (subjectFilter && !subjectFilter.has(subject.slug) && !subjectFilter.has(subject.title.toLowerCase())) continue;
        queue.push({ context, grade, subject });
      }
    }
  }
  return queue;
}

function coverageWarningsForQueue(queue) {
  const countries = [...new Set(queue.map(item => item.context.country))];
  return countries
    .map(country => {
      const caveat = COUNTRY_CONFIGS[country]?.coverageCaveat;
      return caveat ? { country, warning: caveat } : null;
    })
    .filter(Boolean);
}

async function main() {
  const args = parseArgs(process.argv);
  const connectionString = process.env.KITABU_DATABASE_URL;
  if (!connectionString) throw new Error('KITABU_DATABASE_URL is missing. Check apps/api/.env.');
  const limit = args.limit ? Number(args.limit) : Infinity;
  const queue = buildQueue(args).slice(0, limit);
  const coverageWarnings = coverageWarningsForQueue(queue);
  const client = new pg.Client({ connectionString });
  await client.connect();
  const results = [];
  try {
    for (const item of queue) {
      results.push(await buildBook(client, item.context, item.grade, item.subject, { force: args.force === 'true' }));
    }
  } finally {
    await client.end();
  }
  console.log(JSON.stringify({ processed: results, coverageWarnings }, null, 2));
}

main().catch(async error => {
  await appendEvent({ type: 'error', message: error.message, stack: error.stack });
  console.error(error);
  process.exit(1);
});
