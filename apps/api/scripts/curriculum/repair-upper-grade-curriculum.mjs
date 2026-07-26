#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { gunzip } from 'node:zlib';
import { config as loadEnv } from 'dotenv';
import pg from 'pg';
import { loadCompletedGradePlan } from './import-kicd-corpus.mjs';

const { Pool } = pg;
const gunzipAsync = promisify(gunzip);
const apiDirectory = path.resolve(import.meta.dirname, '..', '..');
loadEnv({ path: path.join(apiDirectory, '.env') });

const LANGUAGE_SUBJECTS = new Set([
  'arabic',
  'english',
  'fasihi_ya_kiswahili',
  'french',
  'german',
  'indigenous_languages',
  'kiswahili',
  'literature_in_english',
  'mandarin',
]);

const SUBJECT_OVERRIDES = new Map(Object.entries({
  cre: { officialName: 'Christian Religious Education', displayName: 'CRE' },
  hre: { officialName: 'Hindu Religious Education', displayName: 'HRE' },
  ict: { officialName: 'Information and Communication Technology', displayName: 'ICT' },
  indigenous_languages: { officialName: 'Indigenous Languages', displayName: 'Indigenous Languages' },
  ire: { officialName: 'Islamic Religious Education', displayName: 'IRE' },
  kiswahili: { officialName: 'Kiswahili', displayName: 'Kiswahili' },
  mandarin: { officialName: 'Mandarin Chinese', displayName: 'Mandarin' },
  metalwork: { officialName: 'Metalwork', displayName: 'Metalwork' },
  science_and_technology: { officialName: 'Science and Technology', displayName: 'Science & Technology' },
  theatre_and_film: { officialName: 'Theatre and Film', displayName: 'Theatre & Film' },
  history_and_citizenship: { officialName: 'History and Citizenship', displayName: 'History & Citizenship' },
}));

const REVIEWED_STRAND_TITLES = new Map(Object.entries({
  'Grade 4|french|1.0': 'Listening and Speaking',
  'Grade 4|french|2.0': 'Reading',
  'Grade 4|french|3.0': 'Writing',
}));

const REVIEWED_LANGUAGE_TITLE_IDENTITIES = new Map(Object.entries({
  'Grade 4|english|grammarinuses': 'grammarinuse',
  'Grade 6|kiswahili|841': 'sarufi',
  'Grade 7|english|grammar': 'grammarinuse',
  'Grade 7|english|listening': 'listeningandspeaking',
  'Grade 9|english|intensivereading': 'reading',
  'Grade 9|english|intensivereadingplay': 'reading',
}));

function parseArgs(argv) {
  const options = { dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--dry-run') options.dryRun = true;
    else if (argv[index] === '--grade-dir' && argv[index + 1]) options.gradeDirectory = path.resolve(argv[++index]);
    else throw new Error('Usage: repair-upper-grade-curriculum.mjs --grade-dir <path> [--dry-run]');
  }
  if (!options.gradeDirectory) throw new Error('--grade-dir is required.');
  return options;
}

function normalizeAlias(value) {
  return String(value ?? '').trim().toLocaleLowerCase('en').replace(/[^a-z0-9]+/gu, '');
}

function normalizeSourceCode(value) {
  return String(value ?? '')
    .trim()
    .replace(/^KEN-CBC-G\d+-/iu, '')
    .toLocaleLowerCase('en')
    .replace(/[^a-z0-9]+/gu, '_')
    .replace(/^_+|_+$/gu, '');
}

export function canonicalSubjectCode(sourceCode) {
  const normalized = normalizeSourceCode(sourceCode)
    .replace(/_(cre|hre|ire|csl)$/u, '');
  if (normalized === 'christian_religious_education') return 'cre';
  if (normalized === 'hindu_religious_education') return 'hre';
  if (normalized === 'islamic_religious_education') return 'ire';
  if (normalized === 'indigenous_language' || normalized === 'indigenous_languages') return 'indigenous_languages';
  if (normalized === 'mandarin_chinese') return 'mandarin';
  return normalized;
}

