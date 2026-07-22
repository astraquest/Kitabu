#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(scriptDir, '../..');
const repoRoot = path.resolve(apiDir, '../..');
const defaultOutputDir = path.resolve(apiDir, 'data/curriculum/KEN/CBC/kicd-2024-grade-1-3');
const defaultSourcePath = path.join(defaultOutputDir, 'source-pages.json');

const args = process.argv.slice(2);
const sourceArg = args.indexOf('--source');
const outputArg = args.indexOf('--output');
const sourcePath = sourceArg >= 0 ? path.resolve(args[sourceArg + 1]) : defaultSourcePath;
const outputDir = outputArg >= 0 ? path.resolve(args[outputArg + 1]) : defaultOutputDir;

const SOURCE_PAGE_URL = 'https://kicd.ac.ke/cbc-materials/lower-primary/';
const EXTRACTION_VERSION = 'kicd-lower-primary-viewer-v1';

const expectedLessonTotals = new Map([
  ['creative_activities', 210],
  ['indigenous_language_activities', 60],
  ['christian_religious_education_activities', 90],
  ['environmental_activities', 120],
  ['hindu_religious_education_activities', 90],
  ['english_language_activities', 150],
  ['islamic_religious_education_activities', 90],
  ['kiswahili_language_activities', 120],
  ['mathematical_activities', 150]
]);

const documentedDetailLessonTotals = new Map([
  ['creative_activities:2', 224],
  ['english_language_activities:1', 152],
  ['hindu_religious_education_activities:3', 85],
  ['islamic_religious_education_activities:1', 89],
  ['islamic_religious_education_activities:3', 84]
]);

const documentedMissingInquiryQuestions = new Set([
  'islamic_religious_education_activities:1:3.2',
  'mathematical_activities:1:1.4'
]);

const manualContentOverrides = new Map([
  ['english_language_activities:1:15.3.1', {
    title: 'Interjections of surprise', lessonCount: 2,
    outcomes: ['identify words showing surprise from a text', 'use words showing surprise in simple sentences', 'adopt the use of interjections of surprise in day-to-day communication'],
    activities: ['listen to a short dialogue from an audio recording', 'pick out interjections of surprise from the dialogue', 'make different familiar faces showing surprise', 'read out sentence structures containing interjections of surprise from a story, poem or conversation they have listened to', 'work jointly to role play the interjections of surprise as modelled by peers, the teacher or from a video recording', 'search for emojis showing surprise from digital texts', 'construct sentences using interjections of surprise', 'recite rhymes and poems featuring interjections of surprise'],
    questions: ['How do people show surprise?'],
    coreCompetencies: ['Digital Literacy: The learner’s interaction with digital technology is enhanced as they use digital devices to search for emojis showing surprise.', 'Communication: The learner’s ability to write clearly and correctly is developed as they use interjections of surprise in simple sentences.'],
    values: ['Unity: This is reinforced as the learner works collaboratively with peers to role play the interjections of surprise as modelled by peers, the teacher or from a video recording.'],
    pertinentContemporaryIssues: ['Life Skills (Self-esteem): The learner’s self-esteem is nurtured as they use interjections correctly in communication.'],
    crossCurricularLinks: ['The learner can use the knowledge on interjections of surprise to learn similar concepts in Kiswahili Language and Indigenous Language Activities.']
  }],
  ['english_language_activities:3:2.2.2', {
    title: 'Comprehension', lessonCount: 2,
    outcomes: ['identify words related to the theme', 'make predictions and anticipate possible outcomes in a story for comprehension', 'use contextual clues to infer meanings of new words', 'answer direct and inferential questions for comprehension', 'adopt the reading texts for lifelong learning'],
    activities: ['read a printed or digital text and pick out words related to the theme', 'look at pictures and title of a text and say what will happen in the story', 'work with peers to infer the meaning of new words using contextual clues', 'discuss the text with peers and locate sentences containing answers to the direct questions based on the text', 'answer inferential questions based on the text read using contextual clues', 'make connections between events in the text and real-life experiences', 'engage in a language game using the vocabulary learnt'],
    questions: ['How can we tell how a story or poem will end?'],
    coreCompetencies: ['Creativity and Imagination: The learner’s ability to make connections is enhanced as they relate the events in the texts to real-life experiences.', 'Collaboration: The learner’s sense of teamwork is built up as they work with peers to infer the meaning of new words using contextual clues.'],
    values: ['Unity: Cooperation is enhanced as the learner works collaboratively with peers in group activities.'],
    pertinentContemporaryIssues: ['Life Skills (Self-esteem): The learner’s self-esteem is improved during the answering of comprehension questions to show understanding.'],
    crossCurricularLinks: ['The learner can apply vocabulary learnt in the theme on sharing duties and responsibilities to their learning in religious studies activities.']
  }],
  ['english_language_activities:2:13.1.1', {
    title: 'Pronunciation and Vocabulary', lessonCount: 2, sourcePages: [162],
    outcomes: ["identify words with the target letter-sound combinations: tr, sm, /tʃ/, /aʊ/ and /jː/ in oral texts", "articulate the words with the target letter-sound combinations: tr, sm, /tʃ/, /aʊ/ and /jː/ in a conversation", 'recognise new words related to the theme correctly', 'realise the importance of the correct use of vocabulary in various contexts'],
    activities: ['listen to a teacher read aloud text or audio clips with target letter-sound combinations: tr as in tree and trap, sm as in smile, /tʃ/ as in catch, fetch and watch, /aʊ/ as in out, bow and now, and /jː/ as in ewe and new', 'point out words with the target sound combinations from conversations', 'practise saying words with the target letter-sound combinations', 'respond to instructions given by the teacher or peers', 'construct simple sentences using the new words', 'listen to other learners say their simple sentences using the new words and give feedback'],
    questions: ['Why should we listen attentively when other people are talking?'],
    coreCompetencies: ['Learning to learn: This is promoted as the learner reflects on their own learning by giving feedback when other learners say their simple sentences using the new words.'],
    values: ['Respect is inculcated as the learner appreciates the work of others during peer assessment of the simple sentences they have constructed.'],
    pertinentContemporaryIssues: ['Life Skills (Self-esteem): The learner’s self-esteem is enhanced as they master the skill of listening attentively and correct pronunciation.'],
    crossCurricularLinks: ['The learner applies attentive listening skills when learning concepts in other learning areas.']
  }],
  ['mathematical_activities:1:1.4', {
    title: 'Subtraction', lessonCount: 20,
    outcomes: ['model subtraction as taking away using concrete objects', "use the '-' and '=' signs in writing subtraction sentences", 'subtract single digit numbers', 'subtract a 1-digit number from a 2-digit number without regrouping', 'work out missing numbers in patterns involving subtraction of whole numbers up to 50', 'play games involving subtraction using digital devices and other resources'],
    activities: ['model subtraction using concrete objects', "use '-' and '=' signs in writing subtraction sentences", 'subtract by counting backward', 'subtract using concrete objects', 'make subtraction sentences related to basic addition facts', 'use number cards or charts safely to work out subtraction of a 1-digit number from a 2-digit number', 'work with peers to create patterns involving subtraction'],
    questions: ['How do you subtract a one-digit number from a two-digit number?']
  }]
]);

