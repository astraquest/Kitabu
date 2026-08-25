#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(scriptDir, '../..');
const manifestPath = path.resolve(apiDir, 'data/quiz-bank/KEN/CBC/manifest.json');

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function gradeCode(gradeLevel) {
  return gradeLevel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const manifest = readJson(manifestPath);
const manifestDir = path.dirname(manifestPath);
const byGrade = new Map();
let totalCells = 0;
let emptyCells = 0;
let missingCells = 0;
let totalQuestions = 0;

for (const band of manifest.gradeBands ?? []) {
  for (const gradeLevel of band.grades ?? []) {
    const summary = byGrade.get(gradeLevel) ?? { total: 0, populated: 0, missing: 0, questions: 0 };
    for (const subject of band.subjects ?? []) {
      totalCells += 1;
      summary.total += 1;
      const filePath = path.join(manifestDir, 'questions', gradeCode(gradeLevel), `${subject.id}.json`);
      if (!existsSync(filePath)) {
        missingCells += 1;
        summary.missing += 1;
        continue;
      }
      const payload = readJson(filePath);
      const count = Array.isArray(payload.questions) ? payload.questions.length : 0;
      totalQuestions += count;
      summary.questions += count;
      if (count > 0) {
        summary.populated += 1;
      } else {
        emptyCells += 1;
      }
    }
    byGrade.set(gradeLevel, summary);
  }
}

console.log(`QuizBank coverage: ${totalQuestions} questions across ${totalCells} grade-subject cells (no per-subject cap).`);
console.log(`Missing cells: ${missingCells}; empty cells: ${emptyCells}.`);
for (const [gradeLevel, summary] of byGrade.entries()) {
  console.log(`${gradeLevel}: ${summary.populated}/${summary.total} cells populated, ${summary.questions} questions`);
}
