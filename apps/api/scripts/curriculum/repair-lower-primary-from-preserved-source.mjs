import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import pg from 'pg';

const { Pool } = pg;
const apiDir = path.resolve(import.meta.dirname, '..', '..');
loadEnv({ path: path.join(apiDir, '.env') });

const argumentsList = process.argv.slice(2);
const dryRun = argumentsList.includes('--dry-run');
const positionalArguments = argumentsList.filter(value => value !== '--dry-run');
const sourcePath = positionalArguments[0];
const targetGrade = Number(positionalArguments[1] ?? 1);
const gradeLabel = `Grade ${targetGrade}`;
if (!sourcePath) {
  throw new Error('Usage: node repair-lower-primary-from-preserved-source.mjs <normalized-curriculum.json> [grade]');
}
if (![1, 2, 3].includes(targetGrade)) throw new Error('Grade must be 1, 2, or 3.');
if (!process.env.KITABU_DATABASE_URL) {
  throw new Error('KITABU_DATABASE_URL is not set.');
}

const subjectIds = new Map([
  ['Creative Activities', 'creative_activities'],
  ['Indigenous Language Activities', 'indigenous_languages'],
  ['Christian Religious Education Activities', 'cre'],
  ['Environmental Activities', 'environmental'],
  ['Hindu Religious Education Activities', 'hre'],
  ['English Language Activities', 'english'],
  ['Islamic Religious Education Activities', 'ire'],
  ['Kiswahili Language Activities', 'kiswahili'],
  ['Mathematical Activities', 'mathematics'],
]);
const languageSubjectNames = new Set([
  'English Language Activities',
  'Kiswahili Language Activities',
  'Indigenous Language Activities',
]);

const source = JSON.parse(await readFile(path.resolve(sourcePath), 'utf8'));
const gradeSubjects = (source.gradeSubjects ?? []).filter(
  item => item.grade === targetGrade && subjectIds.has(item.subjectName) && !languageSubjectNames.has(item.subjectName),
);
const expectedSubjectCount = subjectIds.size - languageSubjectNames.size;
if (gradeSubjects.length !== expectedSubjectCount) {
  throw new Error(`Expected ${expectedSubjectCount} mapped non-language ${gradeLabel} subjects, found ${gradeSubjects.length}.`);
}

const pool = new Pool({ connectionString: process.env.KITABU_DATABASE_URL });
const client = await pool.connect();

function items(values, field) {
  return (values ?? []).map((value, index) => ({
    id: `${field}-${index + 1}`,
    text: String(value.statement ?? value.question ?? value.text ?? '').trim(),
  })).filter(value => value.text);
}

async function archive(entityType, entityId, subjectId, snapshot, sourceReference) {
  await client.query(
    `INSERT INTO curriculum_record_revisions (
       entity_type, entity_id, country_code, curriculum_code, grade_level,
       subject_id, reason, source_reference, snapshot
     ) VALUES ($1, $2, 'KEN', 'CBC', $3, $4, $5, $6::jsonb, $7::jsonb)`,
    [entityType, entityId, gradeLabel, subjectId, 'lower-primary-preserved-source-repair', JSON.stringify(sourceReference), JSON.stringify(snapshot)],
  );
}

