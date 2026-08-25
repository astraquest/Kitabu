#!/usr/bin/env node
// Exam harvest pipeline: parse converted exam-paper texts and merge validated
// questions into the QuizBank JSON cells.
//
// Usage:
//   node scripts/quiz-bank/import-exam-harvest.mjs                 # report only
//   node scripts/quiz-bank/import-exam-harvest.mjs --apply         # write merges
//   node scripts/quiz-bank/import-exam-harvest.mjs --text-dir <dir>
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(scriptDir, '../..');
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const textDirFlag = args.includes('--text-dir') ? args[args.indexOf('--text-dir') + 1] : null;
const debugFileFlag = args.includes('--debug-file') ? path.resolve(args[args.indexOf('--debug-file') + 1]) : null;
const textDir = path.resolve(textDirFlag ?? path.resolve(apiDir, '../../tmp/exam-harvest/text-all'));
const manifestPath = path.resolve(apiDir, 'data/quiz-bank/KEN/CBC/manifest.json');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const manifestDir = path.dirname(manifestPath);

function gradeCode(gradeLevel) {
  return gradeLevel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function cellPath(gradeLevel, subjectId) {
  return path.join(manifestDir, 'questions', gradeCode(gradeLevel), `${subjectId}.json`);
}

function manifestHasCell(gradeLevel, subjectId) {
  for (const band of manifest.gradeBands ?? []) {
    if (!band.grades?.includes(gradeLevel)) continue;
    if (band.subjects?.some(subject => subject.id === subjectId)) return true;
  }
  return false;
}

function manifestSubjectName(gradeLevel, subjectId) {
  for (const band of manifest.gradeBands ?? []) {
    if (!band.grades?.includes(gradeLevel)) continue;
    const subject = band.subjects?.find(candidate => candidate.id === subjectId);
    if (subject) return subject.name;
  }
  return subjectId;
}

// ---------------------------------------------------------------------------
// Routing: infer grade + subject from the harvested file name. Bucket labels in
// the harvest tree are unreliable; paper-title keywords win.
// ---------------------------------------------------------------------------

const SUBJECT_TITLE_ROUTES = [
  { test: /KISWAHILI|KUSOMA|SHUGHULI\s*ZA\s*KISWAHILI/i, subject: 'kiswahili' },
  { test: /INTEGRATED[\s-]*SCIENCE/i, subject: 'integrated_science' },
  { test: /PRE-?TECHNICAL/i, subject: 'pre_technical_studies' },
  { test: /CREATIVE[\s-]*ARTS|PERFORMING[\s-]*ARTS/i, subject: 'creative_arts_sports' },
  { test: /\bBUSINESS\b|BUSINESS[\s-]*STUD/i, subject: 'business_studies' },
  { test: /AGRICULTURE|NUTRITION/i, subject: 'agriculture_nutrition_lower_or_junior' },
  { test: /\bCRE\b|CHRISTIAN[\s-]*RELIGIOUS|\bIRE\b|\bHRE\b|RELIGIOUS[\s-]*EDUCA/i, subject: 'religious_education' },
  { test: /\bENGLISH\b|LITERACY|LANGUAGE[\s-]*ACTIVITIES\b/i, subject: 'english' },
  { test: /MATHEMATICS|MATHS?\b/i, subject: 'mathematics' },
  { test: /SOCIAL[\s-]*STUDIES|SOCIAL[\s-]*ENVIRONMENT/i, subject: 'social_studies_lower_or_upper' },
  { test: /HOME[\s-]*SCIENCE|HYGIENE/i, subject: 'home_science_lower' },
  { test: /\bSCIENCE\b|EMVIRONMENTAL|ENVIRONMENTAL|ENVIRONMENT\b/i, subject: 'science_by_grade' }
];

function routeSubject(title, gradeLevel) {
  for (const route of SUBJECT_TITLE_ROUTES) {
    if (route.test.test(title)) {
      switch (route.subject) {
        case 'agriculture_nutrition_lower_or_junior':
          return ['Grade 4', 'Grade 5', 'Grade 6'].includes(gradeLevel) ? 'agriculture_nutrition' : 'agriculture';
        case 'social_studies_lower_or_upper':
          return ['Grade 1', 'Grade 2', 'Grade 3'].includes(gradeLevel) ? 'environmental' : 'social_studies';
        case 'home_science_lower':
          return ['Grade 1', 'Grade 2', 'Grade 3'].includes(gradeLevel) ? 'environmental' : null;
        case 'science_by_grade':
          if (['Grade 1', 'Grade 2', 'Grade 3'].includes(gradeLevel)) return 'environmental';
          if (['Grade 4', 'Grade 5', 'Grade 6'].includes(gradeLevel)) return 'science_technology';
          if (['Grade 7', 'Grade 8', 'Grade 9'].includes(gradeLevel)) return 'integrated_science';
          return 'general_science';
        default:
          return route.subject;
      }
    }
  }
  return null;
}

function routeFile(relativePath) {
  const base = path.basename(relativePath).replace(/\.txt$/i, '');
  const dir = path.dirname(relativePath).replaceAll('\\', '/');

  let gradeLevel = null;
  let title = base;

  const gMatch = base.match(/^G(\d+)-/);
  const primaryMatch = dir.match(/Primary_Grade-(\d+)/i);
  if (primaryMatch) {
    gradeLevel = `Grade ${Number(primaryMatch[1])}`;
  } else if (gMatch) {
    gradeLevel = `Grade ${Number(gMatch[1])}`;
    title = base.replace(/^G\d+-/, '');
  } else if (/^KJSEA/i.test(base)) {
    gradeLevel = 'Grade 9';
    title = base.replace(/^KJSEA(?:-\d{4})?(?:-(?:Sample|ASSESSMENT(?:-ESSENTIAL-STATISTICS)?))?/i, '');
  } else if (/^KCSE/i.test(base) || /^KCSE_/i.test(dir)) {
    return { skip: 'kcse-out-of-scope' };
  }

  // Strip bucket labels and marking-scheme-only files.
  title = title.replace(/^[a-z_]+-(?:GF|MS-GF|Download-\d+|Sports-Download-\d+|Education-Download-\d+)-?/i, '');
  title = title.replace(/^[a-z_]+-CBC-/i, '');
  title = title.replace(/^[-\s]+/, '');
  if (/(?:^|-)MS(?:-|$)|MARKING[\s-]*SCHEME/i.test(title)) {
    return { skip: 'marking-scheme-only-file' };
  }

  const subject = gradeLevel ? routeSubject(title.replaceAll('-', ' '), gradeLevel) : null;
  if (!gradeLevel) return { skip: 'unknown-grade' };
  if (!subject) return { skip: 'unknown-subject' };
  if (!manifestHasCell(gradeLevel, subject)) return { skip: `subject-not-in-manifest:${gradeLevel}:${subject}` };
  return { gradeLevel, subject, paperLabel: title.replaceAll('[_-]+', ' ').trim().slice(0, 90) };
}

// ---------------------------------------------------------------------------
// Text normalization
// ---------------------------------------------------------------------------

const PAGE_FURNITURE = [
  /^\s*COMPETENCE[\s-]*BASED.*$/i,
  /^\s*Kenya Junior School Education Assessment.*$/i,
  /^\s*KENYA NATIONAL EXAMINATIONS.*$/i,
  /^\s*(LEARNER|JINA|MTIHANI|ASSESSMENT NUMBER|NAMBA YA|TAREHE|SAINI|DATE)\b.*$/i,
  /^\s*FOR EXAMINERS USE ONLY.*$/i,
  /^\s*Instructions? to Learners.*$/i,
  /^\s*Answer all (?:the )?Questions?\s*.?$/i,
  /^\s*OUT OF \d+ MARKS\s*$/i,
  /^\s*Learners?\s*(Score|%)\s*\.?\s*$/i,
  /^\s*(Score Range|Performance Level|ASSESSMENT NUMBER).*$/i,
  /^\s*\d{2}-\d{2}\s+(Exceeding|Meeting|Approaching|Below|KUZIDISHA|KUFIKISHA|KUKARIBIA|CHINI).*$/i,
  /^\s*(Exceeding|Meeting|Approaching|Below|KUZIDISHA|KUFIKISHA|KUKARIBIA)\s+.*$/i
];

export function fixMojibake(text) {
  return text
    .replace(/\uFFFD\?o/g, '\u201C')
    .replace(/\uFFFD\?\?/g, '\u201D')
    .replace(/\uFFFD\?T/g, '\u2019')
    .replace(/Learner\uFFFDS/gi, "Learner's")
    .replace(/(\p{L})\uFFFD(\p{L})/gu, '$1\u2019$2')
    .replace(/\uFFFD+/g, '');
}

function cleanLine(line) {
  let cleaned = fixMojibake(line).replace(/\s+/g, ' ').trim();
  return cleaned;
}

function isFurniture(line) {
  const trimmed = line.trim();
  if (!trimmed) return true;
  return PAGE_FURNITURE.some(pattern => pattern.test(trimmed));
}

function cleanStem(text) {
  let stem = text
    .split('\n')
    .map(cleanLine)
    .filter(line => line && !/^_{3,}$/.test(line))
    .join(' ');
  stem = stem.replace(/_{3,}/g, '');
  stem = stem.replace(/\((?:\d+(?:\.\d+)?\s*(?:mks?|marks?)|alama\s*\d+|\d+\s*alama)\)/gi, ' ');
  stem = stem.replace(/\b([a-dA-D])\.\s*\.(?=\s|$)/g, ' ');
  stem = stem.replace(/\s+/g, ' ').trim();
  stem = stem.replace(/\s*[.,;]\s*$/, '').trim();
  return stem;
}

function cleanAnswerBody(text) {
  const body = text
    .split('\n')
    .map(cleanLine)
    .filter(line => line && !/^_{3,}$/.test(line))
    .join('\n')
    .replace(/_{3,}/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
  return body;
}

// ---------------------------------------------------------------------------
// Numbered-block extraction
// ---------------------------------------------------------------------------

function extractNumberedBlocks(lines) {
  const blocks = new Map();
  let current = null;
  let lastNumber = 0;
  const flush = () => {
    if (current && current.body.trim()) {
      if (!blocks.has(current.number)) blocks.set(current.number, current.body.trim());
    }
    current = null;
  };
  for (const rawLine of lines) {
    const match = rawLine.match(/^\s{0,6}(\d{1,3})\s*[.)]\s*(.*)$/);
    const number = match ? Number(match[1]) : null;
    const restart = number === 1 && lastNumber >= 5;
    if (number !== null && ((number > lastNumber && number <= lastNumber + 3) || restart || lastNumber === 0)) {
      flush();
      current = { number, body: match[2] ?? '' };
      lastNumber = number;
    } else if (current) {
      current.body += `\n${rawLine}`;
    }
  }
  flush();
  return blocks;
}

function extractOptions(blockBody) {
  const lines = blockBody.split('\n');
  const options = [];
  const stemLines = [];
  for (const line of lines) {
    const match = line.match(/^\s{0,8}([A-D])\s*[.)]\s+(.+)$/);
    if (match && (match[1] === 'A' ? options.length === 0 : options.length > 0)) {
      options.push({ letter: match[1], text: cleanStem(match[2]) });
    } else {
      stemLines.push(line);
    }
  }
  const letters = options.map(option => option.letter).join('');
  const usable = letters.startsWith('A') && options.length >= 3 && new Set(letters).size === options.length;
  if (!usable) return { stem: blockBody, options: null };
  return { stem: stemLines.join('\n'), options };
}

