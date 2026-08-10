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
loadEnv({ path: path.join(repoRoot, 'apps', 'api', '.env'), override: false });

const BOOK_ROOT = path.join(repoRoot, 'apps', 'api', 'data', 'books');
const SNAPSHOT_ROOT = path.join(repoRoot, 'apps', 'api', 'data', 'book-creator', 'snapshots');
const PROGRESS_PATH = path.join(repoRoot, 'apps', 'api', 'data', 'book-creator', 'progress.json');
const LOG_PATH = path.join(repoRoot, 'apps', 'api', 'data', 'book-creator', 'events.jsonl');
const GENERATOR_VERSION = 'learner-first-reviewer-remediation-renderers-2026-07-04-v48';

const CORE_SUBJECTS = [
  { db: 'Agriculture', slug: 'agriculture', title: 'Agriculture', color: '#15803D' },
  { db: 'Creative Arts', slug: 'creative-arts', title: 'Creative Arts', color: '#DB2777' },
  { db: 'English', slug: 'english', title: 'English', color: '#2563EB' },
  { db: 'Kiswahili', slug: 'kiswahili', title: 'Kiswahili', color: '#C2410C' },
  { db: 'Mathematics', slug: 'mathematics', title: 'Mathematics', color: '#047857' },
  { db: 'Science', slug: 'science-and-technology', title: 'Science and Technology', color: '#7C3AED' },
  { db: 'Social Studies', slug: 'social-studies', title: 'Social Studies', color: '#BE123C' }
];

const MASCOTS = {
  Agriculture: { species: 'honeybee', role: 'farming teamwork guide', sourceRationale: 'Pollination, farming systems, teamwork, food production, environmental care.' },
  'Creative Arts': { species: 'lilac-breasted roller', role: 'creative colour guide', sourceRationale: 'Colorful bird associated with Kenya and strong visual-arts fit.' },
  English: { species: 'fox rabbit', role: 'reading and storytelling guide', sourceRationale: 'User-approved English mascot for clever reading and storytelling.' },
  Kiswahili: { species: 'hare', role: 'oral language and folktale guide', sourceRationale: 'East African folktale association for methali, vitendawili, and stories.' },
  Mathematics: { species: 'lion', role: 'problem-solving guide', sourceRationale: 'User-approved Mathematics mascot; confidence, strength, and Kenya wildlife association.' },
  'Science and Technology': { species: 'chameleon', role: 'curiosity and observation guide', sourceRationale: 'Observation, adaptation, biology, and learner investigations.' },
  'Social Studies': { species: 'giraffe', role: 'maps and community guide', sourceRationale: 'Iconic Kenyan wildlife and landscape association for maps, parks, and environment topics.' }
};

const SCENES = {
  Agriculture: 'learners working in a school garden with seedlings, compost, watering cans, and a friendly honeybee mascot',
  'Creative Arts': 'learners painting a mural and playing percussion instruments with a colorful bird mascot',
  English: 'learners in a reading club with storybooks, a word wall, and a friendly fox rabbit mascot',
  Kiswahili: 'learners in a storytelling circle with books, proverbs cards, and a friendly hare mascot',
  Mathematics: 'learners solving real-life problems with blocks, measuring tools, maps, and a friendly lion mascot',
  'Science and Technology': 'learners observing a chameleon and plants during a safe outdoor investigation',
  'Social Studies': 'learners visiting a historical site with maps, cultural artifacts, and a friendly giraffe mascot'
};

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
    args[key] = value;
  }
  return args;
}

function nowIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function gradeNumber(grade) {
  return Number(String(grade).match(/\d+/)?.[0] ?? 0);
}

function gradeCode(grade) {
  return `G${gradeNumber(grade)}`;
}

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

async function replaceFileWithRetry(tmp, file) {
  let lastError;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      await fs.rename(tmp, file);
      return;
    } catch (error) {
      lastError = error;
      if (!['EPERM', 'EACCES', 'EBUSY'].includes(error.code)) throw error;
      await sleep(125 * (attempt + 1));
    }
  }

  try {
    await fs.copyFile(tmp, file);
    await fs.rm(tmp, { force: true });
    return;
  } catch (error) {
    error.cause = lastError;
    throw error;
  }
}

async function writeJsonAtomic(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await replaceFileWithRetry(tmp, file);
}

async function writeTextAtomic(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, value, 'utf8');
  await replaceFileWithRetry(tmp, file);
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

async function appendEvent(event) {
  await fs.mkdir(path.dirname(LOG_PATH), { recursive: true });
  await fs.appendFile(LOG_PATH, `${JSON.stringify({ at: nowIso(), ...event })}\n`, 'utf8');
}

async function loadProgress() {
  try {
    return JSON.parse(await fs.readFile(PROGRESS_PATH, 'utf8'));
  } catch {
    return { schemaVersion: 1, country: 'KEN', curriculum: 'CBC', startedAt: nowIso(), jobs: [] };
  }
}

function jobKey(grade, subject) {
  return `KEN:CBC:${gradeCode(grade)}:${subject.slug}`;
}

function sourceGradeCodes(grade) {
  const number = gradeNumber(grade);
  return [`GRADE_${number}`, `G${number}`];
}

function sourceSubjectsFor(grade, subject) {
  const number = gradeNumber(grade);
  const base = [subject.db, subject.title];
  const junior = number >= 7 && number <= 9;
  const senior = number >= 10 && number <= 12;

  if (subject.title === 'Science and Technology' && junior) {
    return [...base, 'Integrated Science'];
  }
  if (subject.title === 'Science and Technology' && senior) {
    return [...base, 'General Science', 'Biology', 'Chemistry', 'Physics'];
  }
  if (subject.title === 'Mathematics' && senior) {
    return [...base, 'Core Mathematics', 'Essential Mathematics'];
  }
  if (subject.title === 'Kiswahili' && senior) {
    return [...base, 'Kiswahili Lugha', 'Fasihi ya Kiswahili'];
  }
  if (subject.title === 'Creative Arts' && senior) {
    return [...base, 'Fine Arts', 'Music and Dance', 'Theatre and Film'];
  }
  if (subject.title === 'Social Studies' && senior) {
    return [...base, 'Geography', 'History and Citizenship'];
  }
  return base;
}

function agricultureSourceContaminationText(row) {
  const outcomes = Array.isArray(row.outcomes)
    ? row.outcomes.map(outcome => outcome?.text || outcome?.statement || String(outcome)).join(' ')
    : '';
  const inquiryQuestions = Array.isArray(row.inquiry_questions)
    ? row.inquiry_questions.map(question => question?.text || question?.question || String(question)).join(' ')
    : '';
  const pages = Array.isArray(row.pages)
    ? row.pages.map(page => page?.title || page?.content || String(page)).join(' ')
    : '';
  return normalizeText([
    row.strand_title,
    row.sub_strand_title,
    row.description,
    outcomes,
    inquiryQuestions,
    pages
  ].filter(Boolean).join(' ')).toLowerCase();
}

function isAgricultureSourceContamination(row) {
  const text = agricultureSourceContaminationText(row);
  if (!text) return false;
  return /\b(laundry|launder|loose[-\s]*colou?red|stains?\s+(?:on|from)\s+clothing|disinfect(?:ing|ion)?\s+(?:clothing|household articles?)|garments?|gaping seam|stitches?|crochet(?:ing)?|knit(?:ting)?|textiles?|fabric|yarn|household articles?)\b/i.test(text);
}

function filterCurriculumRowsForSubject(rows, subject) {
  if (subject.title !== 'Agriculture') return rows;
  return rows.filter(row => !isAgricultureSourceContamination(row));
}

async function queryCurriculum(client, grade, subject) {
  const legacyGrade = grade === 'Grade 11' ? 'Form 3' : grade === 'Grade 12' ? 'Form 4' : grade;
  const legacy = await client.query(
    `
      select cs.id as strand_id, cs.number as strand_number, cs.title as strand_title,
             cs.position as strand_position, css.id as sub_strand_id, css.number as sub_strand_number,
             css.title as sub_strand_title, css.description, css.position as sub_strand_position,
             coalesce(css.outcomes, '[]'::jsonb) as outcomes,
             coalesce(css.inquiry_questions, '[]'::jsonb) as inquiry_questions,
             coalesce(css.pages, '[]'::jsonb) as db_pages
      from curriculum_strands cs
      left join curriculum_sub_strands css on css.strand_id = cs.id
      where cs.grade_level = $1 and lower(cs.subject_name) = lower($2)
      order by cs.position nulls last, cs.number, css.position nulls last, css.number
    `,
    [legacyGrade, subject.db]
  );

  const source = await client.query(
    `
      select id, country_code, curriculum_code, grade_code, grade_local_level, local_level, subject,
             official_title, extraction_status, review_status, source_url_status, source_url, object_key, metadata
      from curriculum_source_documents
      where country_code = 'KEN'
        and curriculum_code = 'CBC'
        and (grade_local_level = $1 or local_level = $1 or grade_code = any($2::text[]))
        and lower(subject) = any($3::text[])
        and coalesce(review_status, '') <> 'rejected'
        and subject <> '__SOURCE_INVENTORY__'
      order by official_title nulls last
    `,
    [grade, sourceGradeCodes(grade), sourceSubjectsFor(grade, subject).map(value => value.toLowerCase())]
  );

  return { legacy: filterCurriculumRowsForSubject(legacy.rows, subject), sourceDocuments: source.rows };
}

function flattenOutcomes(rows) {
  return rows.flatMap(row => {
    const outcomes = Array.isArray(row.outcomes) ? row.outcomes : [];
    return outcomes.map((outcome, index) => ({
      id: outcome.id || `${row.sub_strand_id || row.strand_id}-outcome-${index + 1}`,
      text: outcome.text || outcome.statement || String(outcome),
      subStrandId: row.sub_strand_id,
      strandId: row.strand_id
    }));
  }).filter(outcome => outcome.text && outcome.text !== '[object Object]');
}

function normalizeText(value) {
  return String(value || '')
    .replace(/Macram..?/g, 'Macrame')
    .replace(/MacramÃ©/g, 'Macrame')
    .replace(/Ã©/g, 'e')
    .replace(/Ã¨/g, 'e')
    .replace(/Ã¡/g, 'a')
    .replace(/Ã¢/g, 'a')
    .replace(/Ã¶/g, 'o')
    .replace(/Ã¼/g, 'u')
    .replace(/\bof(?=measur|compar|construct|calculat|draw|using)/gi, 'of ')
    .replace(/\band(?=centimet|metres?|gram|kilogram|millimet|degrees?|angles?)/gi, 'and ')
    .replace(/\bdistance(?=in\b)/gi, 'distance ')
    .replace(/\bused(?=in\b)/gi, 'used ')
    .replace(/\brecordings of stores\b/gi, 'recordings of stories')
    .replace(/\baa speaker\b/gi, 'a speaker')
    .replace(/\btitles, characters, titles\b/gi, 'titles, characters')
    .replace(/\bpoems\/dialogues\)/gi, 'stories, poems, and dialogues')
    .replace(/\b(\d+)\s*-\s+(?=dimensional|point)/gi, '$1-')
    .replace(/\b3-\s*D\b/g, '3-D')
    .replace(/\bGovernm\s+ent\b/gi, 'Government')
    .replace(/\bCommunicatio\s+n\b/gi, 'Communication')
    .replace(/\bdevelopmen\s+ts\b/gi, 'developments')
    .replace(/\btransformatio\s+n\b/gi, 'transformation')
    .replace(/\b900,\s*450\s+600,\s*300\b/g, '90 degrees, 45 degrees, 60 degrees, and 30 degrees')
    .replace(/\b(angles?[^.;:\n]{0,50})900\b/gi, '$190 degrees')
    .replace(/\b900\b(?=.*\bangle)/gi, '90 degrees')
    .replace(/\b450\b(?=.*\bangle)/gi, '45 degrees')
    .replace(/\b600\b(?=.*\bangle)/gi, '60 degrees')
    .replace(/\b300\b(?=.*\bangle)/gi, '30 degrees')
    .replace(/\bin n kiln\b/gi, 'in a kiln')
    .replace(/\bbrushworkspray(?:ing)?\b/gi, 'brush spraying')
    .replace(/\bbrushwork\s+spray(?:ing)?\b/gi, 'brush spraying')
    .replace(/\bbrush\s*-\s*/gi, 'brush ')
    .replace(/\b([A-Za-z]+)-\s+([a-z]+)/g, '$1-$2')
    .replace(/\s*\.\.\.+/g, '')
    .replace(/\s+([:;,.!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function removeAdjacentDuplicateWords(value) {
  const words = normalizeText(value).split(' ');
  const cleaned = [];
  for (const word of words) {
    const previous = cleaned[cleaned.length - 1];
    if (previous && previous.toLowerCase().replace(/[^a-z0-9]+/g, '') === word.toLowerCase().replace(/[^a-z0-9]+/g, '')) {
      continue;
    }
    cleaned.push(word);
  }
  return cleaned.join(' ');
}

function trimDanglingConnector(value) {
  let text = normalizeText(value);
  while (/\b(and|or|of|to|in|by|for|from|under|as|with|the|a|an)\.?$/i.test(text)) {
    const next = text
      .replace(/^(and|or|of|to|in|by|for|from|under|as|with|the|a|an)\.?$/i, '')
      .replace(/\s+\b(and|or|of|to|in|by|for|from|under|as|with|the|a|an)\.?$/i, '')
      .trim();
    if (next === text) break;
    text = next;
  }
  return text;
}

function repairCurriculumArtifact(value, fallback) {
  const text = normalizeText(value);
  if (!text) return fallback;
  const lowered = text.toLowerCase();
  if (/^strand$/i.test(text)) return fallback;
  if (/^(Reading|Listening|Speaking|Writing)\s+\d+(?:\.\d+)+$/i.test(text)) {
    return `${text.match(/^(Reading|Listening|Speaking|Writing)/i)[1]} Practice`;
  }
  if (/^(Kusoma|Kuandika|Kusikiliza|Kuzungumza|Sarufi)\s+\d+(?:\.\d+)+$/i.test(text)) {
    return text.match(/^(Kusoma|Kuandika|Kusikiliza|Kuzungumza|Sarufi)/i)[1];
  }
  if (/^Grammar in uses?$/i.test(text)) return 'Grammar Practice';
  if (/^explain and apply\s+(english|kiswahili)\s+topic\b/i.test(text)) return fallback;
  if (/^topic\s+\d+$/i.test(text)) return fallback;
  if (/^direct$/i.test(text)) return fallback;
  if (/^es preservation and storage of cereals and pulses enhance/i.test(text)) return 'Preservation and Storage of Cereals and Pulses';
  if (/^innovative technology be used to preserve vegetables/i.test(text)) return 'Using a Homemade Sun Dryer to Preserve Vegetables';
  if (/^food nutrients in the body.*poor$/i.test(text)) return 'identify food nutrients and disorders linked to poor nutrition';
  if (/^swimming \(optional\): entry in the swimming pool/i.test(text)) return 'Swimming: Safe Entry and Pool Confidence';
  if (/^swimming \(optional\): role played by animal games/i.test(text)) return 'Animal Games for Fitness';
  if (/^pottery and ceramics clay elements of 3-D art/i.test(text)) return 'Pottery and Ceramics: Elements of 3-D Art';
  if (/^role played by animal games for fitness/i.test(text)) return 'Animal Games for Fitness';
  if (/^intensive reading:\s*be able to:\s*comprehension.*illustrations/i.test(text)) return 'Intensive Reading: Using Illustrations for Comprehension';
  if (/direct and:\s*rules of inversion/i.test(text)) return 'Direct and Inverted Word Order: Rules of Inversion';
  if (/composition of about$/i.test(text)) return 'write a composition with a clear beginning, middle, and ending';
  if (/texts? of about$/i.test(text)) return 'read factual texts and answer questions using evidence';
  if (/katika uandishi wa$/i.test(text)) return 'kutumia msamiati na sarufi sahihi katika uandishi';
  if (/kuhusu mahali,\s*hali na:?$/i.test(text)) return 'Vielezi vya Mahali, Hali, na Wakati';
  if (/^nyakati na hali ya$/i.test(text)) return 'Nyakati na Hali ya Vitenzi';
  if (/^katika$/i.test(text)) return fallback;
  if (/\b(na|kwa|ya|wa)\.?$/i.test(text) && text.split(/\s+/).length < 8) return fallback;
  if (/^(appreciate|embrace|value)\s+the\s+(role|importance)\.?$/i.test(text)) return fallback;
  if (/^(appreciate|embrace|value)\s+the\s+importance\s+of\s+listening\s+for\s+information\b/i.test(text)) return 'listen for information in oral contexts';
  if (/^(appreciate|embrace|value)\s+the\s+importance\s+of\s+(.+)$/i.test(text)) {
    const idea = trimDanglingConnector(text.replace(/^(appreciate|embrace|value)\s+the\s+importance\s+of\s+/i, '').replace(/\.$/, ''));
    return idea || fallback;
  }
  if (/^selective listening filtering information extracting information/i.test(text)) return 'Selective Listening: Filtering and Extracting Information from Oral Texts';
  if (/\s*:\s*(appreciate|embrace|value)\s+the\s+(role|importance)\.?$/i.test(text)) {
    return trimDanglingConnector(text.replace(/\s*:\s*(appreciate|embrace|value)\s+the\s+(role|importance)\.?$/i, '')) || fallback;
  }
  if (/usikilizaji husishi.*mahusiano ya kimataifa|kimataifa ambapo usikilizaji husishi/i.test(text)) return 'Usikilizaji Husishi katika Mahusiano ya Kimataifa';
  if (/^mnyambuliko sarufi kauli ya kutenda.*kutumia vitenzi katika kauli za\b/i.test(text)) return 'Mnyambuliko wa Vitenzi: Kauli za Kutenda, Kutendea, na Kutendwa';
  if (/^kutumia vitenzi katika kauli za$/i.test(text)) return 'kutumia vitenzi katika kauli za kutenda, kutendea, na kutendwa ipasavyo';
  if (/^kuchangamkia matumizi ya vitenzi.*kutendea na$/i.test(text)) return 'kuchangamkia matumizi ya vitenzi katika kauli za kutenda, kutendea, na kutendwa';
  if (/^drawing elements and principles.*linear perspective/i.test(text)) return 'Drawing: Elements, Principles, and Perspective';
  if (/^painting wash technique.*brush/i.test(text)) return 'Painting: Wash and Brush Spraying Techniques';
  if (/^collage type of collage/i.test(text)) return 'Collage: Single-Media and Mixed-Media';
  if (/^poems\/dialogues\)?$/i.test(text)) return 'Listening to Recorded Stories, Poems, and Dialogues';
  if (/^melody:\s*model clay slabs\b/i.test(text)) return 'Clay Slab Modelling';
  if (/^self-awareness(?:\s+and\s+awareness)+\s+and\s+personal interests$/.test(lowered)) return 'Self-awareness and personal interests';
  if (lowered === 'self-' || lowered === 'self') return 'Self-awareness and personal interests';
  if (lowered === 'abilities and interests for holistic') return 'identify personal abilities and interests for personal development';
  if (lowered === 'appreciate the role') return fallback;
  if (/^correctly in oral and written texts\b/.test(lowered)) return fallback;
  if (/^learners are guided to\b/.test(lowered)) {
    if (/body cleanliness|personal hygiene|cleanliness as a healthy habit/i.test(text)) return 'practise body cleanliness as a healthy personal hygiene habit';
    if (/poultry|rear poultry|locally available materials/i.test(text)) return 'rear poultry using locally available materials';
    return fallback;
  }
  if (/^topic\s+\d+(?:\.\d+)+$/i.test(text)) return fallback;
  if (/^selected$/i.test(text)) return fallback;
  if (/^interpret rhythmic$/.test(lowered)) return 'interpret rhythmic patterns using clapping, movement, or percussion';
  if (/^analyse the elements and$/.test(lowered)) return fallback;
  if (/^create a mixed-media$/.test(lowered)) return fallback;
  if (/^and responsibilities of a kenyan citizen$/.test(lowered)) return 'explain rights and responsibilities of a Kenyan citizen';
  if (/^materials for lifelong learning\b/.test(lowered)) return 'read a variety of materials independently to build reading speed and fluency';
  if (/^model clay slabs with sol-fa syllables using coil and slab techniques$/i.test(text)) return 'model clay slabs using coil and slab techniques';
  if (/\banalyse the elements and$/i.test(text)) return trimDanglingConnector(text.replace(/\s*:?\s*analyse the elements and$/i, '')) || fallback;
  if (/^tilth for selected planting material\b/.test(lowered)) return fallback;
  if (/practises carried out on crops practises in crop production/i.test(lowered)) return 'carry out crop management practices in crop production';
  if (/\bprovided$/.test(lowered) && text.split(/\s+/).length < 8) return fallback;
  if (/^punctuation abbreviations appropriately\b/.test(lowered)) return 'use punctuation, abbreviations, and acronyms appropriately for effective communication';
  if (/^self-\s+/.test(lowered)) return text.replace(/^Self-\s+/i, 'Self-awareness and ');
  if (/-$/.test(text) && text.split(/\s+/).length <= 4) return fallback;
  if (/^(and|or|for|to|of|with|in|on|by)\b/i.test(text)) return fallback;
  if (/\b(for|from|to|of|with|in|on|by|and|or)\.?$/i.test(text) && text.split(/\s+/).length < 8) return fallback;
  if (/^\w+\s+\w+\s+for\s+\w+$/i.test(text) && text.split(/\s+/).length <= 5) return fallback;
  return text;
}

function cleanDisplayText(value, fallback = 'Topic') {
  let text = normalizeText(value)
    .replace(/^\W+/, '')
    .replace(/\bself-\s+/gi, 'self-')
    .replace(/\bInquiry Question\(s\)\b/gi, '')
    .replace(/\bInquiry Questions?\b/gi, '')
    .replace(/\bQuestions?\s+(Where|How|What|Why|When)\b/gi, '$1')
    .replace(/\bQuestion\s+(Where|How|What|Why|When)\b/gi, '$1')
    .replace(/:{2,}/g, ':')
    .replace(/\s+([:;,.!?])/g, '$1')
    .replace(/[,:;]+$/g, '')
    .replace(/\s+\d+$/g, '')
    .trim();
  text = removeAdjacentDuplicateWords(text);
  text = trimDanglingConnector(text);
  text = repairCurriculumArtifact(text, fallback);
  if (!text || text.length < 3) return fallback;
  if (text.length > 120) {
    const sentence = text.split(/[.;]/).map(part => part.trim()).find(part => part.length >= 12 && part.length <= 120);
    if (sentence) return trimDanglingConnector(sentence);
    return trimDanglingConnector(text.split(/\s+/).slice(0, 16).join(' '));
  }
  return text;
}

function isLanguageSubject(subjectTitle) {
  return /^(English|Kiswahili)$/i.test(subjectTitle || '');
}

function normalizeKiswahiliHeading(value) {
  const text = normalizeText(value);
  if (!text) return text;
  return text.replace(/\b(Wa|Ya|Za|Na|Kwa|Katika|Hiki|Huu|Haya|Hii|Hiyo|Vya|Cha|La)\b/g, word => word.toLowerCase());
}

function languageSkillLabel(subjectTitle, skill) {
  const normalized = String(skill || '').toLowerCase();
  if (subjectTitle === 'Kiswahili') {
    if (/kusoma|reading/.test(normalized)) return 'Kusoma';
    if (/kuandika|writing/.test(normalized)) return 'Uandishi';
    if (/kusikiliza|listening/.test(normalized)) return 'Kusikiliza';
    if (/kuzungumza|speaking/.test(normalized)) return 'Kuzungumza';
    if (/sarufi|grammar/.test(normalized)) return 'Sarufi';
    return 'Stadi za Lugha';
  }
  if (/reading|kusoma/.test(normalized)) return 'Reading Practice';
  if (/writing|kuandika/.test(normalized)) return 'Writing Practice';
  if (/listening|kusikiliza/.test(normalized)) return 'Listening Practice';
  if (/speaking|kuzungumza/.test(normalized)) return 'Speaking Practice';
  if (/grammar|sarufi/.test(normalized)) return 'Grammar Practice';
  return 'Language Practice';
}

function languageUnitTitle(subjectTitle, value, fallback = 'Language Skills') {
  let text = cleanDisplayText(stripEmbeddedOutcomeTail(value), fallback)
    .replace(/^\d+([A-Z])/g, '$1')
    .replace(/\b(Reading|Listening|Speaking|Writing|Grammar)\s+\d+(?:\.\d+)+\s*/gi, (_match, skill) => `${languageSkillLabel(subjectTitle, skill)} `)
    .replace(/\b(Kusoma|Kuandika|Kusikiliza|Kuzungumza|Sarufi)\s+\d+(?:\.\d+)+\s*/gi, (_match, skill) => `${languageSkillLabel(subjectTitle, skill)} `)
    .replace(/\bGrammar in uses?\b/gi, subjectTitle === 'Kiswahili' ? 'Sarufi katika Matumizi' : 'Grammar Practice')
    .replace(/\bGrammar in Use\b/gi, subjectTitle === 'Kiswahili' ? 'Sarufi katika Matumizi' : 'Grammar Practice')
    .replace(/\bStrand\s+\d+\b/gi, '')
    .replace(/\bKiswahili Chapter\b/gi, 'Sura ya Kiswahili')
    .replace(/\bEnglish Topic\b/gi, 'English Practice')
    .replace(/\bKiswahili Topic\b/gi, 'Mazoezi ya Kiswahili')
    .replace(/\s*:\s*/g, ' - ')
    .trim();

  if ((text.match(/:/g) || []).length >= 2) {
    text = text.split(':').map(part => cleanDisplayText(part, '')).find(part => part.length >= 8 && part.length <= 72) || fallback;
  }
  if (/^(you|pupil|learner|learners)\b/i.test(text) && text.length > 54) {
    text = fallback;
  }
  if (isGenericTopicTitle(text) || isMalformedDisplayText(text)) {
    text = fallback;
  }
  if (text.length > 72) {
    text = trimDanglingConnector(text.split(/\s+/).slice(0, 9).join(' ')) || fallback;
  }
  if (text.length > 72) {
    text = trimDanglingConnector(text.slice(0, 72).replace(/\s+\S*$/, '')) || fallback;
  }
  return subjectTitle === 'Kiswahili' ? normalizeKiswahiliHeading(text) : text;
}

function languageTopicDetail(subjectTitle, outcomes, fallbackTitle) {
  const raw = shortOutcomeLabel(outcomes, fallbackTitle || '');
  let detail = languageUnitTitle(subjectTitle, raw, '');
  detail = detail
    .replace(/\bcorrectly\b/gi, '')
    .replace(/\beffective\b/gi, '')
    .replace(/\bcommunication\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!detail || isGenericTopicTitle(detail) || isMalformedDisplayText(detail)) return '';
  if (/^(Reading|Writing|Listening|Speaking|Grammar) Practice$/i.test(detail)) return '';
  if (/^(Kusoma|Uandishi|Kusikiliza|Kuzungumza|Sarufi|Stadi za Lugha)$/i.test(detail)) return '';
  return detail.split(/\s+/).slice(0, 6).join(' ');
}

function learnerTitle(subjectTitle, value, fallback = 'Learning Skills') {
  if (isLanguageSubject(subjectTitle)) {
    return languageUnitTitle(subjectTitle, value, fallback);
  }
  return cleanDisplayText(value, fallback);
}

function learnerPhrase(subjectTitle, value, fallback = 'this skill') {
  return learnerTitle(subjectTitle, value, fallback).toLowerCase();
}

function topicFocusLine(subjectTitle, topic, outcomes = [], questions = []) {
  const firstOutcome = outcomes.find(outcome => outcome?.text)?.text || topic?.learningOutcomes?.find(outcome => outcome?.text)?.text || '';
  const firstQuestion = questions.find(Boolean) || topic?.inquiryQuestions?.find(Boolean) || '';
  const source = firstOutcome || firstQuestion || topic?.unitTitle || '';
  const cleaned = cleanLanguageOutcomeText(subjectTitle, source, learnerPhrase(subjectTitle, topic?.unitTitle || '', 'this skill'));
  const words = cleaned.split(/\s+/).slice(0, 14).join(' ');
  const topicNumber = String(topic?.topicId || '').match(/(\d+)$/)?.[1]?.replace(/^0+/, '') || '';
  if (subjectTitle === 'Kiswahili') return `Lengo la somo${topicNumber ? ` ${topicNumber}` : ''}: ${words}.`;
  return `Lesson focus${topicNumber ? ` ${topicNumber}` : ''}: ${words}.`;
}

function cleanOutcomeText(value, fallback) {
  const cleaned = cleanDisplayText(value, fallback)
    .replace(/^(i+\)|[a-z]\)|[ivx]+\.)\s*/i, '')
    .replace(/\s*\([^)]*$/g, '')
    .replace(/[,:;]+$/g, '')
    .replace(/\s+\d+$/g, '')
    .trim();
  if (!cleaned || cleaned.length < 8) return fallback;
  if (isGenericTopicTitle(cleaned) || isMalformedDisplayText(cleaned)) return fallback;
  return trimDanglingConnector(cleaned) || fallback;
}

function cleanLanguageOutcomeText(subjectTitle, value, fallback) {
  if (!isLanguageSubject(subjectTitle)) return cleanOutcomeText(value, fallback);
  const languageFallback = learnerPhrase(subjectTitle, fallback, 'this language skill');
  const cleaned = cleanOutcomeText(value, languageFallback)
    .replace(/\b(Reading|Listening|Speaking|Writing|Grammar)\s+\d+(?:\.\d+)+\s*/gi, (_match, skill) => `${languageSkillLabel(subjectTitle, skill)} `)
    .replace(/\b(Kusoma|Kuandika|Kusikiliza|Kuzungumza|Sarufi)\s+\d+(?:\.\d+)+\s*/gi, (_match, skill) => `${languageSkillLabel(subjectTitle, skill)} `)
    .replace(/\bGrammar in uses?\b/gi, subjectTitle === 'Kiswahili' ? 'Sarufi katika Matumizi' : 'Grammar Practice')
    .replace(/\s+/g, ' ')
    .trim();
  const safe = trimDanglingConnector(cleaned) || languageFallback;
  if (/\b(?:Reading|Listening|Speaking|Writing|Grammar|Kusoma|Kuandika|Kusikiliza|Kuzungumza|Sarufi)\s+\d+(?:\.\d+)+\b/i.test(safe)) {
    return languageFallback;
  }
  return safe;
}

function cleanQuestionText(value) {
  const cleaned = cleanDisplayText(value, '')
    .replace(/^(Question|Swali)\s*/i, '')
    .trim();
  if (!cleaned || cleaned.length < 10) return '';
  if (/\b(the|a|an|of|to|for|with|and|or)$/i.test(cleaned)) return '';
  if (/\b(help us understand|can we understand)$/i.test(cleaned)) return '';
  return cleaned;
}

function sourceNoteFor(row, snapshot) {
  const docs = Array.isArray(snapshot.sourceDocuments) ? snapshot.sourceDocuments : [];
  if (!docs.length) {
    return 'Generated from curriculum outline data; source-document review is needed before publication.';
  }
  const doc = docs[0];
  const title = normalizeText(doc.official_title || doc.officialTitle || 'curriculum source');
  const extraction = normalizeText(doc.extraction_status || doc.extractionStatus || 'unknown');
  const review = normalizeText(doc.review_status || doc.reviewStatus || 'review_needed');
  const rowDescription = normalizeText(row?.description || '');
  const pageHint = rowDescription.match(/\bpage\s+\d+/i)?.[0];
  return `Draft source: ${title}${pageHint ? `, ${pageHint}` : ''}. Extraction status: ${extraction}; review status: ${review}.`;
}

function localizedSourceNote(subjectTitle, row, snapshot) {
  const note = sourceNoteFor(row, snapshot);
  if (subjectTitle !== 'Kiswahili') return note;
  const docs = Array.isArray(snapshot.sourceDocuments) ? snapshot.sourceDocuments : [];
  if (!docs.length) {
    return 'Imetokana na muhtasari wa mtaala; ukaguzi wa hati chanzo unahitajika kabla ya kuchapishwa.';
  }
  const doc = docs[0];
  const title = normalizeText(doc.official_title || doc.officialTitle || 'hati ya mtaala');
  const review = normalizeText(doc.review_status || doc.reviewStatus || 'review_needed');
  const rowDescription = normalizeText(row?.description || '');
  const pageHint = rowDescription.match(/\bpage\s+\d+/i)?.[0];
  return `Chanzo cha rasimu: ${title}${pageHint ? `, ${pageHint}` : ''}. Hali ya ukaguzi: ${review}.`;
}

function pageId(bookId, index) {
  return `${bookId}-p${String(index).padStart(3, '0')}`;
}

function countWords(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length;
}

function polishGeneratedText(value) {
  return String(value || '')
    .replace(/\.{2,}/g, '.')
    .replace(/\b([A-Za-z]+)-\s+([a-z]+)/g, '$1-$2')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();
}

function makePage(bookId, index, title, content, refs = {}) {
  const normalizedTitle = polishGeneratedText(normalizeText(title));
  const cleanedContent = polishGeneratedText(content);
  return {
    pageId: pageId(bookId, index),
    title: normalizedTitle,
    content: cleanedContent,
    pageType: refs.pageType || inferPageType(normalizedTitle),
    difficulty: refs.difficulty || inferDifficulty(normalizedTitle),
    estimatedMinutes: refs.estimatedMinutes || inferEstimatedMinutes(normalizedTitle, cleanedContent),
    wordCount: countWords(cleanedContent),
    imageRefs: refs.imageRefs || [],
    ...refs
  };
}