const manualMissingStarts = [
  { subjectCode: 'english_language_activities', grade: 2, page: 162, code: '13.1.1', title: 'Pronunciation and Vocabulary', lessonCount: 2 }
];

const canonicalCodeOverrides = new Map([
  ['hindu_religious_education_activities:1:41:5.2', {
    code: '5.3',
    reason: 'The Grade 1 summary identifies Sharing as 5.3; the detail table prints 5.2 a second time.'
  }],
  ['english_language_activities:1:68:12.2.1', {
    code: '12.2.2',
    reason: 'The detail table repeats 12.2.1; the surrounding sequence identifies Comprehension as 12.2.2.'
  }],
  ['english_language_activities:2:159:12.2.1', {
    code: '12.2.2',
    reason: 'The detail table repeats 12.2.1; the surrounding sequence identifies Comprehension as 12.2.2.'
  }]
]);

const subjectRanges = [
  { documentSlug: 'creative-activities-indigenous-languages', subjectCode: 'creative_activities', subjectName: 'Creative Activities', grade: 1, pageStart: 10, pageEnd: 50, hierarchy: 'strand' },
  { documentSlug: 'creative-activities-indigenous-languages', subjectCode: 'creative_activities', subjectName: 'Creative Activities', grade: 2, pageStart: 51, pageEnd: 91, hierarchy: 'strand' },
  { documentSlug: 'creative-activities-indigenous-languages', subjectCode: 'creative_activities', subjectName: 'Creative Activities', grade: 3, pageStart: 92, pageEnd: 135, hierarchy: 'strand' },
  { documentSlug: 'creative-activities-indigenous-languages', subjectCode: 'indigenous_language_activities', subjectName: 'Indigenous Language Activities', grade: 1, pageStart: 136, pageEnd: 175, hierarchy: 'language' },
  { documentSlug: 'creative-activities-indigenous-languages', subjectCode: 'indigenous_language_activities', subjectName: 'Indigenous Language Activities', grade: 2, pageStart: 176, pageEnd: 214, hierarchy: 'language' },
  { documentSlug: 'creative-activities-indigenous-languages', subjectCode: 'indigenous_language_activities', subjectName: 'Indigenous Language Activities', grade: 3, pageStart: 215, pageEnd: 259, hierarchy: 'language' },
  { documentSlug: 'cre', subjectCode: 'christian_religious_education_activities', subjectName: 'Christian Religious Education Activities', grade: 1, pageStart: 10, pageEnd: 45, hierarchy: 'strand' },
  { documentSlug: 'cre', subjectCode: 'christian_religious_education_activities', subjectName: 'Christian Religious Education Activities', grade: 2, pageStart: 46, pageEnd: 85, hierarchy: 'strand' },
  { documentSlug: 'cre', subjectCode: 'christian_religious_education_activities', subjectName: 'Christian Religious Education Activities', grade: 3, pageStart: 86, pageEnd: 128, hierarchy: 'strand' },
  { documentSlug: 'environmental-activities', subjectCode: 'environmental_activities', subjectName: 'Environmental Activities', grade: 1, pageStart: 10, pageEnd: 36, hierarchy: 'strand' },
  { documentSlug: 'environmental-activities', subjectCode: 'environmental_activities', subjectName: 'Environmental Activities', grade: 2, pageStart: 37, pageEnd: 68, hierarchy: 'strand' },
  { documentSlug: 'environmental-activities', subjectCode: 'environmental_activities', subjectName: 'Environmental Activities', grade: 3, pageStart: 69, pageEnd: 100, hierarchy: 'strand' },
  { documentSlug: 'hre', subjectCode: 'hindu_religious_education_activities', subjectName: 'Hindu Religious Education Activities', grade: 1, pageStart: 10, pageEnd: 52, hierarchy: 'strand' },
  { documentSlug: 'hre', subjectCode: 'hindu_religious_education_activities', subjectName: 'Hindu Religious Education Activities', grade: 2, pageStart: 53, pageEnd: 89, hierarchy: 'strand' },
  { documentSlug: 'hre', subjectCode: 'hindu_religious_education_activities', subjectName: 'Hindu Religious Education Activities', grade: 3, pageStart: 90, pageEnd: 132, hierarchy: 'strand' },
  { documentSlug: 'english-activities', subjectCode: 'english_language_activities', subjectName: 'English Language Activities', grade: 1, pageStart: 10, pageEnd: 90, hierarchy: 'language' },
  { documentSlug: 'english-activities', subjectCode: 'english_language_activities', subjectName: 'English Language Activities', grade: 2, pageStart: 91, pageEnd: 182, hierarchy: 'language' },
  { documentSlug: 'english-activities', subjectCode: 'english_language_activities', subjectName: 'English Language Activities', grade: 3, pageStart: 183, pageEnd: 267, hierarchy: 'language' },
  { documentSlug: 'ire', subjectCode: 'islamic_religious_education_activities', subjectName: 'Islamic Religious Education Activities', grade: 1, pageStart: 10, pageEnd: 40, hierarchy: 'strand', codeDepths: [2, 3] },
  { documentSlug: 'ire', subjectCode: 'islamic_religious_education_activities', subjectName: 'Islamic Religious Education Activities', grade: 2, pageStart: 41, pageEnd: 72, hierarchy: 'strand', codeDepths: [2, 3] },
  { documentSlug: 'ire', subjectCode: 'islamic_religious_education_activities', subjectName: 'Islamic Religious Education Activities', grade: 3, pageStart: 73, pageEnd: 107, hierarchy: 'strand', codeDepths: [2, 3] },
  { documentSlug: 'kiswahili', subjectCode: 'kiswahili_language_activities', subjectName: 'Kiswahili Language Activities', grade: 1, pageStart: 11, pageEnd: 99, hierarchy: 'kiswahili' },
  { documentSlug: 'kiswahili', subjectCode: 'kiswahili_language_activities', subjectName: 'Kiswahili Language Activities', grade: 2, pageStart: 100, pageEnd: 193, hierarchy: 'kiswahili' },
  { documentSlug: 'kiswahili', subjectCode: 'kiswahili_language_activities', subjectName: 'Kiswahili Language Activities', grade: 3, pageStart: 194, pageEnd: 285, hierarchy: 'kiswahili' },
  { documentSlug: 'mathematics', subjectCode: 'mathematical_activities', subjectName: 'Mathematical Activities', grade: 1, pageStart: 10, pageEnd: 43, hierarchy: 'strand' },
  { documentSlug: 'mathematics', subjectCode: 'mathematical_activities', subjectName: 'Mathematical Activities', grade: 2, pageStart: 44, pageEnd: 82, hierarchy: 'strand' },
  { documentSlug: 'mathematics', subjectCode: 'mathematical_activities', subjectName: 'Mathematical Activities', grade: 3, pageStart: 83, pageEnd: 126, hierarchy: 'strand' }
];

