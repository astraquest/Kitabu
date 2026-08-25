#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const args = new Set(process.argv.slice(2));
const manifestFlagIndex = process.argv.indexOf('--manifest');
const fileFlagIndex = process.argv.indexOf('--file');
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const manifestPath =
  manifestFlagIndex >= 0
    ? process.argv[manifestFlagIndex + 1]
    : path.resolve(scriptDir, '../../data/quiz-bank/KEN/CBC/manifest.json');
const explicitFile = fileFlagIndex >= 0 ? path.resolve(process.argv[fileFlagIndex + 1]) : null;
const manifestOnly = args.has('--manifest-only');

const allowedTypes = new Set(['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY']);
const allowedCognitiveLevels = new Set(['recall', 'understand', 'apply', 'analyze', 'create']);
const knownImageKeys = new Set([
  'image-library/v1/apple.png', 'image-library/v1/banana.png', 'image-library/v1/ball.png',
  'image-library/v1/book.png', 'image-library/v1/cat.png', 'image-library/v1/dog.png',
  'image-library/v1/teacher.png',
]);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function fail(errors, message) {
  errors.push(message);
}

function gradeCode(gradeLevel) {
  return gradeLevel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function flattenManifest(manifest, errors) {
  const cells = [];
  const seen = new Set();
  for (const band of manifest.gradeBands ?? []) {
    for (const gradeLevel of band.grades ?? []) {
      for (const subject of band.subjects ?? []) {
        const key = `${gradeLevel}:${subject.id}`;
        if (seen.has(key)) {
          fail(errors, `Duplicate manifest cell ${key}`);
        }
        seen.add(key);
        cells.push({
          gradeLevel,
          gradeCode: gradeCode(gradeLevel),
          subjectId: subject.id,
          subjectName: subject.name
        });
      }
    }
  }

  if (cells.length === 0) {
    fail(errors, 'manifest must define at least one grade-subject cell');
  }

  return cells;
}

function validateQuestionFile(manifest, cell, filePath, errors) {
  if (!fs.existsSync(filePath)) {
    fail(errors, `Missing question file: ${filePath}`);
    return;
  }

  const payload = readJson(filePath);
  const questions = payload.questions;

  if (payload.countryCode !== manifest.countryCode) fail(errors, `${filePath}: countryCode must be ${manifest.countryCode}`);
  if (payload.curriculumCode !== manifest.curriculumCode) fail(errors, `${filePath}: curriculumCode must be ${manifest.curriculumCode}`);
  if (payload.gradeLevel !== cell.gradeLevel) fail(errors, `${filePath}: gradeLevel must be ${cell.gradeLevel}`);
  if (payload.subjectId !== cell.subjectId) fail(errors, `${filePath}: subjectId must be ${cell.subjectId}`);
  if (payload.subjectName !== cell.subjectName) fail(errors, `${filePath}: subjectName must be ${cell.subjectName}`);
  if (!Array.isArray(questions)) {
    fail(errors, `${filePath}: questions must be an array`);
    return;
  }

  const seenNumbers = new Set();
  const seenPrompts = new Set();
  const difficulties = new Set();
  const allowedFeatureTags = new Set(manifest.featureTags ?? []);
  for (const [index, question] of questions.entries()) {
    const label = `${filePath} question ${index + 1}`;
    if (!Number.isInteger(question.questionNumber) || question.questionNumber < 1) {
      fail(errors, `${label}: questionNumber must be a positive integer`);
    }
    if (seenNumbers.has(question.questionNumber)) fail(errors, `${label}: duplicate questionNumber ${question.questionNumber}`);
    seenNumbers.add(question.questionNumber);

    if (!allowedTypes.has(question.type)) fail(errors, `${label}: invalid type ${question.type}`);
    const minimumPromptLength = cell.gradeLevel === 'Grade 1' && cell.subjectId === 'mathematics' ? 5 : 12;
    if (typeof question.prompt !== 'string' || question.prompt.trim().length < minimumPromptLength) fail(errors, `${label}: prompt is too short`);
    const promptKey = String(question.prompt ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (seenPrompts.has(promptKey)) fail(errors, `${label}: duplicate prompt`);
    seenPrompts.add(promptKey);

    if (question.type === 'MCQ') {
      if (!Array.isArray(question.options) || question.options.length !== 4) {
        fail(errors, `${label}: MCQ must have exactly 4 options`);
      } else if (!question.options.includes(question.correctAnswer)) {
        fail(errors, `${label}: correctAnswer must match one MCQ option`);
      } else {
        const normalizedOptions = question.options.map(option => String(option).trim().toLowerCase());
        if (question.options.some(option => typeof option !== 'string' || option.trim().length === 0)) {
          fail(errors, `${label}: MCQ options must be non-empty strings`);
        }
        if (new Set(normalizedOptions).size !== question.options.length) {
          fail(errors, `${label}: MCQ options must not contain duplicates`);
        }
      }
    }
    if (question.type === 'TRUE_FALSE' && (!Array.isArray(question.options) || question.options.length !== 2)) {
      fail(errors, `${label}: TRUE_FALSE must have exactly 2 options`);
    }
    if ((question.type === 'SHORT_ANSWER' || question.type === 'ESSAY') && !Array.isArray(question.options)) {
      fail(errors, `${label}: written formats must still provide options as an array`);
    }

    for (const field of ['correctAnswer', 'explanation', 'strandTitle', 'subStrandTitle']) {
      const minimumLength = field === 'correctAnswer' && cell.gradeLevel === 'Grade 1' ? 1 : 2;
      if (typeof question[field] !== 'string' || question[field].trim().length < minimumLength) fail(errors, `${label}: ${field} is required`);
    }
    if (question.learningOutcome !== undefined && typeof question.learningOutcome !== 'string') {
      fail(errors, `${label}: learningOutcome must be a string when present`);
    }
    if (/fallback practice|correct answer|placeholder/i.test(`${question.prompt} ${question.correctAnswer} ${question.explanation}`)) {
      fail(errors, `${label}: contains placeholder or fallback text`);
    }
    if (!Number.isInteger(question.difficulty) || question.difficulty < 1 || question.difficulty > 5) {
      fail(errors, `${label}: difficulty must be 1..5`);
    } else {
      difficulties.add(question.difficulty);
    }
    if (!allowedCognitiveLevels.has(question.cognitiveLevel)) fail(errors, `${label}: invalid cognitiveLevel ${question.cognitiveLevel}`);
    if (question.imageKey != null && !knownImageKeys.has(question.imageKey)) {
      fail(errors, `${label}: imageKey must be a known immutable image-library key`);
    }
    if (/\bat\s+at\b/i.test(question.prompt)) fail(errors, `${label}: prompt repeats a context token`);
    if (question.imageKey && /picture\. Which number shows \d+\s+\w+s\?/i.test(question.prompt)) {
      fail(errors, `${label}: a single-object image cannot claim to show a quantity`);
    }
    if (cell.gradeLevel === 'Grade 1' && cell.subjectId === 'mathematics' && question.imageKey) {
      const visual = question.visual;
      if (!visual || visual.kind !== 'picture_group' || visual.imageKey !== question.imageKey || !Array.isArray(visual.groups)) {
        fail(errors, `${label}: image arithmetic needs a matching picture_group visual`);
      } else {
        const equation = String(visual.equation ?? '').match(/^(\d+)\s*([+-])\s*(\d+)$/);
        const counts = visual.groups.map(group => Number(group?.count));
        if (!equation || counts.length !== 2 || counts.some(count => !Number.isInteger(count) || count < 1)) {
          fail(errors, `${label}: picture_group needs two positive operand counts and an equation`);
        } else {
          const [, leftText, operator, rightText] = equation;
          const left = Number(leftText);
          const right = Number(rightText);
          const expected = operator === '+' ? left + right : left - right;
          if (counts[0] !== left || counts[1] !== right) fail(errors, `${label}: picture_group quantities do not match its equation`);
          if (String(question.correctAnswer) !== String(expected)) fail(errors, `${label}: arithmetic answer does not match its equation`);
          if (question.prompt !== `${visual.equation} = ?`) fail(errors, `${label}: image arithmetic prompt must match its equation`);
        }
      }
    }
    if (!Array.isArray(question.featureTags) || question.featureTags.length === 0) {
      fail(errors, `${label}: featureTags must be a non-empty array`);
    } else {
      for (const tag of question.featureTags) {
        if (!allowedFeatureTags.has(tag)) fail(errors, `${label}: invalid featureTag ${tag}`);
      }
    }
  }

  if (questions.length >= 10 && difficulties.size < 2) {
    fail(errors, `${filePath}: expected at least 2 difficulty levels`);
  }
}

const errors = [];
const manifest = readJson(manifestPath);
const cells = flattenManifest(manifest, errors);

if (explicitFile) {
  const payload = readJson(explicitFile);
  const cell = cells.find(candidate => candidate.gradeLevel === payload.gradeLevel && candidate.subjectId === payload.subjectId);
  if (!cell) {
    fail(errors, `${explicitFile}: no matching manifest cell for ${payload.gradeLevel}:${payload.subjectId}`);
  } else {
    validateQuestionFile(manifest, cell, explicitFile, errors);
  }
} else if (!manifestOnly) {
  const manifestDir = path.dirname(manifestPath);
  for (const cell of cells) {
    validateQuestionFile(manifest, cell, path.join(manifestDir, 'questions', cell.gradeCode, `${cell.subjectId}.json`), errors);
  }
}

if (errors.length > 0) {
  console.error(`QuizBank validation failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

let totalQuestions = 0;
if (!manifestOnly) {
  const manifestDir = path.dirname(manifestPath);
  for (const cell of cells) {
    const questionPath = path.join(manifestDir, 'questions', cell.gradeCode, `${cell.subjectId}.json`);
    if (fs.existsSync(questionPath)) {
      const payload = readJson(questionPath);
      totalQuestions += Array.isArray(payload.questions) ? payload.questions.length : 0;
    }
  }
}
console.log(`QuizBank manifest OK: ${cells.length} grade-subject cells, ${totalQuestions} validated questions (no per-subject cap).`);