function inferPageType(title) {
  const normalized = title.toLowerCase();
  if (normalized.includes('title page')) return 'front-matter';
  if (normalized.includes('how to use') || normalized.includes('learning skills') || normalized.includes('table of contents')) return 'front-matter';
  if (normalized.startsWith('chapter:')) return 'chapter-opener';
  if (normalized.includes('lesson opener')) return 'lesson-opener';
  if (normalized.includes('learn and example')) return 'learn-example';
  if (normalized.endsWith(': learn')) return 'explanation';
  if (normalized.includes('worked example')) return 'worked-example';
  if (normalized.includes('activity and practice')) return 'practice';
  if (normalized.includes('activity')) return 'activity';
  if (normalized.includes('outcome check')) return 'assessment';
  if (normalized.includes('chapter review')) return 'review';
  if (normalized.includes('mixed practice')) return 'mixed-practice';
  if (normalized.includes('glossary')) return 'glossary';
  if (normalized.includes('answer')) return 'answer-notes';
  if (normalized.includes('final project')) return 'project';
  return 'lesson';
}

function inferDifficulty(title) {
  const type = inferPageType(title);
  if (['front-matter', 'lesson-opener', 'glossary'].includes(type)) return 'support';
  if (['worked-example', 'activity', 'practice'].includes(type)) return 'guided';
  if (['assessment', 'review', 'project', 'mixed-practice'].includes(type)) return 'independent';
  return 'core';
}

function inferEstimatedMinutes(title, content) {
  const type = inferPageType(title);
  const words = String(content || '').split(/\s+/).filter(Boolean).length;
  const readingMinutes = Math.max(3, Math.ceil(words / 90));
  if (['activity', 'practice', 'mixed-practice', 'project'].includes(type)) return Math.max(10, readingMinutes + 6);
  if (['assessment', 'review'].includes(type)) return Math.max(8, readingMinutes + 4);
  return Math.max(5, readingMinutes);
}

function subjectMethod(subjectTitle) {
  const methods = {
    Mathematics: 'Use objects, drawings, number sentences, and worked examples before independent practice.',
    English: 'Read, speak, listen, write, and edit in connected language tasks.',
    Kiswahili: 'Soma, sikiliza, zungumza, andika, na tumia msamiati katika miktadha halisi.',
    'Science and Technology': 'Observe, ask questions, test safely, record evidence, and explain findings.',
    'Social Studies': 'Use maps, local examples, discussion, fieldwork, and community inquiry.',
    Agriculture: 'Learn through school-garden practice, observation logs, tool safety, and home projects.',
    'Creative Arts': 'Create, perform, observe, improve, and reflect using local materials and culture.'
  };
  return methods[subjectTitle] || 'Learn through examples, activities, practice, and reflection.';
}

function mathTaskFor(topic, n = 1, outcomeText = '') {
  const domain = mathDomain(topic, outcomeText);
  const label = n > 1 ? `Task ${n}` : 'Task';
  if (domain === 'volume-stacking') {
    return `${label}: Build a cuboid with 4 layers of blocks. Each layer has 3 rows and 5 blocks in each row. Find the volume in cubic blocks. Answer guide: volume = 5 x 3 x 4 = 60 cubic blocks; the length, width, and height are all counted from the stack.`;
  }
  if (domain === 'volume-solids') {
    return `${label}: A cone has radius 7 cm and height 12 cm. Find its volume using pi = 22/7 and V = 1/3 pi r^2 h. Answer guide: V = 1/3 x 22/7 x 7 x 7 x 12 = 616 cubic centimetres.`;
  }
  if (domain === 'temperature') {
    return `${label}: A thermometer reads 25 degrees Celsius in the morning and 31 degrees Celsius at noon. State which time is warmer, find the difference, and convert 25 degrees Celsius to Kelvin using K = degrees Celsius + 273. Answer guide: noon is warmer; difference = 6 degrees Celsius; 25 degrees Celsius = 298 K.`;
  }
  if (domain === 'money-finance') {
    return `${label}: A learner receives KSh 500. She saves KSh 150 in a bank account, budgets KSh 220 for lunch and transport, and keeps the rest for emergencies. Find the emergency amount and name one bank service used. Answer guide: 500 - 150 - 220 = KSh 130; the bank service is saving or deposit account service.`;
  }
  if (domain === 'area-counting-squares') {
    return `${label}: An irregular shape covers 18 full squares and 6 half-squares on a grid where each square is 1 square centimetre. Estimate its area. Answer guide: area = 18 + 6/2 = 21 square centimetres.`;
  }
  if (domain === 'surface-area') {
    return `${label}: A closed cylinder has radius 7 cm and height 10 cm. Find its total surface area using pi = 22/7. Answer guide: total surface area = 2 pi r(h + r) = 2 x 22/7 x 7 x (10 + 7) = 748 square centimetres.`;
  }
  if (domain === 'mid-ordinate-rule') {
    return `${label}: Mid-ordinates at equal interval h = 2 m are 4, 6, 5, and 3. Use the mid-ordinate rule to estimate the area. Answer guide: area = h x sum of mid-ordinates = 2 x (4 + 6 + 5 + 3) = 36 square metres.`;
  }
  if (domain === 'trapezoidal-rule') {
    return `${label}: Ordinates at equal interval h = 2 m are 3, 5, 6, 4, and 2. Use the trapezoidal rule to estimate the area. Answer guide: area = h/2[first + last + 2(sum of middle ordinates)] = 2/2[3 + 2 + 2(5 + 6 + 4)] = 35 square metres.`;
  }
  if (domain === 'unit-circle-angles') {
    return `${label}: On the unit circle, mark 30 degrees, 90 degrees, 150 degrees, and 270 degrees. State the quadrant or axis for each angle. Answer guide: 30 degrees is quadrant I, 90 degrees is on the positive y-axis, 150 degrees is quadrant II, and 270 degrees is on the negative y-axis.`;
  }
  if (domain === 'linear-programming') {
    return `${label}: A school can make x bead bracelets and y key holders. Each bracelet uses 2 units of thread and each key holder uses 1 unit. There are at most 20 thread units. The group can make at most 12 items, so x + y <= 12. Profit is P = 30x + 20y. Draw the feasible region for x >= 0, y >= 0, 2x + y <= 20, and x + y <= 12, then test the corner points. Answer guide: corners include (0,0), (0,12), (8,4), and (10,0); profits are 0, 240, 320, and 300, so maximum profit is 320 at (8,4).`;
  }
  if (domain === 'numerical-integration') {
    return `${label}: Ordinates at equal interval h = 2 m are 3, 5, 6, 4, and 2. Use the trapezoidal rule to estimate the area. Answer guide: area = h/2[first + last + 2(sum of middle ordinates)] = 2/2[3 + 2 + 2(5 + 6 + 4)] = 35 square metres.`;
  }
  if (domain === 'proportion-rates-mixtures') {
    const tasks = [
      `${label}: Cement and sand are mixed in the ratio 1:4. If the total mixture is 25 buckets, find the number of sand buckets. Answer guide: total parts = 5, one part = 5 buckets, sand = 4 x 5 = 20 buckets.`,
      `${label}: Six learners can weed a garden bed in 4 hours. At the same rate, how long would 3 learners take? Answer guide: total work = 6 x 4 = 24 learner-hours; 3 learners take 24 / 3 = 8 hours.`,
      `${label}: A drink is made by mixing 2 litres of juice concentrate with 5 litres of water. How much water is needed for 6 litres of concentrate? Answer guide: water is 5/2 of concentrate, so water = 6 x 5/2 = 15 litres.`,
      `${label}: A map scale is 1 cm represents 5 km. A road is 7 cm on the map. Find the real distance. Answer guide: 7 x 5 = 35 km.`
    ];
    return tasks[(n - 1) % tasks.length];
  }
  if (domain === 'vectors') {
    const tasks = [
      `${label}: Vector a = (3, 2) and vector b = (-1, 4). Find a + b and explain the component method. Answer guide: a + b = (3 + -1, 2 + 4) = (2, 6).`,
      `${label}: Position vector OP = (4, -3). Find 2OP and the magnitude of OP. Answer guide: 2OP = (8, -6); magnitude = square root of (4^2 + (-3)^2) = 5.`,
      `${label}: Vectors u = (2, 5) and v = (6, 15). Decide whether they are parallel. Answer guide: v = 3u, so they are parallel.`
    ];
    return tasks[(n - 1) % tasks.length];
  }
  if (domain === 'vectors-3d') {
    return `${label}: Vector OP = (2, -3, 6). Find its magnitude. Answer guide: magnitude = square root of (2^2 + (-3)^2 + 6^2) = square root of 49 = 7.`;
  }
  if (domain === 'loci') {
    const tasks = [
      `${label}: Draw a point P. Construct the locus of points 4 cm from P. Answer guide: use a compass set to 4 cm and draw a circle centred at P.`,
      `${label}: Construct the perpendicular bisector of line AB and explain the locus. Answer guide: every point on the bisector is the same distance from A and B.`,
      `${label}: Draw a straight line l. Sketch the locus of points 3 cm from the line. Answer guide: draw two parallel lines, one on each side of l, each 3 cm away.`
    ];
    return tasks[(n - 1) % tasks.length];
  }
  if (domain === 'loci-fixed-line') {
    return `${label}: Draw a straight line l. Construct the locus of points 3 cm from the fixed line. Answer guide: draw two lines parallel to l, one on each side, each exactly 3 cm away from l.`;
  }
  if (domain === 'loci-angle-bisector') {
    return `${label}: Draw angle ABC. Construct its angle bisector and explain the locus. Answer guide: points on the angle bisector are the same perpendicular distance from BA and BC.`;
  }
  if (domain === 'position-direction') {
    const tasks = [
      `${label}: Face north. Make a quarter turn clockwise, a half turn, and a full turn. State the final direction each time. Answer guide: quarter turn clockwise faces east; half turn faces south; full turn returns north.`,
      `${label}: Draw a simple route from the classroom door to the board using forward, left, right, clockwise, and anticlockwise. Answer guide: directions must be ordered and possible to follow.`,
      `${label}: A learner faces east and turns anticlockwise through a quarter turn. Name the new direction. Answer guide: north.`
    ];
    return tasks[(n - 1) % tasks.length];
  }
  if (domain === 'plane-figures') {
    const tasks = [
      `${label}: Draw a rectangle, square, triangle, circle, and oval. Write one property of each. Answer guide: rectangle has four sides and four right angles; square has four equal sides; triangle has three sides; circle is round; oval is stretched round.`,
      `${label}: Draw a rectangle and mark all lines of symmetry. Answer guide: a non-square rectangle has two lines of symmetry, one vertical and one horizontal through the centre.`,
      `${label}: Sort these shapes by sides: triangle, square, rectangle, circle, and oval. Answer guide: triangle has 3 straight sides; square and rectangle have 4; circle and oval have curved boundaries.`
    ];
    return tasks[(n - 1) % tasks.length];
  }
  if (domain === 'volume-capacity') {
    return `${label}: A rectangular container is 20 cm long, 10 cm wide, and 8 cm high. Find its volume in cubic centimetres and its capacity in litres if 1000 cubic centimetres = 1 litre. Answer guide: volume = 20 x 10 x 8 = 1600 cubic centimetres; capacity = 1.6 litres.`;
  }
  if (domain === 'length-measure') {
    return `${label}: A desk is 120 cm long. Write this length in metres and millimetres. Answer guide: 120 cm = 1.2 m because 100 cm = 1 m; 120 cm = 1200 mm because 1 cm = 10 mm.`;
  }
  if (domain === 'geometry-angles') {
    return `${label}: Construct a triangle ABC where AB = 6 cm, angle A = 60 degrees, and AC = 5 cm. Then measure BC and write one construction check. Answer guide: draw AB, construct a 60-degree ray at A, mark AC = 5 cm on the ray, join C to B, and check labels/arcs are visible.`;
  }
  if (domain === 'decimals') {
    return `${label}: Write 3 tenths, 45 hundredths, and 2.07 as decimals, then arrange 0.45, 0.3, and 2.07 from smallest to largest. Answer guide: 3 tenths = 0.3; 45 hundredths = 0.45; order is 0.3, 0.45, 2.07.`;
  }
  if (hasAny(topicText(topic), [/\breciprocal\b/])) {
    return `${label}: Find the reciprocal of 5, -3, and 2/7, then check one answer by multiplication. Answer guide: reciprocals are 1/5, -1/3, and 7/2; check: (2/7) x (7/2) = 1.`;
  }
  if (domain === 'matrices') {
    return `${label}: Matrix B = [3  1; 2  4]. State its order, find det(B), and explain whether it is square. Answer guide: order 2 by 2; determinant = (3 x 4) - (1 x 2) = 10.`;
  }
  if (domain === 'calculus') {
    return `${label}: For y = x^2 - 8x + 10, find dy/dx, the stationary point, and whether it is a minimum or maximum. Answer guide: dy/dx = 2x - 8; x = 4; y = -6; second derivative is positive, so it is a minimum.`;
  }
  if (domain === 'motion') {
    return `${label}: A cart travels 180 m in 30 s. Find its average speed, then check by multiplying speed by time. Answer guide: speed = 180 / 30 = 6 m/s; 6 x 30 = 180 m.`;
  }
  if (domain === 'sets') {
    return `${label}: In a class, 24 learners like football, 18 like athletics, and 7 like both. Find how many like football or athletics. Answer guide: 24 + 18 - 7 = 35 learners.`;
  }
  if (domain === 'transformations') {
    return `${label}: Reflect P(4, -2) in the y-axis and state what changes. Answer guide: P'(-4, -2); the x-coordinate changes sign and the y-coordinate stays the same.`;
  }
  if (domain === 'similarity') {
    return `${label}: A triangle has sides 3 cm, 4 cm, and 5 cm. It is enlarged by scale factor 4. Find the new sides. Answer guide: 12 cm, 16 cm, and 20 cm.`;
  }
  if (domain === 'algebra-polynomials') {
    return `${label}: Expand (x + 4)(x + 6), then check by substituting x = 2. Answer guide: x^2 + 10x + 24; at x = 2, both forms give 48.`;
  }
  if (domain === 'indices') {
    return `${label}: Simplify 5^2 x 5^3 and state the law used. Answer guide: 5^(2 + 3) = 5^5 = 3125; multiply same bases by adding indices.`;
  }
  if (domain === 'trigonometry') {
    return `${label}: A right triangle has shorter sides 9 cm and 12 cm. Find the hypotenuse. Answer guide: c^2 = 9^2 + 12^2 = 225, so c = 15 cm.`;
  }
  if (domain === 'number-systems') {
    return `${label}: Classify 7, -3, 0.4, square root of 25, and square root of 7. Answer guide: 7 and square root of 25 are natural/integers/rational; -3 is an integer/rational; 0.4 is rational; square root of 7 is irrational.`;
  }
  if (domain === 'fractions') {
    return `${label}: A learner uses 2/3 of a litre of water and then 1/6 of a litre. How much is used altogether? Answer guide: 2/3 = 4/6, so 4/6 + 1/6 = 5/6 litre.`;
  }
  if (domain === 'percent-finance') {
    return `${label}: A school buys books for KSh 2,400 and gets a 10% discount. Find the discount and final price. Answer guide: discount = KSh 240; final price = KSh 2,160.`;
  }
  if (domain === 'algebra-equations') {
    return `${label}: Solve 3x + 5 = 29 and check the answer. Answer guide: 3x = 24, x = 8; check: 3(8) + 5 = 29.`;
  }
  if (domain === 'measurement') {
    return `${label}: A rectangular plot is 14 m by 9 m. Find perimeter and area. Answer guide: perimeter = 46 m; area = 126 square metres.`;
  }
  if (domain === 'ratio') {
    return `${label}: Juice is mixed in the ratio 2:3 for concentrate to water. If the total is 25 cups, how many cups of water are used? Answer guide: 5 parts = 25, one part = 5, water = 3 x 5 = 15 cups.`;
  }
  if (domain === 'data') {
    return `${label}: Scores are 6, 7, 7, 10, and 15. Find the mean and median. Answer guide: mean = 45 / 5 = 9; median = 7.`;
  }
  return `${label}: Create a worked problem for ${topic.unitTitle}. Use one labelled diagram, table, graph, expression, or equation, solve it step by step, and write a check that proves the answer fits the topic. Answer guide: the model must match ${topic.unitTitle}, each step must be visible, and the final answer must include a reason or unit check.`;
}

function practicePrompt(subjectTitle, unitTitle, outcomeText, n, topic) {
  if (subjectTitle === 'Mathematics') {
    return `${n}. ${mathTaskFor(topic, n, outcomeText)} Target outcome: ${outcomeText}. Show the model, working, answer, and check.`;
  }
  if (subjectTitle === 'Kiswahili') {
    return `${n}. Andika sentensi au aya fupi inayoonyesha: ${outcomeText}.`;
  }
  if (subjectTitle === 'English') {
    return `${n}. ${englishPracticePrompt(outcomeText, n, topic)}`;
  }
  if (subjectTitle === 'Science and Technology') {
    return `${n}. ${scienceOutcomeTask(topic, outcomeText)} Target outcome: ${outcomeText}. Include labels, evidence or expected observation, a safety note where relevant, and a conclusion.`;
  }
  if (subjectTitle === 'Social Studies') {
    return `${n}. Use an example from your county or community to explain: ${outcomeText}.`;
  }
  return `${n}. Carry out or describe a practical task for this outcome: ${outcomeText}. List materials, steps, safety checks, and how you will judge quality.`;
}

function englishPracticePrompt(outcomeText, n, topic) {
  const text = `${normalizeText(outcomeText)} ${topicText(topic)}`.toLowerCase();
  const outcome = normalizeText(outcomeText);
  if (/listen|audio|record|dialogue|poem|oral comprehension/.test(text)) {
    return `Listen to a short story, poem, dialogue, or teacher-read transcript, then write three key details: title or speaker, place/event, and message. Target outcome: ${outcome}.`;
  }
  if (/reading|comprehension|intensive|critical|close|literature|novel|drama|poem/.test(text)) {
    return `Read a short passage linked to this topic, answer one question using Point-Evidence-Explanation, and underline the sentence that proves your answer. Target outcome: ${outcome}.`;
  }
  if (/grammar|sentence|tense|noun|verb|adjective|adverb|clause|punctuation|word class/.test(text)) {
    return `Write two correct sentences that use the grammar point, underline the key word or punctuation mark, and explain why it is correct. Target outcome: ${outcome}.`;
  }
  if (/writing|composition|letter|report|summary|paragraph|notice|speech|creative|functional/.test(text)) {
    return `Plan and write one short paragraph, letter part, report note, or speech opening with a clear audience, then edit one sentence for stronger meaning. Target outcome: ${outcome}.`;
  }
  if (/speaking|discussion|debate|presentation|conversation/.test(text)) {
    return `Prepare a one-minute spoken response with one point, one reason, and one example, then ask a partner for feedback on clarity and tone. Target outcome: ${outcome}.`;
  }
  return `Complete a focused English task for this outcome: ${outcome}. Include purpose, audience, one example, and one correction after feedback.`;
}

function scienceOutcomeTask(topic, outcomeText) {
  const domain = scienceDomain(topic);
  const outcome = normalizeText(outcomeText).toLowerCase();
  if (/\bcomponents of integrated science\b|\bintegrated science as a field\b/.test(outcome)) {
    return `Complete a table with three components of Integrated Science: Biology, Chemistry, and Physics. For each component, write one school or home example: living things, materials, and energy or forces. Answer guide: Biology studies living things such as plants; Chemistry studies substances such as water and salts; Physics studies energy, forces, light, heat, and electricity.`;
  }
  if (/\bimportance of science\b|\bscience in daily life\b/.test(outcome)) {
    return `Choose three daily-life examples where science helps people: clean water, safe cooking fuel, crop growth, medicine, transport, or electricity. For each example, name the science idea and the benefit. Answer guide: clean water uses filtration or boiling to reduce disease; farming uses soil and plant knowledge; electricity uses circuits and energy transfer.`;
  }
  if (/\binterest in learning integrated science\b|\blearning integrated science\b/.test(outcome)) {
    return `Create a junior-school science learning plan with one question from Biology, one from Chemistry, and one from Physics. State how each question can be investigated safely. Answer guide: useful questions are observable or testable, use safe materials, and lead to recorded evidence.`;
  }
  if (/\bflowering and non[- ]flowering\b|\bclassify plants\b/.test(outcome)) {
    return `Classify six plants into flowering and non-flowering groups using visible evidence. Example table: hibiscus, maize, and bean are flowering plants because they produce flowers or seeds; fern and moss are non-flowering plants because they reproduce using spores; pine is non-flowering but produces cones. Answer guide: classification must name the plant and the observed feature.`;
  }
  if (/\bparts of a flower\b|\bfunctions of parts of a flower\b/.test(outcome)) {
    return `Draw a simple flower and label petals, sepals, stamen, pistil, ovary, and pollen. Write one function for each part. Answer guide: petals attract pollinators, sepals protect the bud, stamen produces pollen, pistil receives pollen, and ovary develops seeds after fertilisation.`;
  }
  if (/\bimportance of flowers\b|\bflowers in nature\b/.test(outcome)) {
    return `Explain three roles of flowers in nature using examples: they support reproduction in flowering plants, attract pollinators such as bees or butterflies, and lead to fruits or seeds that feed people and animals. Answer guide: each role must connect the flower part or process to a benefit in the ecosystem.`;
  }
  if (/\bmagneti[sz]ation\b|\bdemagneti[sz]ation\b|\bmagneti[sz]e\b|\bdemagneti[sz]e\b/.test(outcome)) {
    return `Describe one safe method of magnetising a steel needle and one method of demagnetising it, then explain the expected test result using a compass or iron filings. Answer guide: stroking with a magnet in one direction can magnetise steel, heating/hammering or alternating current can demagnetise, and a magnetised needle attracts iron filings or deflects a compass.`;
  }
  if (/\belectromagnetic induction\b|\binduced current\b|\binduced e\.?m\.?f\b|\belectromotive force\b|\bemf\b|\bgenerator\b/.test(outcome)) {
    return `Plan an electromagnetic induction experiment using a coil, bar magnet, connecting wires, and a galvanometer. State what changes when the magnet moves faster, changes direction, or stays still. Answer guide: a changing magnetic field induces current; faster motion gives a larger deflection; reversing motion reverses deflection; no motion gives no induced current.`;
  }
  if (domain === 'magnetism') {
    return `Draw a bar magnet with field lines from north to south, show where the field is strongest, and describe one test using iron filings or a compass. Answer guide: field lines are closest near the poles, a compass aligns with the field, and electromagnetic induction needs a changing magnetic field.`;
  }
  if (domain === 'atomic-structure') {
    return `Draw an atom model, label protons, neutrons, electrons, nucleus, and shells, then complete a small table for atomic number and mass number. Answer guide: protons are positive in the nucleus, neutrons are neutral in the nucleus, electrons are negative around the nucleus, atomic number equals protons.`;
  }
  if (domain === 'animals') {
    return `Classify three animals by observable features, habitat, movement, or body covering, then explain one adaptation. Answer guide: name the animal, give visible evidence such as feathers/scales/legs/body parts, and connect the feature to survival.`;
  }
  if (domain === 'plant-parts') {
    return `Draw a labelled plant and explain the function of root, stem, leaf, and flower. Answer guide: roots absorb water and anchor the plant, stem supports and transports, leaves make food, flowers support reproduction.`;
  }
  if (domain === 'states-of-matter') {
    return `Complete a table comparing solid, liquid, and gas by shape, volume, particle arrangement, and one example, then explain one change of state. Answer guide: solids keep shape, liquids keep volume but take container shape, gases spread to fill space; melting changes solid to liquid.`;
  }
  if (domain === 'genetics') {
    return `Draw a Punnett square or inheritance diagram, label parental genotypes, gametes, offspring genotypes, and phenotype ratio, then explain what the result means.`;
  }
  if (domain === 'organic-chemistry') {
    return `Compare the compound family named in the outcome by giving its functional group, two physical properties, one safe test or observation, and one use or hazard.`;
  }
  if (domain === 'electrolysis') {
    return `Draw an electrolytic cell, label anode, cathode, electrolyte, power source, and ion movement, then explain the role of water or molten state in allowing ions to move.`;
  }
  if (domain === 'electromagnetic-spectrum') {
    return `Draw the electromagnetic spectrum in order, mark wavelength/frequency direction, and explain one use and one hazard for a radiation named in the outcome.`;
  }
  if (domain === 'digestion') {
    return `Trace the food path through the digestive system, name mechanical and chemical digestion steps, and explain one adaptation of a digestive organ.`;
  }
  if (domain === 'respiration') {
    return `Compare aerobic and anaerobic respiration using oxygen requirement, products, energy released, and one real example such as exercise or fermentation.`;
  }
  if (domain === 'plant-growth') {
    return `Design a fair test for one growth condition, name variables, record expected observations, and explain the plant-growth concept using evidence.`;
  }
  return `Use the topic-specific evidence tool: define the key concept, complete a labelled table or diagram with at least three accurate details, add one expected observation or example, and write a conclusion that directly answers the outcome.`;
}

function practiceBlockFor(subjectTitle, unitTitle, unitOutcomes, topic, compactMode) {
  const outcomes = unitOutcomes.slice(0, compactMode ? 3 : 5);
  const criteria = (topic.successCriteria || successCriteriaFor(subjectTitle)).map(item => `- ${item}`).join('\n');
  const prompts = outcomes.map((outcome, i) => practicePrompt(subjectTitle, unitTitle, outcome.text, i + 1, topic)).join('\n');
  const variant = parseInt(crypto.createHash('sha1').update(`${topic.topicId || ''}:${unitTitle}`).digest('hex').slice(0, 2), 16) % 4;
  const englishRoutines = [
    'Plan first: name the language skill, decide the audience, write or speak clearly, then improve one sentence after feedback.',
    'Read the task twice, underline the purpose, use one example or piece of evidence, and check punctuation before you finish.',
    'Move from idea to response: choose your point, add a detail, organise it for the listener or reader, then edit for meaning.',
    'Practise like a writer: draft a short response, test whether it fits the audience, replace one weak word, and read it aloud.'
  ];
  const kiswahiliRoutines = [
    'Panga kwanza: tambua stadi ya lugha, chagua hadhira, andika au zungumza kwa uwazi, kisha boresha sentensi moja.',
    'Soma kazi mara mbili, pigia mstari kusudi, tumia mfano mmoja, kisha hakiki tahajia na uakifishaji kabla ya kumaliza.',
    'Anza na wazo kuu, ongeza maelezo, panga jibu kwa msomaji au msikilizaji, kisha rekebisha maana.',
    'Fanya mazoezi kama mwandishi: andika rasimu fupi, hakiki hadhira, badili neno dhaifu, kisha soma jibu kwa sauti.'
  ];

  if (subjectTitle === 'Kiswahili') {
    return `${compactMode ? `Shughuli ya ${unitTitle}: ${kiswahiliRoutines[variant]}\n\n` : `Mazoezi ya ${unitTitle}:\n\n${kiswahiliRoutines[variant]}\n\n`}${prompts || `1. Andika mambo matatu uliyojifunza kuhusu ${unitTitle}.\n2. Toa mfano mmoja unaofaa.\n3. Tunga swali moja kwa mwanafunzi mwenzako.`}\n\nUkaguzi wa marekebisho:\n${criteria}\n\nTafakuri: Nini kilikuwa rahisi? Ni sehemu gani inahitaji mazoezi zaidi? Utamuuliza mwalimu au mwenzako swali gani?\n\nKiungo cha nyumbani: Uliza mtu wa nyumbani mfano unaohusiana na ${unitTitle.toLowerCase()} kisha andika sentensi mbili kwa Kiswahili.`;
  }

  if (subjectTitle === 'Mathematics') {
    return `${compactMode ? `Activity for ${unitTitle}: Re-read the worked example, copy the method steps, and apply them to the practice tasks below.\n\n` : `Practice for ${unitTitle}:\n\n`}Use this routine for every answer: define what is known, choose a representation, solve step by step, then check the result in context.\n\n${prompts || `1. Complete one worked solution about ${unitTitle} using a table, diagram, equation, or calculation.\n2. Check the answer by estimation, substitution, reverse operation, or a second method.\n3. Explain one error a learner might make and how to avoid it.`}\n\nCorrection check:\n${criteria}\n\nReflection: Which step proved the answer, not just the calculation? What question will you ask before the next lesson?\n\nHome link: Find one place where people count, measure, compare, estimate, record, or predict something related to ${unitTitle.toLowerCase()}. Write it as a mathematical statement.`;
  }

  if (subjectTitle === 'Science and Technology') {
    return `${compactMode ? `Activity for ${unitTitle}: Use the lesson model to plan a safe observation, comparison, test, design note, or data table.\n\n` : `Practice for ${unitTitle}:\n\n`}Use this routine for every answer: question, materials or evidence, method, observation, conclusion, and safety.\n\n${prompts || `1. Write one testable question about ${unitTitle}.\n2. Draw a labelled setup, model, flow chart, or observation table.\n3. Write a conclusion that begins, "The evidence shows..."`}\n\nCorrection check:\n${criteria}\n\nReflection: Which part of your answer is evidence? Which part is explanation?\n\nHome link: Observe a safe related example at home or in the community. Record facts only, without disturbing people, animals, plants, or devices.`;
  }

  if (subjectTitle === 'English') {
    return `${compactMode ? `Activity for ${unitTitle}: ${englishRoutines[variant]}\n\n` : `Practice for ${unitTitle}:\n\n${englishRoutines[variant]}\n\n`}${prompts || `1. Write a short paragraph, dialogue, notice, report, or response about ${unitTitle}.\n2. Underline the clearest sentence and improve one weak sentence.\n3. Explain how your word choice fits the audience.`}\n\nCorrection check:\n${criteria}\n\nReflection: What meaning became clearer after editing? Which sentence still needs work?\n\nHome link: Ask someone at home for a short story, instruction, opinion, or example linked to ${unitTitle.toLowerCase()}. Write four clear sentences about it.`;
  }

  return `${compactMode ? `Activity for ${unitTitle}: Choose one inquiry question from this unit. Discuss it with a partner, then write a clear response using examples from the lesson.\n\n` : `Practice for ${unitTitle}:\n\n`}${prompts || `1. Write three things you learned about ${unitTitle}.\n2. Give one real-life example.\n3. Create one question for a classmate.`}\n\nCorrection check:\n${criteria}\n\nReflection: What was easy? What needs more practice? What question will you ask your teacher or study partner?\n\nHome link: Ask someone at home for an example related to ${unitTitle.toLowerCase()} and write two useful sentences about it.`;
}

function ageBandFor(grade) {
  const number = gradeNumber(grade);
  if (number <= 6) {
    return {
      band: 'upper-primary',
      language: 'short sentences, concrete examples, and step-by-step guidance',
      taskDepth: 'one clear idea at a time, then guided practice'
    };
  }
  if (number <= 9) {
    return {
      band: 'junior-secondary',
      language: 'clear academic words introduced through examples',
      taskDepth: 'multi-step reasoning, comparison, and application'
    };
  }
  return {
    band: 'senior-secondary',
    language: 'exam-ready precision with terms explained before use',
    taskDepth: 'worked solutions, synthesis tasks, and evidence-based explanations'
  };
}

function localContextFor(subjectTitle, unitTitle) {
  const contexts = {
    Mathematics: `a learner solving a money, distance, farming, building, market, or school-data problem linked to ${unitTitle}`,
    English: `a class discussion, reading club, letter, report, speech, or story situation linked to ${unitTitle}`,
    Kiswahili: `mazungumzo, hadithi, insha, hotuba, au shughuli ya jamii inayohusiana na ${unitTitle}`,
    'Science and Technology': `a safe observation at home, school, garden, workshop, health club, or local environment linked to ${unitTitle}`,
    'Social Studies': `a county, community, map, citizenship, culture, environment, or heritage example linked to ${unitTitle}`,
    Agriculture: `a school garden, home garden, farm tool, soil, water, crop, animal-care, or food-security example linked to ${unitTitle}`,
    'Creative Arts': `a drawing, design, music, dance, drama, craft, exhibition, or performance activity linked to ${unitTitle}`
  };
  return contexts[subjectTitle] || `a school, home, or community example linked to ${unitTitle}`;
}

function commonMisconceptions(subjectTitle, unitTitle) {
  const misconceptions = {
    Mathematics: `mixing up the method for ${unitTitle} with a similar method, skipping working, or not checking units`,
    English: `memorising rules without using them in meaningful speech, reading, or writing`,
    Kiswahili: `kukumbuka kanuni bila kuitumia katika sentensi, mazungumzo, au kifungu cha maana`,
    'Science and Technology': `writing guesses as facts without observing, testing safely, or recording evidence`,
    'Social Studies': `giving general answers without naming places, people, evidence, or community examples`,
    Agriculture: `describing farm work without naming tools, steps, safety, observations, or care practices`,
    'Creative Arts': `finishing a product without planning, practising, improving, or explaining creative choices`
  };
  return misconceptions[subjectTitle] || `giving a general answer without a clear example from ${unitTitle}`;
}

function successCriteriaFor(subjectTitle) {
  const criteria = {
    Mathematics: ['method is clear', 'working is shown step by step', 'answer is checked in context'],
    English: ['meaning is clear', 'language choice fits the task', 'spelling, punctuation, and grammar are checked'],
    Kiswahili: ['maana iko wazi', 'msamiati na sarufi vinafaa', 'matamshi au uandishi umehakikiwa'],
    'Science and Technology': ['observation is specific', 'safety is considered', 'conclusion uses evidence'],
    'Social Studies': ['answer uses a local example', 'reasoning is clear', 'citizenship or environment link is explained'],
    Agriculture: ['steps are practical', 'tools/materials are named', 'safety and care are included'],
    'Creative Arts': ['idea is planned', 'skill is practised', 'creative choices are explained']
  };
  return criteria[subjectTitle] || ['answer is clear', 'example is relevant', 'work is checked'];
}

function visualNeedsFor(subjectTitle, unitTitle) {
  const needs = {
    Mathematics: ['worked-solution panel', 'number line/table/chart/manipulative diagram'],
    English: ['reading passage card', 'writing checklist or dialogue panel'],
    Kiswahili: ['msamiati card', 'mazungumzo or reading passage panel'],
    'Science and Technology': ['labelled observation diagram', 'safe investigation table'],
    'Social Studies': ['map/timeline/community scene', 'fieldwork observation table'],
    Agriculture: ['tool or farm-step diagram', 'observation log table'],
    'Creative Arts': ['process steps panel', 'performance or artwork reflection card']
  };
  return (needs[subjectTitle] || ['topic diagram', 'practice checklist']).map(item => ({
    type: item,
    description: `${item} for ${unitTitle}`,
    status: 'inline-text-fallback-ready'
  }));
}

