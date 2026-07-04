#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..', '..', '..');
const apiRoot = path.join(repoRoot, 'apps', 'api');
const matrixPath = path.join(apiRoot, 'data', 'curriculum', 'expected-matrix', 'ETH', 'ENC.json');
const outputPath = path.join(apiRoot, 'data', 'book-creator', 'ethiopia-coverage-gaps.json');
const bookRoot = path.join(apiRoot, 'data', 'books', 'ETH', 'ENC');

loadEnv({ path: path.join(apiRoot, '.env'), override: false });

const { Pool } = pg;

function parseArgs(argv) {
  return argv.reduce(
    (options, arg) => {
      if (arg === '--no-write') options.write = false;
      return options;
    },
    { write: true }
  );
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
  if (sslMode === 'disable') return undefined;
  if (sslMode === 'require') return { rejectUnauthorized: false };
  return isLocalDatabaseUrl(databaseUrl) ? undefined : { rejectUnauthorized: false };
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'subject';
}

function gradeName(gradeNumber) {
  return `Grade ${gradeNumber}`;
}

function gradeCode(gradeNumber) {
  return `GRADE_${gradeNumber}`;
}

function localBookGradeCode(gradeNumber) {
  return `G${gradeNumber}`;
}

function keyFor(grade, subject, stream = null) {
  return `${grade.toLowerCase()}|${String(stream || '').toLowerCase()}|${subject.toLowerCase()}`;
}

function expandExpectedEntries(matrix) {
  return matrix.gradeBands.flatMap(band =>
    band.grades.flatMap(gradeNumber =>
      band.subjects.map(subject => ({
        country: matrix.country,
        curriculum: matrix.curriculum,
        grade: gradeName(gradeNumber),
        gradeCode: gradeCode(gradeNumber),
        localBookGradeCode: localBookGradeCode(gradeNumber),
        stream: band.stream || null,
        subject,
        subjectSlug: slugify(subject),
        frameworkBand: band.name
      }))
    )
  );
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listManifestPaths(root) {
  if (!(await pathExists(root))) return [];
  const result = [];
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && entry.name === 'manifest.json') {
        result.push(fullPath);
      }
    }
  }
  await walk(root);
  return result;
}

async function readGeneratedBooks() {
  const manifests = await listManifestPaths(bookRoot);
  const books = [];
  for (const manifestPath of manifests) {
    try {
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
      books.push({
        grade: manifest.grade,
        subject: manifest.subject,
        subjectSlug: manifest.subjectSlug || slugify(manifest.subject),
        contentStatus: manifest.contentStatus || manifest.status || null,
        generatorVersion: manifest.generatorVersion || null,
        path: path.relative(repoRoot, path.dirname(manifestPath)).split(path.sep).join('/'),
        pageCount: manifest.pageCount || null,
        wordCount: manifest.wordCount || null,
        sourceReviewStatus: manifest.sourceQuality?.reviewStatus || null
      });
    } catch (error) {
      books.push({
        grade: null,
        subject: null,
        subjectSlug: null,
        contentStatus: 'manifest-read-failed',
        generatorVersion: null,
        path: path.relative(repoRoot, path.dirname(manifestPath)).split(path.sep).join('/'),
        error: error.message
      });
    }
  }
  return books.sort((a, b) => `${a.grade} ${a.subject}`.localeCompare(`${b.grade} ${b.subject}`));
}

async function querySourceDocuments(client) {
  const result = await client.query(
    `
      select grade_code,
             coalesce(grade_local_level, local_level, grade_code) as grade,
             subject,
             count(*)::int as count,
             array_remove(array_agg(distinct review_status), null) as review_statuses,
             array_remove(array_agg(distinct source_url_status), null) as source_url_statuses
      from curriculum_source_documents
      where country_code = 'ETH'
        and curriculum_code = 'ENC'
        and subject <> '__SOURCE_INVENTORY__'
        and coalesce(review_status, '') <> 'rejected'
      group by grade_code, coalesce(grade_local_level, local_level, grade_code), subject
      order by grade_code, subject
    `
  );
  return result.rows;
}

async function queryNormalizedUnitCoverage(client) {
  const result = await client.query(
    `
      select cg.local_name as grade,
             csc.subject_name as subject,
             count(cu.id)::int as units
      from curriculum_units cu
      join curriculum_grade_subjects cgs on cgs.id = cu.grade_subject_id
      join curriculum_frameworks cf on cf.id = cgs.framework_id
      join curriculum_grades cg on cg.id = cgs.grade_id
      join curriculum_subject_catalog csc on csc.id = cgs.subject_id
      where cf.country_code = 'ETH'
        and cf.code = 'ENC'
      group by cg.local_name, csc.subject_name
      order by cg.local_name, csc.subject_name
    `
  );
  return result.rows;
}