try {
  await client.query('BEGIN');
  let strandCount = 0;
  let subStrandCount = 0;

  for (const subject of gradeSubjects) {
    const subjectId = subjectIds.get(subject.subjectName);
    const expectedSubStrands = (subject.strands ?? []).reduce(
      (total, strand) => total + (strand.subStrands?.length ?? 0),
      0,
    );
    const activeState = await client.query(
      `SELECT cs.number, cs.title,
              count(css.id) FILTER (WHERE css.is_active)::int AS sub_strands
       FROM curriculum_strands cs
       LEFT JOIN curriculum_sub_strands css ON css.strand_id = cs.id
       WHERE cs.country_code = 'KEN' AND cs.curriculum_code = 'CBC'
         AND cs.grade_level = $2 AND cs.subject_id = $1 AND cs.is_active = TRUE
       GROUP BY cs.id, cs.number, cs.title`,
      [subjectId, gradeLabel],
    );
    const activeSubStrands = activeState.rows.reduce((total, strand) => total + strand.sub_strands, 0);
    const alreadyCanonical =
      activeState.rows.length === (subject.strands?.length ?? 0) &&
      activeSubStrands === expectedSubStrands &&
      (subject.strands ?? []).every(sourceStrand =>
        activeState.rows.some(activeStrand =>
          activeStrand.number === sourceStrand.code && activeStrand.title === sourceStrand.title.trim()
        )
      );
    if (alreadyCanonical) {
      strandCount += activeState.rows.length;
      subStrandCount += activeSubStrands;
      continue;
    }
    // Move the current ordering out of the authoritative range first. This avoids
    // transient unique-position conflicts while existing IDs are moved to their
    // official strand/sub-strand positions inside the same transaction.
    await client.query(
      `WITH offset_value AS (
         SELECT COALESCE(MAX(position), 0) + 10000 AS amount
         FROM curriculum_strands
         WHERE country_code = 'KEN' AND curriculum_code = 'CBC'
           AND grade_level = $2 AND subject_id = $1
       )
       UPDATE curriculum_strands
       SET position = position + offset_value.amount, is_active = FALSE
       FROM offset_value
       WHERE country_code = 'KEN' AND curriculum_code = 'CBC'
         AND grade_level = $2 AND subject_id = $1 AND is_active = TRUE`,
      [subjectId, gradeLabel],
    );
    await client.query(
      `WITH offset_value AS (
         SELECT COALESCE(MAX(css.position), 0) + 10000 AS amount
         FROM curriculum_sub_strands css
         JOIN curriculum_strands cs ON cs.id = css.strand_id
         WHERE cs.country_code = 'KEN' AND cs.curriculum_code = 'CBC'
           AND cs.grade_level = $2 AND cs.subject_id = $1
       )
       UPDATE curriculum_sub_strands css
       SET position = css.position + offset_value.amount, is_active = FALSE
       FROM curriculum_strands cs, offset_value
       WHERE cs.id = css.strand_id
         AND cs.country_code = 'KEN' AND cs.curriculum_code = 'CBC'
         AND cs.grade_level = $2 AND cs.subject_id = $1 AND css.is_active = TRUE`,
      [subjectId, gradeLabel],
    );

    for (const strand of subject.strands ?? []) {
      const strandReference = {
        sourcePath: path.basename(sourcePath),
        sourceDocument: subject.sourceDocument,
        sourcePages: strand.sourcePages ?? [],
      };
      const existingStrand = await client.query(
        `SELECT * FROM curriculum_strands
         WHERE country_code = 'KEN' AND curriculum_code = 'CBC'
           AND grade_level = $3 AND subject_id = $1 AND number = $2
         ORDER BY created_at ASC LIMIT 1`,
        [subjectId, strand.code, gradeLabel],
      );

      let strandId;
      if (existingStrand.rows[0]) {
        strandId = existingStrand.rows[0].id;
        await archive('strand', strandId, subjectId, existingStrand.rows[0], strandReference);
        await client.query(
          `UPDATE curriculum_strands
           SET subject_name = $2, title = $3, position = $4, is_active = TRUE,
               source_metadata = COALESCE(source_metadata, '{}'::jsonb) || $5::jsonb,
               updated_at = NOW()
           WHERE id = $1`,
          [strandId, subject.subjectName, strand.title.trim(), strand.position, JSON.stringify(strandReference)],
        );
      } else {
        const inserted = await client.query(
          `INSERT INTO curriculum_strands (
             country_code, curriculum_code, grade_level, subject_id, subject_name,
             number, title, sub_title, position, source_metadata, updated_at
           ) VALUES ('KEN', 'CBC', $7, $1, $2, $3, $4, '', $5, $6::jsonb, NOW())
           RETURNING id`,
          [subjectId, subject.subjectName, strand.code, strand.title.trim(), strand.position, JSON.stringify(strandReference), gradeLabel],
        );
        strandId = inserted.rows[0].id;
      }
      strandCount += 1;

      for (const subStrand of strand.subStrands ?? []) {
        const sourceReference = {
          sourcePath: path.basename(sourcePath),
          sourcePages: subStrand.sourcePages ?? [],
          sourcePageStart: subStrand.sourcePageStart,
          sourcePageEnd: subStrand.sourcePageEnd,
          sourceTextSha256: subStrand.sourceTextSha256,
          printedCode: subStrand.printedCode,
        };
        const existingSubStrand = await client.query(
          `SELECT css.* FROM curriculum_sub_strands css
           JOIN curriculum_strands cs ON cs.id = css.strand_id
           WHERE cs.country_code = 'KEN' AND cs.curriculum_code = 'CBC'
             AND cs.grade_level = $3 AND cs.subject_id = $1 AND css.number = $2
           ORDER BY css.created_at ASC LIMIT 1`,
          [subjectId, subStrand.code, gradeLabel],
        );
        let subStrandId;
        if (existingSubStrand.rows[0]) {
          subStrandId = existingSubStrand.rows[0].id;
          await archive('sub_strand', subStrandId, subjectId, existingSubStrand.rows[0], sourceReference);
          await client.query(
            `UPDATE curriculum_sub_strands
             SET strand_id = $2, title = $3, position = $4, is_active = TRUE,
                 outcomes = $5::jsonb, inquiry_questions = $6::jsonb, updated_at = NOW()
             WHERE id = $1`,
            [
              subStrandId,
              strandId,
              subStrand.title.trim(),
              subStrand.position,
              JSON.stringify(items(subStrand.outcomes, 'outcome')),
              JSON.stringify(items(subStrand.inquiryQuestions, 'inquiry')),
            ],
          );
        } else {
          const inserted = await client.query(
            `INSERT INTO curriculum_sub_strands (
               strand_id, number, title, type, description, position,
               outcomes, inquiry_questions, pages, updated_at
             ) VALUES ($1, $2, $3, 'knowledge', NULL, $4, $5::jsonb, $6::jsonb, '[]'::jsonb, NOW())
             RETURNING id`,
            [
              strandId,
              subStrand.code,
              subStrand.title.trim(),
              subStrand.position,
              JSON.stringify(items(subStrand.outcomes, 'outcome')),
              JSON.stringify(items(subStrand.inquiryQuestions, 'inquiry')),
            ],
          );
          subStrandId = inserted.rows[0].id;
        }

        await client.query(
          `INSERT INTO curriculum_topics (
             sub_strand_id, code, title, description, position, source_kind, source_reference, updated_at
           ) VALUES ($1, $2, $3, NULL, 0, 'official_sub_strand_root', $4::jsonb, NOW())
           ON CONFLICT (sub_strand_id, position) DO UPDATE
           SET code = EXCLUDED.code, title = EXCLUDED.title,
               source_kind = EXCLUDED.source_kind,
               source_reference = EXCLUDED.source_reference, updated_at = NOW()`,
          [subStrandId, subStrand.code, subStrand.title.trim(), JSON.stringify(sourceReference)],
        );
        subStrandCount += 1;
      }
    }
  }

  if (dryRun) await client.query('ROLLBACK');
  else await client.query('COMMIT');
  console.log(JSON.stringify({ grade: gradeLabel, strands: strandCount, subStrands: subStrandCount, dryRun }));
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}