function inlineVisualFor(subjectTitle, topic) {
  const unitTitle = topic.unitTitle;
  if (subjectTitle === 'Kiswahili') {
    return `Kifaa cha kuona cha maandishi:\n\n| Sehemu | Jaza kwa mada hii |\n| --- | --- |\n| Wazo kuu | ${unitTitle} |\n| Msamiati | Andika maneno matatu muhimu |\n| Mfano | Tunga sentensi au kifungu kifupi |\n| Uhakiki | Angalia tahajia, sarufi, mpangilio, na maana |`;
  }
  if (subjectTitle === 'English') {
    return `Inline visual support:\n\n| Communication part | What to show |\n| --- | --- |\n| Purpose | The reading, listening, speaking, writing, or grammar task in ${unitTitle}. |\n| Audience | Who needs to understand the message. |\n| Evidence or example | A detail from the passage, conversation, notice, report, or spoken task. |\n| Revision | One sentence improved for clarity, tone, spelling, punctuation, or grammar. |`;
  }
  if (subjectTitle === 'Mathematics') {
    return `Inline visual support:\n\n| Step | What to write |\n| --- | --- |\n| Model | Draw a table, number line, diagram, graph, expression, or equation for ${unitTitle}. |\n| Work | Show each operation on its own line. |\n| Check | Estimate, substitute, reverse the operation, or check units. |\n| Answer | Label the final answer in words. |`;
  }
  if (subjectTitle === 'Science and Technology') {
    return `Inline visual support:\n\n| Evidence tool | How to use it in ${unitTitle} |\n| --- | --- |\n| Labelled sketch | Name visible parts and show direction or change with arrows. |\n| Observation table | Record facts before explaining them. |\n| Safety note | Name the hazard and the safe action. |\n| Conclusion | Begin with: The evidence shows... |`;
  }
  if (subjectTitle === 'Social Studies') {
    return `Inline visual support:\n\n| Evidence card | Details to include |\n| --- | --- |\n| Place | County, town, river, road, institution, or heritage site. |\n| People | Groups affected or involved. |\n| Evidence | Map clue, observation, law, interview, timeline, or class text. |\n| Action | One realistic learner, family, school, or community response. |`;
  }
  if (subjectTitle === 'Agriculture') {
    return `Inline visual support:\n\n| Agriculture record | What to note |\n| --- | --- |\n| Purpose | Why the task is being done. |\n| Tools/materials | Exact items needed for ${unitTitle}. |\n| Safety and care | Hazard, hygiene action, and care for living things. |\n| Observation | Date, condition seen, action taken, and result. |`;
  }
  if (subjectTitle === 'Creative Arts') {
    return `Inline visual support:\n\n| Creative process | Evidence in the work |\n| --- | --- |\n| Plan | Purpose, audience, material, and time. |\n| Practise | Skill or technique tried slowly first. |\n| Improve | One visible or audible change after feedback. |\n| Explain | Why the choice fits the message or performance. |`;
  }
  return `Inline visual support:\n\n| Part | Evidence |\n| --- | --- |\n| Idea | ${unitTitle} |\n| Example | A real school, home, or community case. |\n| Practice | One task completed with correction. |\n| Reflection | One improvement after feedback. |`;
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
    sourceSnapshotHash: snapshot.inputHash
  }));
}

function chunkArray(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks.length ? chunks : [[]];
}

function topicChunkSize(subjectTitle) {
  if (subjectTitle === 'Mathematics') return 4;
  if (subjectTitle === 'English' || subjectTitle === 'Kiswahili') return 3;
  if (subjectTitle === 'Science and Technology') return 3;
  return 4;
}