const supportMarkers = [
  { field: 'coreCompetencies', pattern: /(?:Core\s+)?Competenc(?:y|ies)\s+to\s+be\s+developed\s*:/i },
  { field: 'coreCompetencies', pattern: /Umilisi\s+wa\s+kimsingi\s+unaokuzwa\s*:/i },
  { field: 'values', pattern: /\bValues\s*:/i },
  { field: 'values', pattern: /\bMaadili\s*:/i },
  { field: 'pertinentContemporaryIssues', pattern: /Pertinent\s+and\s+Contemporary\s+Issues(?:\s*\(PCIs?\))?\s*:/i },
  { field: 'pertinentContemporaryIssues', pattern: /Masuala\s+mtambuko\s*:/i },
  { field: 'crossCurricularLinks', pattern: /Link\s+to\s+(?:other\s+)?(?:Learning\s+)?(?:Areas?|Activities|activity\s+areas|subjects)\s*[:.]/i },
  { field: 'crossCurricularLinks', pattern: /Uhusiano\s+na\s+masomo\s+mengine\s*:/i },
  { field: 'assessmentRubric', pattern: /Assessment\s+Rubric(?:s)?\s*:?/i },
  { field: 'assessmentRubric', pattern: /Kigezo\s+cha\s+Tathmini\s*:?/i }
];

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function normalizeWhitespace(value) {
  return String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function repairCommonMojibake(value) {
  const replacements = new Map([
    ['â€¢', '•'], ['â—', '●'], ['â€™', '’'], ['â€˜', '‘'], ['â€œ', '“'], ['â€', '”'],
    ['â€“', '–'], ['â€”', '—'], ['â€¦', '…'], ['Â', ''], ['ï¬', 'fi'], ['ï¬‚', 'fl']
  ]);
  let text = String(value ?? '');
  for (const [bad, good] of replacements) text = text.split(bad).join(good);
  const finalReplacements = new Map([
    ['â€¢', '•'], ['â—', '●'], ['â€™', '’'], ['â€˜', '‘'], ['â€œ', '“'], ['â€', '”'],
    ['â€“', '–'], ['â€”', '—'], ['â€¦', '…']
  ]);
  for (const [bad, good] of finalReplacements) text = text.split(bad).join(good);
  return text;
}

function cleanText(value) {
  return normalizeWhitespace(repairCommonMojibake(value));
}

function compact(value) {
  return cleanText(value).replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

function pageText(document, pageNumber) {
  return cleanText(document.pages?.[String(pageNumber)] ?? document.pages?.[pageNumber] ?? '');
}

function markerIndex(text, patterns, fromIndex = 0) {
  let best = null;
  for (const pattern of patterns) {
    const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
    const matcher = new RegExp(pattern.source, flags);
    matcher.lastIndex = fromIndex;
    const match = matcher.exec(text);
    if (match && (!best || match.index < best.index)) best = { index: match.index, match };
  }
  return best;
}

function outcomeMarker(text, fromIndex) {
  return markerIndex(
    text,
    [
      /By\s+the\s+end\s+of[\s\S]{0,180}?learners?\s*should\s+be\s+able\s+to\s*[:;,]?/i,
      /Kufikia\s+mwisho\s+wa[\s\S]{0,140}?mwanafunzi\s+aweze\s*[:;,]?/i
    ],
    fromIndex
  );
}

function learningMarker(text, fromIndex) {
  return markerIndex(
    text,
    [/(?:The\s+)?learners?\s+(?:(?:is|are)\s+(?:to\s+be\s+)?|should\s+be\s+)guide(?:d)?\s+to\s*[:;,]?/i, /Mwanafunzi\s+aelekezwe\s*[:;,]?/i],
    fromIndex
  );
}

function lessonDetails(value) {
  const text = compact(value);
  const match = text.match(/\(\s*(?:(\d+)\s*)?(?:Lessons?|lessons?|Vipindi(?:\s+(\d+))?)\s*\)/i);
  if (!match) return { title: text, lessonCount: null, lessonLabel: null };
  return {
    title: text.slice(0, match.index).trim().replace(/[•●]+$/, '').trim(),
    lessonCount: Number(match[1] ?? match[2] ?? 0) || null,
    lessonLabel: match[0]
  };
}

function codeDepth(code) {
  return code.split('.').length;
}

function candidateCodes(text, hierarchy, configuredDepths = null) {
  const candidates = [];
  const matcher = /(?:^|[^\d.])(\d+\s*\.\s*\d+(?:\s*\.\s*\d+)?)(?=$|[^\d.]|\.(?!\d))/g;
  let match;
  while ((match = matcher.exec(text)) !== null) {
    const rawCode = match[1];
    const code = rawCode.replace(/\s+/g, '');
    const depth = codeDepth(code);
    const desiredDepth = hierarchy === 'strand' ? 2 : 3;
    const allowedDepths = configuredDepths ?? [desiredDepth];
    if (!allowedDepths.includes(depth) || code.endsWith('.0')) continue;
    const marker = outcomeMarker(text, match.index + match[0].length);
    if (!marker) continue;
    const codeIndex = match.index + match[0].indexOf(rawCode);
    const preOutcome = text.slice(codeIndex + rawCode.length, marker.index);
    const hasLessonLabel = lessonDetails(preOutcome).lessonCount !== null;
    const startsLine = /^\s*$/.test(text.slice(text.lastIndexOf('\n', codeIndex) + 1, codeIndex));
    const linePrefix = text.slice(text.lastIndexOf('\n', codeIndex) + 1, codeIndex);
    const strandPrefix = code.split('.').slice(0, 2).join('.');
    const precededByStrandCode = new RegExp(`${strandPrefix.replace('.', '\\.')}\s*$`).test(linePrefix);
    if (!hasLessonLabel && !startsLine && !precededByStrandCode) continue;
    const nextCode = text.slice(match.index + match[0].length).match(/(?:^|[^\d.])\d+\s*\.\s*\d+(?:\s*\.\s*\d+)?(?=$|[^\d.]|\.(?!\d))/);
    if (nextCode && match.index + match[0].length + nextCode.index < marker.index) continue;
    candidates.push({
      code,
      rawCode,
      rawCodeLength: rawCode.length,
      index: codeIndex,
      outcomeIndex: marker.index,
      outcomeMatch: marker.match[0]
    });
  }
  return candidates;
}

function findContextHeading(pages, pageNumber, pageStart, hierarchy, code) {
  const major = code.split('.')[0];
  const themeCode = `${major}.0`;
  const searchStart = Math.max(pageStart, pageNumber - 35);
  for (let page = pageNumber; page >= searchStart; page -= 1) {
    const text = pages.get(page) ?? '';
    if (hierarchy === 'strand') {
      const heading = text.match(new RegExp(`STRAND\\s+${themeCode.replace('.', '\\.')}\\s*:\\s*([^\\n]+)`, 'i'));
      if (heading) return { unitCode: null, unitTitle: null, strandCode: themeCode, strandTitle: compact(heading[1]) };
    } else if (hierarchy === 'kiswahili') {
      const heading = text.match(new RegExp(`(?:^|\\n)\\s*${themeCode.replace('.', '\\.')}\\s*\\n?\\s*([^\\n]+)`, 'i'));
      if (heading) return { unitCode: themeCode, unitTitle: compact(heading[1]), strandCode: code.split('.').slice(0, 2).join('.'), strandTitle: null };
    } else {
      const heading = text.match(new RegExp(`THEME\\s+${themeCode.replace('.', '\\.')}\\s*:\\s*([^\\n]+)`, 'i'));
      if (heading) return { unitCode: themeCode, unitTitle: compact(heading[1]), strandCode: code.split('.').slice(0, 2).join('.'), strandTitle: null };
    }
  }
  return {
    unitCode: hierarchy === 'strand' ? null : themeCode,
    unitTitle: null,
    strandCode: hierarchy === 'strand' ? themeCode : code.split('.').slice(0, 2).join('.'),
    strandTitle: null
  };
}

function languageStrandTitle(text, candidate) {
  const prefix = candidate.code.split('.').slice(0, 2).join('.');
  const before = text.slice(0, candidate.index);
  const matcher = new RegExp(`(?:^|\\n)\\s*${prefix.replace('.', '\\.')}\\s*(?:\\n|\\s)([\\s\\S]*)$`, 'i');
  const match = before.match(matcher);
  if (!match) return null;
  const title = compact(match[1])
    .replace(/^(?:Strand\s+Sub[ -]?Strand\s+Specific[\s\S]*?Question\(s\)\s*)/i, '')
    .replace(/^\d+\s+/, '')
    .trim();
  return title && title.length <= 120 ? title : null;
}

function localStrandTitle(text, candidate) {
  const strandCode = `${candidate.code.split('.')[0]}.0`;
  const before = text.slice(0, candidate.index);
  const matcher = new RegExp(`(?:^|\\n)\\s*${strandCode.replace('.', '\\.')}\\s*(?:\\n|\\s)([\\s\\S]*)$`, 'i');
  const match = before.match(matcher);
  if (!match) return null;
  const title = compact(match[1])
    .replace(/^(?:Strand\s+Sub[ -]?Strand\s+Specific[\s\S]*?Question\(s\)\s*)/i, '')
    .replace(/^\d+\s+/, '')
    .trim();
  return title && title.length <= 120 ? title : null;
}

function extractTitle(text, candidate) {
  const between = text.slice(candidate.index + candidate.rawCodeLength, candidate.outcomeIndex);
  const details = lessonDetails(between);
  return {
    ...details,
    title: details.title.replace(/^[\s:.-]+|[\s:.-]+$/g, '').trim()
  };
}

function listItems(value, mode = 'bullet') {
  const text = cleanText(value);
  if (!text) return [];
  const compacted = compact(text);
  const marker = mode === 'letter' ? /(?:^|\s)([a-z])\)\s*/gi : /[•●]\s*/g;
  const matches = [...compacted.matchAll(marker)];
  if (matches.length === 0) {
    if (!compacted) return [];
    if (mode === 'letter') {
      const bullets = [...compacted.matchAll(/[•●]\s*/g)];
      if (bullets.length > 0) {
        return bullets.map((match, index) => ({
          label: null,
          text: compacted.slice(match.index + match[0].length, bullets[index + 1]?.index ?? compacted.length).trim().replace(/[;,]$/, '')
        })).filter(item => item.text);
      }
    }
    return [{ text: compacted }];
  }
  return matches.map((match, index) => {
    const start = match.index + match[0].length;
    const end = matches[index + 1]?.index ?? compacted.length;
    const textValue = compacted.slice(start, end).trim().replace(/[;,]$/, '');
    return mode === 'letter' ? { label: match[1].toLowerCase(), text: textValue } : { text: textValue };
  }).filter(item => item.text);
}

function questionItems(value) {
  const text = compact(value);
  if (!text.includes('?')) return [];
  const numbered = [...text.matchAll(/(?:^|\s)(\d+)\.\s*([^?]+\?)/g)].map(match => ({ number: Number(match[1]), text: match[2].trim() }));
  if (numbered.length > 0) return numbered;
  const segments = text.match(/[^?]+\?/g) ?? [];
  return segments.map((segment, index) => ({ number: index + 1, text: segment.trim().replace(/^[•●]\s*/, '') }));
}

function splitActivitiesAndQuestions(value) {
  const text = cleanText(value);
  if (!text.includes('?')) return { activities: listItems(text), inquiryQuestions: [] };
  const compacted = compact(text);
  const numberedQuestion = compacted.search(/(?:^|\s)1\.\s+[^.?!]+\?/);
  let questionStart = numberedQuestion >= 0 ? numberedQuestion : -1;
  if (questionStart < 0) {
    const questionEnd = compacted.lastIndexOf('?') + 1;
    const beforeQuestion = compacted.slice(0, questionEnd);
    const lastSentence = beforeQuestion.lastIndexOf('. ');
    if (lastSentence >= 0) questionStart = lastSentence + 2;
  }
  if (questionStart < 0) return { activities: listItems(text), inquiryQuestions: questionItems(text) };
  return {
    activities: listItems(compacted.slice(0, questionStart)),
    inquiryQuestions: questionItems(compacted.slice(questionStart))
  };
}

function supportSections(block) {
  const occurrences = [];
  for (const marker of supportMarkers) {
    const match = marker.pattern.exec(block);
    if (match) occurrences.push({ ...marker, index: match.index, length: match[0].length });
  }
  occurrences.sort((a, b) => a.index - b.index);
  const fields = {
    coreCompetencies: [],
    values: [],
    pertinentContemporaryIssues: [],
    crossCurricularLinks: [],
    assessmentRubric: []
  };
  for (const [index, occurrence] of occurrences.entries()) {
    const end = occurrences[index + 1]?.index ?? block.length;
    let section = block.slice(occurrence.index + occurrence.length, end);
    if (occurrence.field !== 'assessmentRubric') {
      section = section.replace(
        /\s+(?:\d+\s*)?(?:(?:STRAND|THEME)\s+\d+\.\d+|Strand\s+Sub[\s–-]*Strand\s+Specific|SUGGESTED\s+ASSESSMENT|LIST\s+OF\s+SUGGESTED|APPENDIX\s+\d+|LEVEL\s+INDICATOR)[\s\S]*$/i,
        ''
      );
    }
    const items = occurrence.field === 'assessmentRubric' ? [{ text: compact(section) }] : listItems(section);
    fields[occurrence.field].push(...items.filter(item => item.text));
  }
  return { occurrences, fields };
}

function pageRangeForBlock(start, end, allStarts, range) {
  const pages = [];
  for (let page = start.page; page <= Math.min(end?.page ?? range.pageEnd, range.pageEnd); page += 1) pages.push(page);
  return pages;
}

function blockText(start, end, pages, range) {
  const chunks = [];
  const finalPage = Math.min(end?.page ?? range.pageEnd, range.pageEnd);
  for (let page = start.page; page <= finalPage; page += 1) {
    let text = pages.get(page) ?? '';
    if (end && page === start.page && page === end.page) {
      text = text.slice(start.index, end.index);
    } else {
      if (page === start.page) text = text.slice(start.index);
      if (end && page === end.page) text = text.slice(0, end.index);
    }
    if (text.trim()) chunks.push(text.trim());
  }
  return chunks.join('\n\n');
}

function extractSubStrand(start, end, pages, range, sequence) {
  const rawBlock = blockText(start, end, pages, range);
  const recoveredLesson = lessonDetails(rawBlock);
  const outcome = outcomeMarker(rawBlock, 0);
  const learning = outcome ? learningMarker(rawBlock, outcome.index + outcome.match[0].length) : null;
  const support = supportSections(rawBlock);
  const firstSupport = support.occurrences[0]?.index ?? rawBlock.length;
  const outcomeText = outcome && learning
    ? rawBlock.slice(outcome.index + outcome.match[0].length, learning.index)
    : '';
  const activityAndQuestionText = learning
    ? rawBlock.slice(learning.index + learning.match[0].length, firstSupport)
    : '';
  const split = splitActivitiesAndQuestions(activityAndQuestionText);
  const sourcePages = pageRangeForBlock(start, end, [], range);
  return {
    code: start.code,
    printedCode: start.printedCode ?? start.code,
    normalizationNotes: start.normalizationNotes ?? [],
    title: start.title,
    position: sequence,
    lessonCount: start.lessonCount ?? recoveredLesson.lessonCount,
    lessonLabel: start.lessonLabel ?? recoveredLesson.lessonLabel,
    sourcePages,
    sourcePageStart: sourcePages[0],
    sourcePageEnd: sourcePages[sourcePages.length - 1],
    sourceTextSha256: sha256(rawBlock),
    outcomes: listItems(outcomeText, 'letter').map((item, index) => ({ position: index + 1, label: item.label, statement: item.text })),
    inquiryQuestions: split.inquiryQuestions.map((item, index) => ({ position: index + 1, question: item.text })),
    learningActivities: split.activities.map((item, index) => ({ position: index + 1, activity: item.text })),
    ...support.fields
  };
}

function documentMap(capture) {
  if (Array.isArray(capture.sourceDocuments)) {
    return new Map(capture.sourceDocuments.map(document => [document.slug, {
      ...document,
      totalPages: document.pageCount,
      size: document.fileSize,
      pages: Object.fromEntries(document.pages.map(page => [String(page.pageNumber), page.text]))
    }]));
  }
  return new Map(Object.values(capture.documents ?? {}).map(document => [document.slug, document]));
}

function buildGradeSubject(range, document) {
  const pages = new Map();
  for (let page = range.pageStart; page <= range.pageEnd; page += 1) pages.set(page, pageText(document, page));
  const starts = [];
  for (const [page, text] of pages.entries()) {
    const nextPageText = pages.get(page + 1) ?? '';
    const scanText = nextPageText ? `${text}\n${nextPageText}` : text;
    for (const candidate of candidateCodes(scanText, range.hierarchy, range.codeDepths).filter(item => item.index < text.length)) {
      const details = extractTitle(scanText, candidate);
      const context = findContextHeading(pages, page, range.pageStart, range.hierarchy, candidate.code);
      const strandTitle = range.hierarchy === 'strand'
        ? localStrandTitle(text, candidate) ?? context.strandTitle
        : languageStrandTitle(text, candidate) ?? context.strandTitle;
      const start = {
        ...candidate,
        ...details,
        ...context,
        strandTitle,
        page
      };
      const override = canonicalCodeOverrides.get(`${range.subjectCode}:${range.grade}:${page}:${start.code}`);
      if (override) {
        start.printedCode = start.code;
        start.code = override.code;
        start.strandCode = range.hierarchy === 'strand'
          ? `${override.code.split('.')[0]}.0`
          : override.code.split('.').slice(0, 2).join('.');
        start.normalizationNotes = [override.reason];
      }
      starts.push(start);
    }
  }
  for (const forced of manualMissingStarts.filter(item => item.subjectCode === range.subjectCode && item.grade === range.grade)) {
    if (starts.some(item => item.code === forced.code)) continue;
    const text = pages.get(forced.page) ?? '';
    const index = text.lastIndexOf(forced.code);
    if (index < 0) throw new Error(`Unable to locate forced source row ${forced.subjectCode}:${forced.grade}:${forced.code}`);
    const context = findContextHeading(pages, forced.page, range.pageStart, range.hierarchy, forced.code);
    starts.push({
      code: forced.code,
      rawCode: forced.code,
      rawCodeLength: forced.code.length,
      index,
      outcomeIndex: index,
      outcomeMatch: '',
      title: forced.title,
      lessonCount: forced.lessonCount,
      lessonLabel: `(${forced.lessonCount} Lessons)`,
      ...context,
      strandTitle: languageStrandTitle(text, { code: forced.code, index }) ?? context.strandTitle,
      page: forced.page,
      normalizationNotes: ['Row start restored from the official page because its columns are emitted out of reading order by the PDF text layer.']
    });
  }
  starts.sort((a, b) => a.page - b.page || a.index - b.index);

  const subStrands = starts.map((start, index) => extractSubStrand(start, starts[index + 1], pages, range, index + 1));
  const strandsByCode = new Map();
  const unitsByCode = new Map();
  for (const [index, start] of starts.entries()) {
    const subStrand = subStrands[index];
    const strand = strandsByCode.get(start.strandCode) ?? {
      code: start.strandCode,
      title: start.strandTitle,
      position: strandsByCode.size + 1,
      unitCode: start.unitCode,
      subStrands: []
    };
    if (!strand.title && start.strandTitle) strand.title = start.strandTitle;
    strand.subStrands.push(subStrand);
    strandsByCode.set(start.strandCode, strand);
    if (start.unitCode) {
      const unit = unitsByCode.get(start.unitCode) ?? {
        code: start.unitCode,
        title: start.unitTitle,
        position: unitsByCode.size + 1
      };
      if (!unit.title && start.unitTitle) unit.title = start.unitTitle;
      unitsByCode.set(start.unitCode, unit);
    }
  }

  return {
    countryCode: 'KEN',
    curriculumCode: 'CBC',
    curriculumRevision: '2024',
    grade: range.grade,
    gradeLevel: `Grade ${range.grade}`,
    subjectCode: range.subjectCode,
    subjectName: range.subjectName,
    hierarchy: range.hierarchy,
    sourceDocumentId: document.fileId,
    sourceDocumentTitle: document.title,
    sourceUrl: `https://drive.google.com/file/d/${document.fileId}/view`,
    sourcePageStart: range.pageStart,
    sourcePageEnd: range.pageEnd,
    units: [...unitsByCode.values()],
    strands: [...strandsByCode.values()]
  };
}

function fillRepeatedLanguageStrandTitles(entries) {
  const titleCounts = new Map();
  for (const entry of entries.filter(item => item.hierarchy !== 'strand')) {
    for (const strand of entry.strands) {
      if (!strand.title) continue;
      const category = strand.code.split('.')[1];
      const key = `${entry.subjectCode}:${category}`;
      const counts = titleCounts.get(key) ?? new Map();
      counts.set(strand.title, (counts.get(strand.title) ?? 0) + 1);
      titleCounts.set(key, counts);
    }
  }
  for (const entry of entries.filter(item => item.hierarchy !== 'strand')) {
    for (const strand of entry.strands) {
      if (strand.title) continue;
      const category = strand.code.split('.')[1];
      const counts = titleCounts.get(`${entry.subjectCode}:${category}`);
      const inferred = counts
        ? [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0]
        : null;
      if (inferred) {
        strand.title = inferred;
        strand.normalizationNotes = ['Title restored from the repeated official strand pattern for this subject.'];
      }
    }
  }
}

function applyManualContentOverrides(entries) {
  for (const entry of entries) {
    for (const strand of entry.strands) {
      for (const subStrand of strand.subStrands) {
        const override = manualContentOverrides.get(`${entry.subjectCode}:${entry.grade}:${subStrand.code}`);
        if (!override) continue;
        subStrand.title = override.title;
        subStrand.lessonCount = override.lessonCount;
        subStrand.lessonLabel = `(${override.lessonCount} lessons)`;
        subStrand.outcomes = override.outcomes.map((statement, index) => ({
          position: index + 1,
          label: String.fromCharCode(97 + index),
          statement
        }));
        subStrand.learningActivities = override.activities.map((activity, index) => ({ position: index + 1, activity }));
        subStrand.inquiryQuestions = override.questions.map((question, index) => ({ position: index + 1, question }));
        for (const field of ['coreCompetencies', 'values', 'pertinentContemporaryIssues', 'crossCurricularLinks']) {
          if (override[field]) subStrand[field] = override[field].map(text => ({ text }));
        }
        if (override.sourcePages) {
          subStrand.sourcePages = override.sourcePages;
          subStrand.sourcePageStart = override.sourcePages[0];
          subStrand.sourcePageEnd = override.sourcePages[override.sourcePages.length - 1];
        }
        subStrand.normalizationNotes.push('Content order restored from the same source page because the PDF text layer renders this table row out of reading order.');
      }
    }
  }
}

function validateCapture(capture, documents) {
  const issues = [];
  let totalPages = 0;
  for (const document of documents.values()) {
    const total = Number(document.totalPages ?? 0);
    totalPages += total;
    for (let page = 1; page <= total; page += 1) {
      if (!Object.prototype.hasOwnProperty.call(document.pages ?? {}, String(page))) {
        issues.push(`${document.slug}: missing captured page ${page}`);
      }
    }
    const blankPages = Object.entries(document.pages ?? {})
      .filter(([, text]) => !String(text).trim())
      .map(([page]) => Number(page));
    const declaredBlank = new Set(document.blankPages ?? []);
    for (const page of blankPages) {
      if (!declaredBlank.has(page)) issues.push(`${document.slug}: undeclared blank page ${page}`);
    }
  }
  return { totalPages, issues };
}

function validateGradeSubject(entry) {
  const issues = [];
  const warnings = [];
  const subStrands = entry.strands.flatMap(strand => strand.subStrands.map(subStrand => ({ strand, subStrand })));
  if (entry.strands.length === 0) issues.push('no strands extracted');
  if (subStrands.length === 0) issues.push('no sub-strands extracted');
  const codes = new Set();
  for (const { strand, subStrand } of subStrands) {
    if (!strand.title) issues.push(`${subStrand.code}: missing strand title`);
    if (!subStrand.title) issues.push(`${subStrand.code}: missing sub-strand title`);
    if (codes.has(subStrand.code)) issues.push(`${subStrand.code}: duplicate sub-strand code`);
    codes.add(subStrand.code);
    if (!subStrand.lessonCount) issues.push(`${subStrand.code}: missing lesson count`);
    if (subStrand.outcomes.length < 2) issues.push(`${subStrand.code}: fewer than two complete outcomes`);
    if (subStrand.outcomes.some(item => !item.statement || item.statement.length < 15)) issues.push(`${subStrand.code}: truncated outcome`);
    if (subStrand.inquiryQuestions.length === 0) {
      const missingQuestionKey = `${entry.subjectCode}:${entry.grade}:${subStrand.code}`;
      if (documentedMissingInquiryQuestions.has(missingQuestionKey)) {
        warnings.push(`${subStrand.code}: the official detail table does not print a key inquiry question`);
      } else {
        issues.push(`${subStrand.code}: no inquiry questions`);
      }
    }
    if (subStrand.learningActivities.length === 0) issues.push(`${subStrand.code}: no learning activities`);
    if (subStrand.learningActivities.some(item => !item.activity || item.activity.length < 10)) issues.push(`${subStrand.code}: truncated learning activity`);
    if (/\[SOURCE PAGE/i.test(JSON.stringify({ outcomes: subStrand.outcomes, inquiryQuestions: subStrand.inquiryQuestions, learningActivities: subStrand.learningActivities }))) {
      issues.push(`${subStrand.code}: source-page marker leaked into curriculum content`);
    }
    for (let page = subStrand.sourcePageStart; page <= subStrand.sourcePageEnd; page += 1) {
      if (!subStrand.sourcePages.includes(page)) issues.push(`${subStrand.code}: non-contiguous source pages`);
    }
  }
  const lessonTotal = subStrands.reduce((sum, item) => sum + (item.subStrand.lessonCount ?? 0), 0);
  const expectedLessonTotal = expectedLessonTotals.get(entry.subjectCode) ?? null;
  const documentedDetailTotal = documentedDetailLessonTotals.get(`${entry.subjectCode}:${entry.grade}`) ?? null;
  if (documentedDetailTotal !== null && lessonTotal === documentedDetailTotal && lessonTotal !== expectedLessonTotal) {
    warnings.push(`detail tables total ${lessonTotal} lessons while the official summary states ${expectedLessonTotal}`);
  } else if (expectedLessonTotal !== null && lessonTotal !== expectedLessonTotal) {
    issues.push(`lesson total ${lessonTotal} does not match official allocation ${expectedLessonTotal}`);
  }
  return {
    key: `${entry.gradeLevel}:${entry.subjectCode}`,
    strandCount: entry.strands.length,
    subStrandCount: subStrands.length,
    outcomeCount: subStrands.reduce((sum, item) => sum + item.subStrand.outcomes.length, 0),
    inquiryQuestionCount: subStrands.reduce((sum, item) => sum + item.subStrand.inquiryQuestions.length, 0),
    learningActivityCount: subStrands.reduce((sum, item) => sum + item.subStrand.learningActivities.length, 0),
    lessonTotal,
    expectedLessonTotal,
    documentedDetailTotal,
    warnings,
    issues
  };
}

const capture = JSON.parse(await readFile(sourcePath, 'utf8'));
const documents = documentMap(capture);
const missingDocuments = [...new Set(subjectRanges.map(range => range.documentSlug))].filter(slug => !documents.has(slug));
if (missingDocuments.length > 0) throw new Error(`Missing source document captures: ${missingDocuments.join(', ')}`);

const captureValidation = validateCapture(capture, documents);
const gradeSubjects = subjectRanges.map(range => buildGradeSubject(range, documents.get(range.documentSlug)));
fillRepeatedLanguageStrandTitles(gradeSubjects);
applyManualContentOverrides(gradeSubjects);
const coverage = gradeSubjects.map(validateGradeSubject);
const issues = [
  ...captureValidation.issues,
  ...coverage.flatMap(item => item.issues.map(issue => `${item.key}: ${issue}`))
];

const sourceDocuments = [...documents.values()].map(document => ({
  fileId: document.fileId,
  slug: document.slug,
  title: document.title,
  sourceUrl: `https://drive.google.com/file/d/${document.fileId}/view`,
  officialListingUrl: SOURCE_PAGE_URL,
  modifiedTime: document.modifiedTime ?? null,
  fileSize: document.size ?? null,
  pageCount: document.totalPages,
  capturedPageCount: Object.keys(document.pages ?? {}).length,
  blankPages: document.blankPages ?? [],
  captureSha256: sha256(JSON.stringify(document.pages ?? {})),
  pages: Object.entries(document.pages ?? {}).map(([pageNumber, text]) => ({
    pageNumber: Number(pageNumber),
    text: repairCommonMojibake(text),
    textSha256: sha256(repairCommonMojibake(text))
  })).sort((a, b) => a.pageNumber - b.pageNumber)
}));

const generatedAt = new Date().toISOString();
const normalized = {
  schemaVersion: 1,
  extractionVersion: EXTRACTION_VERSION,
  generatedAt,
  countryCode: 'KEN',
  curriculumCode: 'CBC',
  curriculumRevision: '2024',
  publisher: 'Kenya Institute of Curriculum Development',
  officialListingUrl: SOURCE_PAGE_URL,
  sourceDocumentCount: sourceDocuments.length,
  sourcePageCount: captureValidation.totalPages,
  gradeSubjectCount: gradeSubjects.length,
  validation: {
    status: issues.length === 0 ? 'valid' : 'invalid',
    issueCount: issues.length,
    warnings: coverage.flatMap(item => item.warnings.map(warning => `${item.key}: ${warning}`))
  },
  gradeSubjects
};
const report = {
  schemaVersion: 1,
  extractionVersion: EXTRACTION_VERSION,
  generatedAt,
  sourcePath: path.relative(repoRoot, sourcePath).split(path.sep).join('/'),
  sourceDocumentCount: sourceDocuments.length,
  sourcePageCount: captureValidation.totalPages,
  gradeSubjectCount: gradeSubjects.length,
  issueCount: issues.length,
  warningCount: coverage.reduce((sum, item) => sum + item.warnings.length, 0),
  status: issues.length === 0 ? 'valid' : 'invalid',
  issues,
  warnings: coverage.flatMap(item => item.warnings.map(warning => `${item.key}: ${warning}`)),
  coverage
};

await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, 'source-pages.json'), `${JSON.stringify({ schemaVersion: 1, generatedAt, sourceDocuments }, null, 2)}\n`, 'utf8');
await writeFile(path.join(outputDir, 'normalized-curriculum.json'), `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
await writeFile(path.join(outputDir, 'validation-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`Captured source validation: ${sourceDocuments.length} document(s), ${captureValidation.totalPages} page(s).`);
console.log(`Normalized ${gradeSubjects.length} grade-subject cell(s).`);
for (const item of coverage) {
  console.log(`${item.key}: ${item.strandCount} strand(s), ${item.subStrandCount} sub-strand(s), ${item.outcomeCount} outcome(s), ${item.inquiryQuestionCount} inquiry question(s), ${item.lessonTotal} lessons.`);
}
if (issues.length > 0) {
  console.error(`Validation failed with ${issues.length} issue(s). See ${path.join(outputDir, 'validation-report.json')}.`);
  process.exitCode = 1;
} else {
  console.log(`Validation passed. Output written to ${outputDir}.`);
}
