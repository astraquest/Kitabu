#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import pg from 'pg';

const { Pool } = pg;
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(scriptDir, '../..');

loadEnv({ path: path.resolve(apiDir, '.env') });

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const manifestFlagIndex = args.indexOf('--manifest');
const fileFlagIndex = args.indexOf('--file');
const manifestPath =
  manifestFlagIndex >= 0
    ? path.resolve(args[manifestFlagIndex + 1])
    : path.resolve(apiDir, 'data/quiz-bank/KEN/CBC/manifest.json');
const explicitFile = fileFlagIndex >= 0 ? path.resolve(args[fileFlagIndex + 1]) : null;

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function gradeCode(gradeLevel) {
  return gradeLevel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function flattenManifest(manifest) {
  const cells = [];
  for (const band of manifest.gradeBands ?? []) {
    for (const gradeLevel of band.grades ?? []) {
      for (const subject of band.subjects ?? []) {
        cells.push({
          gradeLevel,
          gradeCode: gradeCode(gradeLevel),
          subjectId: subject.id,
          subjectName: subject.name
        });
      }
    }
  }
  return cells;
}

function discoverFiles(manifest, manifestDir) {
  if (explicitFile) {
    return [explicitFile];
  }

  const files = [];
  for (const cell of flattenManifest(manifest)) {
    const filePath = path.join(manifestDir, 'questions', cell.gradeCode, `${cell.subjectId}.json`);
    if (existsSync(filePath)) {
      files.push(filePath);
    }
  }
  return files;
}

function isLocalDatabaseUrl(databaseUrl) {
  try {
    const host = new URL(databaseUrl).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === 'postgres';
  } catch {
    return false;
  }
}

function databaseSslOptions(databaseUrl) {
  const sslMode = process.env.KITABU_DATABASE_SSL_MODE?.trim() || 'auto';
  if (sslMode === 'disable') {
    return undefined;
  }
  if (sslMode === 'require') {
    return { rejectUnauthorized: false };
  }
  return isLocalDatabaseUrl(databaseUrl) ? undefined : { rejectUnauthorized: false };
}

function validatePayload(manifest, payload, filePath) {
  const errors = [];
  if (payload.countryCode !== manifest.countryCode) {
    errors.push(`${filePath}: countryCode must be ${manifest.countryCode}`);
  }
  if (payload.curriculumCode !== manifest.curriculumCode) {
    errors.push(`${filePath}: curriculumCode must be ${manifest.curriculumCode}`);
  }
  if (!Array.isArray(payload.questions)) {
    errors.push(`${filePath}: questions must be an array`);
  }
  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
}

async function importFile(client, manifest, filePath) {
  const payload = readJson(filePath);
  validatePayload(manifest, payload, filePath);

  for (const question of payload.questions) {
    await client.query(
      `INSERT INTO quiz_bank_questions (
         country_code, curriculum_code, grade_level, subject_id, subject_name,
         strand_title, sub_strand_title, learning_outcome, question_number, type,
         prompt, options, correct_answer, explanation, difficulty, cognitive_level,
         feature_tags, source
       )
       VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8, $9, $10,
         $11, $12::jsonb, $13, $14, $15, $16,
         $17::jsonb, $18
       )
       ON CONFLICT (country_code, curriculum_code, grade_level, subject_id, question_number)
       DO UPDATE SET
         subject_name = EXCLUDED.subject_name,
         strand_title = EXCLUDED.strand_title,
         sub_strand_title = EXCLUDED.sub_strand_title,
         learning_outcome = EXCLUDED.learning_outcome,
         type = EXCLUDED.type,
         prompt = EXCLUDED.prompt,
         options = EXCLUDED.options,
         correct_answer = EXCLUDED.correct_answer,
         explanation = EXCLUDED.explanation,
         difficulty = EXCLUDED.difficulty,
         cognitive_level = EXCLUDED.cognitive_level,
         feature_tags = EXCLUDED.feature_tags,
         source = EXCLUDED.source,
         updated_at = NOW()`,
      [
        payload.countryCode,
        payload.curriculumCode,
        payload.gradeLevel,
        payload.subjectId,
        payload.subjectName,
        question.strandTitle,
        question.subStrandTitle,
        question.learningOutcome,
        question.questionNumber,
        question.type,
        question.prompt,
        JSON.stringify(question.options ?? []),
        question.correctAnswer,
        question.explanation,
        question.difficulty,
        question.cognitiveLevel,
        JSON.stringify(question.featureTags ?? []),
        'quizbank-json'
      ]
    );
  }

  return payload.questions.length;
}

const manifest = readJson(manifestPath);
const manifestDir = path.dirname(manifestPath);
const files = discoverFiles(manifest, manifestDir);

if (files.length === 0) {
  console.log('No QuizBank question files found to import.');
  process.exit(0);
}

if (dryRun) {
  let total = 0;
  for (const file of files) {
    const payload = readJson(file);
    validatePayload(manifest, payload, file);
    total += payload.questions?.length ?? 0;
  }
  console.log(`Dry run OK: ${files.length} file(s), ${total} question(s).`);
  process.exit(0);
}

if (!process.env.KITABU_DATABASE_URL) {
  console.error('KITABU_DATABASE_URL is not set. Use --dry-run to check files without importing.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.KITABU_DATABASE_URL,
  ssl: databaseSslOptions(process.env.KITABU_DATABASE_URL)
});

const client = await pool.connect();

try {
  let total = 0;
  await client.query('BEGIN');
  for (const file of files) {
    total += await importFile(client, manifest, file);
  }
  await client.query('COMMIT');
  console.log(`Imported ${total} QuizBank question(s) from ${files.length} file(s).`);
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  console.error('QuizBank import failed.');
  console.error(error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end().catch(() => {});
}