function shortOutcomeLabel(outcomes, fallback) {
  const raw = cleanDisplayText(outcomes[0]?.text || fallback, fallback);
  if (!raw || isGenericTopicTitle(raw) || isMalformedDisplayText(raw)) return fallback;
  if (/rights and responsibilities of a Kenyan citizen/i.test(raw)) return 'Rights and Responsibilities of a Kenyan Citizen';
  if (/body cleanliness|personal hygiene/i.test(raw)) return 'Body Cleanliness and Personal Hygiene';
  if (/rear poultry|poultry/i.test(raw)) return 'Poultry Rearing';
  if (/reading speed and fluency|read a variety of materials/i.test(raw)) return 'Independent Reading Fluency';
  if (/recorded stories|poems|dialogues|audio[- ]visual/i.test(raw)) return 'Recorded Stories, Poems, and Dialogues';
  if (/rhythmic patterns/i.test(raw)) return 'Rhythmic Patterns';
  if (/animal games.*fitness|fitness.*animal games/i.test(raw)) return 'Animal Games for Fitness';
  if (/clay slabs|coil and slab/i.test(raw)) return 'Clay Slab Modelling';
  if (/elements and principles/i.test(raw)) return 'Elements and Principles';
  if (/portfolio folder/i.test(raw)) return 'Portfolio Folder';
  if (/wash techniques/i.test(raw)) return 'Wash Techniques';
  if (/own and others'? paintings/i.test(raw)) return 'Art Appreciation';
  if (/mixed[- ]media/i.test(raw)) return 'Mixed-Media Collage';
  const first = raw
    .replace(/^(use|read|write|apply|identify|determine|recognise|recognize|compare|add|subtract|multiply|divide|express|work out|test|create|analyse|analyze|describe|draw|paint|compose|make|appreciate|perform|demonstrate|value)\s+/i, '')
    .replace(/^(the|a|an)\s+/i, '')
    .replace(/\s+in\s+real[- ]life.*$/i, '')
    .replace(/\s+in\s+different\s+situations.*$/i, '')
    .replace(/\s+for\s+fluency.*$/i, '')
    .replace(/[,:;]+$/g, '')
    .replace(/\s+\d+$/g, '');
  const words = first.split(/\s+/).filter(Boolean).slice(0, 8).join(' ');
  return words || fallback;
}

function stripEmbeddedOutcomeTail(value) {
  const text = cleanDisplayText(value, 'Topic');
  const parts = text.split(':').map(part => part.trim()).filter(Boolean);
  if (parts.length < 2) return text;
  const tail = parts[parts.length - 1];
  const head = parts.slice(0, -1).join(': ');
  if (/^(analyse|analyze|appreciate|embrace|value|describe|identify|state|explain|draw|paint|create|construct|use|apply|read|write|perform|demonstrate|recognise|recognize)\b/i.test(tail)) {
    return trimDanglingConnector(head) || text;
  }
  if (/^importance$/i.test(tail)) {
    return trimDanglingConnector(head) || text;
  }
  if (/\b(and|or|of|to|with|by|for|from)$/i.test(tail)) {
    return trimDanglingConnector(head) || text;
  }
  return text;
}

function isGenericTopicTitle(value) {
  const text = normalizeText(value).toLowerCase();
  return /^topic(?:\s+\d+(?:\.\d+)*)?$/.test(text)
    || /^(english|kiswahili|social studies|agriculture|creative arts|mathematics|science and technology)\s+topic(?:\s+\d+)?$/.test(text)
    || /^explain and apply\s+(english|kiswahili|social studies|agriculture|creative arts|mathematics|science and technology)\s+topic$/i.test(text)
    || /^part\s+\d+$/.test(text)
    || ['selected', 'general', 'activity', 'lesson', 'unit', 'strand', 'good', 'importance'].includes(text);
}

function isMalformedDisplayText(value) {
  const text = normalizeText(value);
  const lowered = text.toLowerCase();
  if (!text) return true;
  if (/[ÃÉÊ]/.test(text)) return true;
  if (/\/\s*(and|or)?\s*\//i.test(text)) return true;
  if (/sounds?:\s*\/\s*(and|or)?\s*\//i.test(text)) return true;
  if (/^explain and apply\s+\w+\s+topic\b/i.test(text)) return true;
  if (/^topic\s+\d+$/i.test(text)) return true;
  if (/kimataifa ambapo usikilizaji husishi/i.test(lowered)) return true;
  if (/\bkutendea na$/i.test(lowered)) return true;
  if (/^(appreciate|embrace|value)\s+the\s+(role|importance)\.?$/i.test(text)) return true;
  if (/\b(for|from|to|of|with|in|on|by|and|or)\.?$/i.test(text) && text.split(/\s+/).length < 10) return true;
  return false;
}

function inquiryTitleFallback(inquiryQuestions, subjectTitle) {
  const joined = inquiryQuestions.join(' ').toLowerCase();
  if (!joined) return '';
  if (subjectTitle === 'English') {
    if (/join sentences|words do we use to join/.test(joined)) return 'Joining Sentences with Linking Words';
    if (/abbreviat/.test(joined)) return 'Abbreviations and Acronyms in Writing';
    if (/play|lessons learnt|real life/.test(joined)) return 'Life Lessons in Plays';
    if (/read|reading|comprehension|passage/.test(joined)) return 'Reading for Meaning and Evidence';
    if (/listen|speaker|audio|record/.test(joined)) return 'Listening for Meaning and Key Details';
    if (/write|paragraph|letter|report|composition/.test(joined)) return 'Writing for Purpose and Audience';
  }
  if (subjectTitle === 'Kiswahili') {
    if (/usikilizaji husishi|mahusiano/.test(joined)) return 'Usikilizaji Husishi katika Mahusiano ya Kimataifa';
    if (/vitenzi.*badilika|kauli/.test(joined)) return 'Mnyambuliko wa Vitenzi: Kauli za Kutenda, Kutendea, na Kutendwa';
    if (/kusoma|ufahamu|matini/.test(joined)) return 'Kusoma kwa Ufahamu na Ushahidi';
    if (/kuandika|insha|barua|ripoti/.test(joined)) return 'Uandishi Wenye Kusudi na Mpangilio';
    if (/kusikiliza|kuzungumza|matamshi|mazungumzo/.test(joined)) return 'Kusikiliza na Kuzungumza kwa Ufasaha';
  }
  if (subjectTitle === 'Agriculture') {
    if (/direct sowing|tiny seeds|sow tiny/.test(joined)) return 'Direct Sowing of Tiny Seeds';
    if (/cereals.*pulses|pulses.*cereals|preservation.*storage/.test(joined)) return 'Preservation and Storage of Cereals and Pulses';
    if (/sun dryer|preserve vegetables|vegetables.*dryer/.test(joined)) return 'Using a Homemade Sun Dryer to Preserve Vegetables';
  }
  if (subjectTitle === 'Creative Arts') {
    if (/clay slab|model clay|coil and slab|slab technique/.test(joined)) return 'Clay Slab Modelling';
    if (/swimming pool|entry in the swimming pool|water safety/.test(joined)) return 'Swimming: Safe Entry and Pool Confidence';
  }
  const question = inquiryQuestions.find(item => item.length >= 12) || '';
  const cleaned = question
    .replace(/\?+$/g, '')
    .replace(/^(how|what|why|which|where|when)\s+(can|do|does|is|are|will|would|should|we|you|learners)?\s*/i, '')
    .replace(/^(je|kwa nini|namna gani|vipi)\s*/i, '')
    .trim();
  if (!cleaned) return '';
  return cleanDisplayText(cleaned.split(/\s+/).slice(0, 9).join(' '), '');
}

function fallbackUnitTitle(subjectTitle, row, inquiryQuestions, rowIndex) {
  const fromQuestion = inquiryTitleFallback(inquiryQuestions, subjectTitle);
  if (fromQuestion && !isGenericTopicTitle(fromQuestion) && !isMalformedDisplayText(fromQuestion)) return fromQuestion;
  const strand = cleanDisplayText(row.strand_title || '', '');
  if (strand && !isGenericTopicTitle(strand) && !isMalformedDisplayText(strand)) return strand;
  const label = {
    English: 'Integrated English Communication',
    Kiswahili: 'Stadi za Mawasiliano ya Kiswahili',
    Mathematics: 'Mathematics Problem Solving',
    'Science and Technology': 'Science Investigation Skills',
    'Social Studies': 'Community and Citizenship Study',
    Agriculture: 'Practical Agriculture Skills',
    'Creative Arts': 'Creative Arts Practice'
  }[subjectTitle] || `${subjectTitle} Learning Skills`;
  return `${label} ${rowIndex + 1}`;
}

function safeUnitTitle(candidate, fallback) {
  const text = cleanDisplayText(candidate, fallback);
  if (!text || isGenericTopicTitle(text) || isMalformedDisplayText(text)) return fallback;
  return text;
}

function outcomeFallbackFor(subjectTitle, unitTitle) {
  const safeTitle = learnerTitle(subjectTitle, unitTitle, subjectTitle);
  if (subjectTitle === 'English') return `use ${safeTitle.toLowerCase()} in clear listening, speaking, reading, writing, or grammar tasks`;
  if (subjectTitle === 'Kiswahili') return `kutumia ${safeTitle.toLowerCase()} katika kusoma, kuandika, kuzungumza, au sarufi kwa usahihi`;
  if (subjectTitle === 'Mathematics') return `solve problems about ${safeTitle.toLowerCase()} using clear working and checks`;
  if (subjectTitle === 'Science and Technology') return `explain ${safeTitle.toLowerCase()} using observations, evidence, and safe investigation`;
  return `explain and apply ${safeTitle.toLowerCase()} using clear examples and practice`;
}

function topicTitleFor(subjectTitle, unitTitle, outcomes, partIndex, totalParts, fallbackTitle = '') {
  const base = stripEmbeddedOutcomeTail(unitTitle).split(/\s+/).slice(0, 12).join(' ');
  const outcomeLabel = cleanDisplayText(shortOutcomeLabel(outcomes, fallbackTitle || `Part ${partIndex + 1}`), fallbackTitle || 'Learning Skills');
  if (isLanguageSubject(subjectTitle)) {
    const label = languageUnitTitle(subjectTitle, base, outcomeLabel);
    const detail = languageTopicDetail(subjectTitle, outcomes, fallbackTitle);
    const distinctLabel = detail && detail.toLowerCase() !== label.toLowerCase()
      ? languageUnitTitle(subjectTitle, `${label} - ${detail}`, label)
      : label;
    if (totalParts <= 1) return distinctLabel;
    const partLabel = subjectTitle === 'Kiswahili' ? `Sehemu ${partIndex + 1}` : `Part ${partIndex + 1}`;
    return `${distinctLabel} - ${partLabel}`;
  }
  if (isGenericTopicTitle(base) || isMalformedDisplayText(base)) {
    return outcomeLabel;
  }
  if (/melody/i.test(base) && /\b(clay|slab|coil|model(?:ling|ing)?)\b/i.test(outcomeLabel)) return outcomeLabel;
  if (/swimming/i.test(base) && /\banimal games?\b/i.test(outcomeLabel)) return outcomeLabel;
  if (totalParts <= 1) return base;
  return cleanDisplayText(`${base}: ${outcomeLabel}`, base);
}

function isBadGlossaryTerm(value) {
  const term = cleanDisplayText(value, '');
  if (!term || isGenericTopicTitle(term) || isMalformedDisplayText(term)) return true;
  if (term.length > 95) return true;
  if (/[()]/.test(term) && /\/|,$/.test(term)) return true;
  if (/\bSounds?:\s*\/|\/\s*(and|or)?\s*\//i.test(term)) return true;
  if (/[:,]\s*$/.test(value)) return true;
  return false;
}

function keyVocabularyFor(unitTitle, baseUnitTitle, subjectTitle = '') {
  const rawTerms = [unitTitle, baseUnitTitle, ...unitTitle.split(/\s+/).filter(word => word.length > 4)];
  const terms = [];
  for (const raw of rawTerms) {
    const term = isLanguageSubject(subjectTitle) ? learnerTitle(subjectTitle, raw, '') : cleanDisplayText(raw, '');
    if (!term || isGenericTopicTitle(term) || isMalformedDisplayText(term)) continue;
    if (/^(English|Kiswahili|Social Studies|Agriculture|Creative Arts|Mathematics|Science and Technology)$/i.test(term)) continue;
    if (/^(katika|kwa|na|ya|wa|kuhusu|hali|vya|vya|wenye|kwenye|kama|au)$/i.test(term)) continue;
    if (/^\d+(?:\.\d+)+$/.test(term)) continue;
    if (/\b(clay|slab|coil|model(?:ling|ing)?)\b/i.test(unitTitle) && /^melod(?:y|ies)$/i.test(term)) continue;
    if (!terms.some(existing => existing.toLowerCase() === term.toLowerCase())) terms.push(term);
  }
  return terms.slice(0, 8);
}

function filterInquiryQuestionsForTopic(unitTitle, questions) {
  const title = normalizeText(unitTitle).toLowerCase();
  const cleaned = questions.map(question => cleanQuestionText(question)).filter(Boolean);
  if (!cleaned.length) return [];

  const reject = [];
  if (/\b(clay|slab|coil|model(?:ling|ing)?)\b/.test(title)) {
    reject.push(/\b(melod(?:y|ies)|rhythm|song|sing|sol-fa|music|instrument)\b/i);
  }
  if (/\b(swimming|pool|water safety)\b/.test(title)) {
    reject.push(/\b(animal|rugby|ball|field|song|melody|draw|paint|clay|craft|dance|drama)\b/i);
  }
  if (/\b(melody|rhythm|song|music|instrument)\b/.test(title)) {
    reject.push(/\b(clay|slab|coil|swimming|pool)\b/i);
  }

  if (!reject.length) return cleaned;
  return cleaned.filter(question => !reject.some(pattern => pattern.test(question)));
}

function firstOutcome(topic) {
  return cleanOutcomeText(topic?.learningOutcomes?.[0]?.text || '', `explain and apply ${topic?.unitTitle || 'this topic'}`);
}

function topicPhrase(topic) {
  return cleanDisplayText(topic?.unitTitle || topic?.sourceUnitTitle || 'this topic', 'this topic');
}

function lowerTopic(topic) {
  return topicPhrase(topic).toLowerCase();
}

function lowerOutcome(topic) {
  return firstOutcome(topic).toLowerCase();
}

function keywordMatch(topic, pattern) {
  return pattern.test(`${lowerTopic(topic)} ${lowerOutcome(topic)}`);
}

function hasAny(text, patterns) {
  return patterns.some(pattern => pattern.test(text));
}

function topicText(topic) {
  return `${lowerTopic(topic)} ${lowerOutcome(topic)}`;
}

function buildBookPlan(snapshot, grade, subject) {
  const rows = snapshot.legacy.filter(row => row.sub_strand_id);
  const strands = [...new Map(snapshot.legacy.map(row => [row.strand_id, row])).values()].filter(row => row.strand_id);
  const ageBand = ageBandFor(grade);
  const sourceRefs = sourceRefsFromSnapshot(snapshot);
  const topics = [];
  let topicIndex = 0;

  for (const [rowIndex, row] of rows.entries()) {
    const inquiryQuestions = (Array.isArray(row.inquiry_questions) ? row.inquiry_questions : [])
      .map(question => cleanQuestionText(question.text || question.question || String(question)))
      .filter(Boolean);
    const fallbackTitle = fallbackUnitTitle(subject.title, row, inquiryQuestions, rowIndex);
    const baseUnitTitle = safeUnitTitle(row.sub_strand_title || row.strand_title, fallbackTitle);
    const outcomes = (Array.isArray(row.outcomes) ? row.outcomes : []).map((outcome, i) => ({
      id: outcome.id || `${row.sub_strand_id}-outcome-${i + 1}`,
      text: cleanLanguageOutcomeText(subject.title, outcome.text || outcome.statement || String(outcome), outcomeFallbackFor(subject.title, baseUnitTitle))
    })).filter(outcome => outcome.text && outcome.text !== '[object Object]');
    const chunks = chunkArray(outcomes, topicChunkSize(subject.title));

    for (const [partIndex, outcomeChunk] of chunks.entries()) {
      topicIndex += 1;
      const unitTitle = topicTitleFor(subject.title, baseUnitTitle, outcomeChunk, partIndex, chunks.length, fallbackTitle);
      const filteredInquiryQuestions = filterInquiryQuestionsForTopic(unitTitle, inquiryQuestions);
      const topicQuestions = filteredInquiryQuestions.length
        ? filteredInquiryQuestions.slice(partIndex, partIndex + 3)
        : [];

      topics.push({
        topicId: `${gradeCode(grade)}-${subject.slug}-topic-${String(topicIndex).padStart(3, '0')}`,
        strandId: row.strand_id,
        parentSubStrandId: row.sub_strand_id,
        subStrandId: chunks.length > 1 ? `${row.sub_strand_id}:topic-${partIndex + 1}` : row.sub_strand_id,
        strandTitle: cleanDisplayText(row.strand_title, baseUnitTitle),
        unitTitle,
        sourceUnitTitle: baseUnitTitle,
        learningOutcomes: outcomeChunk,
        inquiryQuestions: topicQuestions.length ? topicQuestions : filteredInquiryQuestions.slice(0, 3),
        prerequisites: [
          `Recall everyday examples connected to ${baseUnitTitle}.`,
          `Review vocabulary from the previous ${subject.title} lesson before starting.`
        ],
        keyVocabulary: keyVocabularyFor(unitTitle, baseUnitTitle, subject.title),
        misconceptions: [commonMisconceptions(subject.title, unitTitle)],
        localContext: localContextFor(subject.title, unitTitle),
        explanationSequence: [
          'Start with a concrete local situation.',
          'Name the important idea in learner-friendly words.',
          'Model one example slowly.',
          'Guide the learner through a similar task.',
          'Ask the learner to apply the idea independently.'
        ],
        practiceTypes: [
          'guided oral or written response',
          'independent practice',
          'home/community link',
          'reflection and correction'
        ],
        successCriteria: successCriteriaFor(subject.title),
        visualNeeds: visualNeedsFor(subject.title, unitTitle),
        sourceRefs
      });
    }
  }

  return {
    schemaVersion: 1,
    country: 'KEN',
    curriculum: 'CBC',
    grade,
    subject: subject.title,
    generatedAt: snapshot.generatedAt,
    sourceSnapshotHash: snapshot.inputHash,
    ageBand,
    writingStandard: {
      voice: 'simple, conversational, purposeful, and learner-first',
      antiFluff: [
        'No generic filler introductions.',
        'Every page must explain, model, guide practice, assess, review, or support vocabulary.',
        'Every outcome must be covered by explanation, activity/example, and practice.'
      ],
      coversDeferred: true
    },
    strands: strands.map(strand => ({
      strandId: strand.strand_id,
      number: normalizeText(strand.strand_number),
      title: normalizeText(strand.strand_title),
      topicCount: topics.filter(topic => topic.strandId === strand.strand_id).length
    })),
    topics
  };
}

function mathDomain(topic, outcomeText = '') {
  const preferred = normalizeText(outcomeText).toLowerCase();
  const text = preferred ? `${preferred} ${topicText(topic)}` : topicText(topic);
  const outcome = preferred || lowerOutcome(topic);
  if (hasAny(outcome, [/\btemperature\b/, /\bcelsius\b/, /\bkelvin\b/, /\bhotter\b/, /\bwarmer\b/, /\bcolder\b/])) return 'temperature';
  if (hasAny(outcome, [/\bbanks?\b/, /\bbanking\b/, /\bbudget\b/, /\bsav(e|ing)\b/, /\btaxes?\b/, /\bprofit\b/, /\bloss\b/, /\bcommission\b/, /\bpostal\b/, /\bdiscount\b/, /\binterest\b/])) return 'money-finance';
  if (hasAny(outcome, [/\bpiling\b/, /\bstacks?\b/, /\bcubes?\b/, /\bcuboids?\b/]) && hasAny(outcome, [/\bvolume\b/, /\bcubic\b/, /\bpiling\b/, /\bstacks?\b/])) return 'volume-stacking';
  if (hasAny(outcome, [/\bvolume\b/]) && hasAny(outcome, [/\bprisms?\b/, /\bpyramids?\b/, /\bcones?\b/, /\bfrustums?\b/, /\bspheres?\b/, /\bhemispheres?\b/, /\bcomposite solids?\b/])) return 'volume-solids';
  if (hasAny(outcome, [/\bcounting squares?\b/, /\birregular shapes?\b/])) return 'area-counting-squares';
  if (hasAny(outcome, [/\bfixed line\b/, /\bperpendicular line\b/, /\bgiven distance from a line\b/])) return 'loci-fixed-line';
  if (hasAny(outcome, [/\bangle bisectors?\b/, /\bconstant angle\b/])) return 'loci-angle-bisector';
  if (hasAny(outcome, [/\bloci\b/, /\blocus\b/, /\bbisectors?\b/, /\bfixed point\b/, /\bgiven distance\b/])) return 'loci';
  if (hasAny(outcome, [/\bthree dimensions?\b/, /\b3[- ]?d\b/, /\b3 dimensions?\b/]) && hasAny(outcome, [/\bvectors?\b/, /\bmagnitude\b/])) return 'vectors-3d';
  if (hasAny(outcome, [/\bvectors?\b/, /\bposition vectors?\b/, /\bunit vectors?\b/, /\bscalar\b/, /\bmagnitude of a vector\b/, /\bparallelism of vectors?\b/])) return 'vectors';
  if (hasAny(outcome, [/\bmid[- ]?ordinate\b/])) return 'mid-ordinate-rule';
  if (hasAny(outcome, [/\btrapezoidal\b/])) return 'trapezoidal-rule';
  if (hasAny(outcome, [/\bvolume\b/, /\bcapacity\b/, /\bcubic\b/, /\bcone\b/, /\bfrustum\b/, /\bsphere\b/, /\bhemisphere\b/])) return 'volume-capacity';
  if (hasAny(outcome, [/\bsurface area\b/, /\bcurved surface\b/, /\btotal surface\b/, /\bnet of\b/])) return 'surface-area';
  if (hasAny(outcome, [/\bcompound proportions?\b/, /\bdirect proportions?\b/, /\bindirect proportions?\b/, /\binverse proportions?\b/, /\brates? of work\b/, /\bmixtures?\b/, /\bproportional parts?\b/])) return 'proportion-rates-mixtures';
  if (hasAny(outcome, [/\bunit circle\b/, /\bangle[s]?\s+(greater|less)\s+than\b/, /\bangle[s]?\s+in\s+degrees\b/])) return 'unit-circle-angles';
  if (hasAny(outcome, [/\bclockwise\b/, /\banti[- ]?clockwise\b/, /\bquarter turn\b/, /\bhalf turn\b/, /\bfull turn\b/, /\bposition and direction\b/])) return 'position-direction';
  if (hasAny(outcome, [/\bplane figures?\b/, /\brectangles?\b/, /\bsquares?\b/, /\btriangles?\b/, /\bcircles?\b/, /\bovals?\b/, /\bshapes?\b/, /\blines? of symmetry\b/])) return 'plane-figures';
  if (hasAny(text, [/\btemperature\b/, /\bcelsius\b/, /\bkelvin\b/, /\bhotter\b/, /\bwarmer\b/, /\bcolder\b/])) return 'temperature';
  if (hasAny(text, [/\bbanks?\b/, /\bbanking\b/, /\bbudget\b/, /\bsav(e|ing)\b/, /\btaxes?\b/, /\bprofit\b/, /\bloss\b/, /\bcommission\b/, /\bpostal\b/, /\bdiscount\b/, /\binterest\b/])) return 'money-finance';
  if (hasAny(text, [/\bpiling\b/, /\bstacks?\b/, /\bcubes?\b/, /\bcuboids?\b/]) && hasAny(text, [/\bvolume\b/, /\bcubic\b/, /\bpiling\b/, /\bstacks?\b/])) return 'volume-stacking';
  if (hasAny(text, [/\bcounting squares?\b/, /\birregular shapes?\b/])) return 'area-counting-squares';
  if (hasAny(text, [/\bfixed line\b/, /\bperpendicular line\b/, /\bgiven distance from a line\b/])) return 'loci-fixed-line';
  if (hasAny(text, [/\bangle bisectors?\b/, /\bconstant angle\b/])) return 'loci-angle-bisector';
  if (hasAny(text, [/\bloci\b/, /\blocus\b/, /\bbisectors?\b/, /\bfixed point\b/, /\bgiven distance\b/])) return 'loci';
  if (hasAny(text, [/\bthree dimensions?\b/, /\b3[- ]?d\b/, /\b3 dimensions?\b/]) && hasAny(text, [/\bvectors?\b/, /\bmagnitude\b/])) return 'vectors-3d';
  if (hasAny(text, [/\bvectors?\b/, /\bposition vectors?\b/, /\bunit vectors?\b/, /\bscalar\b/, /\bmagnitude of a vector\b/, /\bparallelism of vectors?\b/])) return 'vectors';
  if (hasAny(text, [/\bmid[- ]?ordinate\b/])) return 'mid-ordinate-rule';
  if (hasAny(text, [/\btrapezoidal\b/])) return 'trapezoidal-rule';
  if (hasAny(text, [/\bsurface area\b/, /\bcurved surface\b/, /\btotal surface\b/, /\bnet of\b/])) return 'surface-area';
  if (hasAny(text, [/\blinear programming\b/, /\bobjective function\b/, /\bconstraint\b/, /\bfeasible region\b/, /\binequalit/])) return 'linear-programming';
  if (hasAny(text, [/\barea under\b/, /\bintegrat(e|ion|al)\b/, /\bordinate\b/])) return 'trapezoidal-rule';
  if (hasAny(text, [/\bcompound proportions?\b/, /\bdirect proportions?\b/, /\bindirect proportions?\b/, /\binverse proportions?\b/, /\brates? of work\b/, /\bmixtures?\b/, /\bproportional parts?\b/])) return 'proportion-rates-mixtures';
  if (hasAny(text, [/\bunit circle\b/, /\bangle[s]?\s+(greater|less)\s+than\b/, /\bangle[s]?\s+in\s+degrees\b/])) return 'unit-circle-angles';
  if (hasAny(text, [/\bclockwise\b/, /\banti[- ]?clockwise\b/, /\bquarter turn\b/, /\bhalf turn\b/, /\bfull turn\b/, /\bposition and direction\b/])) return 'position-direction';
  if (hasAny(text, [/\bplane figures?\b/, /\brectangles?\b/, /\bsquares?\b/, /\btriangles?\b/, /\bcircles?\b/, /\bovals?\b/, /\bshapes?\b/, /\blines? of symmetry\b/])) return 'plane-figures';
  if (hasAny(text, [/\bvolume\b/, /\bcapacity\b/, /\bcubic\b/, /\blitres?\b/, /\bmillilitres?\b/])) return 'volume-capacity';
  if (hasAny(text, [/\bcentimetres?\b/, /\bmetres?\b/, /\bkilometres?\b/, /\bmillimetres?\b/, /\bunit of measuring length\b/])) return 'length-measure';
  if (hasAny(text, [/\bangle\b/, /\bpolygon\b/, /\btriangle\b/, /\bquadrilateral\b/, /\bconstruct\b/, /\bgeometrical construction\b/])) return 'geometry-angles';
  if (hasAny(text, [/\bdecimal\b/, /\btenths?\b/, /\bhundredths?\b/, /\bthousandths?\b/, /\bplace value\b/])) return 'decimals';
  if (hasAny(text, [/\bmass\b/, /\bkilogram(me)?s?\b/, /\bgram(me)?s?\b/, /\btonnes?\b/, /\bweigh/])) return 'mass';
  if (hasAny(text, [/\bmatri(x|ces)\b/, /\bdeterminant\b/])) return 'matrices';
  if (hasAny(text, [/\bdifferentiat(e|ion)\b/, /\bstationary\b/, /\bgradient function\b/, /\bderivative\b/])) return 'calculus';
  if (hasAny(text, [/\blinear motion\b/, /\bdistance\b/, /\bdisplacement\b/, /\bspeed\b/, /\bvelocity\b/, /\bacceleration\b/, /\btime graph\b/])) return 'motion';
  if (hasAny(text, [/\bsets?\b/, /\bvenn\b/, /\bunion\b/, /\bintersection\b/, /\bsubset\b/, /\bcomplement\b/])) return 'sets';
  if (hasAny(text, [/\breflection\b/, /\bsymmetry\b/, /\bmirror line\b/, /\brotation\b/, /\btranslation\b/, /\btransformation\b/])) return 'transformations';
  if (hasAny(text, [/\bsimilarity\b/, /\benlargement\b/, /\bscale factor\b/, /\bcongruence\b/])) return 'similarity';
  if (hasAny(text, [/\bbinomial\b/, /\bquadratic\b/, /\bpolynomial\b/, /\bfactoris/, /\bfactoriz/])) return 'algebra-polynomials';
  if (hasAny(text, [/\bindices\b/, /\bindex form\b/, /\bindex law/, /\blogarithm/, /\blog base/])) return 'indices';
  if (hasAny(text, [/\bpythagoras\b/, /\bpythagorean\b/, /\bright[- ]?angled\b/, /\btrigonometry\b/, /\bsine\b/, /\bcosine\b/, /\btangent\b/])) return 'trigonometry';
  if (hasAny(text, [/\breal number\b/, /\breciprocal\b/, /\bsurd\b/, /\birrational\b/, /\brational\b/])) return 'number-systems';
  if (hasAny(text, [/\bfraction\b/, /\bdecimal\b/])) return 'fractions';
  if (hasAny(text, [/\bpercent\b/, /\bpercentage\b/, /\binterest\b/, /\bbanking\b/, /\bduty\b/, /\bbudget\b/])) return 'percent-finance';
  if (hasAny(text, [/\bequation\b/, /\bexpression\b/, /\bvariable\b/, /\balgebra\b/])) return 'algebra-equations';
  if (hasAny(text, [/\barea\b/, /\bperimeter\b/, /\blength\b/, /\bmeasure\b/, /\bmeasurement\b/, /\bcircle\b/, /\bdensity\b/])) return 'measurement';
  if (hasAny(text, [/\bratios?\b/, /\bproportions?\b/])) return 'ratio';
  if (hasAny(text, [/\bdata\b/, /\bstatistics\b/, /\bmean\b/, /\bgraph\b/, /\bchart\b/])) return 'data';
  return 'general';
}

function mathConceptGuide(topic) {
  const domain = mathDomain(topic);
  if (domain === 'volume-stacking') {
    return `Volume by stacking uses cubes or cuboids to show length, width, and height. Count blocks in one layer, count the number of layers, then multiply to find cubic units.`;
  }
  if (domain === 'volume-solids') {
    return `Volume of solids measures the space inside prisms, pyramids, cones, frustums, spheres, or composite solids. Choose the correct formula, substitute dimensions carefully, and label answers in cubic units.`;
  }
  if (domain === 'temperature') {
    return `Temperature comparison uses words such as hotter, warmer, colder, and same, and units such as degrees Celsius and Kelvin. Compare readings first, then convert only when the question asks for another unit.`;
  }
  if (domain === 'money-finance') {
    return `Money mathematics uses saving, budgeting, banking services, taxes, discounts, commission, profit, and loss. Track money in and money out, keep units as shillings, and check that the final amount makes sense.`;
  }
  if (domain === 'area-counting-squares') {
    return `Counting squares estimates the area of an irregular shape on a grid. Count full squares, combine half-squares, and state the answer in square units.`;
  }
  if (domain === 'vectors-3d') {
    return `Three-dimensional vectors use three components. Add or subtract matching components and find magnitude from the square root of x squared plus y squared plus z squared.`;
  }
  if (domain === 'loci-fixed-line' || domain === 'loci-angle-bisector') {
    return `Loci describe all points that satisfy a condition. For a fixed line, construct parallel paths at the given distance. For an angle, construct the angle bisector because its points are equally distant from the two arms.`;
  }
  if (domain === 'surface-area') {
    return `Surface area measures the total outside area of a solid. Draw or imagine the net, identify each face or curved surface, use the correct formula, and label the answer in square units. Do not use a volume formula for a surface-area question.`;
  }
  if (domain === 'mid-ordinate-rule') {
    return `The mid-ordinate rule estimates area using heights measured at the middle of equal strips. Multiply the common width by the sum of the mid-ordinates, then label the answer in square units.`;
  }
  if (domain === 'trapezoidal-rule') {
    return `The trapezoidal rule estimates area under a curve from end ordinates and middle ordinates. Keep the interval width clear, double only the middle ordinates, and label the final estimate in square units.`;
  }
  if (domain === 'unit-circle-angles') {
    return `Unit-circle angle work uses direction from the positive x-axis. Mark quadrants, axes, and reference angles carefully before using trigonometric ratios or reading coordinates. Check that 90 degrees is a right angle, not 900.`;
  }
  if (domain === 'linear-programming') {
    return `Linear programming helps choose the best value when there are limits. Define variables, write inequalities for the constraints, draw the feasible region, test corner points in the objective function, and choose the point that gives the required maximum or minimum.`;
  }
  if (domain === 'numerical-integration') {
    return `Numerical integration estimates area under a curve from a table of ordinates. Keep equal intervals clear, use the correct trapezoidal or mid-ordinate formula, substitute carefully, and label the final area in square units.`;
  }
  if (domain === 'proportion-rates-mixtures') {
    return `Proportion, rates of work, and mixtures compare related quantities. Decide whether the relationship is direct or inverse, keep units consistent, use parts or rates carefully, and check that the final amount fits the situation.`;
  }
  if (domain === 'vectors') {
    return `Vectors have size and direction. Use column or unit-vector notation carefully, add or subtract matching components, multiply each component by a scalar, and check magnitude or parallelism from the components.`;
  }
  if (domain === 'loci') {
    return `Loci describe sets of points that follow a rule. Read the condition first, such as a fixed distance from a point or line, then construct the correct path using a compass, ruler, perpendicular bisector, or angle bisector with clear labels.`;
  }
  if (domain === 'position-direction') {
    return `Position and direction describe where something is and how it turns or moves. Use terms such as clockwise, anticlockwise, quarter turn, half turn, full turn, left, right, forward, and backward with a simple diagram or real classroom route.`;
  }
  if (domain === 'plane-figures') {
    return `Plane figures are flat shapes. Identify them by sides, corners, curves, and lines of symmetry. A good answer includes a neat drawing, correct labels, and a reason why the shape belongs to that group.`;
  }
  if (domain === 'volume-capacity') {
    return `Volume tells how much space a solid occupies. Capacity tells how much a container can hold. Use cubic units for volume, litres or millilitres for capacity, and check that all dimensions are in the same unit before multiplying or converting.`;
  }
  if (domain === 'length-measure') {
    return `Length measures distance from one point to another. Choose a suitable unit, such as millimetres, centimetres, metres, or kilometres. Convert units before comparing or calculating, and check that the answer has a sensible size.`;
  }
  if (domain === 'geometry-angles') {
    return `Geometry work starts with an accurate diagram. Name the shape, mark known sides or angles, use a ruler, compass, and protractor where needed, and explain the rule used. For construction, neat arcs and labels are part of the answer.`;
  }
  if (domain === 'decimals') {
    return `Decimals show parts of a whole using place value. Read each digit by its place: tenths, hundredths, and thousandths. When comparing decimals, align the decimal points and compare digits from left to right.`;
  }
  if (domain === 'mass') {
    return `Mass tells how heavy an object is. Use the correct unit before calculating: 1 kilogramme = 1000 grammes. A good mass answer names the object, reads or converts the unit correctly, and checks that the result is sensible.`;
  }
  if (domain === 'matrices') {
    return `A matrix is a rectangular array of numbers arranged in rows and columns. The order of a matrix is rows by columns. A determinant is a special number found from a square matrix and is useful when deciding whether some matrix operations are possible.`;
  }
  if (domain === 'calculus') {
    return `Differentiation studies rate of change. A stationary point occurs where the derivative is zero. To classify it, find the derivative, solve for where it is zero, then use a sign table or second derivative to decide whether the point is a maximum, minimum, or point of inflection.`;
  }
  if (domain === 'motion') {
    return `Linear motion links distance, displacement, speed, velocity, acceleration, and time. Always identify which quantity is scalar or vector, choose the correct formula or graph feature, and keep units such as metres, seconds, metres per second, and metres per second squared clear.`;
  }
  if (domain === 'sets') {
    return `A set is a well-defined collection. Use braces for members, a Venn diagram for relationships, and set notation for operations. Union means everything in either set. Intersection means only what is in both sets. Complement means what is outside the named set but inside the universal set.`;
  }
  if (domain === 'transformations') {
    return `Transformations describe movement or matching of shapes. Reflection uses a mirror line. Translation slides a shape. Rotation turns a shape around a centre. Symmetry means a shape can match itself after a reflection or turn. Coordinates, distances, and orientation help you check the result.`;
  }
  if (domain === 'similarity') {
    return `Similarity, enlargement, and congruence compare shapes carefully. Similar shapes have equal corresponding angles and proportional corresponding sides. Congruent shapes are the same size and shape. Always match corresponding sides before using a scale factor.`;
  }
  if (domain === 'algebra-polynomials') {
    return `Algebra is a language for patterns. Keep like terms together, multiply every required term, and check by substitution. Expanding changes a product into a sum. Factorising changes a sum back into a product. Both forms can describe the same relationship.`;
  }
  if (domain === 'indices') {
    return `Indices show repeated multiplication. The base tells what is being multiplied, and the index tells how many times. Index laws work only when their conditions are met, such as same bases for multiplication or division. Logarithms reverse powers, so always ask: what power gives this number?`;
  }
  if (domain === 'trigonometry') {
    return `Geometry begins with a clear diagram. Mark the right angle, label known sides, and identify the unknown side before choosing a formula. In right-angled triangles, Pythagoras connects the squares of the side lengths. Trigonometric ratios compare pairs of sides from a named angle.`;
  }
  if (domain === 'number-systems') {
    return `Number systems help you know which operations and answers make sense. Natural numbers, integers, rational numbers, irrational numbers, and real numbers are related groups. A reciprocal answers the question: what number multiplies this one to make 1?`;
  }
  return `Mathematics is learned by connecting the situation, representation, method, and check. Name the quantities, choose a model such as a table, diagram, graph, expression, or equation, solve in clear steps, then test whether the answer fits the original problem.`;
}

function scienceDomain(topic) {
  const text = topicText(topic);
  if (hasAny(text, [/\bmagnetis/, /\bmagnetic\b/, /\belectromagnetic induction\b/, /\binduction\b/, /\bfield line\b/, /\belectromagnet\b/])) return 'magnetism';
  if (hasAny(text, [/\batom\b/, /\batomic\b/, /\belectron\b/, /\bproton\b/, /\bneutron\b/, /\bsubatomic\b/, /\bperiodic\b/])) return 'atomic-structure';
  if (hasAny(text, [/\banimal\b/, /\bvertebrate\b/, /\binvertebrate\b/, /\bhabitat\b/, /\blife cycle\b/])) return 'animals';
  if (hasAny(text, [/\bparts? of a plant\b/, /\bleaf\b/, /\bstem\b/, /\broot\b/, /\bflower\b/])) return 'plant-parts';
  if (hasAny(text, [/\bstate of matter\b/, /\bsolid\b/, /\bliquid\b/, /\bgas\b/, /\bchange of state\b/, /\bevaporat/, /\bcondens/, /\bfreez/, /\bmelt/])) return 'states-of-matter';
  if (hasAny(text, [/\bdigestion\b/, /\bdigestive\b/, /\bnutrition in animals\b/])) return 'digestion';
  if (hasAny(text, [/\brespiration\b/, /\baerobic\b/, /\banaerobic\b/, /\brespiratory quotient\b/])) return 'respiration';
  if (hasAny(text, [/\bgenetic/, /\bdna\b/, /\bgenes?\b/, /\bchromosomes?\b/, /\bmonohybrid\b/, /\binheritance\b/, /\bvariation\b/])) return 'genetics';
  if (hasAny(text, [/\balkanol/, /\balkanoic\b/, /\bester/, /\bethanoic\b/, /\borganic\b/])) return 'organic-chemistry';
  if (hasAny(text, [/\belectroly/, /\belectrolysis\b/, /\belectrolyte\b/, /\banode\b/, /\bcathode\b/])) return 'electrolysis';
  if (hasAny(text, [/\belectromagnetic spectrum\b/, /\bradiation\b/, /\bradio waves?\b/, /\bx-rays?\b/, /\bultraviolet\b/, /\binfrared\b/])) return 'electromagnetic-spectrum';
  if (hasAny(text, [/\bwater hardness\b/, /\bhard water\b/, /\bsoft water\b/, /\bdetergent\b/, /\bsoap\b/, /\bsoapless\b/, /\bsalts?\b/, /\bsolubility\b/, /\bsoluble\b/])) return 'water-chemistry';
  if (hasAny(text, [/\babsorption of water\b/, /\bmineral salts\b/, /\btranslocation\b/, /\bxylem\b/, /\bphloem\b/, /\btransport in plants\b/])) return 'plant-transport';
  if (hasAny(text, [/\bplant growth\b/, /\bseed dormancy\b/, /\bgrowth hormone\b/, /\bgermination\b/])) return 'plant-growth';
  if (hasAny(text, [/\bcell\b/, /\borgan\b/, /\btissue\b/, /\bbody\b/, /\bcirculation\b/, /\breproduction\b/])) return 'living-systems';
  if (hasAny(text, [/\belectric\b/, /\bcircuit\b/, /\benergy\b/, /\bheat\b/, /\blight\b/, /\bsound\b/, /\bmagnet\b/])) return 'physical-energy';
  if (hasAny(text, [/\bmixture\b/, /\bseparation\b/, /\bsolution\b/, /\bmatter\b/, /\bacid\b/, /\bbase\b/, /\bchemical\b/, /\bmaterial\b/])) return 'materials';
  if (hasAny(text, [/\bforce\b/, /\bmotion\b/, /\bpressure\b/, /\bmachine\b/, /\blever\b/, /\bfriction\b/, /\bspeed\b/])) return 'forces-motion';
  if (hasAny(text, [/\benvironment\b/, /\bweather\b/, /\bclimate\b/, /\bsoil\b/, /\bwater\b/, /\becosystem\b/, /\bplant\b/, /\banimal\b/])) return 'environment';
  return 'general';
}

function scienceConceptGuide(topic) {
  const domain = scienceDomain(topic);
  if (domain === 'digestion') {
    return `Digestion changes food into small soluble substances the body can absorb. Mechanical digestion breaks food into smaller pieces. Chemical digestion uses enzymes to break large food molecules into smaller ones. A good explanation follows food through the mouth, oesophagus, stomach, small intestine, large intestine, and rectum.`;
  }
  if (domain === 'respiration') {
    return `Respiration releases energy from food inside living cells. Aerobic respiration uses oxygen and releases more energy. Anaerobic respiration happens without oxygen and releases less energy. Do not confuse breathing, which moves air, with respiration, which releases energy in cells.`;
  }
  if (domain === 'genetics') {
    return `Genetics explains how traits are inherited. Genes are sections of DNA found on chromosomes. In monohybrid inheritance, one characteristic is followed through a cross. Use clear symbols, gametes, a Punnett square, and genotype-to-phenotype reasoning.`;
  }
  if (domain === 'organic-chemistry') {
    return `Alkanols, alkanoic acids, and esters are organic compounds with different functional groups. Physical properties include smell, solubility, boiling point, and volatility. Chemical properties are shown by reactions such as oxidation, neutralisation, or esterification.`;
  }
  if (domain === 'electrolysis') {
    return `Electrolysis uses electricity to decompose an electrolyte. Ions move through water or molten compounds: positive ions move to the cathode and negative ions move to the anode. Water helps ions move when an ionic substance dissolves, so the circuit can be completed.`;
  }
  if (domain === 'electromagnetic-spectrum') {
    return `The electromagnetic spectrum is a family of radiations arranged by wavelength and frequency. Radio waves, microwaves, infrared, visible light, ultraviolet, X-rays, and gamma rays all transfer energy. Their uses and hazards depend on penetration power, frequency, and interaction with matter.`;
  }
  if (domain === 'water-chemistry') {
    return `Water chemistry explains properties such as hardness, solubility, salts, soaps, and detergents. A strong answer names the ions or substances involved, describes the observation, and explains the chemical reason for the result.`;
  }
  if (domain === 'plant-transport') {
    return `Transport in plants moves water, mineral salts, and food substances. Roots absorb water and mineral salts, xylem transports water upward, phloem transports manufactured food, and transpiration helps pull water through the plant.`;
  }
  if (domain === 'plant-growth') {
    return `Plant growth is controlled by conditions such as water, oxygen, suitable temperature, light, nutrients, and hormones. Germination begins when a seed absorbs water and the embryo starts growing. Dormancy prevents growth until conditions are suitable.`;
  }
  if (domain === 'living-systems') {
    return `Living systems are made of parts that work together. Learn each part by linking structure to function: what it is like, what it does, and how it supports the whole organism or system. Use labelled diagrams and evidence from observation or approved class texts.`;
  }
  if (domain === 'physical-energy') {
    return `Physical science looks for patterns in energy, forces, and materials. Keep one condition changing at a time, observe the effect, and use measured evidence where possible. A correct explanation names the cause, the change observed, and the reason the change happened.`;
  }
  if (domain === 'materials') {
    return `Materials can be described by observable properties such as state, texture, solubility, magnetism, colour, and reaction. Choose a separation or testing method because it matches a property, not because the method sounds familiar.`;
  }
  if (domain === 'forces-motion') {
    return `Forces and motion are studied by measuring how objects start, stop, speed up, slow down, or change direction. A fair test changes one condition at a time and records distance, time, speed, force, or pressure accurately.`;
  }
  if (domain === 'environment') {
    return `Environmental science connects observation with care for people and living things. Record place, date, conditions, and evidence. Then explain the pattern and propose a practical improvement that protects health, safety, food, water, or the environment.`;
  }
  return `Science and technology learning starts with a question. A useful answer is built from evidence: observations, measurements, diagrams, models, tests, data tables, or design trials. Separate what you saw from what you think it means.`;
}

function englishConceptGuide(topic) {
  if (keywordMatch(topic, /comprehension|reading|poem|story|literature|novel|drama/i)) {
    return `Reading well means tracking meaning, not just finishing words. Identify the main idea, notice how details support it, and answer with evidence from the text. For literature, connect character, setting, plot, language, and theme.`;
  }
  if (keywordMatch(topic, /grammar|sentence|tense|noun|verb|adjective|adverb|clause|punctuation/i)) {
    return `Grammar helps meaning become clear. Do not memorise a rule alone; test it inside a real sentence. Check who or what the sentence is about, what action or state is shown, and how punctuation guides the reader.`;
  }
  if (keywordMatch(topic, /writing|essay|composition|letter|report|summary|paragraph|notice|speech/i)) {
    return `Writing improves when purpose, audience, structure, and editing work together. Plan the main idea first, arrange details in a sensible order, choose exact words, and revise at least one sentence after feedback.`;
  }
  if (keywordMatch(topic, /listening|speaking|oral|conversation|debate|discussion|presentation/i)) {
    return `Speaking and listening are active skills. Listen for the main point, take brief notes, respond respectfully, and support your own point with a reason or example. Clear speech uses pace, volume, eye contact, and appropriate tone.`;
  }
  return `English lessons connect reading, speaking, listening, writing, and editing. Before you answer, ask what the task wants, who the audience is, what evidence you can use, and how to make your meaning clearer.`;
}

function kiswahiliConceptGuide(topic) {
  if (keywordMatch(topic, /ufahamu|kusoma|hadithi|fasihi|ushairi|tamthilia|riwaya/i)) {
    return `Kusoma kwa uelewa kunahitaji kutafuta wazo kuu, maelezo muhimu, wahusika, mandhari, na ujumbe. Jibu zuri hutumia ushahidi kutoka kifungu, si kukisia tu.`;
  }
  if (keywordMatch(topic, /sarufi|nomino|kitenzi|vivumishi|viwakilishi|sentensi|nyakati|ngeli/i)) {
    return `Sarufi husaidia sentensi kuwa sahihi na yenye maana. Angalia nomino, kitenzi, upatanisho, wakati, viambishi, na alama za uakifishaji. Kanuni iwekwe katika sentensi halisi.`;
  }
  if (keywordMatch(topic, /insha|uandishi|barua|ripoti|hotuba|muhtasari|aya/i)) {
    return `Uandishi mzuri huanza kwa kupanga mawazo. Tambua kusudi, hadhira, wazo kuu, maelezo yanayounga mkono, na hitimisho. Baada ya kuandika, hakiki tahajia, sarufi, mpangilio, na maana.`;
  }
  if (keywordMatch(topic, /kusikiliza|kuzungumza|mazungumzo|matamshi|mdahalo|majadiliano/i)) {
    return `Mawasiliano bora hutegemea kusikiliza, kutamka wazi, kutoa hoja, kutumia lugha ya heshima, na kujibu wazo la mwingine. Mazungumzo mazuri yana lengo na mpangilio.`;
  }
  return `Kiswahili hujengwa kwa kusoma, kusikiliza, kuzungumza, kuandika, na kuhakiki. Kila jibu lihusiane na mada, litumie msamiati sahihi, na lionyeshe mfano au ushahidi.`;
}

function explainTopic(subjectTitle, grade, topic) {
  const criteria = topic.successCriteria.map(item => `- ${item}`).join('\n');
  if (subjectTitle === 'Kiswahili') {
    const starters = [
      `Anza kwa mfano wa karibu: ${topic.localContext}.`,
      `Fikiria matumizi ya mada hii katika mazungumzo, usomaji, au uandishi wa kila siku.`,
      `Kabla ya kufanya mazoezi, jiulize: ni neno, kanuni, au ushahidi gani unaohitajika hapa?`
    ];
    const starter = starters[Number(String(topic.topicId || '').match(/(\d+)$/)?.[1] || 0) % starters.length];
    return `${starter}\n\nWazo muhimu: ${topic.unitTitle}.\n\n${kiswahiliConceptGuide(topic)}\n\nKosa la kawaida ni ${topic.misconceptions[0]}. Epuka kosa hilo kwa kutumia vigezo hivi:\n${criteria}\n\nKwa Darasa la ${gradeNumber(grade)}, tumia Kiswahili sahihi, mifano inayoeleweka, na marekebisho baada ya maoni.`;
  }
  if (subjectTitle === 'Mathematics') {
    return `Start with this real situation: ${topic.localContext}.\n\nImportant idea: ${topic.unitTitle}.\n\n${mathConceptGuide(topic)}\n\nA common mistake is ${topic.misconceptions[0]}. Avoid it by checking definitions, diagrams, units, operation signs, and whether the final answer makes sense.\n\nSuccess criteria:\n${criteria}\n\nFor Grade ${gradeNumber(grade)}, write each step clearly enough that another learner can follow your thinking.`;
  }
  if (subjectTitle === 'English') {
    const starters = [
      `Begin with a real language task: ${topic.localContext}.`,
      `Think of the listener or reader first. The task is connected to ${topic.unitTitle}.`,
      `Before answering, decide whether you are reading, speaking, listening, writing, or editing.`
    ];
    const starter = starters[Number(String(topic.topicId || '').match(/(\d+)$/)?.[1] || 0) % starters.length];
    return `${starter}\n\nImportant idea: ${topic.unitTitle}.\n\n${englishConceptGuide(topic)}\n\nA common mistake is ${topic.misconceptions[0]}. Avoid it by reading the model first, underlining useful words, and improving one sentence after feedback.\n\nSuccess criteria:\n${criteria}\n\nFor Grade ${gradeNumber(grade)}, use clear sentences, examples, and respectful discussion.`;
  }
  if (subjectTitle === 'Science and Technology') {
    return `Start with this real situation: ${topic.localContext}.\n\nImportant idea: ${topic.unitTitle}.\n\n${scienceConceptGuide(topic)}\n\nA common mistake is ${topic.misconceptions[0]}. Avoid it by separating what you saw from what you think it means.\n\nSuccess criteria:\n${criteria}\n\nFor Grade ${gradeNumber(grade)}, use labelled sketches, tables, and short evidence-based explanations.`;
  }
  return `Start with this real situation: ${topic.localContext}.\n\nThe important idea is ${topic.unitTitle}. In this lesson, do not memorise words only. Read the example, try the guided task, then explain the idea in your own words.\n\nA common mistake is ${topic.misconceptions[0]}. Avoid it by checking your work against these success criteria:\n${criteria}\n\nFor Grade ${gradeNumber(grade)}, use ${ageBandFor(grade).language}.`;
}

function mathWorkedExample(topic, grade) {
  const domain = mathDomain(topic);
  const gradeNo = gradeNumber(grade);
  if (domain === 'surface-area') {
    return `Worked example for ${topic.unitTitle}: Find surface area, not volume.\n\nA closed cylinder has radius 3 cm and height 8 cm. Use pi = 3.14 to find total surface area.\n\n1. Write the formula: total surface area = 2 pi r(h + r).\n2. Substitute: 2 x 3.14 x 3 x (8 + 3).\n3. Add inside brackets: 8 + 3 = 11.\n4. Multiply: 2 x 3.14 x 3 x 11 = 207.24.\n5. Label the answer in square units because surface area covers outside space.\n\nAnswer: 207.24 square centimetres.\n\nYour turn: Find the total surface area of a closed cylinder with radius 4 cm and height 6 cm.`;
  }
  if (domain === 'mid-ordinate-rule') {
    return `Worked example for ${topic.unitTitle}: Estimate area using the mid-ordinate rule.\n\nMid-ordinates at equal interval h = 1.5 m are 2, 3, 5, and 4.\n\n1. Write the rule: area = h x sum of mid-ordinates.\n2. Add the mid-ordinates: 2 + 3 + 5 + 4 = 14.\n3. Multiply by the interval: 1.5 x 14 = 21.\n4. Label the answer: 21 square metres.\n\nAnswer: estimated area is 21 square metres.\n\nYour turn: Use h = 2 and mid-ordinates 3, 4, 6, and 5.`;
  }
  if (domain === 'trapezoidal-rule') {
    return `Worked example for ${topic.unitTitle}: Estimate area using the trapezoidal rule.\n\nOrdinates at equal interval h = 1 are 2, 4, 5, and 3.\n\n1. Write the rule: area = h/2[first + last + 2(sum of middle ordinates)].\n2. Identify first = 2, last = 3, middle ordinates = 4 and 5.\n3. Substitute: area = 1/2[2 + 3 + 2(4 + 5)].\n4. Simplify: area = 1/2[5 + 18] = 11.5 square units.\n\nAnswer: estimated area is 11.5 square units.\n\nYour turn: Use h = 2 and ordinates 1, 3, 4, 2.`;
  }
  if (domain === 'unit-circle-angles') {
    return `Worked example for ${topic.unitTitle}: Locate angles on the unit circle.\n\nLocate 120 degrees on the unit circle.\n\n1. Start at the positive x-axis and move anticlockwise.\n2. 120 degrees is greater than 90 degrees but less than 180 degrees.\n3. Therefore it lies in quadrant II.\n4. Its reference angle is 180 degrees - 120 degrees = 60 degrees.\n5. Check: quadrant II has negative x-values and positive y-values.\n\nAnswer: 120 degrees is in quadrant II with reference angle 60 degrees.\n\nYour turn: Locate 240 degrees and state its quadrant and reference angle.`;
  }
  if (domain === 'linear-programming') {
    return `Worked example for ${topic.unitTitle}: Maximise profit with two products.\n\nA group makes x bracelets and y key holders. Constraints are x >= 0, y >= 0, x + y <= 12, and 2x + y <= 20. Profit is P = 30x + 20y.\n\n1. Draw axes for x and y.\n2. Draw x + y = 12 and shade below it.\n3. Draw 2x + y = 20 and shade below it.\n4. Identify feasible corner points: (0,0), (0,12), (8,4), and (10,0).\n5. Test profit: 0, 240, 320, and 300.\n\nAnswer: The maximum profit is 320 at x = 8 and y = 4.\n\nYour turn: Change the profit to P = 25x + 30y and test the same corner points.`;
  }
  if (domain === 'numerical-integration') {
    return `Worked example for ${topic.unitTitle}: Estimate area using the trapezoidal rule.\n\nOrdinates at equal interval h = 1 are 2, 4, 5, and 3.\n\n1. Write the rule: area = h/2[first + last + 2(sum of middle ordinates)].\n2. Identify first = 2, last = 3, middle ordinates = 4 and 5.\n3. Substitute: area = 1/2[2 + 3 + 2(4 + 5)].\n4. Simplify: area = 1/2[5 + 18] = 11.5 square units.\n\nAnswer: estimated area is 11.5 square units.\n\nYour turn: Use h = 2 and ordinates 1, 3, 4, 2.`;
  }
  if (domain === 'proportion-rates-mixtures') {
    return `Worked example for ${topic.unitTitle}: Use proportion to solve a rate-of-work problem.\n\nSix learners weed a school garden bed in 4 hours. How long would 3 learners take at the same rate?\n\n1. Think about the relationship: fewer learners take more time, so this is inverse proportion.\n2. Find total work in learner-hours: 6 learners x 4 hours = 24 learner-hours.\n3. Divide by the new number of learners: 24 / 3 = 8 hours.\n4. Check: 3 learners for 8 hours also gives 24 learner-hours.\n\nAnswer: 3 learners would take 8 hours.\n\nYour turn: If 8 learners finish a task in 6 hours, how long would 4 learners take at the same rate?`;
  }
  if (domain === 'vectors') {
    return `Worked example for ${topic.unitTitle}: Add vectors component by component.\n\nVector a = (2, 5) and vector b = (4, -1). Find a + b and the magnitude of a.\n\n1. Add x-components: 2 + 4 = 6.\n2. Add y-components: 5 + -1 = 4.\n3. So a + b = (6, 4).\n4. Magnitude of a = square root of (2^2 + 5^2).\n5. Magnitude of a = square root of 29.\n\nAnswer: a + b = (6, 4), and magnitude of a is square root of 29.\n\nYour turn: Add (3, -2) and (1, 6), then find the magnitude of (3, -2).`;
  }
  if (domain === 'loci') {
    return `Worked example for ${topic.unitTitle}: Construct a locus from a fixed point.\n\nDraw the locus of all points 3 cm from point P.\n\n1. Mark point P clearly.\n2. Set a compass opening to 3 cm using a ruler.\n3. Put the compass point on P.\n4. Draw a complete circle around P.\n5. Check: every point on the circle is 3 cm from P.\n\nAnswer: the locus is a circle with centre P and radius 3 cm.\n\nYour turn: Draw the locus of points 5 cm from point Q.`;
  }
  if (domain === 'position-direction') {
    return `Worked example for ${topic.unitTitle}: Track a turn using direction words.\n\nA learner faces north. The learner makes a quarter turn clockwise. What direction is the learner facing?\n\n1. Draw a small compass: north at the top, east on the right, south at the bottom, west on the left.\n2. Clockwise means the same direction as a clock hand moves.\n3. A quarter turn from north moves one step to the right.\n4. The new direction is east.\n\nAnswer: the learner faces east.\n\nYour turn: Start facing south and make a half turn. What direction do you face?`;
  }
  if (domain === 'plane-figures') {
    return `Worked example for ${topic.unitTitle}: Identify a plane figure by its properties.\n\nA shape has four straight sides, four corners, opposite sides equal, and four right angles. What shape is it?\n\n1. Four straight sides means it is a quadrilateral.\n2. Four right angles means it is a rectangle or square.\n3. Opposite sides equal, but not necessarily all four sides equal, points to a rectangle.\n4. Check by drawing it and marking the equal opposite sides.\n\nAnswer: the shape is a rectangle.\n\nYour turn: Draw a square and write two properties that make it different from a non-square rectangle.`;
  }
  if (domain === 'volume-capacity') {
    return `Worked example for ${topic.unitTitle}: Find volume and capacity.\n\nA rectangular water container is 15 cm long, 10 cm wide, and 6 cm high.\n\n1. Use volume = length x width x height.\n2. Substitute: 15 x 10 x 6 = 900 cubic centimetres.\n3. Convert to litres if needed: 1000 cubic centimetres = 1 litre.\n4. 900 cubic centimetres = 0.9 litres.\n\nAnswer: volume is 900 cubic centimetres and capacity is 0.9 litres.\n\nYour turn: Find the volume of a 20 cm by 12 cm by 5 cm box.`;
  }
  if (domain === 'length-measure') {
    return `Worked example for ${topic.unitTitle}: Convert length units.\n\nA ribbon is 250 cm long. Write the length in metres and millimetres.\n\n1. Convert centimetres to metres: 100 cm = 1 m.\n2. 250 cm = 2.5 m.\n3. Convert centimetres to millimetres: 1 cm = 10 mm.\n4. 250 cm = 2500 mm.\n\nAnswer: 250 cm = 2.5 m = 2500 mm.\n\nYour turn: Convert 75 cm to metres and millimetres.`;
  }
  if (domain === 'geometry-angles') {
    return `Worked example for ${topic.unitTitle}: Construct and check an angle.\n\nConstruct angle ABC = 60 degrees.\n\n1. Draw ray BA with a ruler.\n2. Place the protractor centre at B and baseline along BA.\n3. Mark 60 degrees.\n4. Draw ray BC through the mark.\n5. Label the angle and check the protractor reading again.\n\nAnswer: angle ABC is 60 degrees, with B as the vertex.\n\nYour turn: Construct 45 degrees and 90 degrees, then label each vertex.`;
  }
  if (domain === 'decimals') {
    return `Worked example for ${topic.unitTitle}: Compare decimals using place value.\n\nOrder 0.7, 0.45, and 0.09 from smallest to largest.\n\n1. Write each number with hundredths: 0.70, 0.45, 0.09.\n2. Compare tenths first, then hundredths.\n3. 0.09 has 0 tenths, 0.45 has 4 tenths, and 0.70 has 7 tenths.\n\nAnswer: 0.09, 0.45, 0.7.\n\nYour turn: Order 0.3, 0.08, and 0.25 from smallest to largest.`;
  }
  if (domain === 'mass') {
    return `Worked example for ${topic.unitTitle}: A bag of maize flour has a mass of 2 kg 500 g. Write its mass in grammes.\n\n1. Recall the conversion: 1 kg = 1000 g.\n2. Convert 2 kg to grammes: 2 x 1000 g = 2000 g.\n3. Add the extra grammes: 2000 g + 500 g = 2500 g.\n4. Check: 2 kg 500 g is between 2 kg and 3 kg, so 2500 g is reasonable.\n\nAnswer: 2 kg 500 g = 2500 g.\n\nYour turn: Convert 3 kg 250 g into grammes, then explain the check.`;
  }
  if (domain === 'matrices') {
    return `Worked example for ${topic.unitTitle}: Find the order of the matrix and the determinant if it is square.\n\nMatrix A = [ 2  5 ]\n           [ 1  3 ]\n\n1. Count rows: there are 2 rows.\n2. Count columns: there are 2 columns.\n3. The order is 2 by 2, so a determinant can be found.\n4. For a 2 by 2 matrix [a b; c d], determinant = ad - bc.\n5. Substitute: (2 x 3) - (5 x 1) = 6 - 5 = 1.\n\nAnswer: A is a 2 by 2 matrix and det(A) = 1.\n\nYour turn: Find the order and determinant of [4 2; 3 1].`;
  }
  if (domain === 'calculus') {
    return `Worked example for ${topic.unitTitle}: Find and classify the stationary point of y = x^2 - 4x + 1.\n\n1. Differentiate: dy/dx = 2x - 4.\n2. At a stationary point, dy/dx = 0.\n3. Solve: 2x - 4 = 0, so x = 2.\n4. Find y: y = 2^2 - 4(2) + 1 = 4 - 8 + 1 = -3.\n5. Classify: d^2y/dx^2 = 2, which is positive, so the point is a minimum.\n\nAnswer: the stationary point is (2, -3), a minimum point.\n\nYour turn: Find the stationary point of y = x^2 - 6x + 5.`;
  }
  if (domain === 'motion') {
    return `Worked example for ${topic.unitTitle}: A runner moves 120 m in 15 s along a straight track. Find the average speed.\n\n1. Write the formula: average speed = distance / time.\n2. Substitute the values: 120 m / 15 s.\n3. Divide: 120 / 15 = 8.\n4. Add units: 8 m/s.\n5. Check: 8 m/s for 15 s gives 8 x 15 = 120 m.\n\nAnswer: the average speed is 8 m/s.\n\nYour turn: A cyclist covers 300 m in 25 s. Find the average speed and check by multiplication.`;
  }
  if (domain === 'sets') {
    return `Worked example: In a Grade ${gradeNo} club survey, 18 learners like football, 14 like athletics, and 6 like both. How many learners like football or athletics?\n\n1. Name the sets: F = football and A = athletics.\n2. The learners who like both have been counted twice, so subtract them once.\n3. Use the rule: n(F union A) = n(F) + n(A) - n(F intersection A).\n4. Substitute: 18 + 14 - 6 = 26.\n5. Check with a Venn diagram: football-only is 12, both is 6, athletics-only is 8, and 12 + 6 + 8 = 26.\n\nAnswer: 26 learners like football or athletics.\n\nYour turn: Use 20, 15, and 5 for the same survey and draw the Venn diagram before calculating.`;
  }
  if (domain === 'transformations') {
    return `Worked example: A point A is at (2, 3). Reflect it in the y-axis.\n\n1. Draw or imagine the coordinate plane.\n2. Reflection in the y-axis changes the sign of the x-coordinate but keeps the y-coordinate the same.\n3. A(2, 3) becomes A'(-2, 3).\n4. Check: A and A' are the same distance from the y-axis on opposite sides.\n\nAnswer: A' is (-2, 3).\n\nYour turn: Reflect B(5, -1) in the y-axis, then state what stayed the same and what changed.`;
  }
  if (domain === 'similarity') {
    return `Worked example: A drawing of a rectangular classroom is enlarged by scale factor 3. The drawing is 4 cm long and 2 cm wide. Find the new dimensions.\n\n1. Similar figures have the same shape but corresponding lengths are multiplied by the same scale factor.\n2. Multiply each length by 3.\n3. New length: 4 cm x 3 = 12 cm.\n4. New width: 2 cm x 3 = 6 cm.\n5. Check: both dimensions were multiplied by the same number, so the shape stayed similar.\n\nAnswer: the enlarged rectangle is 12 cm by 6 cm.\n\nYour turn: Enlarge a 5 cm by 3 cm rectangle by scale factor 2, then compare the original and new shapes.`;
  }
  if (domain === 'algebra-polynomials') {
    return `Worked example: Expand and simplify (x + 3)(x + 5).\n\n1. Multiply every term in the first bracket by every term in the second bracket.\n2. x times x = x^2.\n3. x times 5 = 5x and 3 times x = 3x.\n4. 3 times 5 = 15.\n5. Combine like terms: x^2 + 5x + 3x + 15 = x^2 + 8x + 15.\n\nAnswer: (x + 3)(x + 5) = x^2 + 8x + 15.\n\nYour turn: Expand (x + 2)(x + 7), then check by substituting x = 1 into both forms.`;
  }
  if (domain === 'indices') {
    return `Worked example: Simplify 2^3 x 2^4, then explain the rule used.\n\n1. Both powers have the same base, 2.\n2. When multiplying powers with the same base, add the indices.\n3. 2^3 x 2^4 = 2^(3 + 4) = 2^7.\n4. Evaluate if needed: 2^7 = 128.\n5. Check by expansion: 2 x 2 x 2 x 2 x 2 x 2 x 2 = 128.\n\nAnswer: 2^3 x 2^4 = 2^7 = 128.\n\nYour turn: Simplify 3^2 x 3^5 and state the rule.`;
  }
  if (domain === 'trigonometry') {
    return `Worked example: A ladder reaches 5 m up a wall. Its foot is 12 m from the wall. How long is the ladder?\n\n1. Draw a right-angled triangle. The wall and ground are the shorter sides.\n2. The ladder is the hypotenuse because it is opposite the right angle.\n3. Use Pythagoras: c^2 = a^2 + b^2.\n4. Substitute: c^2 = 5^2 + 12^2 = 25 + 144 = 169.\n5. Find the square root: c = 13.\n\nAnswer: the ladder is 13 m long.\n\nYour turn: Use sides 6 m and 8 m to find the hypotenuse, then check if the answer is reasonable.`;
  }
  if (domain === 'number-systems') {
    return `Worked example: Classify these numbers: -4, 0.75, square root of 9, and square root of 2.\n\n1. -4 is an integer because it is a whole number below zero.\n2. 0.75 is rational because 0.75 = 3/4.\n3. square root of 9 is 3, so it is a natural number, an integer, and rational.\n4. square root of 2 is irrational because it cannot be written exactly as a fraction of two integers.\n5. Check: every natural number is also a whole number, integer, rational number, and real number.\n\nYour turn: Classify 5, -1/2, square root of 16, and square root of 5.`;
  }
  if (domain === 'fractions') {
    return `Worked example: A school garden uses 3/4 of a sack of compost in the morning and 1/8 of a sack in the afternoon. How much compost is used altogether?\n\n1. Name the operation: the question asks for altogether, so add.\n2. Use a common denominator: 3/4 = 6/8.\n3. Add: 6/8 + 1/8 = 7/8.\n4. Check: 7/8 is less than one full sack, which is reasonable.\n\nAnswer: 7/8 of a sack of compost.\n\nYour turn: Change 1/8 to 2/8 and solve the new problem.`;
  }
  if (domain === 'percent-finance') {
    return `Worked example: A class has 800 tree seedlings. The learners plant 15% of them before lunch. How many seedlings is that?\n\n1. Write the percent as a fraction or decimal: 15% = 15/100 = 0.15.\n2. Multiply by the total: 0.15 x 800 = 120.\n3. Label the answer: 120 seedlings.\n4. Check: 10% of 800 is 80 and 5% is 40, so 15% is 120.\n\nYour turn: Find 25% of 800 seedlings.`;
  }
  if (domain === 'algebra-equations') {
    return `Worked example: A learner thinks of a number. When 14 is added, the result is 35. Find the number.\n\n1. Let the number be x.\n2. Write the equation: x + 14 = 35.\n3. Undo adding 14 by subtracting 14 from both sides: x = 35 - 14.\n4. Calculate: x = 21.\n5. Check: 21 + 14 = 35.\n\nAnswer: the number is 21.\n\nYour turn: Solve y + 18 = 50 and check your answer.`;
  }
  if (domain === 'measurement') {
    return `Worked example: A classroom notice board is 12 m long and 8 m wide. Find its perimeter and area.\n\n1. Perimeter is distance around: 12 + 8 + 12 + 8 = 40 m.\n2. Area is space covered: 12 x 8 = 96 square metres.\n3. Check the units: perimeter uses metres; area uses square metres.\n\nAnswer: perimeter = 40 m; area = 96 square metres.\n\nYour turn: Find the perimeter and area of a 10 m by 7 m rectangle.`;
  }
  if (domain === 'ratio') {
    return `Worked example: A school club mixes red and yellow paint in the ratio 3:2. If there are 40 cups of paint altogether, how many cups are red?\n\n1. Add ratio parts: 3 + 2 = 5 parts.\n2. Find one part: 40 / 5 = 8 cups.\n3. Red paint is 3 parts: 3 x 8 = 24 cups.\n4. Check: yellow is 2 x 8 = 16, and 24 + 16 = 40.\n\nAnswer: 24 cups are red.\n\nYour turn: Use the same ratio for 30 cups of paint.`;
  }
  if (domain === 'data') {
    return `Worked example: Five learners collect these numbers of bottle tops for recycling: 6, 8, 7, 9, and 10. Find the mean.\n\n1. Add the values: 6 + 8 + 7 + 9 + 10 = 40.\n2. Count the values: there are 5 learners.\n3. Divide: 40 / 5 = 8.\n4. Interpret: the mean is 8 bottle tops per learner.\n\nYour turn: Find the mean of 5, 7, 9, 9, and 10.`;
  }
  return `Worked example for ${topic.unitTitle}: Build a model that matches the topic.\n\nA Grade ${gradeNo} learner must solve a problem about ${topic.unitTitle.toLowerCase()}.\n\n1. Read the exact task and underline the quantities, shapes, rules, or relationships named in the topic.\n2. Choose the best model: labelled diagram, table, number line, graph, expression, equation, or construction.\n3. Put the known information into the model before calculating.\n4. Solve one step at a time and label the answer.\n5. Check that the model and answer both match ${topic.unitTitle.toLowerCase()}, not a different topic.\n\nYour turn: Write one short problem about ${topic.unitTitle.toLowerCase()}, solve it with a suitable model, and explain your check.`;
}

function scienceWorkedExample(topic, grade) {
  const domain = scienceDomain(topic);
  const gradeNo = gradeNumber(grade);
  if (domain === 'magnetism') {
    return `Investigation model for ${topic.unitTitle}: Map a magnetic field safely.\n\nQuestion: Where is a magnet's field strongest?\n\nExample: Iron filings gather most closely near the north and south poles of a bar magnet. A compass needle changes direction when moved around the magnet because it aligns with the magnetic field.\n\nProcedure:\n1. Place a bar magnet under a sheet of paper.\n2. Sprinkle a small amount of iron filings or use a compass at different positions.\n3. Sketch the field pattern and label north pole, south pole, and field direction.\n4. Compare the spacing of field lines near and far from the poles.\n5. For induction, explain that a changing magnetic field can produce an electric current in a conductor.\n\nConclusion frame: The magnetic field is strongest where _____.`;
  }
  if (domain === 'atomic-structure') {
    return `Model for ${topic.unitTitle}: Connect subatomic particles to atom structure.\n\nQuestion: How do particles inside an atom explain atomic number and mass number?\n\nExample table:\n| Particle | Charge | Position |\n| --- | --- | --- |\n| Proton | positive | nucleus |\n| Neutron | neutral | nucleus |\n| Electron | negative | shells around nucleus |\n\nProcedure:\n1. Draw a nucleus and label protons and neutrons.\n2. Draw electrons on shells around the nucleus.\n3. State that atomic number equals number of protons.\n4. State that mass number equals protons plus neutrons.\n5. Use one example atom to calculate the missing value.\n\nConclusion frame: Atomic structure is useful because _____.`;
  }
  if (domain === 'animals') {
    return `Observation model for ${topic.unitTitle}: Classify animals by visible features.\n\nQuestion: What features help us group animals correctly?\n\nExample: A fish has scales, fins, and gills, so it is adapted for living in water. A bird has feathers, wings, and a beak, so those features help with movement, warmth, feeding, or protection.\n\nProcedure:\n1. Choose three familiar animals.\n2. Record body covering, movement, feeding structure, habitat, and one adaptation.\n3. Group the animals using visible evidence.\n4. Explain why one feature supports survival.\n5. Avoid grouping by guesses or likes.\n\nConclusion frame: The evidence shows this animal belongs to _____ because _____.`;
  }
  if (domain === 'plant-parts') {
    return `Observation model for ${topic.unitTitle}: Link plant parts to functions.\n\nQuestion: How does each plant part help the plant live?\n\nExample: Roots hold the plant in soil and absorb water. The stem supports leaves and carries water upward. Leaves receive light and make food. Flowers help the plant produce seeds.\n\nProcedure:\n1. Draw a plant with roots, stem, leaves, and flower where present.\n2. Label each part clearly.\n3. Write one function next to each label.\n4. Add arrows to show water movement from root to stem to leaves.\n5. Explain one adaptation, such as broad leaves for light or deep roots for water.\n\nConclusion frame: A plant survives because its parts _____.`;
  }
  if (domain === 'states-of-matter') {
    return `Investigation model for ${topic.unitTitle}: Compare states of matter.\n\nQuestion: How do solids, liquids, and gases behave differently?\n\nExample comparison:\n| State | Shape | Volume | Example |\n| --- | --- | --- | --- |\n| Solid | fixed | fixed | stone |\n| Liquid | takes container shape | fixed | water |\n| Gas | fills space | not fixed | air |\n\nProcedure:\n1. Observe one safe solid, liquid, and gas example.\n2. Compare shape and volume.\n3. Describe particle arrangement using simple spacing language.\n4. Explain one change of state such as melting, freezing, evaporation, or condensation.\n5. Record what changed and what stayed the same.\n\nConclusion frame: Matter changes state when _____.`;
  }
  if (domain === 'digestion') {
    return `Investigation model for ${topic.unitTitle}: Trace what happens to food in the human digestive system.\n\nQuestion: How do mechanical and chemical digestion work together?\n\nExample: In the mouth, teeth break food into smaller pieces while saliva starts chemical digestion of starch. In the stomach, muscles churn food and gastric juice begins protein digestion. In the small intestine, enzymes complete digestion and digested food is absorbed.\n\nProcedure:\n1. Draw a labelled path: mouth, oesophagus, stomach, small intestine, large intestine, rectum.\n2. Beside each part, write whether the main action is mechanical digestion, chemical digestion, absorption, or removal of waste.\n3. Use arrows to show movement of food.\n4. Add one enzyme or digestive juice where it is taught in class.\n5. Explain why digestion is not complete in the mouth only.\n\nConclusion frame: Digestion needs both physical breakdown and chemical breakdown because _____.`;
  }
  if (domain === 'respiration') {
    return `Investigation model for ${topic.unitTitle}: Compare aerobic and anaerobic respiration.\n\nQuestion: How does oxygen affect energy release in living cells?\n\nExample comparison:\n| Type | Oxygen needed? | Main products | Energy released |\n| --- | --- | --- | --- |\n| Aerobic respiration | Yes | carbon dioxide and water | more energy |\n| Anaerobic respiration in muscles | No | lactic acid | less energy |\n\nProcedure:\n1. Define respiration as energy release in cells.\n2. State the word equation for aerobic respiration if required.\n3. Compare the two types using oxygen, products, and energy.\n4. Give one real example, such as vigorous exercise causing muscle fatigue.\n5. Avoid the common mistake of calling breathing and respiration the same thing.\n\nConclusion frame: Respiration is important because cells need energy to _____.`;
  }
  if (domain === 'genetics') {
    return `Worked model for ${topic.unitTitle}: Show monohybrid inheritance using a Punnett square.\n\nQuestion: If T represents tall and t represents short in a plant, what offspring can result from Tt x Tt?\n\n1. Write parent genotypes: Tt and Tt.\n2. Write gametes: T and t from each parent.\n3. Complete the Punnett square:\n|   | T | t |\n| --- | --- | --- |\n| T | TT | Tt |\n| t | Tt | tt |\n4. Genotype ratio: 1 TT : 2 Tt : 1 tt.\n5. If T is dominant, phenotype ratio is 3 tall : 1 short.\n\nConclusion frame: The Punnett square shows possible inheritance patterns, not a guarantee for one individual offspring.`;
  }
  if (domain === 'organic-chemistry') {
    return `Investigation model for ${topic.unitTitle}: Compare an alkanol, an alkanoic acid, and an ester using safe observations.\n\nQuestion: Which physical property helps identify an ester?\n\nExample: Ethanol is an alkanol, ethanoic acid is an alkanoic acid, and ethyl ethanoate is an ester. Esters often have pleasant fruity smells, while alkanoic acids have sharp acidic smells.\n\nProcedure:\n1. Use only teacher-approved samples and waft vapour gently; do not smell directly.\n2. Record physical properties such as smell, volatility, solubility in water, and appearance.\n3. Compare the functional group named in the lesson.\n4. Link the property to the compound family.\n5. Write one safety rule for handling organic liquids.\n\nConclusion frame: The evidence suggests the sample may be an ester because _____.`;
  }
  if (domain === 'electrolysis') {
    return `Investigation model for ${topic.unitTitle}: Explain why water can help electrolysis occur.\n\nQuestion: What role does water play when an ionic substance is electrolysed in solution?\n\nExample: When copper(II) sulfate dissolves in water, ions can move. Positive copper ions move towards the cathode, and negative sulfate ions remain in solution while other ions may take part depending on the electrodes and electrolyte.\n\nProcedure:\n1. Draw a simple electrolytic cell with anode, cathode, electrolyte, and power source.\n2. Label positive and negative electrodes.\n3. Show the direction of ion movement.\n4. Explain that pure water is a poor conductor, but dissolved ions carry charge.\n5. State one expected observation at an electrode where relevant.\n\nConclusion frame: Water supports electrolysis when it allows ions to move through the solution.`;
  }
  if (domain === 'electromagnetic-spectrum') {
    return `Analysis model for ${topic.unitTitle}: Arrange electromagnetic radiations by wavelength and use.\n\nQuestion: How do wavelength and frequency affect use and hazard?\n\nExample order from long wavelength to short wavelength: radio waves, microwaves, infrared, visible light, ultraviolet, X-rays, gamma rays.\n\nProcedure:\n1. Draw the spectrum as a labelled line.\n2. Mark wavelength decreasing and frequency increasing.\n3. Add one use for three radiations, such as radio communication, thermal imaging, and medical X-rays.\n4. Add one hazard where energy or penetration is high.\n5. Explain why visible light is only one small part of the spectrum.\n\nConclusion frame: Electromagnetic radiations differ by wavelength, frequency, energy, uses, and hazards.`;
  }
  if (domain === 'water-chemistry') {
    return `Investigation model for ${topic.unitTitle}: Explain a water or salt property using evidence.\n\nQuestion: How can an observation show the chemical property being studied?\n\nExample: Hard water does not lather easily with soap because calcium or magnesium ions react with soap to form scum. A soapless detergent can lather better in hard water because it does not form the same scum.\n\nProcedure:\n1. State the property being tested, such as hardness, solubility, or detergent action.\n2. Name the substances or ions involved where they are known.\n3. Record the observation, such as lather, precipitate, residue, or solubility.\n4. Explain the observation using the particles or ions.\n5. Add one use, problem, or treatment method linked to the property.\n\nConclusion frame: The observation shows _____ because _____.`;
  }
  if (domain === 'plant-transport') {
    return `Investigation model for ${topic.unitTitle}: Trace water and mineral salts through a plant.\n\nQuestion: How do roots, xylem, and leaves support transport?\n\nExample: Root hairs absorb water and dissolved mineral salts from the soil. Xylem vessels transport them upward through the stem. Transpiration from leaves helps pull water upward, while phloem transports manufactured food from leaves to other parts.\n\nProcedure:\n1. Draw a labelled plant with root hairs, root, stem, xylem, phloem, and leaf.\n2. Use arrows to show water and mineral salts moving upward.\n3. Add a separate arrow for food movement in phloem.\n4. Explain one factor that affects absorption or transpiration.\n5. State one adaptation that improves transport.\n\nConclusion frame: Plant transport is efficient because _____.`;
  }
  if (domain === 'plant-growth') {
    return `Investigation model for ${topic.unitTitle}: Test one condition needed for germination or plant growth.\n\nQuestion: How does water affect seed germination?\n\nExample fair test:\n| Container | Seeds | Water | Light | Expected observation |\n| --- | --- | --- | --- | --- |\n| A | 5 bean seeds | moist cotton | same place | seeds germinate |\n| B | 5 bean seeds | dry cotton | same place | little or no germination |\n\nProcedure:\n1. Change only the water condition.\n2. Keep seed type, number of seeds, container, and position the same.\n3. Record observations daily.\n4. Measure root or shoot length if germination occurs.\n5. Explain the result using the role of water in activating growth.\n\nConclusion frame: The evidence shows that water is needed for germination because _____.`;
  }
  if (domain === 'living-systems') {
    return `Investigation model for ${topic.unitTitle}: Connect a living structure to its function.\n\nQuestion: How does one part support the work of the whole system?\n\nExample: In the breathing system, the trachea carries air, bronchi branch into the lungs, and alveoli provide a large surface for gas exchange.\n\nProcedure:\n1. Draw the organism, organ, or system being studied.\n2. Label each visible part clearly.\n3. For each label, write one function using the frame: "This part helps by..."\n4. Connect two parts with an arrow and explain how they work together.\n5. Check that every claim is based on observation, a diagram, class text, or teacher demonstration.\n\nConclusion frame: The evidence shows that _____ is important because _____.`;
  }
  if (domain === 'physical-energy') {
    return `Investigation model for ${topic.unitTitle}: Test one energy or circuit condition safely.\n\nQuestion: What changes when one condition is changed?\n\nExample: In a simple circuit, a bulb lights only when there is a complete path from one battery terminal, through the bulb, and back to the other terminal.\n\nProcedure:\n1. Name the variable you will change, such as number of cells, wire length, material, distance, or surface.\n2. Name what you will observe or measure.\n3. Keep the other conditions the same.\n4. Record results in a table with at least three trials or comparisons.\n5. Write a conclusion that mentions the pattern in the results.\n\nSafety rule: Use only approved school materials and ask before connecting any electrical device.`;
  }
  if (domain === 'materials') {
    return `Investigation model for ${topic.unitTitle}: Compare material properties.\n\nQuestion: Which property helps us identify or separate the materials?\n\nExample: A mixture of sand and salt can be separated because salt dissolves in water but sand does not. The sand can be filtered out, and salt can be recovered from the solution by evaporation.\n\nProcedure:\n1. List the materials and their visible properties.\n2. Predict which property will be useful: size, solubility, magnetism, boiling point, texture, or colour change.\n3. Choose a safe method that matches the property.\n4. Record what happens before and after each step.\n5. Explain why the method worked instead of only naming the method.\n\nConclusion frame: The useful property was _____, so the best method was _____.`;
  }
  if (domain === 'forces-motion') {
    return `Investigation model for ${topic.unitTitle}: Measure a change in motion.\n\nQuestion: How does the force or surface affect the movement?\n\nExample: A toy car travels farther on a smooth tile than on rough soil because the rough surface produces more friction.\n\nProcedure:\n1. Choose one object to move.\n2. Change only one condition, such as surface, load, slope, or pushing force.\n3. Measure distance or time in the same way each trial.\n4. Repeat the test and record the results.\n5. Use the words force, motion, friction, speed, or pressure correctly in the conclusion.\n\nConclusion frame: When _____ changed, _____ happened because _____.`;
  }
  if (domain === 'environment') {
    return `Investigation model for ${topic.unitTitle}: Use field observation carefully.\n\nQuestion: What evidence in the local environment shows the pattern or problem?\n\nExample: A school garden with dry soil, wilting leaves, and cracks near the roots shows that plants need steady water and soil cover to reduce moisture loss.\n\nProcedure:\n1. Choose a safe observation point in the school compound, garden, home area, or community.\n2. Record date, weather, place, and what you can see without disturbing living things.\n3. Draw a labelled sketch or complete a three-column observation table.\n4. Separate facts from explanations.\n5. Suggest one practical improvement that protects health, safety, food, water, or the environment.\n\nConclusion frame: My observations show _____ because the evidence was _____.`;
  }
  return `Investigation model for ${topic.unitTitle}: Move from question to evidence.\n\nQuestion: What evidence would help explain this idea clearly?\n\nProcedure:\n1. State the exact question in one sentence.\n2. Name the materials, diagram, data, model, or digital tool needed.\n3. Decide what will be observed, measured, compared, or designed.\n4. Record results in a table, labelled sketch, flow chart, or screenshot note.\n5. Explain what the evidence means and name one limit of the investigation.\n\nEvidence table:\n| Step | Evidence collected | What it shows |\n| --- | --- | --- |\n| Observe or test | specific detail | explanation |\n\nConclusion frame: The evidence supports this answer because _____.`;
}

function englishWorkedExample(topic, grade) {
  const title = lowerTopic(topic);
  const gradeNo = gradeNumber(grade);
  if (/listen|audio|record|dialogue|poem|oral comprehension/.test(title)) {
    return `Listening model for ${topic.unitTitle}: Catch key details from a recording or teacher-read text.\n\nTranscript excerpt: \"At dawn, Naliaka and her brother carried seedlings to the school garden. Their teacher reminded the club to water the young trees before the sun became hot. By Friday, every group had labelled its row and recorded the number of seedlings planted.\"\n\nQuestion: Which details should a listener record?\n\nModel answer:\n1. Who: Naliaka, her brother, the teacher, and the club.\n2. Where: the school garden.\n3. What happened: seedlings were planted, watered, labelled, and recorded.\n4. Message: careful listening helps us retell events in order.\n\nGrade ${gradeNo} check: A strong listening answer names people, place, event order, and message without inventing details.`;
  }
  if (/pronunciation|sounds?|vocabulary|word meaning|oral/i.test(title)) {
    return `Pronunciation and vocabulary model for ${topic.unitTitle}: Hear, say, use, and check the word.\n\nWord set: school, shade, share, shape.\n\n1. Listen for the beginning sound.\n2. Say each word clearly and slowly.\n3. Use one word in a sentence: The learners sat under the shade during reading time.\n4. Check meaning from the sentence, not from guessing.\n5. Practise with a partner and correct one unclear sound.\n\nYour turn: Choose three words from ${topic.unitTitle.toLowerCase()}, say them clearly, write one sentence, and explain one meaning.`;
  }
  if (/blog|newspaper|article|media|lively language|feature/i.test(title)) {
    return `Media writing model for ${topic.unitTitle}: Turn facts into a short, lively article opening.\n\nTask: Write the opening of a school news article about a clean-water campaign.\n\nWeak opening: The campaign was good and many people came.\n\nImproved opening: Learners at Baraka Secondary turned the assembly ground into a clean-water action centre on Friday, testing simple filters, interviewing health volunteers, and signing a pledge to report broken taps before water is wasted.\n\nWhy it works:\n1. It names who, where, and when.\n2. It uses active verbs: turned, testing, interviewing, signing.\n3. It gives concrete details instead of saying only good.\n4. It fits a public audience.\n\nYour turn: Write a 60-word blog or newspaper opening for ${topic.unitTitle.toLowerCase()} using one fact, one vivid verb, and one clear audience.`;
  }
  if (/summary|paraphras|note[- ]?making|study skills/i.test(title)) {
    return `Summary model for ${topic.unitTitle}: Reduce a paragraph to its main idea without copying.\n\nOriginal note: A school debate helps learners practise listening, organise arguments, respond to different views, and speak with confidence before an audience.\n\nGood summary: A school debate builds communication by training learners to listen, organise ideas, respond respectfully, and speak confidently.\n\nSteps:\n1. Keep the main idea.\n2. Remove repeated details.\n3. Use your own sentence structure.\n4. Preserve the meaning.\n\nYour turn: Summarise a short paragraph linked to ${topic.unitTitle.toLowerCase()} in one clear sentence.`;
  }
  if (/polite|euphem|courtesy|etiquette|hotel|dining|reservation|restaurant|table manners|service encounter/i.test(title)) {
    return `Polite language model for ${topic.unitTitle}: Match words to the setting and listener.\n\nSituation: A learner is helping visitors during a school hospitality day. One visitor wants to reserve a table near a quiet corner.\n\nWeak response: Sit there. I do not know if the table is free.\n\nImproved response: Good afternoon. Let me check whether the quiet-corner table is available. If it has already been reserved, I can offer you another table near the window.\n\nWhy it works:\n1. It opens politely.\n2. It explains the action instead of sounding dismissive.\n3. It gives an alternative.\n4. It fits a hotel, dining, or public-service setting.\n\nYour turn: Write a polite request, apology, or reservation response linked to ${topic.unitTitle.toLowerCase()}, then underline the words that make the tone respectful.`;
  }
  if (/comprehension|reading|poem|story|literature|novel|drama/i.test(title)) {
    return `Reading model for ${topic.unitTitle}: Read the short passage, then answer with evidence.\n\nPassage: Amina borrowed a library book about a school clean-water campaign. She first skimmed the headings, then read the middle paragraph slowly because it explained why learners labelled taps, reported leaks, and kept drinking cups clean. In her notebook, she wrote one main idea and two details from the paragraph instead of guessing from the title alone.\n\nQuestion: What does Amina's behaviour show about careful reading?\n\nModel answer:\n1. Point: Amina reads carefully and uses evidence.\n2. Evidence: She skims headings, rereads the paragraph, and records one main idea with two details.\n3. Explanation: These actions show that a strong reading answer comes from the text, not from a quick guess.\n\nGrade ${gradeNo} check: A strong answer names the idea, quotes or paraphrases evidence, and explains why the evidence matters.`;
  }
  if (/grammar|sentence|tense|noun|verb|adjective|adverb|clause|punctuation/i.test(title)) {
    if (/punctuation|comma|apostrophe|quotation|direct speech/i.test(title)) {
      return `Language model for ${topic.unitTitle}: Use punctuation to guide meaning.\n\nOriginal sentence: before the debate chairperson said we must listen carefully\n\nRevision steps:\n1. Begin with a capital letter.\n2. Add a comma after the opening time phrase where it helps the reader pause.\n3. Put spoken words inside quotation marks if the sentence reports exact speech.\n4. Improved sentence: Before the debate, the chairperson said, "We must listen carefully."\n\nExplanation: Capital letters, commas, and quotation marks help the reader know where the sentence begins, pauses, and reports speech.\n\nYour turn: Write one sentence linked to ${topic.unitTitle.toLowerCase()} and punctuate it so a reader can follow it easily.`;
    }
    if (/tense|verb|agreement|subject/i.test(title)) {
      return `Language model for ${topic.unitTitle}: Make the verb agree with the subject and time.\n\nOriginal sentence: The reading group discuss ${topic.unitTitle.toLowerCase()} yesterday and writes notes today.\n\nRevision steps:\n1. Find the subject: the reading group.\n2. Match the time words: yesterday needs past tense; today needs present tense.\n3. Keep each verb in the correct form.\n4. Improved sentence: The reading group discussed ${topic.unitTitle.toLowerCase()} yesterday and writes notes today.\n\nExplanation: Verb tense shows time, and agreement shows whether the subject is singular or plural.\n\nYour turn: Write two correct sentences about ${topic.unitTitle.toLowerCase()}: one in the past tense and one in the present tense.`;
    }
    if (/clause|phrase|complex|compound/i.test(title)) {
      return `Language model for ${topic.unitTitle}: Join ideas without making the sentence confusing.\n\nOriginal sentence: The class read the passage. The passage explained ${topic.unitTitle.toLowerCase()}. The group needed evidence.\n\nRevision steps:\n1. Keep the main idea clear.\n2. Join related ideas with because, when, although, or which only where the meaning fits.\n3. Remove repeated words.\n4. Improved sentence: When the class read the passage about ${topic.unitTitle.toLowerCase()}, the group underlined evidence before answering.\n\nExplanation: A useful complex sentence links ideas and still keeps the main action easy to find.\n\nYour turn: Combine two short sentences about ${topic.unitTitle.toLowerCase()} into one clear sentence.`;
    }
    if (/noun|pronoun|determiner|adjective|adverb|word class|word classes/i.test(title)) {
      return `Language model for ${topic.unitTitle}: Sort words by class before using them in sentences.\n\nWord set: Nairobi, chair, water, courage, several, quickly.\n\nModel classification:\n1. Nairobi is a proper noun because it names a specific place.\n2. Chair is a common count noun because we can count one chair, two chairs.\n3. Water is a common non-count noun in ordinary use.\n4. Courage is an abstract noun because it names a quality.\n5. Several is a determiner because it tells about quantity.\n6. Quickly is an adverb because it describes how an action is done.\n\nModel sentence: Several learners quickly carried the chair from Nairobi Hall after the reading activity.\n\nExplanation: Word classes help us choose correct forms and place words where the sentence makes sense.\n\nYour turn: Classify four words linked to ${topic.unitTitle.toLowerCase()}, then use two of them in correct sentences.`;
    }
    return `Language model for ${topic.unitTitle}: Improve a sentence so the meaning is precise.\n\nDraft sentence: The learner wrote clear examples, but the explanation need one reason.\n\nRevision steps:\n1. Find the subject of the second clause: the explanation.\n2. Check the verb form: explanation is singular, so use needs.\n3. Keep the correction small so the meaning stays the same.\n4. Improved sentence: The learner wrote clear examples, but the explanation needs one reason.\n\nExplanation: Correct agreement and exact word order help the reader understand the idea without guessing.\n\nYour turn: Write one correct sentence about ${topic.unitTitle.toLowerCase()}, then underline the subject and verb.`;
  }
  if (/writing|essay|composition|letter|report|summary|paragraph|notice|speech/i.test(title)) {
    return `Writing model for ${topic.unitTitle}: Plan before writing.\n\nTask: Write a short response that explains a learning activity connected to this topic.\n\nPlan:\n1. Purpose: explain what happened and what was learned.\n2. Audience: classmates, teacher, parents, or public readers.\n3. Opening sentence: Our group studied ${topic.unitTitle.toLowerCase()} by reading the task, discussing evidence, and improving one draft.\n4. Three details: what learners did, what evidence was used, and what changed after feedback.\n5. Closing sentence: The activity showed that clear planning and revision improve communication.\n\nModel paragraph: Our group studied ${topic.unitTitle.toLowerCase()} by reading the task, discussing evidence, and improving one draft. Each learner contributed one sentence, then the group checked word choice and punctuation. We revised the weakest sentence so the message became clearer. The activity showed that clear planning and revision improve communication.\n\nYour turn: Use the same plan for a paragraph, report, letter, or speech linked to this topic.`;
  }
  if (/listening|speaking|oral|conversation|debate|discussion|presentation/i.test(title)) {
    return `Oral language model for ${topic.unitTitle}: Prepare a clear contribution for discussion.\n\nTopic: How can learners communicate this idea clearly and respectfully?\n\nModel response:\n1. Position: I think ${topic.unitTitle.toLowerCase()} needs clear examples and careful listening.\n2. Reason: A listener understands better when the speaker gives one point at a time.\n3. Evidence: In class, a speaker who names the topic, gives a reason, and pauses for questions is easier to follow.\n4. Respectful close: I understand another group may explain it differently, but every answer should stay linked to evidence.\n\nSpeaking checklist: face the listener, speak at a steady pace, give one example, and respond politely to another person's point.\n\nYour turn: Prepare a one-minute response connected to ${topic.unitTitle.toLowerCase()}.`;
  }
  return `Communication model for ${topic.unitTitle}: Choose purpose, audience, evidence, and revision.\n\nTask: Help a classmate understand one idea from this lesson.\n\nModel response:\n1. Purpose: I am explaining the idea clearly, not memorising a definition.\n2. Audience: My classmate needs simple words and one useful example.\n3. Evidence: I will use a detail from the passage, discussion, notice, report, or spoken task.\n4. Revision: I will reread one sentence and improve its clarity, tone, spelling, punctuation, or grammar.\n\nYour turn: Write four connected sentences about ${topic.unitTitle.toLowerCase()}: one main idea, one example, one evidence sentence, and one improved sentence.`;
}

function kiswahiliWorkedExample(topic, grade) {
  const title = lowerTopic(topic);
  const gradeNo = gradeNumber(grade);
  if (/tafsiri|kutafsiri|kisayansi|kitaaluma|akadem/i.test(title)) {
    return `Mfano wa tafsiri kuhusu ${topic.unitTitle}: Tafsiri maana, si maneno moja moja.\n\nSentensi ya Kiingereza: The experiment shows that heat can change the state of matter.\n\nTafsiri dhaifu: Jaribio linaonyesha kwamba joto linaweza kubadilisha hali ya jambo.\n\nTafsiri bora: Jaribio linaonyesha kuwa joto linaweza kubadilisha hali ya maada.\n\nKwa nini tafsiri bora inafaa:\n1. Inatumia istilahi ya kisayansi "maada" badala ya neno la jumla "jambo".\n2. Inahifadhi maana ya sentensi ya asili.\n3. Inasomeka kwa Kiswahili sanifu.\n4. Haiongezi wazo ambalo halikuwepo.\n\nZamu yako: Tafsiri sentensi moja ya kitaaluma inayohusiana na ${topic.unitTitle.toLowerCase()}, kisha eleza istilahi moja uliyochagua.`;
  }
  if (/kumbukumbu|muhtasari wa kikao|minutes/i.test(title)) {
    return `Mfano wa kumbukumbu kuhusu ${topic.unitTitle}: Andika kumbukumbu kwa mpangilio rasmi.\n\nKichwa: Kumbukumbu za kikao cha klabu ya mazingira.\n\n1. Tarehe: 12 Machi 2026.\n2. Mahali: Maktaba ya shule.\n3. Waliohudhuria: Mwenyekiti, katibu, mwalimu mshauri, na wanachama 18.\n4. Ajenda: Kupanga siku ya upandaji miti.\n5. Hoja kuu: Kila darasa litaleta miche miwili na maji ya kumwagilia.\n6. Uamuzi: Shughuli itafanyika Ijumaa saa nne asubuhi.\n7. Kikao kilifungwa: Saa tano na robo.\n\nZamu yako: Andika kumbukumbu fupi za kikao kinachohusiana na ${topic.unitTitle.toLowerCase()} ukitumia vipengele hivyo.`;
  }
  if (/ufahamu|kusoma|hadithi|fasihi|ushairi|tamthilia|riwaya/i.test(title)) {
    if (/ushairi|shairi/i.test(title)) {
      return `Mfano wa ushairi kuhusu ${topic.unitTitle}: Soma beti fupi, kisha jibu kwa ushahidi.\n\nBeti:\nMaji safi ni uhai,\nTuyalinde kila siku,\nShuleni na nyumbani,\nTumia bila fujo.\n\nSwali: Ujumbe mkuu wa beti hizi ni upi?\n\nJibu la mfano:\n1. Hoja: Ujumbe ni kutumia na kulinda maji kwa uangalifu.\n2. Ushahidi: Mshairi anasema "maji safi ni uhai" na "tumia bila fujo".\n3. Maelezo: Maneno hayo yanaonyesha kuwa maji ni muhimu na hayapaswi kupotezwa.\n\nZamu yako: Tafuta mstari mmoja unaounga mkono jibu lako kuhusu ${topic.unitTitle.toLowerCase()}, kisha ueleze maana yake.`;
    }
    if (/hadithi|riwaya|tamthilia|fasihi/i.test(title)) {
      return `Mfano wa fasihi kuhusu ${topic.unitTitle}: Chunguza tukio, mhusika, na ujumbe.\n\nKifungu: Amina alifika maktabani mapema ili amalize kusoma hadithi. Alipokutana na rafiki yake, hakumpa jibu moja kwa moja. Alimwonyesha ukurasa wenye ushahidi na kumwambia, "Tusome sentensi hii tena kabla ya kujibu."\n\nSwali: Tabia ya Amina inaonyesha nini kuhusu usomaji bora?\n\nJibu la mfano:\n1. Hoja: Amina ni msomaji makini.\n2. Ushahidi: Anarudi kwenye ukurasa wenye ushahidi kabla ya kutoa jibu.\n3. Maelezo: Hii inaonyesha kuwa ufahamu mzuri hutegemea matini, si kukisia.\n\nZamu yako: Eleza mhusika, tukio, au ujumbe mmoja unaohusiana na ${topic.unitTitle.toLowerCase()} ukitumia ushahidi.`;
    }
    return `Mfano wa kusoma kuhusu ${topic.unitTitle}: Soma kifungu, kisha jibu kwa ushahidi.\n\nKifungu: Katika maktaba ya shule, kikundi cha Darasa la ${gradeNo} kilisoma kifungu kuhusu ${topic.unitTitle.toLowerCase()}. Mwanafunzi mmoja alitaja wazo kuu, mwingine akapata sentensi inayoliunga mkono, kisha wote wakaandika maana kwa maneno yao wenyewe.\n\nSwali: Kikundi kilionyesha stadi gani ya kusoma?\n\nJibu la mfano:\n1. Hoja: Walionyesha kusoma kwa ufahamu na kutumia ushahidi.\n2. Ushahidi: Walitaja wazo kuu na kupata sentensi inayoliunga mkono.\n3. Maelezo: Hii inaonyesha kuwa jibu bora huchukua hoja kutoka matini na kuieleza kwa maneno ya msomaji.\n\nZamu yako: Taja hoja moja kuhusu ${topic.unitTitle.toLowerCase()}, toa ushahidi, kisha eleza maana yake.`;
  }
  if (/sarufi|nomino|kitenzi|vivumishi|viwakilishi|sentensi|nyakati|ngeli/i.test(title)) {
    if (/wingi|umoja/i.test(title)) {
      return `Mfano wa sarufi kuhusu ${topic.unitTitle}: Linganisha umoja na wingi.\n\nSentensi ya umoja: Mti mrefu umekua karibu na darasa.\nSentensi ya wingi: Miti mirefu imekua karibu na darasa.\n\nHatua:\n1. Tambua nomino: mti.\n2. Badilisha nomino kuwa wingi: miti.\n3. Badilisha kivumishi na kitenzi vilingane na nomino mpya.\n4. Hakiki maana: sentensi zote mbili zinahusu kitu kilekile lakini idadi imebadilika.\n\nZamu yako: Andika jozi mbili za sentensi kuhusu ${topic.unitTitle.toLowerCase()}, moja ya umoja na moja ya wingi.`;
    }
    if (/ngeli|viambishi|upatanisho/i.test(title)) {
      return `Mfano wa sarufi kuhusu ${topic.unitTitle}: Hakiki upatanisho wa ngeli.\n\nSentensi isiyokamilika: Vitabu vipya ___ mezani.\nJibu bora: Vitabu vipya viko mezani.\n\nHatua:\n1. Tambua nomino: vitabu.\n2. Tambua ngeli inayotumia kiambishi vi-.\n3. Chagua kitenzi au kivumishi kinacholingana: viko, vipya, vile.\n4. Soma sentensi tena ili kusikia kama upatanisho ni sahihi.\n\nZamu yako: Tunga sentensi tatu kuhusu ${topic.unitTitle.toLowerCase()} ukitumia viambishi vinavyolingana na nomino.`;
    }
    if (/kitenzi|vitenzi|nyakati|hali|mnyambuliko/i.test(title)) {
      return `Mfano wa sarufi kuhusu ${topic.unitTitle}: Badilisha kitenzi kulingana na wakati au hali.\n\nMzizi wa kitenzi: -soma.\nSentensi ya sasa: Mwanafunzi anasoma kifungu.\nSentensi ya jana: Mwanafunzi alisoma kifungu.\nSentensi ya mazoea: Mwanafunzi husoma kifungu kila jioni.\n\nHatua:\n1. Tambua mzizi wa kitenzi.\n2. Chagua kiambishi cha wakati au hali.\n3. Hakikisha mtenda na kitenzi vinaendana.\n4. Soma sentensi ili kuona kama maana imebaki wazi.\n\nZamu yako: Tumia kitenzi kimoja kutoka ${topic.unitTitle.toLowerCase()} katika nyakati au hali tatu.`;
    }
    if (/herufi kubwa|koma|kikomo|uakifishaji/i.test(title)) {
      return `Mfano wa sarufi kuhusu ${topic.unitTitle}: Tumia alama za uakifishaji kwa usahihi.\n\nSentensi ghafi: jana neema alisema tutasoma kiswahili maktabani\nSentensi sahihi: Jana, Neema alisema, "Tutasoma Kiswahili maktabani."\n\nHatua:\n1. Anza sentensi kwa herufi kubwa.\n2. Andika majina ya watu na lugha kwa herufi kubwa.\n3. Tumia koma pale pa pumziko fupi.\n4. Tumia kikomo au alama za kunukuu kulingana na ujumbe.\n\nZamu yako: Rekebisha sentensi mbili kuhusu ${topic.unitTitle.toLowerCase()} ukionyesha alama ulizotumia.`;
    }
    return `Mfano wa sarufi kuhusu ${topic.unitTitle}: Chunguza sentensi, kisha eleza kanuni.\n\nSentensi: Wanafunzi wawili waliandika majibu yao kwa makini.\n\nHatua:\n1. Tambua nomino kuu: wanafunzi.\n2. Tambua kitenzi: waliandika.\n3. Tambua maneno yanayoongeza maana: wawili, yao, kwa makini.\n4. Eleza kanuni inayotumika katika mada hii kwa sentensi moja.\n\nZamu yako: Andika sentensi mbili kuhusu ${topic.unitTitle.toLowerCase()}, kisha uonyeshe nomino, kitenzi, na kanuni ya sarufi uliyoitumia.`;
  }
  if (/insha|uandishi|barua|ripoti|hotuba|muhtasari|aya/i.test(title)) {
    return `Mfano wa uandishi kuhusu ${topic.unitTitle}: Panga mawazo kabla ya kuandika.\n\nKazi: Andika aya inayofafanua wazo moja muhimu katika mada hii.\n\nMpango:\n1. Kusudi: kueleza wazo kwa uwazi.\n2. Msomaji: mwanafunzi, mwalimu, mzazi, au jamii.\n3. Sentensi ya mwanzo: Mada ya ${topic.unitTitle.toLowerCase()} hutusaidia kutumia Kiswahili kwa usahihi zaidi.\n4. Maelezo matatu: eleza istilahi, toa mfano, kisha onyesha matumizi yake.\n5. Sentensi ya mwisho: Hitimisha kwa ujumbe unaofunga wazo kuu.\n\nAya ya mfano: Mada ya ${topic.unitTitle.toLowerCase()} hutusaidia kutumia Kiswahili kwa usahihi zaidi. Kwanza, tunatambua msamiati unaofaa muktadha. Pili, tunautumia katika sentensi zinazoeleweka. Tatu, tunahakiki kazi yetu ili kuondoa makosa ya tahajia, sarufi, na mpangilio. Kwa njia hii, ujumbe unakuwa wazi kwa msomaji.\n\nZamu yako: Tumia mpango huo kuandika aya kuhusu mada hii.`;
  }
  if (/kusikiliza|kuzungumza|mazungumzo|matamshi|mdahalo|majadiliano/i.test(title)) {
    return `Mfano wa mazungumzo: Andaa mchango mfupi wenye heshima.\n\nMada: Kwa nini wanafunzi walinde vifaa vya shule?\n\nJibu la mfano:\n1. Msimamo: Wanafunzi wanapaswa kulinda vifaa vya shule.\n2. Sababu: Vifaa hivyo hutumiwa na madarasa mengi.\n3. Mfano: Dawati likiharibika, wanafunzi wengine hushindwa kukaa vizuri wanaposoma.\n4. Hitimisho: Kwa hiyo, kila mwanafunzi awajibike na kuripoti uharibifu mapema.\n\nVigezo: tamka maneno wazi, sikiliza wengine, toa sababu, na tumia lugha ya heshima.\n\nZamu yako: Andaa mchango wa dakika moja unaohusiana na ${topic.unitTitle.toLowerCase()}.`;
  }
  return `Mfano wa Kiswahili: Unganisha kusudi, msomaji au msikilizaji, na ushahidi.\n\nKazi kuhusu ${topic.unitTitle}: Andika au sema jibu fupi linalofundisha wazo kwa uwazi.\n\n1. Kusudi: chagua kama unaeleza, unasimulia, unashawishi, unaelekeza, au unajibu kifungu.\n2. Hadhira: tumia msamiati unaofaa mwanafunzi, mwalimu, mzazi, au jamii.\n3. Ushahidi: tumia mfano kutoka kifungu, mazungumzo, tukio, au maisha ya kila siku.\n4. Mpangilio: anza na wazo kuu, ongeza maelezo mawili, kisha malizia kwa sentensi ya hitimisho.\n5. Uhakiki: rekebisha tahajia, sarufi, mpangilio, na maana.\n\nKiunzi cha jibu: Wazo muhimu katika ${topic.unitTitle.toLowerCase()} ni _____ kwa sababu _____. Kwa mfano, _____.`;
}

function socialStudiesWorkedExample(topic, grade) {
  const text = topicText(topic);
  if (hasAny(text, [/\bcompass\b/, /\bdirection\b/, /\blocate\b/, /\bposition\b/, /\bmap\b/])) {
    return `Mapwork model for ${topic.unitTitle}: Use a real route and direction words.\n\nExample: On a simple Kenya map, Nairobi is south-east of Nakuru, while Kisumu is west of Nakuru. A learner travelling from Nairobi to Mombasa generally moves south-east towards the coast.\n\nHow to answer:\n1. Name the two places being compared.\n2. Use a compass direction such as north, south, east, west, north-east, or south-west.\n3. Check the answer against the map arrow or compass rose.\n4. Add one reason the direction matters, such as travel, trade, weather, or planning.\n\nQuality check: A good mapwork answer names actual places and uses the compass direction correctly.`;
  }
  if (hasAny(text, [/\bgood citizenship\b/, /\bresponsibilities of a kenyan citizen\b/, /\bpatriotism\b/, /\bnational unity\b/])) {
    return `Citizenship model for ${topic.unitTitle}: Connect a right with a responsibility.\n\nExample: A Kenyan learner has the right to education and the responsibility to attend school, respect others, protect school property, and report unsafe behaviour. In a school election, good citizenship means voting peacefully, accepting fair rules, and avoiding false claims about candidates.\n\nHow to answer:\n1. Name one right or responsibility.\n2. Give a school, home, county, or national example.\n3. Explain why the action supports peace, fairness, safety, or unity.\n4. State one practical action a learner can take this week.\n\nQuality check: A good answer names Kenya or a real community setting, not only \"people should be good\".`;
  }
  if (hasAny(text, [/\beastern africa\b/, /\buganda\b/, /\btanzania\b/, /\brwanda\b/, /\bburundi\b/, /\bsouth sudan\b/, /\bethiopia\b/])) {
    return `Regional studies model for ${topic.unitTitle}: Use an East African example.\n\nExample: Kenya, Uganda, Tanzania, Rwanda, Burundi, South Sudan, and Ethiopia are part of the wider Eastern Africa region. Countries cooperate through trade, transport routes, environmental protection, education, and peace-building. For example, the Northern Corridor links Mombasa port to inland neighbours and supports movement of goods.\n\nHow to answer:\n1. Name the countries or feature being studied.\n2. Use a map clue such as border, coast, lake, highland, or transport route.\n3. Explain one benefit of cooperation or one shared challenge.\n4. Add one responsible action, such as respecting neighbours, protecting shared resources, or checking facts before sharing information.`;
  }
  if (hasAny(text, [/\biebc\b/, /\belection\b/, /\bvoting\b/, /\bdemocracy\b/])) {
    return `Civic model for ${topic.unitTitle}: Explain an election body using a concrete Kenya example.\n\nExample: The Independent Electoral and Boundaries Commission, IEBC, manages elections and referenda in Kenya. It registers voters, prepares polling materials, educates voters, manages polling stations, counts votes, and announces results according to the law.\n\nHow to answer:\n1. Name the institution: IEBC.\n2. State its public role: managing elections and boundaries.\n3. Give two duties, such as voter registration and announcing results.\n4. Explain why fairness matters: citizens trust results when rules are followed.\n5. Add one learner action: verify information before sharing election claims.\n\nQuality check: A good answer names the institution, gives real duties, and links the work to citizenship and fairness.`;
  }
  if (hasAny(text, [/\bconstitution\b/, /\bright\b/, /\bresponsibilit/, /\bcitizen/])) {
    return `Civic model for ${topic.unitTitle}: Connect rights with responsibilities.\n\nExample: The Constitution of Kenya protects rights such as education, expression, religion, and equality. A right is not a licence to harm others. Learners practise responsible citizenship by respecting others, following school rules, protecting public property, and reporting unsafe behaviour.\n\nHow to answer:\n1. Name one right.\n2. Explain what the right protects.\n3. Name one responsibility linked to it.\n4. Give a school or community example.\n5. Explain how the example supports peace, fairness, or safety.`;
  }
  if (hasAny(text, [/\bfort jesus\b/, /\bheritage\b/, /\bculture\b/, /\bhistorical\b/, /\bmonument\b/])) {
    return `Heritage model for ${topic.unitTitle}: Use a real site and explain its value.\n\nExample: Fort Jesus in Mombasa is a historical site linked to coastal trade, defence, and contact between different peoples. It helps learners understand Kenya's coastal history and why heritage sites should be protected.\n\nHow to answer:\n1. Name the site or cultural practice.\n2. State where it is found.\n3. Explain what it teaches about the past.\n4. Give one way people protect it.\n5. Explain why heritage supports identity, tourism, learning, or unity.`;
  }
  if (hasAny(text, [/\briver tana\b/, /\briver\b/, /\blake\b/, /\bmap\b/, /\brelief\b/, /\bclimate\b/, /\benvironment\b/])) {
    return `Geography model for ${topic.unitTitle}: Explain a place using evidence.\n\nExample: River Tana is Kenya's longest river. It supports farming, fishing, hydroelectric power, water supply, and wildlife habitats, but it can also flood when rainfall is heavy.\n\nHow to answer:\n1. Name the physical feature.\n2. Locate it using a map direction or county/region clue.\n3. State two benefits to people or the environment.\n4. State one risk or conservation issue.\n5. Suggest one responsible action, such as protecting riverbanks or using water carefully.`;
  }
  if (hasAny(text, [/\bschool\b/, /\bclass\b/, /\bchildren'?s government\b/, /\blearner leader\b/])) {
    return `School community model for ${topic.unitTitle}: Use evidence from a school setting.\n\nExample: A school council can identify a problem such as broken desks, unsafe paths, or waste around classrooms. Learners gather evidence, report to the teacher or head teacher, and agree on a responsible action.\n\nHow to answer:\n1. Name the school issue or leadership role.\n2. State who is affected: learners, teachers, parents, or support staff.\n3. Use evidence such as a class record, observation, interview, or school rule.\n4. Explain why the issue affects safety, fairness, learning, or responsibility.\n5. Suggest one action learners can take without breaking school rules.`;
  }
  if (hasAny(text, [/\btopographical\b/, /\bcontour\b/, /\bscale\b/, /\bkey\b/, /\bsymbol\b/, /\bgrid\b/])) {
    return `Map evidence model for ${topic.unitTitle}: Read the map before explaining.\n\nExample: A topographical map uses symbols, scale, grid references, contour lines, and direction to show features such as roads, rivers, schools, settlements, and slopes.\n\nHow to answer:\n1. Name the exact map feature being used.\n2. Read the map key, scale, grid, or contour pattern.\n3. State what the feature shows about the place.\n4. Explain how the evidence helps travel, farming, settlement, safety, or planning.\n5. Avoid guessing from memory when the map gives direct evidence.`;
  }
  if (hasAny(text, [/\btechnology\b/, /\bindustr/, /\bcommunication\b/, /\btransport\b/, /\btrade\b/])) {
    return `Technology and industry model for ${topic.unitTitle}: Link activity to people's needs.\n\nExample: A food-processing industry turns farm produce into products that can be stored, transported, and sold. Digital communication can help traders share prices, contact customers, and reduce wasted journeys.\n\nHow to answer:\n1. Name the technology, industry, or transport activity.\n2. State the resource, service, or need it connects to.\n3. Explain one benefit and one challenge.\n4. Name the people affected, such as learners, farmers, traders, families, workers, or customers.\n5. Suggest one responsible action, such as using information honestly or reducing waste.`;
  }
  if (hasAny(text, [/\bgovern/, /\bleadership\b/, /\bcounty\b/, /\bpublic office\b/, /\blaw\b/])) {
    return `Government model for ${topic.unitTitle}: Explain a public role with evidence.\n\nExample: County governments provide services such as local roads, markets, health facilities, water services, and early childhood education. Citizens can use public notices, meetings, budgets, and service records to check what has been promised or done.\n\nHow to answer:\n1. Name the government level, office, or leader.\n2. State the duty being studied.\n3. Give evidence from a law, notice, meeting, observation, or class text.\n4. Explain why the duty affects citizens.\n5. Name one respectful way citizens or learners can participate.`;
  }
  if (hasAny(text, [/\beconomic\b/, /\benterprise\b/, /\bmarket\b/, /\bresource\b/, /\boccupation\b/])) {
    return `Economic activity model for ${topic.unitTitle}: Follow resources, work, and value.\n\nExample: A school enterprise project can grow vegetables, keep records of costs, sell produce fairly, and decide how profit supports a class need.\n\nHow to answer:\n1. Name the resource or activity.\n2. State the work people do and the product or service created.\n3. Explain one benefit to families, schools, communities, or the country.\n4. Mention one problem such as waste, unfair prices, poor transport, or unsafe work.\n5. Suggest a responsible action that improves value or fairness.`;
  }
  if (hasAny(text, [/\bpopulation\b/, /\bsettlement\b/, /\bmigration\b/, /\burban\b/, /\brural\b/])) {
    return `Population model for ${topic.unitTitle}: Explain a pattern with reasons.\n\nExample: People may settle near roads, markets, schools, health facilities, water sources, fertile land, or jobs. Crowded places need careful planning for housing, waste, transport, water, and safety.\n\nHow to answer:\n1. Name the population or settlement pattern.\n2. Give two reasons for the pattern.\n3. Explain one benefit and one challenge.\n4. Use evidence such as a map, census table, observation, or class text.\n5. Suggest one planning action that protects people and the environment.`;
  }
  return `Community evidence model for ${topic.unitTitle}: Choose a precise Kenya example.\n\nExample: A useful Social Studies answer names a real place, group, institution, resource, law, map feature, or event. It then explains what the evidence shows and why the issue matters for citizenship, fairness, safety, heritage, environment, or livelihoods.\n\nHow to answer:\n1. Place: name a Kenyan county, town, river, school, market, public office, road, farm area, or heritage site that fits the topic.\n2. People: identify the learners, families, workers, leaders, elders, visitors, voters, or community groups involved.\n3. Evidence: use a map clue, observation, interview, timeline, law, photograph, table, public notice, or class text.\n4. Meaning: explain why the evidence matters for the topic.\n5. Action: suggest one realistic action a learner, family, school, or community can take.\n\nQuality check: another learner should be able to name the place, people, evidence, and importance after reading your answer.`;
}

function agricultureWorkedExample(topic, grade) {
  const text = topicText(topic);
  if (hasAny(text, [/\bbeekeep/, /\bhive\b/, /\bbee\b/])) {
    return `Practical model for ${topic.unitTitle}: Beekeeping safety and observation.\n\nTeacher-supervised procedure:\n1. Wear protective clothing: veil, gloves, long sleeves, trousers, and closed shoes.\n2. Approach the hive calmly from the side or back, not directly in front of the entrance.\n3. Use smoke only under trained supervision to calm bees.\n4. Inspect quickly for comb condition, pests, and signs of honey, then close the hive gently.\n5. Keep learners with allergies or fear of stings away from the hive area.\n\nHazards: stings, allergic reactions, fire from smoker, and disturbing bees.\n\nQuality criteria: safe distance, correct protective clothing, calm movement, clear observation record, and no damage to the colony.`;
  }
  if (hasAny(text, [/\banimal handling\b/, /\banimal rearing\b/, /\blivestock\b/, /\bcattle\b/, /\bgoat\b/, /\bpoultry\b/, /\bfeeding\b/, /\banimal project\b/])) {
    return `Practical model for ${topic.unitTitle}: Safe animal handling.\n\nTeacher-supervised procedure:\n1. Observe the animal's behaviour before moving close.\n2. Approach from the side where the animal can see you.\n3. Keep hands away from the mouth, horns, hooves, and back legs.\n4. Use clean water, feed, bedding, and equipment as instructed.\n5. Wash hands and disinfect equipment after the task.\n\nHazards: kicks, bites, scratches, disease transmission, and stress to the animal.\n\nQuality criteria: calm handling, clean tools, correct restraint if needed, animal welfare, and accurate records of feed, health, or behaviour.`;
  }
  if (hasAny(text, [/\bcompost\b/, /\bmanure\b/, /\borganic matter\b/])) {
    return `Practical model for ${topic.unitTitle}: Making compost safely.\n\nProcedure:\n1. Choose a shaded, well-drained site away from drinking water.\n2. Layer dry plant material, green plant material, and a little soil or old compost.\n3. Moisten the heap lightly; it should be damp, not waterlogged.\n4. Turn the heap regularly to add air.\n5. Keep plastics, glass, metal, diseased plants, and faecal waste out of the compost.\n\nHazards: cuts from hidden objects, bad odour from too much water, pests, and disease from unsafe waste.\n\nQuality criteria: correct materials, balanced moisture, regular turning, earthy smell, and dark crumbly compost when ready.`;
  }
  if (hasAny(text, [/\bdisinfect/, /\bwaste\b/, /\bhygiene\b/, /\bcooking\b/, /\bflour\b/, /\bfood\b/])) {
    return `Practical model for ${topic.unitTitle}: Food and hygiene safety.\n\nProcedure:\n1. Wash hands with soap and clean water before handling food or tools.\n2. Clean the working surface and separate raw, cooked, and waste materials.\n3. Measure ingredients with clean containers.\n4. Dispose of waste in the correct bin or compost area if suitable.\n5. Wash tools, dry them, and store them safely after use.\n\nHazards: contamination, burns, cuts, slippery floors, and unsafe waste handling.\n\nQuality criteria: clean hands, clean tools, correct measurements, safe disposal, and a record of what was done.`;
  }
  if (hasAny(text, [/\bsoil\b/, /\berosion\b/, /\bmulch\b/, /\bfertil/, /\bnutrient\b/])) {
    return `Practical model for ${topic.unitTitle}: Soil observation and improvement.\n\nProcedure:\n1. Collect a small soil sample from an approved school-garden spot.\n2. Observe colour, texture, moisture, stones, plant remains, and signs of erosion.\n3. Record the evidence in a table before suggesting an improvement.\n4. Choose one improvement such as mulching, compost, contour planting, cover crops, or safe drainage.\n5. Explain how the improvement protects soil fertility, water, or plant growth.\n\nHazards: sharp objects, dirty hands, unsafe slopes, and contaminated soil.\n\nRubric: excellent work names the soil evidence, links it to a practical improvement, includes safety, and records observations clearly.`;
  }
  if (hasAny(text, [/\bdirect sow/, /\btiny seed/, /\bsowing\b/, /\bseedbed\b/])) {
    return `Practical model for ${topic.unitTitle}: Direct sow tiny seeds carefully.\n\nProcedure:\n1. Prepare a fine, level seedbed with small soil particles and no large clods.\n2. Make shallow drills or marked rows at the spacing taught by the teacher.\n3. Mix very tiny seeds with dry sand or fine soil so they spread more evenly.\n4. Sow thinly, cover lightly, water gently, and label the row with crop and date.\n5. Observe germination, thin overcrowded seedlings, and record what changed.\n\nHazards: wasting seed, burying tiny seeds too deeply, washing seeds away, using dirty water, and stepping on the seedbed.\n\nRubric: excellent work shows correct depth, even spacing, gentle watering, clear labelling, and a useful germination record.`;
  }
  if (hasAny(text, [/\bcrop\b/, /\bseed\b/, /\bplanting\b/, /\bnursery\b/, /\bharvest\b/, /\bpest\b/, /\bdisease\b/])) {
    return `Practical model for ${topic.unitTitle}: Crop-care decision card.\n\nProcedure:\n1. Identify the crop stage: seed, nursery, transplanted crop, flowering, fruiting, or harvest.\n2. Observe spacing, water, weeds, pests, disease signs, soil cover, and plant colour.\n3. Choose one safe action: watering, thinning, weeding, mulching, staking, pest scouting, or harvesting.\n4. Record why that action fits the evidence seen.\n5. Review the result after a set time and note whether plant health improved.\n\nHazards: sharp tools, unsafe chemicals, dirty water, plant irritation, and overwatering.\n\nRubric: excellent work uses real observations, names the crop-care action, protects safety, and explains the expected result.`;
  }
  if (hasAny(text, [/\birrigation\b/, /\bwater\b/, /\bconservation\b/, /\bdrainage\b/])) {
    return `Practical model for ${topic.unitTitle}: Water-use plan for a garden bed.\n\nProcedure:\n1. Check soil moisture before watering by observing colour and feel.\n2. Decide whether the bed needs watering, mulching, drainage, or shade.\n3. Water near the root zone and avoid wasting water on paths.\n4. Record amount, time, weather, and plant response.\n5. Suggest one conservation action such as mulching, watering early, fixing leaks, or using a watering can with a rose.\n\nHazards: slippery paths, contaminated water, heavy containers, and flooded roots.\n\nRubric: excellent work links water action to evidence, avoids waste, protects plants, and keeps a useful record.`;
  }
  if (hasAny(text, [/\brecord\b/, /\bbudget\b/, /\bmarket\b/, /\benterprise\b/, /\bagribusiness\b/])) {
    return `Practical model for ${topic.unitTitle}: Simple farm-record or enterprise check.\n\nProcedure:\n1. Name the activity, such as planting, feeding, harvesting, selling, or storing.\n2. Record date, item, quantity, cost, income, loss, or observation.\n3. Calculate one useful figure, such as total cost, total sales, profit, loss, or stock remaining.\n4. Explain one decision the record supports.\n5. Store the record neatly for comparison with the next activity.\n\nHazards: wrong measurements, missing entries, unsafe storage, and confusing income with profit.\n\nRubric: excellent work has accurate entries, correct calculation, a realistic decision, and neat records.`;
  }
  if (hasAny(text, [/\btool\b/, /\bequipment\b/, /\bmaintain\b/, /\bmaintenance\b/, /\bsharpen\b/, /\bstore\b/])) {
    return `Practical model for ${topic.unitTitle}: Tool selection and maintenance check.\n\nProcedure:\n1. Name the agriculture task and choose the correct tool for it.\n2. Inspect the handle, blade, joint, edge, or moving part before use.\n3. Use the tool with safe spacing and the correct body position.\n4. Clean, dry, oil, sharpen, or store the tool as appropriate after use.\n5. Record one fault found and the safe maintenance action taken.\n\nHazards: cuts, loose handles, rust, poor storage, and using the wrong tool.\n\nRubric: excellent work matches tool to task, checks safety before use, maintains the tool correctly, and records the result.`;
  }
  if (hasAny(text, [/\bsun dryer\b/, /\bdry vegetables\b/, /\bpreserve vegetables\b/, /\bsolar dryer\b/])) {
    return `Practical model for ${topic.unitTitle}: Preserve vegetables with a homemade sun dryer.\n\nProcedure:\n1. Select fresh vegetables, wash them with clean water, and remove damaged parts.\n2. Cut pieces evenly so they dry at a similar rate.\n3. Place them on a clean raised tray inside a covered sun dryer that allows warm air to pass through.\n4. Turn pieces as instructed and protect them from dust, animals, and rain.\n5. Store only fully dried vegetables in a clean, dry, labelled container.\n\nHazards: contamination, mould from poor drying, cuts while slicing, burns from hot surfaces, and leaving food uncovered.\n\nRubric: excellent work protects hygiene, shows correct drying conditions, prevents spoilage, and explains how preservation reduces food loss.`;
  }
  if (hasAny(text, [/\bcereal\b/, /\bpulse\b/, /\bgrain\b/, /\bpreserv/, /\bstorage\b/])) {
    return `Practical model for ${topic.unitTitle}: Store cereals and pulses safely.\n\nProcedure:\n1. Sort grains or pulses to remove stones, chaff, damaged seeds, and pests.\n2. Dry them to a safe condition before storage.\n3. Clean and dry the container, sack, or storage area.\n4. Label the produce with name, date, and quantity.\n5. Check regularly for moisture, insects, rodents, mould, and broken packaging.\n\nHazards: mould, pest damage, contamination, wrong moisture level, and unsafe chemicals.\n\nRubric: excellent work explains sorting, drying, clean storage, labelling, regular inspection, and how the method reduces post-harvest loss.`;
  }
  if (hasAny(text, [/\bprocessing\b/, /\bvalue addition\b/, /\bpreserv/, /\bpackag/, /\bstorage\b/, /\bprepare.*market\b/])) {
    return `Practical model for ${topic.unitTitle}: Produce handling and value-addition plan.\n\nProcedure:\n1. Identify the produce and its quality requirements before handling.\n2. Sort, clean, grade, dry, package, process, or store it using the method taught.\n3. Keep hands, containers, surfaces, and storage areas clean.\n4. Label the product or record date, quantity, and condition.\n5. Explain how the method reduces loss or improves market value.\n\nHazards: contamination, cuts, spoilage, wrong packaging, and unsafe storage.\n\nRubric: excellent work protects hygiene, follows the right method, reduces waste, and explains the value added.`;
  }
  return `Practical model for ${topic.unitTitle}: Choose the exact agriculture action, then prove it with evidence.\n\nProcedure:\n1. Choose one concrete task from this topic: observe soil, care for a crop, handle a tool, feed or protect an animal, store produce, manage water, or keep a record.\n2. State the purpose of that task in one sentence.\n3. List exact tools, materials, living things, and safety items before starting.\n4. Perform one step at a time under teacher or adult guidance where needed.\n5. Record date, condition observed, action taken, result, and one improvement.\n\nRubric: excellent work names the real task, uses safe handling, gives a clear sequence, cares for living things, and records useful evidence.`;
}

function creativeArtsWorkedExample(topic, grade) {
  const text = topicText(topic);
  if (hasAny(text, [/\bclay\b/, /\bslab\b/, /\bcoil\b/, /\bmodel\b/, /\bpapier\b/, /\bpapier mache\b/, /\bpottery\b/, /\bceramic/, /\bbisque\b/, /\bthrowing technique\b/])) {
    return `Craft model for ${topic.unitTitle}: Shape and finish a stable three-dimensional form safely.\n\nProcedure:\n1. Sketch the object and label materials, tools, joining method, and finish before starting.\n2. Prepare clay, paper, paste, or other teacher-approved material safely.\n3. Shape the object using the technique taught, such as coil, slab, throwing, casting, folding, joining, or modelling.\n4. Check wall thickness, strength, balance, surface finish, safe tool use, and drying or firing requirements.\n5. Improve one feature after feedback and explain the change using correct art vocabulary.\n\nRubric: excellent work is safely made, structurally stable, neatly finished, improved after feedback, and explained with the correct technique terms.`;
  }
  if (hasAny(text, [/\btie[- ]?dye\b/, /\bbatik\b/, /\bdye\b/])) {
    return `Studio model for ${topic.unitTitle}: Tie-dye or batik safety and quality.\n\nTeacher-supervised procedure:\n1. Sketch the pattern before using dye or wax.\n2. Wear gloves and protect the work surface.\n3. Tie, fold, stitch, or apply wax according to the planned pattern.\n4. Apply dye carefully and keep colours labelled.\n5. Rinse, dry, and evaluate the pattern after the teacher confirms it is safe.\n\nHazards: staining skin/clothes, hot wax, chemical irritation, spills, and slippery floors.\n\nQuality criteria: clear pattern, controlled colour, safe handling, neat finishing, and explanation of design choices.`;
  }
  if (hasAny(text, [/\bcarv/, /\bsculpt/, /\bknife\b/, /\btool\b/])) {
    return `Studio model for ${topic.unitTitle}: Carving or sculpture safety.\n\nTeacher-supervised procedure:\n1. Plan the form with a sketch or small model.\n2. Choose suitable soft material before using any sharp tool.\n3. Secure the material on a stable surface.\n4. Cut away from the body and keep hands behind the cutting edge.\n5. Smooth, clean, and store tools safely after use.\n\nHazards: cuts, flying chips, dust, unstable material, and misuse of sharp tools.\n\nQuality criteria: balanced form, safe tool control, smooth finish, stable structure, and clear explanation of the idea.`;
  }
  if (hasAny(text, [/\bswimming\b/, /\bpool\b/, /\bwater safety\b/, /\bsafe entry\b/])) {
    return `Movement model for ${topic.unitTitle}: Practise safe pool entry and water confidence.\n\nTeacher-supervised procedure:\n1. Check pool rules, lifeguard or teacher position, depth markings, and safe entry point before entering.\n2. Enter only when instructed, using the taught entry method for that depth.\n3. Keep space from other swimmers and avoid pushing, running, or diving without permission.\n4. Practise breathing, floating, kicking, or movement slowly near the safe area first.\n5. Exit calmly, report discomfort immediately, and reflect on one safety action used.\n\nHazards: slipping, panic, water inhalation, collision, unsafe depth, and ignoring instructions.\n\nQuality criteria: follows pool rules, enters safely, controls movement, respects others, and can explain the safety reason for each action.`;
  }
  if (hasAny(text, [/\brugby\b/, /\bswimming\b/, /\bsport\b/, /\bphysical\b/])) {
    return `Movement model for ${topic.unitTitle}: Safe physical performance.\n\nTeacher-supervised procedure:\n1. Warm up before the activity.\n2. Check the field, pool, or performance space for hazards.\n3. Practise the skill slowly before increasing speed or force.\n4. Follow rules on contact, spacing, rescue, hydration, and stopping when tired or injured.\n5. Cool down and reflect on teamwork, control, and safety.\n\nHazards: collision, drowning risk, sprains, unsafe surfaces, dehydration, and ignoring instructions.\n\nQuality criteria: correct technique, safe spacing, teamwork, rule-following, and controlled movement.`;
  }
  if (hasAny(text, [/\bdraw/, /\bpaint/, /\bcolour/, /\bcolor/, /\bdesign\b/, /\bposter\b/, /\bmural\b/])) {
    return `Studio model for ${topic.unitTitle}: Build a visual idea from observation.\n\nProcedure:\n1. Observe the object, scene, message, or pattern before drawing.\n2. Make two thumbnail sketches to test composition.\n3. Choose line, shape, colour, texture, and balance deliberately.\n4. Create the work safely, keeping materials labelled and the space clean.\n5. Improve one part after feedback, such as contrast, spacing, neatness, or focal point.\n\nRubric: excellent work has a clear message, controlled technique, safe material use, visible improvement, and an explanation of design choices.`;
  }
  if (hasAny(text, [/\bmusic\b/, /\bsong\b/, /\brhythm\b/, /\bmelody\b/, /\binstrument\b/, /\bpercussion\b/])) {
    return `Performance model for ${topic.unitTitle}: Practise rhythm, voice, or instrument control.\n\nProcedure:\n1. Clap or tap the pulse before adding words, melody, or instrument sound.\n2. Practise a short phrase slowly, then repeat it at performance speed.\n3. Listen for timing, volume, tone, entry, and ending.\n4. Perform in a group while keeping safe spacing and respectful listening.\n5. Improve one musical feature after peer feedback.\n\nRubric: excellent work keeps steady timing, controls sound, works with the group, improves after feedback, and explains the musical choice.`;
  }
  if (hasAny(text, [/\bdrama\b/, /\brole\b/, /\bscript\b/, /\bscene\b/, /\bacting\b/, /\bvoice\b/])) {
    return `Drama model for ${topic.unitTitle}: Turn an idea into a short scene.\n\nProcedure:\n1. Define the character, setting, problem, and message.\n2. Write or improvise a short dialogue with a beginning, middle, and ending.\n3. Rehearse voice, movement, facial expression, and spacing.\n4. Perform safely without pushing, shouting into someone's ear, or blocking exits.\n5. Improve one moment after feedback, such as clearer speech or stronger emotion.\n\nRubric: excellent work has a clear scene, believable roles, safe movement, audible speech, teamwork, and a message the audience can explain.`;
  }
  if (hasAny(text, [/\bweav/, /\bmacrame\b/, /\bcraft\b/, /\btextile\b/, /\bpaper\b/, /\bcollage\b/, /\bmodel\b/])) {
    return `Craft model for ${topic.unitTitle}: Make a useful or expressive object safely.\n\nProcedure:\n1. Sketch the object and label materials before starting.\n2. Measure, cut, fold, weave, join, or decorate with teacher-approved tools.\n3. Check strength, neatness, balance, pattern, and finishing while working.\n4. Keep sharp tools, glue, dye, and waste controlled.\n5. Improve one feature after feedback and explain the change.\n\nRubric: excellent work is functional or expressive, safely made, neatly finished, improved after feedback, and explained with correct art vocabulary.`;
  }
  return `Creative process model for ${topic.unitTitle}: Choose the art form, practise the technique, and show improvement.\n\nProcedure:\n1. Choose the exact form for this topic: drawing, painting, craft, music, dance, drama, design, exhibition, or physical performance.\n2. Define purpose, audience, material, space, and time.\n3. Practise one core technique slowly before producing the final work.\n4. Ask for feedback on one visible or audible feature.\n5. Improve one part and explain what changed.\n\nRubric: excellent work has a clear idea, safe process, practised technique, visible improvement, teamwork where needed, and an explanation of creative choices.`;
}

function workedExampleFor(subjectTitle, grade, topic) {
  if (subjectTitle === 'Mathematics') {
    return `${mathWorkedExample(topic, grade)}\n\nWorked-example quality check: Explain why the method fits the problem, check the unit or meaning of the answer, and write one similar problem that changes only one condition. This helps you learn the idea instead of memorising the numbers.`;
  }
  if (subjectTitle === 'Kiswahili') {
    return kiswahiliWorkedExample(topic, grade);
  }
  if (subjectTitle === 'English') {
    return englishWorkedExample(topic, grade);
  }
  if (subjectTitle === 'Science and Technology') {
    return scienceWorkedExample(topic, grade);
  }
  if (subjectTitle === 'Social Studies') {
    return socialStudiesWorkedExample(topic, grade);
  }
  if (subjectTitle === 'Agriculture') {
    return agricultureWorkedExample(topic, grade);
  }
  return creativeArtsWorkedExample(topic, grade);
}

function visualRefsFor(topic, pageRole) {
  if (!topic?.visualNeeds?.length) return [];
  return topic.visualNeeds.slice(0, 2).map((_, index) => `${topic.topicId}:${pageRole}:inline-visual-${index + 1}`);
}

function bookLabels(subjectTitle) {
  if (subjectTitle === 'Kiswahili') {
    return {
      titlePage: 'Ukurasa wa Kichwa',
      howToUse: 'Jinsi ya Kutumia Kitabu Hiki',
      learningSkills: 'Stadi za Kujifunza katika Kitabu Hiki',
      toc: 'Yaliyomo',
      chapter: 'Sura',
      lessonOpener: 'Utangulizi wa Somo',
      learnAndExample: 'Jifunze kwa Mfano',
      learn: 'Jifunze',
      workedExample: 'Mfano Uliotatuliwa',
      activity: 'Shughuli',
      activityPractice: 'Shughuli na Mazoezi',
      outcomeCheck: 'Ukaguzi wa Umahiri',
      chapterReview: 'Marudio ya Sura',
      glossary: 'Kamusi Ndogo',
      answerNotes: 'Maelezo ya Majibu na Mwalimu',
      finalProject: 'Mradi wa Mwisho'
    };
  }
  return {
    titlePage: 'Title Page',
    howToUse: 'How To Use This Book',
    learningSkills: 'Learning Skills In This Book',
    toc: 'Table Of Contents',
    chapter: 'Chapter',
    lessonOpener: 'Lesson Opener',
    learnAndExample: 'Learn And Example',
    learn: 'Learn',
    workedExample: 'Worked Example',
    activity: 'Activity',
    activityPractice: 'Activity And Practice',
    outcomeCheck: 'Outcome Check',
    chapterReview: 'Chapter Review',
    glossary: 'Glossary',
    answerNotes: 'Answer And Teacher Notes',
    finalProject: 'Final Project'
  };
}

function pageTitleFor(subjectTitle, unitTitle, key) {
  const labels = bookLabels(subjectTitle);
  let safeUnitTitle = unitTitle ? learnerTitle(subjectTitle, unitTitle, labels[key] || 'Topic') : unitTitle;
  if (safeUnitTitle && isLanguageSubject(subjectTitle)) {
    const maxTitleLength = Math.max(36, 94 - String(labels[key] || '').length);
    if (safeUnitTitle.length > maxTitleLength) {
      safeUnitTitle = trimDanglingConnector(safeUnitTitle.slice(0, maxTitleLength).replace(/\s+\S*$/, '')) || safeUnitTitle.slice(0, maxTitleLength);
    }
  }
  if (key === 'chapter') return `${labels.chapter}: ${safeUnitTitle}`;
  if (key === 'chapterReview') return `${safeUnitTitle}: ${labels.chapterReview}`;
  if (key === 'titlePage' || key === 'howToUse' || key === 'learningSkills' || key === 'toc' || key === 'glossary' || key === 'answerNotes' || key === 'finalProject') {
    return labels[key];
  }
  return `${safeUnitTitle}: ${labels[key]}`;
}

function openingText(subjectTitle, grade, title, mascot) {
  if (subjectTitle === 'Kiswahili') {
    return `${title}\n\nRasimu ya maudhui ya Kenya CBC kwa ukaguzi\n\nKiongozi wa kitabu: ${mascot.species}\n\nRasimu hii imeundwa kutoka data ya mtaala kwa mpango wa mada kwa mada. Inamsaidia mwanafunzi kusoma, kufanya mazoezi, kujadiliana, kuandika, kurekebisha, na kujenga ujasiri kwa Kiswahili.\n\nMichoro ya jalada imeahirishwa hadi maudhui yote yakaguliwe na yawekwe tayari kwa awamu ya majalada.`;
  }
  return `${title}\n\nKenya CBC content draft for review\n\nMascot: ${mascot.species}\n\nThis content-first draft was regenerated from Kitabu curriculum data using a topic-by-topic book plan. It is designed to help learners read, practise, discuss, create, and revise with confidence.\n\nCover artwork is intentionally deferred until all content has passed review and is marked ready-for-cover.`;
}

function howToUseText(subjectTitle, grade) {
  if (subjectTitle === 'Kiswahili') {
    return `Kitabu hiki kinamsaidia mwanafunzi wa Darasa la ${gradeNumber(grade)} kujifunza Kiswahili kupitia maelezo wazi, mifano, shughuli, mazoezi, na marudio.\n\nAnza kwa swali la uchunguzi. Soma maelezo. Chunguza mfano. Fanya shughuli. Jibu maswali ya mazoezi. Rekebisha kazi yako baada ya maoni.\n\n${subjectMethod(subjectTitle)}\n\nKila mada ina mfano wa maisha halisi, kosa la kuepuka, vigezo vya mafanikio, na ukaguzi wa uelewa.`;
  }
  return `This book helps Grade ${gradeNumber(grade)} learners study ${subjectTitle} through clear lessons, worked examples, activities, practice, and revision.\n\nUse the inquiry questions to think first. Read the explanation. Try the guided example. Complete the activity. Answer the practice questions. Correct your work and ask for support where needed.\n\n${subjectMethod(subjectTitle)}\n\nEvery unit has a local example, a misconception to avoid, success criteria, and a check for understanding.`;
}

function learningSkillsText(subjectTitle) {
  if (subjectTitle === 'Kiswahili') {
    return `Kila sura hujenga maarifa, stadi, maadili, ubunifu, mawasiliano, ushirikiano, fikra makini, matumizi bora ya teknolojia, na kujiamini.\n\nUtaona aina hizi za kurasa: Jifunze, Mfano, Shughuli, Mazoezi, Tafakuri, Kiungo cha nyumbani, na Marudio.\n\nNjia nzuri ya kujisomea: soma lengo kwanza, pigia mstari maneno mapya, jaribu mfano kabla ya kusoma jibu lote, jadiliana na mwenzako, na rekebisha kazi baada ya maoni. Maswali ya tafakuri hukusaidia kujua ulichoelewa na kinachohitaji mazoezi zaidi.`;
  }
  return `Each chapter builds knowledge, skills, values, creativity, communication, collaboration, critical thinking, digital literacy, and self-confidence.\n\nLook for these page types: Learn, Example, Activity, Practice, Reflection, Home Link, and Review.\n\nHow to study well: read the goal first, underline new words, try the example before reading the answer, discuss with a partner, and correct your work after feedback. Do not skip the reflection questions. They help you notice what you understand and what needs more practice.`;
}

function tableOfContentsText(subjectTitle, strands) {
  const list = strands.map((strand, i) => {
    const number = normalizeText(strand.strand_number);
    const title = learnerTitle(subjectTitle, strand.strand_title, `${subjectTitle} ${i + 1}`);
    return `${i + 1}. ${number ? `${number} ` : ''}${title}`;
  }).join('\n');
  if (subjectTitle === 'Kiswahili') {
    return `Tumia yaliyomo kupanga masomo yako. Anza na sura ya kwanza, lakini rudi kwenye kurasa zilizotangulia unapohitaji marudio.\n\n${list}\n\nBaada ya kila sura, fanya marudio ya sura kabla ya kuendelea. Mwishoni mwa kitabu, tumia kamusi ndogo, maelezo ya majibu, na mradi wa mwisho kurejelea somo lote.`;
  }
  return `Use this table of contents to plan your study. Start with the first chapter, but return to earlier pages whenever you need revision.\n\n${list}\n\nAfter each chapter, complete the chapter review before moving forward. At the end of the book, use the glossary, answer notes, and final project to revise the whole subject.`;
}

function activityFor(subjectTitle, grade, topic, questions) {
  const unitTitle = topic.unitTitle;
  const criteria = (topic.successCriteria || successCriteriaFor(subjectTitle)).map(item => `   - ${item}`).join('\n');
  const inquiry = questions[0] || `How can ${unitTitle.toLowerCase()} help solve a real problem?`;
  if (subjectTitle === 'Mathematics') {
    return `Activity for ${unitTitle}: Work with a partner and use a concrete model before writing symbols.\n\nInquiry question: ${inquiry}\n\n1. Choose a realistic situation from school, market, farming, transport, building, sport, or class records.\n2. Write the quantities or relationships that are known.\n3. Represent the situation with a table, drawing, number line, expression, equation, graph, or labelled diagram.\n4. Solve one worked example together. Each learner must explain one step aloud.\n5. Create a similar question with changed numbers, then solve it independently.\n6. Compare answers and correct any place value, unit, operation, or reasoning error.\n\nSuccess criteria:\n${criteria}\n\nHome link: Ask someone at home where this mathematics is used and write the example as a short problem with a solution.`;
  }
  if (subjectTitle === 'Kiswahili') {
    return `Shughuli ya ${unitTitle}: Fanyeni kazi wawili wawili au katika kikundi kidogo.\n\nSwali la uchunguzi: ${inquiry}\n\n1. Soma au sikiliza mfano uliotolewa.\n2. Taja msamiati muhimu na maana yake.\n3. Tunga sentensi, mazungumzo, au aya fupi inayotumia wazo hili.\n4. Soma kazi yako kwa mwenzako na sikiliza maoni.\n5. Rekebisha tahajia, sarufi, mpangilio, na maana.\n6. Eleza kwa kifupi jambo moja uliloboresha.\n\nVigezo vya mafanikio:\n${criteria}\n\nKiungo cha nyumbani: Uliza mtu wa nyumbani mfano mmoja unaohusiana na somo hili, kisha uandike sentensi mbili kwa Kiswahili.`;
  }
  if (subjectTitle === 'Science and Technology') {
    return `Activity for ${unitTitle}: Plan a safe observation or investigation.\n\nInquiry question: ${inquiry}\n\n1. State the question you want to answer.\n2. List safe materials and one safety rule.\n3. Draw a labelled setup or observation table before starting.\n4. Record at least three observations. Do not write guesses as facts.\n5. Compare evidence with a partner and discuss what the evidence means.\n6. Write a short conclusion that begins, "The evidence shows..."\n\nSuccess criteria:\n${criteria}\n\nHome link: Look for a safe related example at home or in the community. Record what you observed without disturbing people, animals, plants, or devices.`;
  }
  if (subjectTitle === 'Social Studies') {
    return `Activity for ${unitTitle}: Build an evidence card for a real Kenya case.\n\nInquiry question: ${inquiry}\n\n1. Name the exact place, institution, law, physical feature, community group, or event studied in this lesson.\n2. Write three facts from the lesson, map, class text, teacher explanation, or approved source.\n3. Add one "why it matters" sentence linked to citizenship, fairness, safety, heritage, economy, or environment.\n4. Add one responsible action a learner, family, school, county office, or community can take.\n5. Check that the answer teaches the example instead of saying only "my county" or "my community".\n6. Present the card and answer one question from a partner.\n\nSuccess criteria:\n${criteria}\n\nHome link: Ask an adult for one fact about the place, institution, or issue. Record the fact and say whether it confirms or adds to the lesson.`;
  }
  if (subjectTitle === 'Agriculture') {
    return `Activity for ${unitTitle}: Complete a supervised agriculture procedure card.\n\nInquiry question: ${inquiry}\n\n1. State the purpose of the task.\n2. List exact tools, materials, living things, and protective items needed.\n3. Write the steps in order, including what the teacher or adult must supervise.\n4. Name at least three hazards and the safety action for each hazard.\n5. Record what should be observed before, during, and after the task.\n6. Judge quality using practical criteria: safety, hygiene, care for living things, correct method, and useful records.\n\nSuccess criteria:\n${criteria}\n\nHome link: Observe a related farm, garden, kitchen, storage, or animal-care practice. Record what was done safely and one improvement.`;
  }
  if (subjectTitle === 'Creative Arts') {
    return `Activity for ${unitTitle}: Use a safe creative-process checklist.\n\nInquiry question: ${inquiry}\n\n1. Plan the purpose, audience, material, space, and time.\n2. Identify hazards such as sharp tools, dyes, hot wax, dust, water, slippery surfaces, collision, or voice strain.\n3. Practise the skill slowly before producing the final artwork, performance, or movement.\n4. Ask for feedback on one visible or audible feature.\n5. Improve one part and explain what changed.\n6. Judge quality using technique, safety, creativity, finish, teamwork, and message.\n\nSuccess criteria:\n${criteria}\n\nHome link: Find a safe artwork, song, dance, craft, game, or performance example. Describe one technique and one safety rule.`;
  }
  return `Activity for ${unitTitle}: Work with a partner or small group.\n\nInquiry question: ${inquiry}\n\n1. Discuss what you already know and what you need to find out.\n2. Choose a real example from school, home, community, farm, market, map work, reading, performance, or creative work.\n3. Use available materials, books, maps, objects, pictures, interviews, or digital resources responsibly.\n4. Record three findings with enough detail for another learner to understand.\n5. Present your findings and answer one question from a peer.\n6. Improve your work using the feedback.\n\nSuccess criteria:\n${criteria}\n\nHome link: Ask someone at home for an example related to ${unitTitle.toLowerCase()} and write two useful sentences about it.`;
}

function kiswahiliOutcomeModel(topic) {
  if (keywordMatch(topic, /vitendawili/i)) {
    return `Mfano wa kazi: Tega kitendawili kimoja, toa jibu, kisha eleza neno moja lililokusaidia kupata maana. Hakikisha kitendawili kinaanza kwa njia inayokubalika darasani na jibu linaeleweka.`;
  }
  if (keywordMatch(topic, /matamshi|sauti|silabi/i)) {
    return `Mfano wa kazi: Chagua jozi moja ya sauti, kama p/b au t/d. Tunga silabi mbili kwa kila sauti, zisome kwa sauti, kisha andika neno moja linalotumia kila silabi.`;
  }
  if (keywordMatch(topic, /mazungumzo|kusikiliza|kuzungumza/i)) {
    return `Mfano wa kazi: Andika mazungumzo ya mistari minne kati ya wanafunzi wawili. Kila mzungumzaji atumie salamu, jibu la heshima, na sentensi moja inayohusiana na mada.`;
  }
  if (keywordMatch(topic, /insha|uandishi|barua|aya|ripoti/i)) {
    return `Mfano wa kazi: Andika aya ya sentensi tano. Sentensi ya kwanza itaje wazo kuu, sentensi tatu zitoe maelezo, na sentensi ya mwisho ihitimishe kwa ujumbe wazi.`;
  }
  if (keywordMatch(topic, /sarufi|nomino|vitenzi|vivumishi|ngeli|sentensi/i)) {
    return `Mfano wa kazi: Andika sentensi mbili zinazotumia kanuni ya sarufi ya mada hii. Pigia mstari neno kuu, kisha eleza kwa kifupi kwa nini matumizi yake ni sahihi.`;
  }
  return `Mfano wa kazi: Tumia wazo la mada hii katika sentensi, mazungumzo, au kifungu kifupi. Onyesha msamiati mpya, maana, na marekebisho uliyofanya baada ya kusoma tena.`;
}

function outcomeCheckFor(subjectTitle, topic, outcome) {
  const unitTitle = topic.unitTitle;
  if (subjectTitle === 'Mathematics') {
    return `Outcome: ${outcome.text}\n\nShow mastery with a complete solution.\n\nConcrete task:\n${mathTaskFor(topic, 1, outcome.text)}\n\nSteps:\n1. State what is known and what must be found.\n2. Choose the best representation: drawing, table, number line, expression, equation, graph, or calculation.\n3. Solve step by step and label the final answer.\n4. Check the answer by estimation, substitution, reverse operation, or unit check.\n5. Explain one likely mistake and how to avoid it.\n\nRubric:\n- 4: method, working, answer, units, and check are all correct.\n- 3: method and answer are mostly correct but one check or label is weak.\n- 2: some correct setup is shown but steps are incomplete.\n- 1: the answer is guessed or working cannot be followed.\n\nEvidence of mastery: another learner can follow your working without asking what happened between steps.`;
  }
  if (subjectTitle === 'Kiswahili') {
    return `Ukaguzi wa umahiri katika ${unitTitle}\n\nLengo la kujifunza: ${outcome.text}.\n\n${kiswahiliOutcomeModel(topic)}\n\nHatua za kufanya:\n1. Eleza lengo hili kwa maneno yako mwenyewe.\n2. Fanya kazi ya mfano inayolingana na mada, si kazi ya jumla.\n3. Tumia msamiati sahihi wa Kiswahili na sentensi zilizo wazi.\n4. Soma kazi yako tena kwa sauti ya chini ili kusikia makosa ya matamshi, tahajia, sarufi, au mpangilio.\n5. Andika kosa moja linaloweza kutokea na namna ya kuliepuka.\n\nUshahidi wa umahiri: msomaji au msikilizaji anaelewa ujumbe wako, anaona mfano unaofaa, na anaweza kutaja jambo moja uliloboresha baada ya maoni.`;
  }
  if (subjectTitle === 'Science and Technology') {
    return `Outcome: ${outcome.text}\n\nShow mastery with topic evidence.\n\nTask: ${scienceOutcomeTask(topic, outcome.text)}\n\nSteps:\n1. Define the key term or process in one accurate sentence.\n2. Complete the diagram, table, model, comparison, calculation, or investigation plan required by the task.\n3. Add labels, units, variables, or safety notes where they matter.\n4. Write a conclusion that uses the words "The evidence shows..." or "The model shows..."\n5. Name one common misconception and correct it.\n\nEvidence of mastery: your work answers the exact outcome in ${unitTitle}, uses correct science vocabulary, and connects evidence to explanation.`;
  }
  return `Outcome: ${outcome.text}\n\nShow mastery with evidence.\n\n1. Explain the outcome in your own words.\n2. Give one local, school, home, community, practical, or text-based example.\n3. Complete a short task that proves you can apply the idea in ${unitTitle}.\n4. Use correct vocabulary and include a reason, observation, example, step, or result.\n5. Write one mistake a learner might make and how to avoid it.\n6. Ask a peer, teacher, or parent to check whether your answer is clear.\n\nEvidence of mastery: your work answers the exact outcome, gives a relevant example, and shows a correction after feedback.`;
}

function buildPages(snapshot, grade, subject, bookPlan) {
  const bookId = `kitabu-quest-grade-${gradeNumber(grade)}-${subject.slug}`;
  const title = `KITABU QUEST Grade ${gradeNumber(grade)} ${subject.title}`;
  const pages = [];
  let index = 1;
  const rows = snapshot.legacy.filter(row => row.sub_strand_id);
  const strands = [...new Map(snapshot.legacy.map(row => [row.strand_id, row])).values()].filter(row => row.strand_id);
  const outcomes = flattenOutcomes(rows);
  const topicsByParentUnitId = new Map();
  for (const topic of bookPlan.topics) {
    const key = topic.parentSubStrandId || topic.subStrandId;
    topicsByParentUnitId.set(key, [...(topicsByParentUnitId.get(key) || []), topic]);
  }
  const compactMode = rows.length >= 35 || strands.length >= 20;
  const ultraCompactMode = rows.length >= 55;

  const add = (pageTitle, content, refs = {}) => {
    pages.push(makePage(bookId, index, pageTitle, content, refs));
    index += 1;
  };

  add(
    pageTitleFor(subject.title, null, 'titlePage'),
    openingText(subject.title, grade, title, MASCOTS[subject.title]),
    { pageType: 'front-matter', difficulty: 'support' }
  );
  add(
    pageTitleFor(subject.title, null, 'howToUse'),
    howToUseText(subject.title, grade),
    { pageType: 'front-matter', difficulty: 'support' }
  );
  add(
    pageTitleFor(subject.title, null, 'learningSkills'),
    learningSkillsText(subject.title),
    { pageType: 'front-matter', difficulty: 'support' }
  );
  add(
    pageTitleFor(subject.title, null, 'toc'),
    tableOfContentsText(subject.title, strands),
    { pageType: 'front-matter', difficulty: 'support' }
  );

  for (const strand of strands) {
    const unitRows = rows.filter(row => row.strand_id === strand.strand_id);
    if (!compactMode) {
      add(
        pageTitleFor(subject.title, strand.strand_title, 'chapter'),
        subject.title === 'Kiswahili'
          ? `Katika sura hii utajifunza ${learnerTitle(subject.title, strand.strand_title, subject.title)}.\n\nSwali la mwanzo: Unajua nini tayari kuhusu mada hii kutoka nyumbani, shuleni, au katika jamii?\n\nMada za sura:\n${unitRows.map(row => `- ${normalizeText(row.sub_strand_number)} ${learnerTitle(subject.title, row.sub_strand_title, row.strand_title || subject.title)}`).join('\n') || '- Sura hii ina mada moja kuu.'}\n\nKabla ya kuanza, andika mambo mawili unayoyajua na swali moja unalotaka kujibiwa. Unaposoma, kusanya mifano kutoka maisha ya kila siku. Mwishoni mwa sura, rudi kwenye swali lako na uboreshe jibu kwa msamiati, mifano, na ushahidi kutoka masomoni.`
          : `In this chapter you will study ${learnerTitle(subject.title, strand.strand_title, subject.title)}.\n\nInquiry starter: What do you already know about this topic from home, school, or your community?\n\nChapter units:\n${unitRows.map(row => `- ${normalizeText(row.sub_strand_number)} ${learnerTitle(subject.title, row.sub_strand_title, row.strand_title || subject.title)}`).join('\n') || '- This chapter has one focused learning unit.'}\n\nBefore you begin, write two things you already know and one question you want to answer. As you study, collect examples from daily life. At the end of the chapter, return to your question and improve your answer using new vocabulary, examples, and evidence from the lessons.`,
        { strandIds: [strand.strand_id], pageType: 'chapter-opener', difficulty: 'support' }
      );
    }

    for (const row of unitRows) {
      const fallbackUnitTitle = cleanDisplayText(row.sub_strand_title || row.strand_title, subject.title);
      const fallbackOutcomes = (Array.isArray(row.outcomes) ? row.outcomes : []).map((outcome, i) => ({
        id: outcome.id || `${row.sub_strand_id}-outcome-${i + 1}`,
        text: cleanLanguageOutcomeText(subject.title, outcome.text || outcome.statement || String(outcome), `explain and apply ${fallbackUnitTitle.toLowerCase()}`)
      })).filter(outcome => outcome.text && outcome.text !== '[object Object]');
      const fallbackQuestions = (Array.isArray(row.inquiry_questions) ? row.inquiry_questions : []).map(question => cleanQuestionText(question.text || question.question || String(question))).filter(Boolean);
      const topicsToRender = topicsByParentUnitId.get(row.sub_strand_id) || [{
        subStrandId: row.sub_strand_id,
        unitTitle: fallbackUnitTitle,
        learningOutcomes: fallbackOutcomes,
        inquiryQuestions: fallbackQuestions,
        localContext: localContextFor(subject.title, fallbackUnitTitle),
        misconceptions: [commonMisconceptions(subject.title, fallbackUnitTitle)],
        successCriteria: successCriteriaFor(subject.title),
        keyVocabulary: [fallbackUnitTitle, 'evidence', 'example', 'practice', 'reflection'],
        sourceRefs: sourceRefsFromSnapshot(snapshot)
      }];

      for (const topic of topicsToRender) {
        const unitTitle = learnerTitle(subject.title, topic.unitTitle || fallbackUnitTitle, fallbackUnitTitle);
        const renderTopic = {
          ...topic,
          unitTitle,
          localContext: localContextFor(subject.title, unitTitle),
          keyVocabulary: keyVocabularyFor(unitTitle, unitTitle, subject.title)
        };
        const unitOutcomes = (Array.isArray(topic.learningOutcomes) ? topic.learningOutcomes : []).map((outcome, i) => ({
          id: outcome.id || `${topic.subStrandId || row.sub_strand_id}-outcome-${i + 1}`,
          text: cleanLanguageOutcomeText(subject.title, outcome.text || outcome.statement || String(outcome), `explain and apply ${unitTitle.toLowerCase()}`)
        })).filter(outcome => outcome.text && outcome.text !== '[object Object]');
        const questions = Array.isArray(topic.inquiryQuestions) && topic.inquiryQuestions.length ? topic.inquiryQuestions : fallbackQuestions;
        const focusLine = topicFocusLine(subject.title, renderTopic, unitOutcomes, questions);
        const refs = {
          strandIds: [row.strand_id],
          unitIds: [topic.subStrandId || row.sub_strand_id],
          parentUnitIds: [row.sub_strand_id],
          outcomeIds: unitOutcomes.map(outcome => outcome.id),
          sourceRefs: topic.sourceRefs || sourceRefsFromSnapshot(snapshot),
          imageRefs: visualRefsFor(topic, 'unit')
        };

        add(
          pageTitleFor(subject.title, unitTitle, 'lessonOpener'),
          subject.title === 'Kiswahili'
            ? `${focusLine}\n\nSomo hili linaanza na ${localContextFor(subject.title, unitTitle)}.\n\nUtajifunza ${learnerPhrase(subject.title, unitTitle, 'stadi hii')} kwa kusoma, kujadiliana, kuandika, na kurekebisha kazi yako.\n\nUnapaswa kuweza:\n${unitOutcomes.map(outcome => `- ${outcome.text}`).join('\n') || '- Eleza na tumia wazo kuu katika mada hii.'}\n\nFikiria maswali haya unaposoma:\n${questions.map(question => `- ${question}`).join('\n') || '- Unaweza kutazama, kuuliza, au kujaribu nini kabla ya kujifunza wazo jipya?'}\n\nAndika jambo moja unalolijua tayari na swali moja unalotaka somo hili lijibu.`
            : `${focusLine}\n\nThis lesson begins with ${localContextFor(subject.title, unitTitle)}.\n\nYou will practise ${learnerPhrase(subject.title, unitTitle, 'this skill')} through reading, discussion, writing, and correction.\n\nWhat you should be able to do:\n${unitOutcomes.map(outcome => `- ${outcome.text}`).join('\n') || '- Explain and apply the main idea in this unit.'}\n\nThink about these questions as you read:\n${questions.map(question => `- ${question}`).join('\n') || '- What can you observe, ask, or try before learning the new idea?'}\n\nWrite one thing you already know and one question you want this lesson to answer.`,
          { ...refs, pageType: 'lesson-opener', difficulty: 'support' }
        );

        if (ultraCompactMode) {
          add(
            pageTitleFor(subject.title, unitTitle, 'learnAndExample'),
            `${focusLine}\n\n${explainTopic(subject.title, grade, renderTopic)}\n\n${inlineVisualFor(subject.title, renderTopic)}\n\n${workedExampleFor(subject.title, grade, renderTopic)}\n\n${subject.title === 'Kiswahili' ? 'Msamiati muhimu' : 'Key words'}:\n${(renderTopic.keyVocabulary || [unitTitle, 'evidence', 'example', 'practice', 'reflection']).map(term => `- ${term}`).join('\n')}`,
            { ...refs, pageType: 'learn-example', difficulty: 'core' }
          );
        } else {
          add(
            pageTitleFor(subject.title, unitTitle, 'learn'),
            subject.title === 'Kiswahili'
              ? `${focusLine}\n\n${explainTopic(subject.title, grade, renderTopic)}\n\n${inlineVisualFor(subject.title, renderTopic)}\n\nMbinu ya Kiswahili: ${subjectMethod(subject.title)}\n\nMsamiati muhimu:\n${(renderTopic.keyVocabulary || [unitTitle, 'ushahidi', 'mfano', 'mazoezi', 'tafakuri']).map(term => `- ${term}`).join('\n')}\n\nEleza wazo kwa maneno yako kabla ya kufanya shughuli.`
              : `${focusLine}\n\n${explainTopic(subject.title, grade, renderTopic)}\n\n${inlineVisualFor(subject.title, renderTopic)}\n\nMethod for ${subject.title}: ${subjectMethod(subject.title)}\n\nKey words:\n${(renderTopic.keyVocabulary || [unitTitle, 'evidence', 'example', 'practice', 'reflection']).map(term => `- ${term}`).join('\n')}\n\nExplain the idea in your own words before attempting the activities.`,
            { ...refs, pageType: 'explanation', difficulty: 'core' }
          );

          add(
            pageTitleFor(subject.title, unitTitle, 'workedExample'),
            `${focusLine}\n\n${workedExampleFor(subject.title, grade, renderTopic)}`,
            { ...refs, pageType: 'worked-example', difficulty: 'guided' }
          );
        }

        if (!compactMode) {
          add(
            pageTitleFor(subject.title, unitTitle, 'activity'),
            `${focusLine}\n\n${activityFor(subject.title, grade, renderTopic, questions)}`,
            { ...refs, pageType: 'activity', difficulty: 'guided' }
          );
        }

        add(
          pageTitleFor(subject.title, unitTitle, 'activityPractice'),
          `${focusLine}\n\n${practiceBlockFor(subject.title, unitTitle, unitOutcomes, renderTopic, compactMode)}`,
          { ...refs, pageType: 'practice', difficulty: 'guided' }
        );

        const outcomeChecks = compactMode ? [] : unitOutcomes.slice(0, Math.max(1, Math.min(3, unitOutcomes.length)));
        for (const outcome of outcomeChecks) {
          add(
            pageTitleFor(subject.title, unitTitle, 'outcomeCheck'),
            outcomeCheckFor(subject.title, topic, outcome),
            { ...refs, outcomeIds: [outcome.id], pageType: 'assessment', difficulty: 'independent' }
          );
        }
      }
    }

    if (!compactMode) {
      const reviewTitle = learnerTitle(subject.title, strand.strand_title, subject.title);
      const reviewCode = normalizeText(strand.strand_number || '').replace(/\s+/g, ' ');
      const reviewFocus = reviewCode ? `${reviewCode} ${reviewTitle}` : reviewTitle;
      add(
        pageTitleFor(subject.title, strand.strand_title, 'chapterReview'),
        subject.title === 'Kiswahili'
          ? `Marudio ya sura: ${reviewFocus}.\n\n1. Andika maneno matano muhimu kutoka sura hii na ueleze maana yake.\n2. Chagua mada mbili na ulinganishe ulichojifunza.\n3. Tengeneza bango, mazungumzo, jedwali, kifungu, au mpango wa uwasilishaji unaofundisha sura hii.\n4. Jibu tena swali moja la uchunguzi. Boresha jibu lako la kwanza kwa kutumia msamiati na ushahidi mpya.\n5. Pima ujasiri wako: juu, wastani, au nahitaji mazoezi zaidi.`
          : `Chapter review focus: ${reviewFocus}.\n\n1. Write five key words from this chapter and explain each one.\n2. Choose two units and compare what you learned.\n3. Create one poster, chart, dialogue, model, map, or worked solution that teaches this chapter.\n4. Answer one inquiry question again. Improve your first answer using what you now know.\n5. Rate your confidence: high, medium, or needs practice.`,
        { strandIds: [strand.strand_id], pageType: 'review', difficulty: 'independent' }
      );
    }
  }

  let reviewSet = 1;
  const target = targetPageCount(subject.title, outcomes.length, rows.length);
  const maxReviewClinics = Math.max(4, Math.min(12, Math.ceil(rows.length * 0.2)));
  while (pages.length < target && reviewSet <= maxReviewClinics) {
    const row = rows[(reviewSet - 1) % Math.max(1, rows.length)];
    const rowTopics = row ? (topicsByParentUnitId.get(row.sub_strand_id) || []) : [];
    const topic = rowTopics.length ? rowTopics[(reviewSet - 1) % rowTopics.length] : null;
    const unitTitle = normalizeText(topic?.unitTitle || row?.sub_strand_title || subject.title);
    const practiceContexts = subject.title === 'Kiswahili'
      ? [
          `mfano wa nyumbani au shuleni unaohusiana na ${unitTitle}`,
          `mfano wa jamii unaohusiana na ${unitTitle}`,
          `majadiliano na mwenzako kuhusu ${unitTitle}`,
          `kazi ndogo ya kusoma, kuandika, au kuzungumza kuhusu ${unitTitle}`
        ]
      : [
          `home or school example connected to ${unitTitle}`,
          `county or community example connected to ${unitTitle}`,
          `partner discussion about ${unitTitle}`,
          `small project or observation linked to ${unitTitle}`
        ];
    const practiceContext = practiceContexts[(reviewSet - 1) % practiceContexts.length];
    add(
      `${learnerTitle(subject.title, unitTitle, subject.title)}: ${subject.title === 'Kiswahili' ? `Kliniki ya Marudio ${reviewSet}` : `Review Clinic ${reviewSet}`}`,
      subject.title === 'Kiswahili'
        ? `Tumia kliniki hii kuimarisha mada halisi kutoka kitabu hiki.\n\nMuktadha wa mazoezi: ${practiceContext}.\n\n1. Soma tena somo la ${unitTitle} na upigie mstari wazo kuu.\n2. Andika muhtasari wa sentensi tano au hatua tano.\n3. Tunga swali moja la maarifa.\n4. Tunga swali moja la stadi, hoja, au matumizi.\n5. Jibu maswali yote mawili.\n6. Linganisha kazi yako na kigezo hiki: ${(topic?.successCriteria || successCriteriaFor(subject.title))[(reviewSet - 1) % successCriteriaFor(subject.title).length]}.\n7. Badilishana maswali na mwenzako kisha jadilini marekebisho.\n\nChangamoto: Eleza kazi ya maisha halisi kutoka nyumbani, shuleni, maktabani, au katika jamii inayotumia wazo hili.`
        : `Use this review clinic to strengthen a real unit from the book.\n\nPractice context: ${practiceContext}.\n\n1. Re-read the lesson on ${unitTitle} and underline the main idea.\n2. Write a five-sentence or five-step summary.\n3. Make one question that tests knowledge.\n4. Make one question that tests skill, reasoning, or application.\n5. Solve or answer both questions.\n6. Check your work against this criterion: ${(topic?.successCriteria || successCriteriaFor(subject.title))[(reviewSet - 1) % successCriteriaFor(subject.title).length]}.\n7. Exchange your questions with a partner and discuss corrections.\n\nChallenge: Describe a real-life task from your home, school, farm, market, field, library, or community that uses this idea.`,
      row
        ? {
            strandIds: [row.strand_id],
            unitIds: [topic?.subStrandId || row.sub_strand_id],
            parentUnitIds: [row.sub_strand_id],
            outcomeIds: topic?.learningOutcomes.map(outcome => outcome.id) || [],
            sourceRefs: topic?.sourceRefs || sourceRefsFromSnapshot(snapshot),
            imageRefs: visualRefsFor(topic, 'review'),
            pageType: 'review',
            difficulty: 'independent'
          }
        : { sourceRefs: sourceRefsFromSnapshot(snapshot), pageType: 'review', difficulty: 'independent' }
    );
    reviewSet += 1;
  }

  add(pageTitleFor(subject.title, null, 'glossary'), glossaryFor(subject.title, rows), { pageType: 'glossary', difficulty: 'support' });
  add(pageTitleFor(subject.title, null, 'answerNotes'), answerNotes(subject.title), { pageType: 'answer-notes', difficulty: 'support' });
  add(pageTitleFor(subject.title, null, 'finalProject'), finalProjectFor(subject.title), { pageType: 'project', difficulty: 'independent' });

  return pages;
}

function targetPageCount(subjectTitle, outcomeCount, unitCount) {
  const base = {
    English: 160,
    Kiswahili: 150,
    Mathematics: 140,
    'Science and Technology': 130,
    'Social Studies': 140,
    Agriculture: 120,
    'Creative Arts': 120
  }[subjectTitle] || 120;
  return Math.max(base, Math.min(240, 8 + unitCount * 6 + Math.ceil(outcomeCount * 0.65)));
}

function glossaryFor(subjectTitle, rows) {
  const terms = [...new Set(rows
    .slice(0, 30)
    .map(row => glossaryTermFor(row, subjectTitle))
    .filter(term => term && !isBadGlossaryTerm(term))
  )];
  if (subjectTitle === 'Kiswahili') {
    return `Tumia kamusi hii ndogo kurejelea maneno muhimu ya Kiswahili.\n\n${terms.map(term => `- ${term}: ${glossaryDefinitionFor(subjectTitle, term)}`).join('\n')}\n\nOngeza maneno matano mapya kutoka masomoni, kisha andika maana na sentensi moja kwa kila neno.`;
  }
  return `Use this glossary to revise important words in ${subjectTitle}.\n\n${terms.map(term => `- ${term}: ${glossaryDefinitionFor(subjectTitle, term)}`).join('\n')}\n\nAdd five more words from your lessons, then write a meaning and one correct example sentence or worked example for each word.`;
}

function glossaryTermFor(row, subjectTitle) {
  const outcomeItems = Array.isArray(row.outcomes) ? row.outcomes : [];
  const outcomeTexts = outcomeItems.map(item => ({ text: item.text || item.statement || String(item) }));
  const candidates = [
    row.sub_strand_title,
    row.strand_title,
    shortOutcomeLabel(outcomeTexts, ''),
    fallbackUnitTitle(subjectTitle, row, [], 0)
  ];
  for (const candidate of candidates) {
    const term = isLanguageSubject(subjectTitle) ? learnerTitle(subjectTitle, candidate, '') : cleanDisplayText(candidate, '');
    if (term && !isBadGlossaryTerm(term)) return term;
  }
  return '';
}

function glossaryDefinitionFor(subjectTitle, term) {
  const text = normalizeText(term).toLowerCase();
  if (subjectTitle === 'Kiswahili') {
    if (/ufahamu|kusoma|fasihi|hadithi|riwaya|ushairi|tamthilia/.test(text)) return 'Kusoma au kuchambua matini kwa kutafuta wazo kuu, ushahidi, wahusika, mandhari, na ujumbe.';
    if (/sarufi|ngeli|sentensi|vitenzi|nomino|vivumishi/.test(text)) return 'Kanuni za lugha zinazosaidia maneno na sentensi zipatane na kutoa maana sahihi.';
    if (/uandishi|insha|barua|ripoti|hotuba|aya/.test(text)) return 'Kupanga mawazo, kuandika kwa mpangilio, na kuhakiki tahajia, sarufi, na maana.';
    if (/mazungumzo|kusikiliza|kuzungumza|matamshi/.test(text)) return 'Stadi za kusikiliza kwa makini, kutamka wazi, kujibu kwa heshima, na kutoa hoja yenye mfano.';
    return `Dhana ya somo inayohitaji maana wazi, mfano unaofaa, na matumizi sahihi katika sentensi au kifungu.`;
  }
  if (subjectTitle === 'English') {
    if (/pronunciation|vocabulary|sounds?/.test(text)) return 'A speaking and word-use skill: say the word clearly, understand its meaning, and use it correctly in a sentence.';
    if (/listening|speaking|oral|audio|dialogue|poem|story/.test(text)) return 'A communication skill: listen for the main idea and details, then respond clearly with a reason or example.';
    if (/reading|comprehension|literature|novel|drama/.test(text)) return 'A reading skill: identify meaning, use evidence from the text, and explain how details support the answer.';
    if (/grammar|sentence|tense|noun|verb|adjective|punctuation/.test(text)) return 'A language-control skill: use correct word forms, sentence structure, and punctuation so meaning is clear.';
    if (/writing|composition|letter|report|summary|paragraph|notice|speech/.test(text)) return 'A writing skill: plan for purpose and audience, organise ideas, and edit spelling, grammar, punctuation, and meaning.';
    return 'A language topic that should be practised through reading, speaking, listening, writing, and editing in a real task.';
  }
  if (subjectTitle === 'Mathematics') return 'A mathematics idea to model with a diagram, table, expression, equation, graph, construction, or calculation before checking the answer.';
  if (subjectTitle === 'Science and Technology') return 'A science idea to explain with observation, labelled diagrams, safe investigation, evidence, and a conclusion.';
  if (subjectTitle === 'Social Studies') return 'A place, people, citizenship, map, history, culture, or environment idea that should be explained with a named example and evidence.';
  if (subjectTitle === 'Agriculture') return 'A practical agriculture idea that needs tools or materials, safe steps, care for living things, observations, and records.';
  if (subjectTitle === 'Creative Arts') return 'A creative skill or process that needs planning, safe practice, technique, improvement, and explanation of choices.';
  return 'A key idea from the book that should be explained with a clear definition and example.';
}

function subjectRubric(subjectTitle) {
  if (subjectTitle === 'Kiswahili') {
    return `\n\nRubric ya kujihakiki:\n- 4: Jibu linajibu swali moja kwa moja, lina ushahidi au mfano, linatumia Kiswahili sanifu, na linaonyesha marekebisho.\n- 3: Jibu ni sahihi kwa jumla lakini ushahidi, mpangilio, au uhakiki unahitaji kuimarishwa.\n- 2: Jibu lina wazo fulani sahihi lakini ni fupi, la jumla, au lina makosa yanayozuia maana.\n- 1: Jibu halijibu swali au halina mfano unaoweza kuhakikiwa.\n\nNjia ya kusahihisha: soma swali tena, pigia mstari kitenzi cha kazi, tafuta ushahidi, andika jibu fupi, kisha boresha sentensi moja baada ya maoni.`;
  }
  return `\n\nRubric for self-checking:\n- 4: The answer addresses the exact question, uses subject vocabulary correctly, gives evidence or working, and includes a useful check or correction.\n- 3: The main answer is correct but one part needs stronger evidence, clearer working, better labels, or a fuller explanation.\n- 2: Some understanding is shown, but the answer is incomplete, too general, or hard to follow.\n- 1: The answer is guessed, off topic, or missing the evidence needed for the task.\n\nCorrection routine: reread the command word, underline the key data or evidence, improve one weak step, and write one sentence explaining why the final answer is reasonable.`;
}

function answerNotes(subjectTitle) {
  if (subjectTitle === 'Kiswahili') {
    return `Maswali mengi katika kitabu hiki ni mazoezi ya kutumia lugha. Jibu zuri linapaswa:\n\n- kujibu swali husika moja kwa moja;\n- kutumia msamiati sahihi wa Kiswahili;\n- kuwa na mfano, sababu, ushahidi, au maelezo yanayotosha;\n- kuandikwa au kusemwa kwa mpangilio unaoeleweka;\n- kuonyesha marekebisho baada ya maoni.\n\nKwa kazi za kusoma, tumia ushahidi kutoka kifungu. Kwa uandishi, hakiki tahajia, sarufi, alama za uakifishaji, mpangilio, na maana. Kwa mazungumzo, zingatia matamshi, sauti, heshima, na kusikiliza.\n\nMwongozo wa majibu: maswali ya ufahamu yanahitaji hoja, ushahidi, na maelezo. Maswali ya sarufi yanahitaji sentensi sahihi na sababu fupi. Maswali ya uandishi yanahitaji kusudi, hadhira, mpangilio, na uhakiki. Maswali ya mazungumzo yanahitaji sauti, heshima, na mfano unaoeleweka.${subjectRubric(subjectTitle)}`;
  }
  if (subjectTitle === 'Mathematics') {
    return `A strong Mathematics answer should:\n\n- state what is known and what must be found;\n- choose a suitable model, table, diagram, expression, equation, graph, or calculation;\n- show working step by step without hidden jumps;\n- label the final answer and check it in context;\n- explain one possible error and how to avoid it.\n\nFor proof, algebra, geometry, data, and measurement work, the method matters as much as the final answer. A learner should be able to read the working and understand why each step is valid.\n\nAnswer-key guide: calculation tasks should include the formula or rule used, substitution, simplified working, units, and a check. Geometry tasks should include a labelled diagram or named theorem. Algebra tasks should include expansion, collection of like terms, solving steps, and substitution checks. Data tasks should show totals, counts, scale, and interpretation.${subjectRubric(subjectTitle)}`;
  }
  if (subjectTitle === 'Science and Technology') {
    return `A strong Science and Technology answer should:\n\n- answer the exact question asked;\n- separate observation from explanation;\n- name materials, variables, safety checks, or data sources where needed;\n- use labelled diagrams, tables, or step-by-step procedures when useful;\n- draw a conclusion from evidence, not from guessing.\n\nFor investigations, good answers include a question, method, results, conclusion, and one limit or improvement. For technology tasks, good answers explain the design choice and how it solves the problem safely.\n\nAnswer-key guide: a complete science answer names the concept, shows evidence in a labelled sketch/table/model, explains the pattern, includes safety where relevant, and ends with a conclusion beginning from the evidence. Wrong answers often mix observation with opinion or leave out variables.${subjectRubric(subjectTitle)}`;
  }
  if (subjectTitle === 'English') {
    return `A strong English answer should:\n\n- match the purpose and audience;\n- use evidence from the passage, discussion, task, or real context;\n- organise ideas into clear sentences and paragraphs;\n- choose words that fit the tone;\n- edit spelling, punctuation, grammar, and meaning after feedback.\n\nFor reading questions, use point, evidence, and explanation. For writing tasks, plan before writing and revise at least one sentence before submitting.\n\nAnswer-key guide: reading answers need a point, a quoted or paraphrased detail, and an explanation. Grammar answers need the corrected sentence and the reason for the correction. Writing answers need purpose, audience, structure, and editing evidence. Oral tasks need a clear position, reason, example, and respectful close.${subjectRubric(subjectTitle)}`;
  }
  return `Most questions in this book are open practice tasks. A good answer should:\n\n- respond to the exact question asked;\n- use correct vocabulary from ${subjectTitle};\n- include a clear example, reason, working, observation, or evidence;\n- be neat enough for another learner to follow;\n- show correction after feedback.\n\nFor calculations, check each step. For language work, check spelling, punctuation, grammar, and meaning. For practical subjects, check safety, materials, observations, and conclusion.\n\nAnswer-key guide: Social Studies answers should name the place, people, evidence, meaning, and responsible action. Agriculture answers should name tools, sequence, safety, observation, and care for living things. Creative Arts answers should show planning, technique, safety, improvement, and explanation of choices.${subjectRubric(subjectTitle)}`;
}

function finalProjectFor(subjectTitle) {
  if (subjectTitle === 'Kiswahili') {
    return `Unda mradi wa mwisho wa Kiswahili.\n\nMradi wako uwe na:\n1. Kichwa kilicho wazi.\n2. Swali, ujumbe, au tukio halisi.\n3. Ushahidi kutoka angalau masomo matatu.\n4. Kifungu, mazungumzo, hotuba, insha fupi, chati ya msamiati, au wasilisho.\n5. Tafakuri fupi inayoeleza ulichojifunza na ulichoboresha.\n\nWasilisha mradi kwa mwanafunzi mwenzako, mwalimu, mzazi, au kikundi cha kujisomea.`;
  }
  if (subjectTitle === 'Mathematics') {
    return `Create a final Mathematics project.\n\nYour project must include:\n1. A clear real-life problem from school, home, community, farming, transport, money, construction, data, sport, or design.\n2. At least three mathematical ideas from the book.\n3. A table, diagram, graph, model, equation, or worked solution.\n4. Full working and a context check for the answer.\n5. A short reflection explaining which method was most useful and which error you avoided.\n\nPresent your project to a classmate, teacher, parent, or study group.`;
  }
  if (subjectTitle === 'Science and Technology') {
    return `Create a final Science and Technology project.\n\nYour project must include:\n1. A clear question, problem, or design need.\n2. Evidence from at least three lessons.\n3. A safe method, labelled diagram, data table, flow chart, model, or prototype plan.\n4. A conclusion that explains what the evidence shows.\n5. One safety note, one limitation, and one improvement.\n\nPresent your project to a classmate, teacher, parent, or study group.`;
  }
  return `Create a final project for ${subjectTitle}.\n\nYour project must include:\n1. A clear title.\n2. A real-life problem or question.\n3. Evidence from at least three lessons.\n4. A drawing, table, map, chart, model, dialogue, performance plan, artwork note, or worked solution.\n5. A short reflection explaining what you learned.\n\nPresent your project to a classmate, teacher, parent, or study group.`;
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
  const sourceRefs = sourceRefsFor(manifest);
  return {
    schemaVersion: 1,
    bookId: manifest.bookId,
    sourceSnapshotHash: manifest.sourceSnapshotHash,
    bookPlanHash: manifest.bookPlanHash,
    pages: pages.map(page => ({
      pageId: page.pageId,
      title: page.title,
      strandIds: page.strandIds || [],
      unitIds: page.unitIds || [],
      outcomeIds: page.outcomeIds || [],
      sourceRefs: page.sourceRefs?.length ? page.sourceRefs : sourceRefs
    }))
  };
}

function sourceRefsFor(manifest) {
  const documents = Array.isArray(manifest.sourceDocuments) ? manifest.sourceDocuments : [];
  if (!documents.length) {
    return [
      {
        type: 'source-snapshot',
        sourceSnapshotHash: manifest.sourceSnapshotHash,
        country: manifest.country,
        curriculum: manifest.curriculum,
        grade: manifest.grade,
        subject: manifest.subject
      }
    ];
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
    metadata: doc.metadata,
    sourceSnapshotHash: manifest.sourceSnapshotHash
  }));
}

function appSafeManifest(manifest) {
  const {
    sourceDocuments,
    ...safe
  } = manifest;
  return {
    ...safe,
    sourceDocuments: Array.isArray(sourceDocuments)
      ? sourceDocuments.map(doc => ({
          id: doc.id,
          subject: doc.subject,
          officialTitle: doc.officialTitle,
          countryCode: doc.countryCode,
          curriculumCode: doc.curriculumCode,
          gradeCode: doc.gradeCode,
          gradeLocalLevel: doc.gradeLocalLevel,
          localLevel: doc.localLevel
        }))
      : []
  };
}

function isPublishedForTestingManifest(manifest) {
  const statuses = [manifest?.status, manifest?.publicationStatus]
    .filter(Boolean)
    .map(value => String(value).toLowerCase());
  return statuses.includes('published-for-testing') || statuses.includes('phase1-testing-published');
}

async function existingFileInPackage(outDir, relativePath) {
  if (!relativePath || path.isAbsolute(relativePath) || relativePath.includes('..')) return false;
  return fileExists(path.join(outDir, relativePath));
}

async function publishedTestingMetadataForRegeneration(outDir, previousManifest) {
  if (!isPublishedForTestingManifest(previousManifest)) return {};

  const preserved = {
    status: previousManifest.status || 'published-for-testing',
    publicationStatus: previousManifest.publicationStatus || 'published-for-testing'
  };

  for (const field of ['testingRelease', 'reviewStatus']) {
    if (previousManifest[field] !== undefined) {
      preserved[field] = previousManifest[field];
    }
  }

  const previousAssets = Array.isArray(previousManifest.assets) ? previousManifest.assets : [];
  const coverAssets = [];
  for (const asset of previousAssets) {
    if (!asset || asset.kind !== 'cover') continue;
    if (await existingFileInPackage(outDir, asset.path)) {
      coverAssets.push(asset);
    }
  }

  const coverImage = previousManifest.coverImage?.path && await existingFileInPackage(outDir, previousManifest.coverImage.path)
    ? previousManifest.coverImage
    : coverAssets[0];

  if (coverImage || coverAssets.length) {
    preserved.coverImage = coverImage;
    if (coverAssets.length) {
      preserved.assets = coverAssets;
    }
    preserved.coverStatus = previousManifest.coverStatus || 'phase1-testing-cover-attached';
    if (previousManifest.coverAssetStatus !== undefined) {
      preserved.coverAssetStatus = previousManifest.coverAssetStatus;
    }
  }

  return preserved;
}

async function buildBook(client, grade, subject, options) {
  const progress = await loadProgress();
  const key = jobKey(grade, subject);
  const existing = progress.jobs.find(job => job.key === key);
  if (existing?.status === 'completed' && existing.generatorVersion === GENERATOR_VERSION && !options.force) {
    return { skipped: true, key, generatorVersion: GENERATOR_VERSION };
  }

  const startedAt = nowIso();
  const curriculum = await queryCurriculum(client, grade, subject);
  const snapshot = { schemaVersion: 1, country: 'KEN', curriculum: 'CBC', grade, subject: subject.title, generatedAt: startedAt, ...curriculum };
  const hash = stableHash(snapshot);
  snapshot.inputHash = hash;
  const bookId = `kitabu-quest-grade-${gradeNumber(grade)}-${subject.slug}`;
  const outDir = path.join(BOOK_ROOT, 'KEN', 'CBC', gradeCode(grade), subject.slug);
  const previousManifest = await readJsonIfExists(path.join(outDir, 'manifest.json'));
  const publishedTestingMetadata = await publishedTestingMetadataForRegeneration(outDir, previousManifest);
  const snapshotPath = path.join(SNAPSHOT_ROOT, 'KEN', 'CBC', gradeCode(grade), `${bookId}-${hash.slice(0, 12)}.json`);

  await writeJsonAtomic(snapshotPath, snapshot);
  await saveProgress({ ...progress, updatedAt: nowIso(), jobs: upsertJob(progress.jobs, { key, country: 'KEN', curriculum: 'CBC', grade, subject: subject.title, slug: subject.slug, status: 'running', generatorVersion: GENERATOR_VERSION, startedAt, snapshotPath: rel(snapshotPath), snapshotHash: hash }) });
  await appendEvent({ type: 'job_started', key, snapshotHash: hash });

  const bookPlan = buildBookPlan(snapshot, grade, subject);
  const bookPlanHash = stableHash(bookPlan);
  const pages = buildPages(snapshot, grade, subject, bookPlan);
  const wordCount = pages.reduce((sum, page) => sum + page.content.split(/\s+/).filter(Boolean).length, 0);
  const manifest = {
    schemaVersion: 1,
    bookId,
    title: `KITABU QUEST Grade ${gradeNumber(grade)} ${subject.title}`,
    country: 'KEN',
    curriculum: 'CBC',
    grade,
    subject: subject.title,
    subjectSlug: subject.slug,
    subjectColor: subject.color,
    version: `draft-${startedAt.slice(0, 10)}`,
    generatorVersion: GENERATOR_VERSION,
    status: 'content-draft-review-needed',
    contentStatus: sourceIsReviewed(curriculum.sourceDocuments) ? 'content-reviewed-draft' : 'content-draft-review-needed',
    coverStatus: 'deferred-until-all-content-ready',
    generatedAt: startedAt,
    sourceSnapshotHash: hash,
    bookPlanHash,
    pageCount: pages.length,
    wordCount,
    contentQuality: {
      strategy: 'learner-first-topic-cluster',
      ageBand: bookPlan.ageBand.band,
      coversDeferred: true,
      antiFluffChecks: bookPlan.writingStandard.antiFluff,
      topicCount: bookPlan.topics.length,
      outcomeCount: bookPlan.topics.reduce((sum, topic) => sum + topic.learningOutcomes.length, 0),
      localContextRequired: true,
      sourceMapRequired: true
    },
    mascot: { country: 'KEN', subject: subject.title, ...MASCOTS[subject.title] },
    cover: {
      scene: SCENES[subject.title],
      prompt: `Create vibrant realistic school textbook cover artwork for Kenya CBC ${grade} ${subject.title}. Scene: ${SCENES[subject.title]}. Include a friendly ${MASCOTS[subject.title].species} mascot near the title area, looking inviting and helpful. Show learners in a subject-relevant setting, bright commercial learner-book style, no readable text, no logos, portrait 4:5.`
    },
    assets: [],
    downloads: {
      markdown: `${bookId}.md`,
      bookPlan: 'book-plan.json',
      pagesJson: 'pages.json',
      sourceMap: 'source-map.json',
      pdf: `${bookId}.pdf`
    },
    sourceDocuments: curriculum.sourceDocuments.map(doc => ({
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
    })),
    ...publishedTestingMetadata
  };

  await fs.mkdir(outDir, { recursive: true });
  await writeJsonAtomic(path.join(outDir, 'book-plan.json'), bookPlan);
  await writeJsonAtomic(path.join(outDir, 'manifest.json'), manifest);
  await writeJsonAtomic(path.join(outDir, 'pages.json'), pages);
  await writeJsonAtomic(path.join(outDir, 'source-map.json'), sourceMapFor(manifest, pages));
  await writeTextAtomic(path.join(outDir, `${bookId}.md`), markdownFor(manifest, pages));
  await writeJsonAtomic(path.join(outDir, `${bookId}.pages.json`), { ...appSafeManifest(manifest), pages });

  const pdf = spawnSync('python', [path.join(__dirname, 'render-book-package-pdf.py'), '--dir', outDir], { cwd: repoRoot, encoding: 'utf8' });
  if (pdf.status !== 0) {
    throw new Error(`PDF render failed for ${key}: ${pdf.stderr || pdf.stdout}`);
  }

  const completedAt = nowIso();
  const nextProgress = await loadProgress();
  await saveProgress({ ...nextProgress, updatedAt: completedAt, jobs: upsertJob(nextProgress.jobs, { key, country: 'KEN', curriculum: 'CBC', grade, subject: subject.title, slug: subject.slug, status: 'completed', generatorVersion: GENERATOR_VERSION, contentStatus: manifest.contentStatus, coverStatus: manifest.coverStatus, startedAt, completedAt, snapshotPath: rel(snapshotPath), snapshotHash: hash, bookPlanHash, outDir: rel(outDir), pageCount: pages.length, wordCount: manifest.wordCount }) });
  await appendEvent({ type: 'job_completed', key, pageCount: pages.length, wordCount: manifest.wordCount });
  return { key, outDir, pageCount: pages.length, wordCount: manifest.wordCount };
}

function rel(file) {
  return path.relative(repoRoot, file).replace(/\\/g, '/');
}

function sourceIsReviewed(docs) {
  return docs.length > 0 && docs.every(doc => ['approved', 'reviewed'].includes(String(doc.review_status || '').toLowerCase()));
}

function upsertJob(jobs, job) {
  const rest = jobs.filter(existing => existing.key !== job.key);
  return [...rest, job].sort((a, b) => a.key.localeCompare(b.key));
}

async function saveProgress(progress) {
  await writeJsonAtomic(PROGRESS_PATH, progress);
}

function buildQueue(args) {
  const grades = (args.grades ? args.grades.split(',').map(value => value.trim()) : ['Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']);
  const subjectFilter = args.subjects ? new Set(args.subjects.split(',').map(value => value.trim().toLowerCase())) : null;
  const subjects = subjectFilter ? CORE_SUBJECTS.filter(subject => subjectFilter.has(subject.slug) || subjectFilter.has(subject.title.toLowerCase())) : CORE_SUBJECTS;
  const queue = [];
  for (const grade of grades) {
    for (const subject of subjects) queue.push({ grade, subject });
  }
  return queue;
}

async function main() {
  const args = parseArgs(process.argv);
  const connectionString = process.env.KITABU_DATABASE_URL;
  if (!connectionString) throw new Error('KITABU_DATABASE_URL is missing. Check apps/api/.env.');
  const limit = args.limit ? Number(args.limit) : Infinity;
  const queue = buildQueue(args).slice(0, limit);
  const client = new pg.Client({ connectionString });
  await client.connect();
  const results = [];
  try {
    for (const item of queue) {
      results.push(await buildBook(client, item.grade, item.subject, { force: args.force === 'true' }));
    }
  } finally {
    await client.end();
  }
  console.log(JSON.stringify({ processed: results }, null, 2));
}

main().catch(async error => {
  await appendEvent({ type: 'error', message: error.message, stack: error.stack });
  console.error(error);
  process.exit(1);
});