function indexByGradeSubject(rows) {
  const map = new Map();
  for (const row of rows) {
    map.set(keyFor(row.grade, row.subject), row);
  }
  return map;
}

function buildEntries(expectedEntries, sourceDocuments, normalizedUnits, generatedBooks) {
  const sourceByKey = indexByGradeSubject(sourceDocuments);
  const unitsByKey = indexByGradeSubject(normalizedUnits);
  const booksByKey = indexByGradeSubject(generatedBooks);

  return expectedEntries.map(entry => {
    const key = keyFor(entry.grade, entry.subject);
    const source = sourceByKey.get(key);
    const units = unitsByKey.get(key);
    const book = booksByKey.get(key);
    const hasSourceDocument = Boolean(source?.count);
    const hasNormalizedUnits = Boolean(units?.units);
    const hasGeneratedBook = Boolean(book);
    let state = 'missing-source';
    if (hasGeneratedBook && (book.contentStatus || '').includes('ready-for-cover')) {
      state = 'ready-for-cover';
    } else if (hasGeneratedBook) {
      state = 'generated-draft';
    } else if (hasNormalizedUnits) {
      state = 'normalized-no-book';
    } else if (hasSourceDocument) {
      state = 'source-no-units';
    }

    return {
      ...entry,
      hasSourceDocument,
      sourceDocumentCount: source?.count || 0,
      sourceReviewStatuses: source?.review_statuses || [],
      sourceUrlStatuses: source?.source_url_statuses || [],
      hasNormalizedUnits,
      normalizedUnitCount: units?.units || 0,
      hasGeneratedBook,
      generatedBookStatus: book?.contentStatus || null,
      generatedBookPath: book?.path || null,
      generatorVersion: book?.generatorVersion || null,
      pageCount: book?.pageCount || null,
      wordCount: book?.wordCount || null,
      sourceReviewStatus: book?.sourceReviewStatus || null,
      state
    };
  });
}

function summarize(entries) {
  const byState = {};
  for (const entry of entries) {
    byState[entry.state] = (byState[entry.state] || 0) + 1;
  }
  return {
    totalExpectedEntries: entries.length,
    generatedDraftEntries: entries.filter(entry => entry.state === 'generated-draft').length,
    readyForCoverEntries: entries.filter(entry => entry.state === 'ready-for-cover').length,
    entriesWithSourceDocuments: entries.filter(entry => entry.hasSourceDocument).length,
    entriesWithNormalizedUnits: entries.filter(entry => entry.hasNormalizedUnits).length,
    missingGeneratedBooks: entries.filter(entry => !entry.hasGeneratedBook).length,
    missingSourceDocuments: entries.filter(entry => !entry.hasSourceDocument).length,
    missingNormalizedUnits: entries.filter(entry => !entry.hasNormalizedUnits).length,
    byState
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!process.env.KITABU_DATABASE_URL) {
    throw new Error('KITABU_DATABASE_URL is not set');
  }

  const matrix = JSON.parse(await fs.readFile(matrixPath, 'utf8'));
  const expectedEntries = expandExpectedEntries(matrix);
  const generatedBooks = await readGeneratedBooks();
  const pool = new Pool({
    connectionString: process.env.KITABU_DATABASE_URL,
    ssl: databaseSslOptions(process.env.KITABU_DATABASE_URL)
  });

  let sourceDocuments = [];
  let normalizedUnitCoverage = [];
  try {
    const client = await pool.connect();
    try {
      [sourceDocuments, normalizedUnitCoverage] = await Promise.all([
        querySourceDocuments(client),
        queryNormalizedUnitCoverage(client)
      ]);
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }

  const entries = buildEntries(expectedEntries, sourceDocuments, normalizedUnitCoverage, generatedBooks);
  const report = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    country: matrix.country,
    curriculum: matrix.curriculum,
    expectedMatrixPath: path.relative(repoRoot, matrixPath).split(path.sep).join('/'),
    sourceOfExpectedMatrix: matrix.sourceOfExpectedMatrix,
    readinessPolicy: matrix.readinessPolicy,
    summary: summarize(entries),
    gradeBands: matrix.gradeBands,
    generatedBooks,
    sourceDocumentsInDb: sourceDocuments,
    normalizedUnitCoverageInDb: normalizedUnitCoverage,
    entries
  };

  const json = `${JSON.stringify(report, null, 2)}\n`;
  if (options.write) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, json, 'utf8');
    console.log(`Wrote ${path.relative(repoRoot, outputPath).split(path.sep).join('/')}`);
  } else {
    console.log(json);
  }
  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
