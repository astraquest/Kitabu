#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import pg from 'pg';

const { Pool } = pg;
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(scriptDir, '../..');
const dataDir = path.resolve(apiDir, 'data/curriculum/KEN/CBC/kicd-2024-grade-1-3');
const dryRun = process.argv.includes('--dry-run');

loadEnv({ path: path.resolve(apiDir, '.env') });

const normalized = JSON.parse(readFileSync(path.join(dataDir, 'normalized-curriculum.json'), 'utf8'));
const sourcePages = JSON.parse(readFileSync(path.join(dataDir, 'source-pages.json'), 'utf8'));
const validationReport = JSON.parse(readFileSync(path.join(dataDir, 'validation-report.json'), 'utf8'));

const legacySubjectIds = new Map([
  ['creative_activities', 'creative_activities'],
  ['indigenous_language_activities', 'indigenous_languages'],
  ['christian_religious_education_activities', 'cre'],
  ['environmental_activities', 'environmental'],
  ['hindu_religious_education_activities', 'hre'],
  ['english_language_activities', 'english'],
  ['islamic_religious_education_activities', 'ire'],
  ['kiswahili_language_activities', 'kiswahili'],
  ['mathematical_activities', 'mathematics']
]);

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function stableUuid(key) {
  const bytes = Buffer.from(sha256(`kitabu:kicd:2024:${key}`).slice(0, 32), 'hex');
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function databaseSslOptions(databaseUrl) {
  const sslMode = process.env.KITABU_DATABASE_SSL_MODE?.trim() || 'auto';
  if (sslMode === 'disable') return undefined;
  if (sslMode === 'require') return { rejectUnauthorized: false };
  try {
    const host = new URL(databaseUrl).hostname;
    if (['localhost', '127.0.0.1', 'postgres'].includes(host)) return undefined;
  } catch {}
  return { rejectUnauthorized: false };
}

function flattenCurriculum() {
  const cells = [];
  const subStrands = [];
  for (const entry of normalized.gradeSubjects ?? []) {
    const key = `${entry.gradeLevel}:${entry.subjectCode}`;
    cells.push(key);
    for (const strand of entry.strands ?? []) {
      for (const subStrand of strand.subStrands ?? []) subStrands.push({ entry, strand, subStrand });
    }
  }
  return { cells, subStrands };
}

function validateData() {
  const errors = [];
  const { cells, subStrands } = flattenCurriculum();
  if (normalized.countryCode !== 'KEN' || normalized.curriculumCode !== 'CBC' || normalized.curriculumRevision !== '2024') {
    errors.push('Normalized corpus must be KEN/CBC revision 2024.');
  }
  if (normalized.sourceDocumentCount !== 8 || sourcePages.sourceDocuments?.length !== 8) errors.push('Expected eight official source documents.');
  if (normalized.sourcePageCount !== 1404) errors.push('Expected 1,404 captured source pages.');
  if (normalized.gradeSubjectCount !== 27 || cells.length !== 27 || new Set(cells).size !== 27) errors.push('Expected 27 unique grade-subject cells.');
  if (validationReport.status !== 'valid' || validationReport.issueCount !== 0 || normalized.validation?.status !== 'valid') {
    errors.push('The committed extraction validation report is not valid.');
  }
  const documents = new Map();
  let countedPages = 0;
  for (const document of sourcePages.sourceDocuments ?? []) {
    if (documents.has(document.fileId)) errors.push(`Duplicate source document ${document.fileId}.`);
    documents.set(document.fileId, document);
    if (document.pages?.length !== document.pageCount || document.capturedPageCount !== document.pageCount) {
      errors.push(`${document.slug}: captured page count mismatch.`);
    }
    countedPages += document.pages?.length ?? 0;
    const pageNumbers = new Set();
    for (const page of document.pages ?? []) {
      if (pageNumbers.has(page.pageNumber)) errors.push(`${document.slug}: duplicate page ${page.pageNumber}.`);
      pageNumbers.add(page.pageNumber);
      if (sha256(page.text) !== page.textSha256) errors.push(`${document.slug}: checksum mismatch on page ${page.pageNumber}.`);
    }
  }
  if (countedPages !== 1404) errors.push(`Captured source page total is ${countedPages}, expected 1,404.`);
  for (const { entry, strand, subStrand } of subStrands) {
    const prefix = `${entry.gradeLevel}:${entry.subjectCode}:${subStrand.code}`;
    if (!legacySubjectIds.has(entry.subjectCode)) errors.push(`${prefix}: no legacy subject mapping.`);
    if (!strand.title || !subStrand.title) errors.push(`${prefix}: missing title.`);
    if (!subStrand.lessonCount) errors.push(`${prefix}: missing suggested lesson count.`);
    if ((subStrand.outcomes ?? []).length < 2) errors.push(`${prefix}: incomplete outcomes.`);
    if ((subStrand.learningActivities ?? []).length < 1) errors.push(`${prefix}: missing learning activities.`);
    if (!documents.has(entry.sourceDocumentId)) errors.push(`${prefix}: missing source document.`);
    for (const page of subStrand.sourcePages ?? []) {
      if (page < entry.sourcePageStart || page > entry.sourcePageEnd) errors.push(`${prefix}: source page ${page} is outside the subject range.`);
    }
  }
  if (errors.length > 0) throw new Error(errors.join('\n'));
  return {
    sourceDocuments: sourcePages.sourceDocuments.length,
    sourcePages: countedPages,
    gradeSubjects: cells.length,
    strands: normalized.gradeSubjects.reduce((sum, entry) => sum + entry.strands.length, 0),
    subStrands: subStrands.length,
    outcomes: subStrands.reduce((sum, item) => sum + item.subStrand.outcomes.length, 0),
    inquiryQuestions: subStrands.reduce((sum, item) => sum + item.subStrand.inquiryQuestions.length, 0),
    learningActivities: subStrands.reduce((sum, item) => sum + item.subStrand.learningActivities.length, 0),
    warnings: normalized.validation.warnings.length
  };
}

async function upsertUnit(client, row) {
  await client.query(
    `INSERT INTO curriculum_units (
       id, grade_subject_id, parent_unit_id, local_unit_type, canonical_unit_type,
       local_code, title, description, sequence, suggested_periods, content_type,
       official_status, source_id, metadata, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'knowledge', 'official', $11, $12::jsonb, NOW())
     ON CONFLICT (id) DO UPDATE SET
       grade_subject_id = EXCLUDED.grade_subject_id,
       parent_unit_id = EXCLUDED.parent_unit_id,
       local_unit_type = EXCLUDED.local_unit_type,
       canonical_unit_type = EXCLUDED.canonical_unit_type,
       local_code = EXCLUDED.local_code,
       title = EXCLUDED.title,
       description = EXCLUDED.description,
       sequence = EXCLUDED.sequence,
       suggested_periods = EXCLUDED.suggested_periods,
       content_type = EXCLUDED.content_type,
       official_status = EXCLUDED.official_status,
       source_id = EXCLUDED.source_id,
       metadata = EXCLUDED.metadata,
       updated_at = NOW()`,
    [row.id, row.gradeSubjectId, row.parentId, row.localType, row.canonicalType, row.code, row.title, row.description ?? null, row.sequence, row.suggestedPeriods ?? null, row.sourceId, JSON.stringify(row.metadata)]
  );
}

async function syncSequencedRows(client, table, unitId, rows, insertRow) {
  for (const [index, row] of rows.entries()) await insertRow(row, index + 1);
  await client.query(`DELETE FROM ${table} WHERE unit_id = $1 AND sequence > $2`, [unitId, rows.length]);
}

async function importNormalizedCell(client, entry, frameworkId, gradeId, subjectId, sourceId) {
  const gradeSubjectResult = await client.query(
    `INSERT INTO curriculum_grade_subjects (framework_id, grade_id, subject_id, is_compulsory, display_order, source_id, updated_at)
     VALUES ($1, $2, $3, TRUE, $4, $5, NOW())
     ON CONFLICT (grade_id, subject_id) DO UPDATE SET
       framework_id = EXCLUDED.framework_id, is_compulsory = TRUE,
       display_order = EXCLUDED.display_order, source_id = EXCLUDED.source_id, updated_at = NOW()
     RETURNING id`,
    [frameworkId, gradeId, subjectId, entry.grade * 100 + [...legacySubjectIds.keys()].indexOf(entry.subjectCode), sourceId]
  );
  const gradeSubjectId = gradeSubjectResult.rows[0].id;
  const desiredUnitIds = [];
  const themeIds = new Map();

  for (const unit of entry.units ?? []) {
    const id = stableUuid(`normalized:${entry.gradeLevel}:${entry.subjectCode}:theme:${unit.code}`);
    desiredUnitIds.push(id);
    themeIds.set(unit.code, id);
    await upsertUnit(client, {
      id, gradeSubjectId, parentId: null, localType: 'theme', canonicalType: 'unit', code: unit.code,
      title: unit.title || unit.code, sequence: unit.position, sourceId,
      metadata: { countryCode: 'KEN', curriculumCode: 'CBC', revision: '2024', official: true }
    });
  }

  for (const strand of entry.strands) {
    const strandId = stableUuid(`normalized:${entry.gradeLevel}:${entry.subjectCode}:strand:${strand.code}`);
    desiredUnitIds.push(strandId);
    await upsertUnit(client, {
      id: strandId, gradeSubjectId, parentId: strand.unitCode ? themeIds.get(strand.unitCode) ?? null : null,
      localType: 'strand', canonicalType: 'strand', code: strand.code, title: strand.title,
      sequence: strand.position, sourceId,
      metadata: { countryCode: 'KEN', curriculumCode: 'CBC', revision: '2024', official: true, normalizationNotes: strand.normalizationNotes ?? [] }
    });
    for (const subStrand of strand.subStrands) {
      const unitId = stableUuid(`normalized:${entry.gradeLevel}:${entry.subjectCode}:sub-strand:${subStrand.code}`);
      desiredUnitIds.push(unitId);
      const provenance = {
        countryCode: 'KEN', curriculumCode: 'CBC', revision: '2024', official: true,
        sourceDocumentFileId: entry.sourceDocumentId, sourceUrl: entry.sourceUrl,
        sourcePages: subStrand.sourcePages, sourceTextSha256: subStrand.sourceTextSha256,
        printedCode: subStrand.printedCode, normalizationNotes: subStrand.normalizationNotes,
        coreCompetencies: subStrand.coreCompetencies, values: subStrand.values,
        pertinentContemporaryIssues: subStrand.pertinentContemporaryIssues,
        crossCurricularLinks: subStrand.crossCurricularLinks,
        assessmentRubric: subStrand.assessmentRubric
      };
      await upsertUnit(client, {
        id: unitId, gradeSubjectId, parentId: strandId, localType: 'sub-strand', canonicalType: 'sub_strand',
        code: subStrand.code, title: subStrand.title, sequence: subStrand.position,
        suggestedPeriods: subStrand.lessonCount, sourceId, metadata: provenance
      });
      await syncSequencedRows(client, 'curriculum_learning_outcomes', unitId, subStrand.outcomes, async (outcome, sequence) => {
        await client.query(
          `INSERT INTO curriculum_learning_outcomes (unit_id, local_type, statement, sequence, official_status, source_id, metadata, updated_at)
           VALUES ($1, 'expected_learning_outcome', $2, $3, 'official', $4, $5::jsonb, NOW())
           ON CONFLICT (unit_id, sequence) DO UPDATE SET statement = EXCLUDED.statement, local_type = EXCLUDED.local_type,
             official_status = 'official', source_id = EXCLUDED.source_id, metadata = EXCLUDED.metadata, updated_at = NOW()`,
          [unitId, outcome.statement, sequence, sourceId, JSON.stringify({ label: outcome.label ?? null, sourcePages: subStrand.sourcePages })]
        );
      });
      await syncSequencedRows(client, 'curriculum_inquiry_questions', unitId, subStrand.inquiryQuestions, async (question, sequence) => {
        await client.query(
          `INSERT INTO curriculum_inquiry_questions (unit_id, question, source_type, status, sequence, source_id, metadata, updated_at)
           VALUES ($1, $2, 'official', 'active', $3, $4, $5::jsonb, NOW())
           ON CONFLICT (unit_id, sequence) DO UPDATE SET question = EXCLUDED.question, source_type = 'official',
             status = 'active', source_id = EXCLUDED.source_id, metadata = EXCLUDED.metadata, updated_at = NOW()`,
          [unitId, question.question, sequence, sourceId, JSON.stringify({ sourcePages: subStrand.sourcePages })]
        );
      });
      await syncSequencedRows(client, 'curriculum_learning_activities', unitId, subStrand.learningActivities, async (activity, sequence) => {
        await client.query(
          `INSERT INTO curriculum_learning_activities (unit_id, activity_type, activity, sequence, source_id, metadata, updated_at)
           VALUES ($1, 'learning_experience', $2, $3, $4, $5::jsonb, NOW())
           ON CONFLICT (unit_id, sequence) DO UPDATE SET activity = EXCLUDED.activity, activity_type = 'learning_experience',
             source_id = EXCLUDED.source_id, metadata = EXCLUDED.metadata, updated_at = NOW()`,
          [unitId, activity.activity, sequence, sourceId, JSON.stringify({ sourcePages: subStrand.sourcePages })]
        );
      });
    }
  }
  await client.query(
    `DELETE FROM curriculum_units WHERE grade_subject_id = $1 AND source_id = $2 AND NOT (id = ANY($3::uuid[]))`,
    [gradeSubjectId, sourceId, desiredUnitIds]
  );
}

async function importLegacyCell(client, entry, sourceId) {
  const subjectId = legacySubjectIds.get(entry.subjectCode);
  const desiredStrandIds = entry.strands.map(strand => stableUuid(`legacy:${entry.gradeLevel}:${subjectId}:strand:${strand.code}`));
  await client.query(
    `DELETE FROM curriculum_strands
     WHERE country_code = 'KEN' AND curriculum_code = 'CBC' AND grade_level = $1 AND subject_id = $2
       AND NOT (id = ANY($3::uuid[]))`,
    [entry.gradeLevel, subjectId, desiredStrandIds]
  );
  const themes = new Map((entry.units ?? []).map(unit => [unit.code, unit.title]));
  for (const strand of entry.strands) {
    const strandId = stableUuid(`legacy:${entry.gradeLevel}:${subjectId}:strand:${strand.code}`);
    await client.query(
      `INSERT INTO curriculum_strands (
         id, country_code, curriculum_code, grade_level, subject_id, subject_name, number,
         title, sub_title, position, source_id, source_metadata, updated_at
       ) VALUES ($1, 'KEN', 'CBC', $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE SET country_code = 'KEN', curriculum_code = 'CBC', grade_level = EXCLUDED.grade_level,
         subject_id = EXCLUDED.subject_id, subject_name = EXCLUDED.subject_name, number = EXCLUDED.number,
         title = EXCLUDED.title, sub_title = EXCLUDED.sub_title, position = EXCLUDED.position,
         source_id = EXCLUDED.source_id, source_metadata = EXCLUDED.source_metadata, updated_at = NOW()`,
      [strandId, entry.gradeLevel, subjectId, entry.subjectName, strand.code, strand.title, themes.get(strand.unitCode) ?? '', strand.position, sourceId, JSON.stringify({ revision: '2024', sourceDocumentFileId: entry.sourceDocumentId, unitCode: strand.unitCode ?? null, normalizationNotes: strand.normalizationNotes ?? [] })]
    );
    const desiredSubStrandIds = strand.subStrands.map(subStrand => stableUuid(`legacy:${entry.gradeLevel}:${subjectId}:sub-strand:${subStrand.code}`));
    await client.query(`DELETE FROM curriculum_sub_strands WHERE strand_id = $1 AND NOT (id = ANY($2::uuid[]))`, [strandId, desiredSubStrandIds]);
    for (const subStrand of strand.subStrands) {
      const subStrandId = stableUuid(`legacy:${entry.gradeLevel}:${subjectId}:sub-strand:${subStrand.code}`);
      const outcomes = subStrand.outcomes.map((item, index) => ({ id: `${subStrandId}-outcome-${index + 1}`, text: item.statement }));
      const questions = subStrand.inquiryQuestions.map((item, index) => ({ id: `${subStrandId}-question-${index + 1}`, text: item.question }));
      const sourceMetadata = {
        revision: '2024', official: true, sourceDocumentFileId: entry.sourceDocumentId,
        sourceUrl: entry.sourceUrl, sourcePages: subStrand.sourcePages,
        sourceTextSha256: subStrand.sourceTextSha256, printedCode: subStrand.printedCode,
        normalizationNotes: subStrand.normalizationNotes
      };
      await client.query(
        `INSERT INTO curriculum_sub_strands (
           id, strand_id, number, title, type, description, position, outcomes, inquiry_questions, pages,
           suggested_lessons, learning_activities, core_competencies, curriculum_values,
           pertinent_contemporary_issues, cross_curricular_links, source_id, source_metadata, updated_at
         ) VALUES ($1, $2, $3, $4, 'knowledge', $5, $6, $7::jsonb, $8::jsonb, '[]'::jsonb,
           $9, $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb, $15, $16::jsonb, NOW())
         ON CONFLICT (id) DO UPDATE SET strand_id = EXCLUDED.strand_id, number = EXCLUDED.number, title = EXCLUDED.title,
           type = EXCLUDED.type, description = EXCLUDED.description, position = EXCLUDED.position,
           outcomes = EXCLUDED.outcomes, inquiry_questions = EXCLUDED.inquiry_questions,
           suggested_lessons = EXCLUDED.suggested_lessons, learning_activities = EXCLUDED.learning_activities,
           core_competencies = EXCLUDED.core_competencies, curriculum_values = EXCLUDED.curriculum_values,
           pertinent_contemporary_issues = EXCLUDED.pertinent_contemporary_issues,
           cross_curricular_links = EXCLUDED.cross_curricular_links, source_id = EXCLUDED.source_id,
           source_metadata = EXCLUDED.source_metadata, updated_at = NOW()`,
        [subStrandId, strandId, subStrand.code, subStrand.title, `Official KICD 2024 curriculum design; ${subStrand.lessonCount} suggested lessons.`, subStrand.position, JSON.stringify(outcomes), JSON.stringify(questions), subStrand.lessonCount, JSON.stringify(subStrand.learningActivities), JSON.stringify(subStrand.coreCompetencies), JSON.stringify(subStrand.values), JSON.stringify(subStrand.pertinentContemporaryIssues), JSON.stringify(subStrand.crossCurricularLinks), sourceId, JSON.stringify(sourceMetadata)]
      );
    }
  }
}

async function importCorpus(client, stats) {
  await client.query(`INSERT INTO curriculum_countries (code, name, default_curriculum_code) VALUES ('KEN', 'Kenya', 'CBC') ON CONFLICT (code) DO UPDATE SET name = 'Kenya', default_curriculum_code = 'CBC', updated_at = NOW()`);
  const runResult = await client.query(
    `INSERT INTO curriculum_ingestion_runs (run_type, status, data_version, summary, country_code, curriculum_code, run_key)
     VALUES ('official_kicd_lower_primary', 'running', 1, $1::jsonb, 'KEN', 'CBC', $2) RETURNING id`,
    [JSON.stringify({ ...stats, extractionVersion: normalized.extractionVersion }), `KEN:CBC:2024:grades-1-3:${sha256(JSON.stringify(stats)).slice(0, 16)}`]
  );
  const runId = runResult.rows[0].id;
  const sourceResult = await client.query(
    `INSERT INTO curriculum_sources (country_code, publisher, title, year, url, accessed_on, notes, updated_at)
     VALUES ('KEN', $1, $2, 2024, $3, CURRENT_DATE, $4, NOW())
     ON CONFLICT (country_code, publisher, title) DO UPDATE SET year = 2024, url = EXCLUDED.url,
       accessed_on = CURRENT_DATE, notes = EXCLUDED.notes, updated_at = NOW() RETURNING id`,
    [normalized.publisher, 'Revised Lower Primary Curriculum Designs (Grades 1–3, 2024)', normalized.officialListingUrl, `Official KICD corpus captured page-by-page; extraction ${normalized.extractionVersion}. Source warnings: ${normalized.validation.warnings.join(' | ')}`]
  );
  const sourceId = sourceResult.rows[0].id;

  for (const document of sourcePages.sourceDocuments) {
    const documentResult = await client.query(
      `INSERT INTO curriculum_source_documents (
         country_code, curriculum_code, grade_local_level, subject, official_title, publisher,
         edition_year, source_url, downloaded_file_checksum, extraction_status, review_status,
         last_processed_page, metadata, run_id, grade_code, local_level, source_url_status, updated_at
       ) VALUES ('KEN', 'CBC', 'Grade 1-3', $1, $2, $3, 2024, $4, $5, 'seeded', 'approved', $6, $7::jsonb, $8, 'G1-G3', 'Lower Primary', 'official', NOW())
       ON CONFLICT (country_code, curriculum_code, grade_local_level, subject, official_title) DO UPDATE SET
         publisher = EXCLUDED.publisher, edition_year = 2024, source_url = EXCLUDED.source_url,
         downloaded_file_checksum = EXCLUDED.downloaded_file_checksum, extraction_status = 'seeded',
         review_status = 'approved', last_processed_page = EXCLUDED.last_processed_page,
         metadata = EXCLUDED.metadata, run_id = EXCLUDED.run_id, updated_at = NOW() RETURNING id`,
      [document.slug, document.title, normalized.publisher, document.sourceUrl, document.captureSha256, document.pageCount, JSON.stringify({ fileId: document.fileId, slug: document.slug, officialListingUrl: document.officialListingUrl, modifiedTime: document.modifiedTime, fileSize: document.fileSize, pageCount: document.pageCount, blankPages: document.blankPages, captureSha256: document.captureSha256 }), runId]
    );
    const documentId = documentResult.rows[0].id;
    for (const page of document.pages) {
      await client.query(
        `INSERT INTO curriculum_extraction_rows (
           source_document_id, page_number, row_order, detected_headers, raw_text,
           extraction_confidence, parser_name, parser_version, status, metadata, normalized_payload, updated_at
         ) VALUES ($1, $2, 1, '[]'::jsonb, $3, 1.0, 'kicd-drive-viewer-text', $4, 'seeded', $5::jsonb, '{}'::jsonb, NOW())
         ON CONFLICT (source_document_id, page_number, row_order) DO UPDATE SET raw_text = EXCLUDED.raw_text,
           extraction_confidence = 1.0, parser_name = EXCLUDED.parser_name, parser_version = EXCLUDED.parser_version,
           status = 'seeded', metadata = EXCLUDED.metadata, updated_at = NOW()`,
        [documentId, page.pageNumber, page.text, normalized.extractionVersion, JSON.stringify({ textSha256: page.textSha256, blank: !page.text.trim() })]
      );
    }
    await client.query(`DELETE FROM curriculum_extraction_rows WHERE source_document_id = $1 AND (row_order <> 1 OR page_number > $2)`, [documentId, document.pageCount]);
  }

  const frameworkResult = await client.query(
    `INSERT INTO curriculum_frameworks (country_code, code, name, publisher, status, effective_from, source_id, notes, updated_at)
     VALUES ('KEN', 'CBC', 'Competency Based Curriculum', $1, 'active', DATE '2024-01-01', $2, $3, NOW())
     ON CONFLICT (country_code, code) DO UPDATE SET name = EXCLUDED.name, publisher = EXCLUDED.publisher,
       status = 'active', effective_from = EXCLUDED.effective_from, source_id = EXCLUDED.source_id,
       notes = EXCLUDED.notes, updated_at = NOW() RETURNING id`,
    [normalized.publisher, sourceId, 'KICD Revised Lower Primary Curriculum Designs, Grades 1–3, 2024.']
  );
  const frameworkId = frameworkResult.rows[0].id;
  const gradeIds = new Map();
  for (const grade of [1, 2, 3]) {
    const result = await client.query(
      `INSERT INTO curriculum_grades (framework_id, grade_code, local_name, canonical_stage, sequence, typical_age_min, typical_age_max, source_id, updated_at)
       VALUES ($1, $2, $3, 'lower_primary', $4, $5, $6, $7, NOW())
       ON CONFLICT (framework_id, grade_code) DO UPDATE SET local_name = EXCLUDED.local_name,
         canonical_stage = 'lower_primary', sequence = EXCLUDED.sequence, typical_age_min = EXCLUDED.typical_age_min,
         typical_age_max = EXCLUDED.typical_age_max, source_id = EXCLUDED.source_id, updated_at = NOW() RETURNING id`,
      [frameworkId, `G${grade}`, `Grade ${grade}`, grade, grade + 5, grade + 6, sourceId]
    );
    gradeIds.set(grade, result.rows[0].id);
  }
  const subjectIds = new Map();
  for (const entry of normalized.gradeSubjects.filter(item => item.grade === 1)) {
    const result = await client.query(
      `INSERT INTO curriculum_subject_catalog (country_code, subject_code, subject_name, learning_area, language_code, source_id, updated_at)
       VALUES ('KEN', $1, $2, $2, $3, $4, NOW())
       ON CONFLICT (country_code, subject_code) DO UPDATE SET subject_name = EXCLUDED.subject_name,
         learning_area = EXCLUDED.learning_area, language_code = EXCLUDED.language_code,
         source_id = EXCLUDED.source_id, updated_at = NOW() RETURNING id`,
      [entry.subjectCode, entry.subjectName, entry.subjectCode.includes('language') ? (entry.subjectCode.startsWith('kiswahili') ? 'sw' : entry.subjectCode.startsWith('english') ? 'en' : null) : null, sourceId]
    );
    subjectIds.set(entry.subjectCode, result.rows[0].id);
  }
  for (const entry of normalized.gradeSubjects) {
    await importNormalizedCell(client, entry, frameworkId, gradeIds.get(entry.grade), subjectIds.get(entry.subjectCode), sourceId);
    await importLegacyCell(client, entry, sourceId);
  }
  await client.query(`DELETE FROM curriculum_strands WHERE country_code = 'KEN' AND curriculum_code = 'CBC' AND grade_level IN ('Grade 1', 'Grade 2', 'Grade 3') AND subject_id = 'hygiene_nutrition' AND source_id IS NULL`);

  const mappings = [
    ['strand', 'Strand'], ['sub_strand', 'Sub-Strand'],
    ['learning_outcome', 'Specific Learning Outcome'], ['inquiry_question', 'Key Inquiry Question']
  ];
  for (const [canonicalField, localTerm] of mappings) {
    await client.query(
      `INSERT INTO curriculum_term_mappings (country_code, framework_id, canonical_field, local_term, applies_to, required, source_id, updated_at)
       VALUES ('KEN', $1, $2, $3, 'Lower Primary Grades 1-3', TRUE, $4, NOW())
       ON CONFLICT (country_code, framework_id, canonical_field, local_term) DO UPDATE SET
         applies_to = EXCLUDED.applies_to, required = TRUE, source_id = EXCLUDED.source_id, updated_at = NOW()`,
      [frameworkId, canonicalField, localTerm, sourceId]
    );
  }
  await client.query(
    `INSERT INTO curriculum_coverage_reports (country_code, curriculum_code, report_key, status, report, updated_at)
     VALUES ('KEN', 'CBC', 'KEN:CBC:2024:grades-1-3', $1, $2::jsonb, NOW())
     ON CONFLICT (report_key) DO UPDATE SET status = EXCLUDED.status, report = EXCLUDED.report, updated_at = NOW()`,
    [stats.warnings > 0 ? 'gap_documented' : 'approved', JSON.stringify({ ...stats, validation: normalized.validation, extractionVersion: normalized.extractionVersion, generatedAt: normalized.generatedAt })]
  );
  await client.query(
    `UPDATE curriculum_ingestion_runs SET status = 'completed', summary = $2::jsonb, completed_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [runId, JSON.stringify({ ...stats, sourceId })]
  );
  return { runId, sourceId };
}

async function verifyImportedCounts(client, stats, sourceId) {
  const result = await client.query(`
    select
      (select count(*)::int from curriculum_source_documents where country_code = 'KEN' and curriculum_code = 'CBC' and edition_year = 2024 and grade_local_level = 'Grade 1-3') as source_documents,
      (select count(*)::int from curriculum_extraction_rows cer join curriculum_source_documents csd on csd.id = cer.source_document_id where csd.country_code = 'KEN' and csd.curriculum_code = 'CBC' and csd.edition_year = 2024 and csd.grade_local_level = 'Grade 1-3') as source_pages,
      (select count(*)::int from curriculum_strands where source_id = $1 and country_code = 'KEN' and curriculum_code = 'CBC' and grade_level in ('Grade 1','Grade 2','Grade 3')) as legacy_strands,
      (select count(*)::int from curriculum_sub_strands css join curriculum_strands cs on cs.id = css.strand_id where cs.source_id = $1) as legacy_sub_strands,
      (select coalesce(sum(jsonb_array_length(css.outcomes)),0)::int from curriculum_sub_strands css join curriculum_strands cs on cs.id = css.strand_id where cs.source_id = $1) as legacy_outcomes,
      (select coalesce(sum(jsonb_array_length(css.inquiry_questions)),0)::int from curriculum_sub_strands css join curriculum_strands cs on cs.id = css.strand_id where cs.source_id = $1) as legacy_questions,
      (select count(*)::int from curriculum_units where source_id = $1 and canonical_unit_type = 'sub_strand') as normalized_sub_strands,
      (select count(*)::int from curriculum_learning_outcomes where source_id = $1) as normalized_outcomes,
      (select count(*)::int from curriculum_inquiry_questions where source_id = $1) as normalized_questions,
      (select count(*)::int from curriculum_learning_activities where source_id = $1) as normalized_activities
  `, [sourceId]);
  const actual = result.rows[0];
  const expected = {
    source_documents: stats.sourceDocuments, source_pages: stats.sourcePages,
    legacy_strands: stats.strands, legacy_sub_strands: stats.subStrands,
    legacy_outcomes: stats.outcomes, legacy_questions: stats.inquiryQuestions,
    normalized_sub_strands: stats.subStrands, normalized_outcomes: stats.outcomes,
    normalized_questions: stats.inquiryQuestions, normalized_activities: stats.learningActivities
  };
  for (const [key, value] of Object.entries(expected)) {
    if (actual[key] !== value) throw new Error(`Post-import verification failed for ${key}: got ${actual[key]}, expected ${value}.`);
  }
  return actual;
}

const stats = validateData();
if (dryRun) {
  console.log(`KICD Grade 1-3 validation passed: ${stats.sourceDocuments} documents, ${stats.sourcePages} pages, ${stats.gradeSubjects} grade-subject cells, ${stats.strands} strands, ${stats.subStrands} sub-strands, ${stats.outcomes} outcomes, ${stats.inquiryQuestions} inquiry questions, ${stats.learningActivities} learning activities, ${stats.warnings} documented source warnings.`);
  process.exit(0);
}
if (!process.env.KITABU_DATABASE_URL) throw new Error('KITABU_DATABASE_URL is required unless --dry-run is used.');

const pool = new Pool({ connectionString: process.env.KITABU_DATABASE_URL, ssl: databaseSslOptions(process.env.KITABU_DATABASE_URL) });
const client = await pool.connect();
try {
  await client.query('BEGIN');
  const identifiers = await importCorpus(client, stats);
  const counts = await verifyImportedCounts(client, stats, identifiers.sourceId);
  await client.query('COMMIT');
  console.log(`Imported KICD Grade 1-3 corpus in run ${identifiers.runId}. Verified ${counts.source_documents} documents, ${counts.source_pages} pages, ${counts.legacy_sub_strands} sub-strands, ${counts.legacy_outcomes} outcomes, and ${counts.legacy_questions} inquiry questions.`);
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  console.error('KICD Grade 1-3 import failed; the transaction was rolled back.');
  console.error(error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end().catch(() => {});
}