function stableUuid(key) {
  const bytes = Buffer.from(createHash('sha256').update(key).digest('hex').slice(0, 32), 'hex');
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function readDataset(directory) {
  const jsonPath = path.join(directory, 'normalized-curriculum.json');
  try {
    return JSON.parse(await readFile(jsonPath, 'utf8'));
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    return JSON.parse((await gunzipAsync(await readFile(`${jsonPath}.gz`))).toString('utf8'));
  }
}

function datasetCounts(dataset) {
  const strands = (dataset.gradeSubjects ?? []).flatMap(subject => subject.strands ?? []);
  const subStrands = strands.flatMap(strand => strand.subStrands ?? []);
  return {
    gradeSubjects: dataset.gradeSubjects?.length ?? 0,
    strands: strands.length,
    subStrands: subStrands.length,
    outcomes: subStrands.reduce((total, item) => total + (item.outcomes?.length ?? 0), 0),
    inquiryQuestions: subStrands.reduce((total, item) => total + (item.inquiryQuestions?.length ?? 0), 0),
    learningActivities: subStrands.reduce((total, item) => total + (item.learningActivities?.length ?? 0), 0),
  };
}

function validateArtifacts(dataset, validationReport, importPolicy) {
  const grade = `Grade ${dataset.grade}`;
  if (!Number.isInteger(dataset.grade) || dataset.grade < 4 || dataset.grade > 12) {
    throw new Error('Only normalized Grades 4-12 can be repaired by this script.');
  }
  if (dataset.countryCode !== 'KEN' || dataset.curriculumCode !== 'CBC') {
    throw new Error('The current repair is restricted to the Kenya CBC source corpus.');
  }
  if (validationReport.status !== 'valid' || validationReport.errorCount !== 0) {
    throw new Error(`${grade} validation report is not valid.`);
  }
  const reportDatasetDigest = validationReport.inputHashes?.strictValidationLogicalDigest
    ?? validationReport.logicalDigest
    ?? validationReport.logicalDigestSha256;
  if (reportDatasetDigest !== dataset.logicalDigestSha256) {
    throw new Error(`${grade} normalized data does not match its validation logical digest.`);
  }
  if (importPolicy.scope?.grade !== grade || importPolicy.scope?.countryCode !== 'KEN'
      || importPolicy.scope?.curriculumCode !== 'CBC') {
    throw new Error(`${grade} import policy scope does not match the normalized artifact.`);
  }
  const expected = importPolicy.importerPolicy?.expectedCountsByGrade?.[grade];
  if (!expected) throw new Error(`${grade} import policy is missing expected counts.`);
  const actual = datasetCounts(dataset);
  for (const field of Object.keys(actual)) {
    if (expected[field] !== actual[field] || validationReport.counts?.[field] !== actual[field]) {
      throw new Error(`${grade} ${field} count mismatch across source artifacts.`);
    }
  }
  return grade;
}

export function canonicalGroups(subject) {
  const canonicalCode = canonicalSubjectCode(subject.subjectCode);
  const grade = subject.gradeLevel ?? (subject.grade ? `Grade ${subject.grade}` : '');
  const byTitle = new Map();
  for (const strand of subject.strands ?? []) {
    const sourceTitleKey = normalizeAlias(strand.title);
    const key = REVIEWED_LANGUAGE_TITLE_IDENTITIES.get(`${grade}|${canonicalCode}|${sourceTitleKey}`)
      ?? sourceTitleKey;
    const group = byTitle.get(key) ?? [];
    group.push(strand);
    byTitle.set(key, group);
  }
  const collapseRepeatedLanguageHierarchy = LANGUAGE_SUBJECTS.has(canonicalCode)
    && byTitle.size < (subject.strands?.length ?? 0)
    && [...byTitle.values()].every(group => group.length > 1);

  if (!collapseRepeatedLanguageHierarchy) {
    return (subject.strands ?? []).map((strand, position) => ({
      key: `source-${normalizeAlias(strand.code)}`,
      code: strand.code,
      title: REVIEWED_STRAND_TITLES.get(`${grade}|${canonicalCode}|${strand.code}`)
        ?? strand.title.trim(),
      position,
      sourceStrands: [strand],
      repairKind: 'source_hierarchy',
    }));
  }

  const firstPosition = new Map((subject.strands ?? []).map((strand, index) => [strand, index]));
  return [...byTitle.entries()]
    .map(([titleKey, sourceStrands]) => ({
      key: `group-${titleKey}`,
      code: null,
      title: sourceStrands[0].title.trim(),
      position: Math.min(...sourceStrands.map(strand => firstPosition.get(strand))),
      sourceStrands,
      repairKind: 'repeated_language_hierarchy',
    }))
    .sort((left, right) => left.position - right.position)
    .map((group, position) => ({ ...group, position }));
}

function subjectNames(subject) {
  const canonicalCode = canonicalSubjectCode(subject.subjectCode);
  const override = SUBJECT_OVERRIDES.get(canonicalCode);
  return {
    canonicalCode,
    officialName: override?.officialName ?? subject.subjectName.trim(),
    displayName: override?.displayName ?? subject.subjectName.trim(),
  };
}

function sourceSubIdentity(strand, subStrand) {
  const duplicates = (strand.subStrands ?? []).filter(item => item.code === subStrand.code);
  const alternate = subStrand.sourceVariance?.alternateInternalIdentity;
  if (duplicates.length > 1 && !alternate) {
    throw new Error(`Source strand ${strand.code} has duplicate sub-strand code ${subStrand.code} without an alternate identity.`);
  }
  return alternate ?? subStrand.code;
}

async function archiveChangedCanonicalStrands(client, grade, expectedByKey) {
  const current = await client.query(
    `SELECT * FROM curriculum_canonical_strands
     WHERE country_code = 'KEN' AND curriculum_code = 'CBC' AND grade_level = $1 AND is_active = TRUE`,
    [grade],
  );
  for (const row of current.rows) {
    const expected = expectedByKey.get(row.canonical_key);
    const changed = !expected || row.subject_code !== expected.subjectCode || row.code !== expected.code
      || row.title !== expected.title || row.position !== expected.position
      || row.active_source_release_id !== expected.releaseId;
    if (!changed) continue;
    await client.query(
      `INSERT INTO curriculum_record_revisions (
         entity_type, entity_id, country_code, curriculum_code, grade_level,
         subject_id, reason, source_reference, snapshot
       ) VALUES ('strand', $1, 'KEN', 'CBC', $2, $3,
                 'canonical-presentation-source-upgrade', $4::jsonb, $5::jsonb)`,
      [row.id, grade, row.subject_code, JSON.stringify(row.source_reference), JSON.stringify(row)],
    );
  }
}

async function archiveTopicIfChanged(client, current, expected) {
  if (!current) return true;
  const changed = current.sub_strand_id !== expected.subStrandId
    || current.canonical_strand_id !== expected.canonicalStrandId
    || current.code !== expected.code
    || current.title !== expected.title
    || current.display_order !== expected.displayOrder
    || current.subject_code !== expected.subjectCode
    || current.is_active !== true;
  if (!changed) return false;
  await client.query(
    `INSERT INTO curriculum_record_revisions (
       entity_type, entity_id, country_code, curriculum_code, grade_level,
       subject_id, reason, source_reference, snapshot
     ) VALUES ('topic', $1, 'KEN', 'CBC', $2, $3,
               'canonical-topic-source-upgrade', $4::jsonb, $5::jsonb)`,
    [current.id, expected.grade, expected.subjectCode, JSON.stringify(current.source_reference), JSON.stringify(current)],
  );
  return true;
}

export async function main(argv = process.argv.slice(2)) {
const options = parseArgs(argv);
if (!process.env.KITABU_DATABASE_URL) throw new Error('KITABU_DATABASE_URL is not set.');

const dataset = await readDataset(options.gradeDirectory);
const validationReport = await readJson(path.join(options.gradeDirectory, 'validation-report.json'));
const importPolicy = await readJson(path.join(options.gradeDirectory, 'import-policy.json'));
const grade = validateArtifacts(dataset, validationReport, importPolicy);
const completedPlan = await loadCompletedGradePlan(options.gradeDirectory);
if (completedPlan.grade !== grade) throw new Error(`${grade} completed import plan has a different grade scope.`);
const pool = new Pool({ connectionString: process.env.KITABU_DATABASE_URL });
const client = await pool.connect();

try {
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`kitabu:canonical-curriculum:KEN:CBC:${grade}`]);

  const releaseResult = await client.query(
    `SELECT id FROM curriculum_releases
     WHERE id = $1 AND metadata->'gradeScope' @> $2::jsonb`,
    [completedPlan.plan.releaseId, JSON.stringify([grade])],
  );
  if (releaseResult.rows.length !== 1) {
    throw new Error(`${grade} imported source release ${completedPlan.plan.releaseId} is missing.`);
  }
  const releaseId = releaseResult.rows[0].id;

  const sourceRows = await client.query(
    `SELECT cs.id AS strand_id, cs.subject_id, cs.subject_name, cs.number AS strand_code,
            cs.title AS strand_title, cs.position AS strand_position,
            cs.source_metadata AS strand_source_metadata,
            css.id AS sub_strand_id, css.number AS sub_strand_code,
            css.title AS sub_strand_title, css.position AS sub_strand_position,
            css.source_metadata AS sub_strand_source_metadata
     FROM curriculum_strands cs
     LEFT JOIN curriculum_sub_strands css ON css.strand_id = cs.id AND css.release_id = cs.release_id
     WHERE cs.release_id = $1 AND cs.country_code = 'KEN' AND cs.curriculum_code = 'CBC'
       AND cs.grade_level = $2
     ORDER BY cs.subject_id, cs.position, css.position`,
    [releaseId, grade],
  );
  const dbBySubjectAndStrand = new Map();
  for (const row of sourceRows.rows) {
    const key = `${row.subject_id}\0${row.strand_code}`;
    const strand = dbBySubjectAndStrand.get(key) ?? { ...row, subStrands: [] };
    if (row.sub_strand_id) strand.subStrands.push(row);
    dbBySubjectAndStrand.set(key, strand);
  }

  const aliases = new Map();
  const expectedStrands = [];
  const expectedTopics = [];
  for (const subject of dataset.gradeSubjects ?? []) {
    const names = subjectNames(subject);
    const sourceNames = [...new Set([subject.subjectName.trim(), names.officialName, names.displayName])];
    const sourceCodes = [...new Set([subject.subjectCode, names.canonicalCode])];
    const globalExisting = await client.query(
      `SELECT official_name, display_name, source_names FROM curriculum_subjects
       WHERE country_code = 'KEN' AND curriculum_code = 'CBC' AND subject_code = $1`,
      [names.canonicalCode],
    );
    const globalOfficial = globalExisting.rows[0]?.official_name ?? names.officialName;
    const globalDisplay = globalExisting.rows[0]?.display_name ?? names.displayName;
    const combinedSourceNames = [...new Set([
      ...(globalExisting.rows[0]?.source_names ?? []),
      ...sourceNames,
    ])].sort();
    await client.query(
      `INSERT INTO curriculum_subjects (
         country_code, curriculum_code, subject_code, official_name, display_name, source_names
       ) VALUES ('KEN', 'CBC', $1, $2, $3, $4::jsonb)
       ON CONFLICT (country_code, curriculum_code, subject_code) DO UPDATE
       SET source_names = EXCLUDED.source_names, updated_at = NOW()
       WHERE curriculum_subjects.source_names IS DISTINCT FROM EXCLUDED.source_names`,
      [names.canonicalCode, globalOfficial, globalDisplay, JSON.stringify(combinedSourceNames)],
    );
    await client.query(
      `INSERT INTO curriculum_grade_subject_identities (
         country_code, curriculum_code, grade_level, subject_code,
         official_name, display_name, source_names, source_codes,
         active_source_release_id, metadata
       ) VALUES ('KEN', 'CBC', $1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8::jsonb)
       ON CONFLICT (country_code, curriculum_code, grade_level, subject_code) DO UPDATE
       SET official_name = EXCLUDED.official_name,
           display_name = EXCLUDED.display_name,
           source_names = EXCLUDED.source_names,
           source_codes = EXCLUDED.source_codes,
           active_source_release_id = EXCLUDED.active_source_release_id,
           metadata = EXCLUDED.metadata,
           updated_at = NOW()
       WHERE (curriculum_grade_subject_identities.official_name,
              curriculum_grade_subject_identities.display_name,
              curriculum_grade_subject_identities.source_names,
              curriculum_grade_subject_identities.source_codes,
              curriculum_grade_subject_identities.active_source_release_id,
              curriculum_grade_subject_identities.metadata)
         IS DISTINCT FROM
             (EXCLUDED.official_name, EXCLUDED.display_name, EXCLUDED.source_names,
              EXCLUDED.source_codes, EXCLUDED.active_source_release_id, EXCLUDED.metadata)`,
      [
        grade,
        names.canonicalCode,
        names.officialName,
        names.displayName,
        JSON.stringify([subject.subjectName.trim()]),
        JSON.stringify([subject.subjectCode]),
        releaseId,
        JSON.stringify({ logicalDigest: dataset.logicalDigestSha256, sourceDocumentId: subject.sourceDocumentId ?? null }),
      ],
    );

    for (const alias of [...sourceNames, ...sourceCodes]) {
      const aliasKey = normalizeAlias(alias);
      const existing = aliases.get(aliasKey);
      if (existing && existing !== names.canonicalCode) {
        throw new Error(`${grade} alias ${alias} maps to both ${existing} and ${names.canonicalCode}.`);
      }
      aliases.set(aliasKey, names.canonicalCode);
      await client.query(
        `INSERT INTO curriculum_subject_aliases (
           country_code, curriculum_code, alias_key, alias_name, subject_code
         ) VALUES ('KEN', 'CBC', $1, $2, $3)
         ON CONFLICT (country_code, curriculum_code, alias_key) DO UPDATE
         SET alias_name = EXCLUDED.alias_name, subject_code = EXCLUDED.subject_code
         WHERE (curriculum_subject_aliases.alias_name, curriculum_subject_aliases.subject_code)
           IS DISTINCT FROM (EXCLUDED.alias_name, EXCLUDED.subject_code)`,
        [aliasKey, alias, names.canonicalCode],
      );
    }

    const groups = canonicalGroups(subject);
    for (const group of groups) {
      const canonicalKey = `${normalizeAlias(grade)}:${names.canonicalCode}:${group.key}`;
      const strandId = stableUuid(`kitabu:canonical-strand:KEN:CBC:${canonicalKey}`);
      const sourceReference = {
        logicalDigest: dataset.logicalDigestSha256,
        releaseId,
        repairKind: group.repairKind,
        sourceSubjectCode: subject.subjectCode,
        sourceSubjectName: subject.subjectName,
        sourceStrandCodes: group.sourceStrands.map(strand => strand.code),
        sourceStrandTitles: group.sourceStrands.map(strand => strand.title),
        sourceDocumentId: subject.sourceDocumentId ?? null,
      };
      expectedStrands.push({
        id: strandId,
        canonicalKey,
        subjectCode: names.canonicalCode,
        code: group.code,
        title: group.title,
        position: group.position,
        releaseId,
        sourceReference,
      });

      let topicPosition = 0;
      for (const sourceStrand of group.sourceStrands) {
        const databaseStrand = dbBySubjectAndStrand.get(`${subject.subjectCode}\0${sourceStrand.code}`);
        if (!databaseStrand) throw new Error(`${grade}/${subject.subjectCode} is missing source strand ${sourceStrand.code} in release ${releaseId}.`);
        if (databaseStrand.strand_title !== sourceStrand.title || databaseStrand.strand_position !== (sourceStrand.position ?? subject.strands.indexOf(sourceStrand) + 1)) {
          throw new Error(`${grade}/${subject.subjectCode}/${sourceStrand.code} does not match the immutable source release.`);
        }
        if (databaseStrand.subStrands.length !== (sourceStrand.subStrands?.length ?? 0)) {
          throw new Error(`${grade}/${subject.subjectCode}/${sourceStrand.code} sub-strand count does not match the immutable source release.`);
        }
        for (const [subIndex, subStrand] of (sourceStrand.subStrands ?? []).entries()) {
          const databaseSubStrand = databaseStrand.subStrands[subIndex];
          const expectedPosition = subStrand.position ?? subIndex + 1;
          if (databaseSubStrand.sub_strand_code !== subStrand.code
              || databaseSubStrand.sub_strand_title !== subStrand.title
              || databaseSubStrand.sub_strand_position !== expectedPosition) {
            throw new Error(`${grade}/${subject.subjectCode}/${sourceStrand.code}/${subStrand.code} does not match the immutable source release.`);
          }
          const internalIdentity = sourceSubIdentity(sourceStrand, subStrand);
          const topicKey = `${normalizeAlias(grade)}:${names.canonicalCode}:topic:${normalizeAlias(sourceStrand.code)}:${normalizeAlias(internalIdentity)}`;
          expectedTopics.push({
            id: stableUuid(`kitabu:canonical-topic:KEN:CBC:${topicKey}`),
            canonicalKey: topicKey,
            canonicalStrandId: strandId,
            subStrandId: databaseSubStrand.sub_strand_id,
            subjectCode: names.canonicalCode,
            grade,
            code: subStrand.code,
            title: subStrand.title.trim(),
            displayOrder: topicPosition++,
            sourceReference: {
              logicalDigest: dataset.logicalDigestSha256,
              releaseId,
              sourceSubjectCode: subject.subjectCode,
              sourceStrandCode: sourceStrand.code,
              sourceSubStrandCode: subStrand.code,
              sourceInternalIdentity: internalIdentity,
              sourceDocumentId: subject.sourceDocumentId ?? null,
              sourceIdentity: databaseSubStrand.sub_strand_source_metadata?.sourceIdentity ?? null,
            },
          });
        }
      }
    }
  }

  if (dbBySubjectAndStrand.size !== datasetCounts(dataset).strands) {
    throw new Error(`${grade} immutable source release contains ${dbBySubjectAndStrand.size} strands; expected ${datasetCounts(dataset).strands}.`);
  }

  const expectedByKey = new Map(expectedStrands.map(strand => [strand.canonicalKey, strand]));
  const expectedStrandKeys = [...expectedByKey.keys()];
  const expectedTopicKeys = expectedTopics.map(topic => topic.canonicalKey);
  await archiveChangedCanonicalStrands(client, grade, expectedByKey);
  await client.query(
    `UPDATE curriculum_canonical_strands SET is_active = FALSE, updated_at = NOW()
     WHERE country_code = 'KEN' AND curriculum_code = 'CBC' AND grade_level = $1
       AND is_active = TRUE AND canonical_key <> ALL($2::text[])`,
    [grade, expectedStrandKeys],
  );
  await client.query(
    `UPDATE curriculum_topics SET is_active = FALSE, updated_at = NOW()
     WHERE country_code = 'KEN' AND curriculum_code = 'CBC' AND grade_level = $1
       AND canonical_key IS NOT NULL AND is_active = TRUE
       AND canonical_key <> ALL($2::text[])`,
    [grade, expectedTopicKeys],
  );

  for (const strand of expectedStrands) {
    await client.query(
      `INSERT INTO curriculum_canonical_strands (
         id, country_code, curriculum_code, grade_level, subject_code,
         canonical_key, code, title, position, active_source_release_id,
         source_reference, is_active, updated_at
       ) VALUES ($1, 'KEN', 'CBC', $2, $3, $4, $5, $6, $7, $8, $9::jsonb, TRUE, NOW())
       ON CONFLICT (country_code, curriculum_code, grade_level, canonical_key) DO UPDATE
       SET subject_code = EXCLUDED.subject_code,
           code = EXCLUDED.code,
           title = EXCLUDED.title,
           position = EXCLUDED.position,
           active_source_release_id = EXCLUDED.active_source_release_id,
           source_reference = EXCLUDED.source_reference,
           is_active = TRUE,
           updated_at = NOW()
       WHERE (curriculum_canonical_strands.subject_code,
              curriculum_canonical_strands.code,
              curriculum_canonical_strands.title,
              curriculum_canonical_strands.position,
              curriculum_canonical_strands.active_source_release_id,
              curriculum_canonical_strands.source_reference,
              curriculum_canonical_strands.is_active)
         IS DISTINCT FROM
             (EXCLUDED.subject_code, EXCLUDED.code, EXCLUDED.title,
              EXCLUDED.position, EXCLUDED.active_source_release_id,
              EXCLUDED.source_reference, EXCLUDED.is_active)`,
      [
        strand.id,
        grade,
        strand.subjectCode,
        strand.canonicalKey,
        strand.code,
        strand.title,
        strand.position,
        strand.releaseId,
        JSON.stringify(strand.sourceReference),
      ],
    );
  }

  for (const topic of expectedTopics) {
    const currentResult = await client.query(
      `SELECT * FROM curriculum_topics
       WHERE (country_code = 'KEN' AND curriculum_code = 'CBC' AND grade_level = $1 AND canonical_key = $2)
          OR (sub_strand_id = $3 AND position = 0)
       ORDER BY CASE WHEN canonical_key = $2 THEN 0 ELSE 1 END
       LIMIT 1`,
      [grade, topic.canonicalKey, topic.subStrandId],
    );
    const current = currentResult.rows[0];
    const topicChanged = await archiveTopicIfChanged(client, current, topic);
    if (current) {
      if (!topicChanged) continue;
      await client.query(
        `UPDATE curriculum_topics
         SET sub_strand_id = $2,
             code = $3,
             title = $4,
             source_kind = 'official_sub_strand_root',
             source_reference = $5::jsonb,
             canonical_strand_id = $6,
             canonical_key = $7,
             country_code = 'KEN',
             curriculum_code = 'CBC',
             grade_level = $8,
             subject_code = $9,
             display_order = $10,
             is_active = TRUE,
             updated_at = NOW()
         WHERE id = $1`,
        [
          current.id,
          topic.subStrandId,
          topic.code,
          topic.title,
          JSON.stringify(topic.sourceReference),
          topic.canonicalStrandId,
          topic.canonicalKey,
          grade,
          topic.subjectCode,
          topic.displayOrder,
        ],
      );
    } else {
      await client.query(
        `INSERT INTO curriculum_topics (
           id, sub_strand_id, code, title, description, position,
           source_kind, source_reference, canonical_strand_id, canonical_key,
           country_code, curriculum_code, grade_level, subject_code,
           display_order, is_active, updated_at
         ) VALUES ($1, $2, $3, $4, NULL, 0, 'official_sub_strand_root', $5::jsonb,
                   $6, $7, 'KEN', 'CBC', $8, $9, $10, TRUE, NOW())`,
        [
          topic.id,
          topic.subStrandId,
          topic.code,
          topic.title,
          JSON.stringify(topic.sourceReference),
          topic.canonicalStrandId,
          topic.canonicalKey,
          grade,
          topic.subjectCode,
          topic.displayOrder,
        ],
      );
    }
  }

  const verification = await client.query(
    `SELECT
       (SELECT count(*)::int FROM curriculum_grade_subject_identities
        WHERE country_code = 'KEN' AND curriculum_code = 'CBC' AND grade_level = $1
          AND active_source_release_id = $2) AS subjects,
       (SELECT count(*)::int FROM curriculum_canonical_strands
        WHERE country_code = 'KEN' AND curriculum_code = 'CBC' AND grade_level = $1
          AND active_source_release_id = $2 AND is_active = TRUE) AS strands,
       (SELECT count(*)::int FROM curriculum_topics
        WHERE country_code = 'KEN' AND curriculum_code = 'CBC' AND grade_level = $1
          AND is_active = TRUE AND canonical_key IS NOT NULL) AS topics`,
    [grade, releaseId],
  );
  const actual = verification.rows[0];
  if (actual.subjects !== dataset.gradeSubjects.length
      || actual.strands !== expectedStrands.length
      || actual.topics !== expectedTopics.length) {
    throw new Error(`${grade} canonical verification failed: ${JSON.stringify(actual)}.`);
  }

  if (options.dryRun) await client.query('ROLLBACK');
  else await client.query('COMMIT');
  console.log(JSON.stringify({
    grade,
    dryRun: options.dryRun,
    releaseId,
    logicalDigest: dataset.logicalDigestSha256,
    source: datasetCounts(dataset),
    canonical: actual,
    collapsedSubjects: (dataset.gradeSubjects ?? [])
      .filter(subject => canonicalGroups(subject).some(group => group.repairKind === 'repeated_language_hierarchy'))
      .map(subject => canonicalSubjectCode(subject.subjectCode)),
  }));
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  throw error;
} finally {
  client.release();
  await pool.end();
}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