function deriveDifficultyAndCognition(rawBody) {
  const marksMatch =
    rawBody.match(/\((\d+(?:\.\d+)?)\s*(?:mks?|marks?)\)/i) ??
    rawBody.match(/alama\s*(\d+(?:\.\d+)?)/i) ??
    rawBody.match(/(\d+(?:\.\d+)?)\s*alama/i);
  const marks = marksMatch ? Number(marksMatch[1]) : null;
  if (marks === null) return { difficulty: 2, cognitiveLevel: 'understand' };
  if (marks >= 5) return { difficulty: 4, cognitiveLevel: 'apply' };
  if (marks >= 3) return { difficulty: 3, cognitiveLevel: 'apply' };
  if (marks <= 1) return { difficulty: 1, cognitiveLevel: 'recall' };
  return { difficulty: 2, cognitiveLevel: 'understand' };
}

const VISUAL_DEPENDENT = /\b(map|picture|diagram|chart|graph|photograph|photo|illustration|crossword|wordsearch|figure)\b/i;

function parseDocument(text, relativePath, paperLabel) {
  const normalized = fixMojibake(text).replace(/\r\n?/g, '\n');
  const allLines = normalized.split('\n');
  let answerStartIndex = -1;
  for (let index = allLines.length - 1; index >= 0; index -= 1) {
    if (/^\s*(?:marking\s*(?:scheme|guide)|answers?)\s*:?\s*$/i.test(allLines[index])) {
      answerStartIndex = index;
      break;
    }
  }
  if (answerStartIndex < 0) return { items: [], skippedNoAnswers: true };

  const questionLines = allLines.slice(0, answerStartIndex).filter(line => !isFurniture(line));
  const answerLines = allLines.slice(answerStartIndex + 1).filter(line => !isFurniture(line));

  const questionBlocks = extractNumberedBlocks(questionLines);
  const answerBlocks = extractNumberedBlocks(answerLines);

  let sectionHint = '';
  const items = [];
  const skips = { noAnswer: 0, visualDependent: 0, tooShort: 0, unresolvedMcq: 0, duplicate: 0, teacherAssessed: 0 };
  const seenPrompts = new Set();
  const bannedContextTokens = new Set();

  for (const [number, rawBody] of [...questionBlocks.entries()].sort((a, b) => a[0] - b[0])) {
    const headerMatch = rawBody.match(/^\s*((?:[A-Z][A-Z'\u2019\s&-]{3,60}))\s*$/);
    if (headerMatch && rawBody.split('\n').length === 1) sectionHint = headerMatch[1].trim();

    const { stem: bodyWithoutOptions, options } = extractOptions(rawBody);
    const stem = cleanStem(bodyWithoutOptions);
    if (stem.length < 20 || stem.split(' ').length < 4) {
      skips.tooShort += 1;
      continue;
    }
    if (VISUAL_DEPENDENT.test(stem)) {
      skips.visualDependent += 1;
      for (const token of stem.match(/\b[A-Z][a-z]{3,}\b/g) ?? []) {
        if (!['Kenya', 'Grade', 'Learners', 'The'].includes(token)) bannedContextTokens.add(token.toLowerCase());
      }
      continue;
    }
    const lowerStem = stem.toLowerCase();
    if ([...bannedContextTokens].some(token => lowerStem.includes(token))) {
      skips.visualDependent += 1;
      continue;
    }

    const rawAnswerBody = answerBlocks.has(number) ? cleanAnswerBody(answerBlocks.get(number)) : '';

    let item = null;
    if (options && options.length === 4) {
      const optionTexts = options.map(option => option.text);
      const compactAnswer = rawAnswerBody.replace(/\s+/g, ' ').trim();
      const letterMatch = compactAnswer.match(/^\(?([A-D])\)?\b[\s.,:)']?/);
      let correctAnswer = null;
      if (letterMatch && letterMatch[1] && letterMatch.index === 0) {
        const chosen = options.find(option => option.letter === letterMatch[1]);
        correctAnswer = chosen ? chosen.text : null;
      }
      if (!correctAnswer) {
        const normalizedBody = compactAnswer.toLowerCase();
        const contained = optionTexts.find(optionText => {
          const normalizedOption = optionText.toLowerCase().replace(/\s+/g, ' ').trim();
          return normalizedOption.length >= 2 && (normalizedBody === normalizedOption || normalizedBody.includes(normalizedOption));
        });
        correctAnswer = contained ?? null;
      }
      if (!correctAnswer || optionTexts.some(optionText => optionText.length < 1)) {
        skips.unresolvedMcq += 1;
        continue;
      }
      if (new Set(optionTexts.map(optionText => optionText.toLowerCase())).size !== 4) {
        skips.duplicate += 1;
        continue;
      }
      item = { type: 'MCQ', prompt: stem, options: optionTexts, correctAnswer };
    }

    const answerBody = rawAnswerBody;
    if (!item && (!answerBody || answerBody.length < 2)) {
      skips.noAnswer += 1;
      continue;
    }
    if (!item && /^(?:teacher|composition|project|oral)\b/i.test(answerBody)) {
      skips.teacherAssessed += 1;
      continue;
    }

    if (!item) {
      const flattened = answerBody.replace(/\s+/g, ' ').trim().slice(0, 600);
      item = { type: 'SHORT_ANSWER', prompt: stem, options: [], correctAnswer: flattened };
    }

    const promptKey = stem.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seenPrompts.has(promptKey)) {
      skips.duplicate += 1;
      continue;
    }

    item.explanation = `From ${paperLabel} marking scheme.`;
    seenPrompts.add(promptKey);
    const marksMeta = deriveDifficultyAndCognition(rawBody);
    items.push({ number, sectionHint, difficulty: marksMeta.difficulty, cognitiveLevel: marksMeta.cognitiveLevel, ...item });
  }

  return { items, skips, skippedNoAnswers: false };
}

// ---------------------------------------------------------------------------
// Merge into quiz-bank cells
// ---------------------------------------------------------------------------

function normalizePromptKey(prompt) {
  return prompt.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

const resetHarvest = args.includes('--reset-harvest');
if (resetHarvest) {
  let removed = 0;
  for (const band of manifest.gradeBands ?? []) {
    for (const gradeLevel of band.grades ?? []) {
      for (const subject of band.subjects ?? []) {
        const filePath = cellPath(gradeLevel, subject.id);
        if (!fs.existsSync(filePath)) continue;
        const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const kept = payload.questions.filter(question => !/^From .+ marking scheme\.$/.test(question.explanation ?? ''));
        removed += payload.questions.length - kept.length;
        if (kept.length !== payload.questions.length) {
          payload.questions = kept.map((question, index) => ({ ...question, questionNumber: index + 1 }));
          fs.writeFileSync(filePath, JSON.stringify(payload, null, 1) + '\n');
        }
      }
    }
  }
  console.log(`Reset harvest: removed ${removed} harvested question(s).`);
  process.exit(0);
}

const cells = new Map();
for (const band of manifest.gradeBands ?? []) {
  for (const gradeLevel of band.grades ?? []) {
    for (const subject of band.subjects ?? []) {
      const filePath = cellPath(gradeLevel, subject.id);
      const payload = fs.existsSync(filePath)
        ? JSON.parse(fs.readFileSync(filePath, 'utf8'))
        : {
            countryCode: manifest.countryCode,
            curriculumCode: manifest.curriculumCode,
            gradeLevel,
            subjectId: subject.id,
            subjectName: subject.name,
            questions: []
          };
      cells.set(`${gradeLevel}:${subject.id}`, payload);
    }
  }
}

function walkTextFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walkTextFiles(full));
    else if (entry.name.toLowerCase().endsWith('.txt')) found.push(full);
  }
  return found;
}

const textFiles = walkTextFiles(textDir);
const report = {
  filesScanned: textFiles.length,
  routed: 0,
  skipped: {},
  perCell: {},
  sampleItems: []
};
let totalImported = 0;

for (const filePath of textFiles.sort()) {
  const relativePath = path.relative(textDir, filePath);
  const route = routeFile(relativePath);
  if (route.skip) {
    report.skipped[route.skip] = (report.skipped[route.skip] ?? 0) + 1;
    continue;
  }
  report.routed += 1;
  const key = `${route.gradeLevel}:${route.subject}`;
  const cellPayload = cells.get(key);
  const existingPrompts = new Set(cellPayload.questions.map(question => normalizePromptKey(question.prompt)));
  const nextNumber = Math.max(0, ...cellPayload.questions.map(question => question.questionNumber));

  let text;
  try {
    text = fs.readFileSync(filePath, 'utf8');
  } catch {
    report.skipped['unreadable'] = (report.skipped['unreadable'] ?? 0) + 1;
    continue;
  }

  const parsed = parseDocument(text, relativePath, route.paperLabel);
  let added = 0;
  for (const parsedItem of parsed.items) {
    if (nextNumber + added >= 999) break;
    const promptKey = normalizePromptKey(parsedItem.prompt);
    if (existingPrompts.has(promptKey)) {
      report.skipped['duplicate-in-bank'] = (report.skipped['duplicate-in-bank'] ?? 0) + 1;
      continue;
    }
    existingPrompts.add(promptKey);
    added += 1;
    cellPayload.questions.push({
      questionNumber: nextNumber + added,
      type: parsedItem.type,
      prompt: parsedItem.prompt,
      options: parsedItem.options ?? [],
      correctAnswer: parsedItem.correctAnswer,
      explanation: parsedItem.explanation,
      difficulty: 2,
      cognitiveLevel: 'understand',
      featureTags: [...manifest.featureTags],
      imageKey: null,
      strandTitle: 'Exam Practice',
      subStrandTitle: (parsedItem.sectionHint || route.paperLabel).slice(0, 120)
    });
    if (report.sampleItems.length < 3) {
      report.sampleItems.push({ file: relativePath, ...cellPayload.questions.at(-1) });
    }
  }
  if (added > 0) {
    const cellReport = report.perCell[key] ?? { files: 0, added: 0 };
    cellReport.files += 1;
    cellReport.added += added;
    report.perCell[key] = cellReport;
    totalImported += added;
  }
  if (parsed.skippedNoAnswers) {
    report.skipped['no-answer-section'] = (report.skipped['no-answer-section'] ?? 0) + 1;
  }
}

if (debugFileFlag) {
  const relativePath = path.relative(textDir, debugFileFlag);
  const route = routeFile(relativePath);
  console.log('ROUTE:', JSON.stringify(route));
  if (!route.skip) {
    const parsed = parseDocument(fs.readFileSync(debugFileFlag, 'utf8'), relativePath, route.paperLabel);
    console.log('skips:', JSON.stringify(parsed.skips), 'skippedNoAnswers:', parsed.skippedNoAnswers);
    for (const item of parsed.items.slice(0, 12)) {
      console.log('-', JSON.stringify(item).slice(0, 400));
    }
  }
  process.exit(0);
}

console.log(`Exam harvest ${apply ? 'APPLY' : 'REPORT'}: scanned=${report.filesScanned} routed=${report.routed} candidateQuestions=${totalImported}`);
console.log('Skip reasons:', JSON.stringify(report.skipped, null, 1));
console.log('Per-cell additions:', JSON.stringify(report.perCell, null, 1));

if (apply) {
  for (const [key, payload] of cells.entries()) {
    if (payload.questions.length === 0) continue;
    const [gradeLevel, subjectId] = key.split(':');
    const filePath = cellPath(gradeLevel, subjectId);
    payload.subjectName = manifestSubjectName(gradeLevel, subjectId);
    payload.questions.sort((a, b) => a.questionNumber - b.questionNumber);
    const serialized = JSON.stringify(payload, null, 1) + '\n';
    const tempPath = `${filePath}.tmp-write`;
    fs.writeFileSync(tempPath, serialized);
    fs.copyFileSync(tempPath, filePath);
    fs.rmSync(tempPath, { force: true });
  }
  console.log(`Applied merges to ${cells.size} tracked cells.`);
}
