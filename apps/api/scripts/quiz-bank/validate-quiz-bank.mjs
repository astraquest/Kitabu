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
  const target = manifest.questionCountPerSubject;
  if (!Number.isInteger(target) || target < 1) {
    fail(errors, 'manifest.questionCountPerSubject must be a positive integer');
  }

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
          bandId: band.id,
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
  const expectedCount = manifest.questionCountPerSubject;

  if (payload.countryCode !== manifest.countryCode) {
    fail(errors, `${filePath}: countryCode must be ${manifest.countryCode}`);
  }
  if (payload.curriculumCode !== manifest.curriculumCode) {
    fail(errors, `${filePath}: curriculumCode must be ${manifest.curriculumCode}`);
  }
  if (payload.gradeLevel !== cell.gradeLevel) {
    fail(errors, `${filePath}: gradeLevel must be ${cell.gradeLevel}`);
  }
  if (payload.subjectId !== cell.subjectId) {
    fail(errors, `${filePath}: subjectId must be ${cell.subjectId}`);
  }
  if (payload.subjectName !== cell.subjectName) {
    fail(errors, `${filePath}: subjectName must be ${cell.subjectName}`);
  }
  if (!Array.isArray(questions)) {
    fail(errors, `${filePath}: questions must be an array`);
    return;
  }
  if (questions.length !== expectedCount) {
    fail(errors, `${filePath}: expected ${expectedCount} questions, found ${questions.length}`);
  }

  const seenNumbers = new Set();
  const seenPrompts = new Set();
  const difficulties = new Set();
  for (const [index, question] of questions.entries()) {
    const label = `${filePath} question ${index + 1}`;
    if (!Number.isInteger(question.questionNumber) || question.questionNumber < 1 || question.questionNumber > expectedCount) {
      fail(errors, `${label}: questionNumber must be 1..${expectedCount}`);
    }
    if (seenNumbers.has(question.questionNumber)) {
      fail(errors, `${label}: duplicate questionNumber ${question.questionNumber}`);
    }
    seenNumbers.add(question.questionNumber);

    if (!allowedTypes.has(question.type)) {
      fail(errors, `${label}: invalid type ${question.type}`);
    }
    if (typeof question.prompt !== 'string' || question.prompt.trim().length < 12) {
      fail(errors, `${label}: prompt is too short`);
    }
    const promptKey = String(question.prompt ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (seenPrompts.has(promptKey)) {
      fail(errors, `${label}: duplicate prompt`);
    }
    seenPrompts.add(promptKey);

    if (question.type === 'MCQ') {
      if (!Array.isArray(question.options) || question.options.length !== 4) {
        fail(errors, `${label}: MCQ must have exactly 4 options`);
      } else if (!question.options.includes(question.correctAnswer)) {
        fail(errors, `${label}: correctAnswer must match one MCQ option`);
      }
    }
    if (question.type === 'TRUE_FALSE' && (!Array.isArray(question.options) || question.options.length !== 2)) {
      fail(errors, `${label}: TRUE_FALSE must have exactly 2 options`);
    }
    if ((question.type === 'SHORT_ANSWER' || question.type === 'ESSAY') && !Array.isArray(question.options)) {
      fail(errors, `${label}: written formats must still provide options as an array`);
    }

    for (const field of ['correctAnswer', 'explanation', 'strandTitle', 'subStrandTitle', 'learningOutcome']) {
      if (typeof question[field] !== 'string' || question[field].trim().length < 2) {
        fail(errors, `${label}: ${field} is required`);
      }
    }
    if (/fallback practice|correct answer|placeholder/i.test(`${question.prompt} ${question.correctAnswer} ${question.explanation}`)) {
      fail(errors, `${label}: contains placeholder or fallback text`);
    }
    if (!Number.isInteger(question.difficulty) || question.difficulty < 1 || question.difficulty > 5) {
      fail(errors, `${label}: difficulty must be 1..5`);
    } else {
      difficulties.add(question.difficulty);
    }
    if (!allowedCognitiveLevels.has(question.cognitiveLevel)) {
      fail(errors, `${label}: invalid cognitiveLevel ${question.cognitiveLevel}`);
    }
    if (!Array.isArray(question.featureTags) || question.featureTags.length === 0) {
      fail(errors, `${label}: featureTags must be a non-empty array`);
    }
  }

  if (questions.length === expectedCount && difficulties.size < 3) {
    fail(errors, `${filePath}: expected at least 3 difficulty levels`);
  }
}

const errors = [];
const manifest = readJson(manifestPath);
const cells = flattenManifest(manifest, errors);

if (explicitFile) {
  const payload = readJson(explicitFile);
  const cell = cells.find(
    candidate => candidate.gradeLevel === payload.gradeLevel && candidate.subjectId === payload.subjectId
  );
  if (!cell) {
    fail(errors, `${explicitFile}: no matching manifest cell for ${payload.gradeLevel}:${payload.subjectId}`);
  } else {
    validateQuestionFile(manifest, cell, explicitFile, errors);
  }
} else if (!manifestOnly) {
  const manifestDir = path.dirname(manifestPath);
  for (const cell of cells) {
    const filePath = path.join(manifestDir, 'questions', cell.gradeCode, `${cell.subjectId}.json`);
    validateQuestionFile(manifest, cell, filePath, errors);
  }
}

if (errors.length > 0) {
  console.error(`QuizBank validation failed with ${errors.length} issue(s):`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

const totalQuestions = cells.length * manifest.questionCountPerSubject;
console.log(
  `QuizBank manifest OK: ${cells.length} grade-subject cells, ${totalQuestions} target questions.`
);
