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
const sourcePath = path.resolve(
  positionalArguments[0] ?? path.join(apiDir, 'data', 'curriculum', 'KEN', 'CBC', 'kicd-2024-grade-1-3', 'normalized-curriculum.json'),
);
const targetGrade = Number(positionalArguments[1] ?? 1);
const gradeLabel = `Grade ${targetGrade}`;
if (![1, 2, 3].includes(targetGrade)) throw new Error('Grade must be 1, 2, or 3.');
if (!process.env.KITABU_DATABASE_URL) {
  throw new Error('KITABU_DATABASE_URL is not set.');
}

const languageDefinitions = [
  {
    subjectId: 'english',
    sourceName: 'English Language Activities',
    strands: [
      { sourceKey: '1', title: 'Listening and Speaking', key: 'listening-speaking' },
      { sourceKey: '2', title: 'Reading', key: 'reading' },
      { sourceKey: '3', title: 'Language Use', key: 'language-use' },
      { sourceKey: '4', title: 'Writing', key: 'writing' },
    ],
  },
  {
    subjectId: 'kiswahili',
    sourceName: 'Kiswahili Language Activities',
    strands: [
      { sourceKey: '1', title: 'Kusikiliza na Kuzungumza', key: 'kusikiliza-kuzungumza' },
      { sourceKey: '2', title: 'Kusoma', key: 'kusoma' },
      { sourceKey: '3', title: 'Kuandika', key: 'kuandika' },
      { sourceKey: '4', title: 'Sarufi', key: 'sarufi' },
    ],
  },
  {
    subjectId: 'indigenous_languages',
    sourceName: 'Indigenous Language Activities',
    strands: [
      { sourceKey: '1', title: 'Listening and Speaking', key: 'listening-speaking' },
      { sourceKey: '2', title: 'Reading', key: 'reading' },
      { sourceKey: '3', title: 'Writing', key: 'writing' },
    ],
  },
];

function curriculumItems(values, field) {
  return (values ?? [])
    .map((value, index) => ({
      id: `${field}-${index + 1}`,
      text: String(value.statement ?? value.question ?? value.text ?? '').trim(),
    }))
    .filter(value => value.text);
}

function sourceReference(sourceFile, subject, strand, subStrand) {
  return {
    sourcePath: path.basename(sourceFile),
    sourceDocument: subject.sourceDocument,
    sourceStrandCode: strand.code,
    sourceUnitCode: strand.unitCode,
    sourcePages: subStrand.sourcePages ?? [],
    sourcePageStart: subStrand.sourcePageStart,
    sourcePageEnd: subStrand.sourcePageEnd,
    sourceTextSha256: subStrand.sourceTextSha256,
    printedCode: subStrand.printedCode ?? subStrand.code,
    recoveredFromStrandTitle: Boolean(subStrand.recoveredFromStrandTitle),
  };
}

function canonicalChildren(subject, definition) {
  return definition.strands.map(canonical => {
    const sourceStrands = (subject.strands ?? []).filter(strand => strand.code?.split('.')[1] === canonical.sourceKey);
    const children = [];

    for (const sourceStrand of sourceStrands) {
      const expectedTitle = canonical.title.toLocaleLowerCase();
      if (sourceStrand.title.trim().toLocaleLowerCase() !== expectedTitle) {
        const recovered = sourceStrand.title.match(/(\d+\.\d+\.\d+)\s+(.+)$/u);
        if (recovered && !(sourceStrand.subStrands ?? []).some(item => item.code === recovered[1])) {
          children.push({
            code: recovered[1],
            printedCode: recovered[1],
            title: recovered[2].trim(),
            outcomes: [],
            inquiryQuestions: [],
            sourcePages: sourceStrand.sourcePages ?? [],
            recoveredFromStrandTitle: true,
            sourceStrand,
          });
        }
      }

      for (const subStrand of sourceStrand.subStrands ?? []) {
        children.push({ ...subStrand, sourceStrand });
      }
    }

    return { ...canonical, children };
  });
}

async function archiveActiveStrands(client, subjectId, sourceFile) {
  await client.query(
    `INSERT INTO curriculum_record_revisions (
       entity_type, entity_id, country_code, curriculum_code, grade_level,
       subject_id, reason, source_reference, snapshot
     )
     SELECT 'strand', cs.id, cs.country_code, cs.curriculum_code, cs.grade_level,
            cs.subject_id, 'lower-primary-language-hierarchy-repair', $3::jsonb,
            jsonb_build_object(
              'strand', to_jsonb(cs),
              'subStrands', COALESCE((
                SELECT jsonb_agg(
                  jsonb_build_object(
                    'subStrand', to_jsonb(css),
                    'topics', COALESCE((
                      SELECT jsonb_agg(to_jsonb(ct) ORDER BY ct.position)
                      FROM curriculum_topics ct WHERE ct.sub_strand_id = css.id
                    ), '[]'::jsonb)
                  ) ORDER BY css.position
                ) FROM curriculum_sub_strands css WHERE css.strand_id = cs.id
              ), '[]'::jsonb)
            )
     FROM curriculum_strands cs
     WHERE cs.country_code = 'KEN' AND cs.curriculum_code = 'CBC'
       AND cs.grade_level = $2 AND cs.subject_id = $1 AND cs.is_active = TRUE`,
    [subjectId, gradeLabel, JSON.stringify({ sourcePath: path.basename(sourceFile) })],
  );
}

async function repairSubject(client, subject, definition, sourceFile) {
  const canonicalStrands = canonicalChildren(subject, definition);
  const expectedSubStrands = canonicalStrands.reduce((total, strand) => total + strand.children.length, 0);
  const activeSummary = await client.query(
    `SELECT count(DISTINCT cs.id)::int AS strands,
            count(css.id) FILTER (WHERE css.is_active)::int AS sub_strands,
            array_agg(DISTINCT cs.title ORDER BY cs.title) AS titles
     FROM curriculum_strands cs
     LEFT JOIN curriculum_sub_strands css ON css.strand_id = cs.id
     WHERE cs.country_code = 'KEN' AND cs.curriculum_code = 'CBC'
       AND cs.grade_level = $2 AND cs.subject_id = $1 AND cs.is_active = TRUE`,
    [definition.subjectId, gradeLabel],
  );
  const summary = activeSummary.rows[0];
  const expectedTitles = definition.strands.map(item => item.title).sort();
  if (
    summary.strands === definition.strands.length &&
    summary.sub_strands === expectedSubStrands &&
    JSON.stringify(summary.titles ?? []) === JSON.stringify(expectedTitles)
  ) {
    return { subjectId: definition.subjectId, strands: summary.strands, subStrands: summary.sub_strands, changed: false };
  }

  await archiveActiveStrands(client, definition.subjectId, sourceFile);
  const subjectRows = await client.query(
    `SELECT id FROM curriculum_strands
     WHERE country_code = 'KEN' AND curriculum_code = 'CBC'
       AND grade_level = $2 AND subject_id = $1`,
    [definition.subjectId, gradeLabel],
  );
  const retiredStrandIds = subjectRows.rows.map(row => row.id);

  if (retiredStrandIds.length > 0) {
    await client.query(
      `WITH offset_value AS (
         SELECT COALESCE(MAX(position), 0) + 10000 AS amount
         FROM curriculum_strands
         WHERE country_code = 'KEN' AND curriculum_code = 'CBC'
           AND grade_level = $2 AND subject_id = $1
       )
       UPDATE curriculum_strands
       SET position = position + offset_value.amount, is_active = FALSE, updated_at = NOW()
       FROM offset_value
       WHERE country_code = 'KEN' AND curriculum_code = 'CBC'
         AND grade_level = $2 AND subject_id = $1`,
      [definition.subjectId, gradeLabel],
    );
    await client.query(
      `WITH offset_value AS (
         SELECT COALESCE(MAX(position), 0) + 10000 AS amount
         FROM curriculum_sub_strands WHERE strand_id = ANY($1::uuid[])
       )
       UPDATE curriculum_sub_strands
       SET position = position + offset_value.amount, is_active = FALSE, updated_at = NOW()
       FROM offset_value
       WHERE strand_id = ANY($1::uuid[])`,
      [retiredStrandIds],
    );
  }

  for (const [strandPosition, canonical] of canonicalStrands.entries()) {
    const repairKey = `grade${targetGrade}-${definition.subjectId}-${canonical.key}`;
    const existingCanonical = await client.query(
      `SELECT id FROM curriculum_strands
       WHERE country_code = 'KEN' AND curriculum_code = 'CBC'
         AND grade_level = $3 AND subject_id = $1
         AND source_metadata->>'hierarchyRepairKey' = $2
       ORDER BY created_at ASC LIMIT 1`,
      [definition.subjectId, repairKey, gradeLabel],
    );
    let strandId = existingCanonical.rows[0]?.id;
    const strandMetadata = {
      hierarchyRepairKey: repairKey,
      hierarchyRole: 'canonical_strand',
      sourcePath: path.basename(sourceFile),
      groupedSourceStrandCodes: canonical.children.map(child => child.sourceStrand.code),
    };

    if (strandId) {
      await client.query(
        `UPDATE curriculum_strands
         SET subject_name = $2, number = NULL, title = $3, sub_title = '', position = $4,
             source_metadata = COALESCE(source_metadata, '{}'::jsonb) || $5::jsonb,
             is_active = TRUE, updated_at = NOW()
         WHERE id = $1`,
        [strandId, subject.subjectName, canonical.title, strandPosition, JSON.stringify(strandMetadata)],
      );
    } else {
      const inserted = await client.query(
        `INSERT INTO curriculum_strands (
           country_code, curriculum_code, grade_level, subject_id, subject_name,
           number, title, sub_title, position, source_metadata, is_active, updated_at
         ) VALUES ('KEN', 'CBC', $6, $1, $2, NULL, $3, '', $4, $5::jsonb, TRUE, NOW())
         RETURNING id`,
        [definition.subjectId, subject.subjectName, canonical.title, strandPosition, JSON.stringify(strandMetadata), gradeLabel],
      );
      strandId = inserted.rows[0].id;
    }

    for (const [subPosition, subStrand] of canonical.children.entries()) {
      const existingSubStrand = await client.query(
        `SELECT css.id
         FROM curriculum_sub_strands css
         JOIN curriculum_strands cs ON cs.id = css.strand_id
         WHERE cs.country_code = 'KEN' AND cs.curriculum_code = 'CBC'
           AND cs.grade_level = $4 AND cs.subject_id = $1 AND css.number = $2
         ORDER BY CASE WHEN css.strand_id = ANY($3::uuid[]) THEN 0 ELSE 1 END, css.created_at ASC
         LIMIT 1`,
        [definition.subjectId, subStrand.code, retiredStrandIds, gradeLabel],
      );
      const reference = sourceReference(sourceFile, subject, subStrand.sourceStrand, subStrand);
      let subStrandId = existingSubStrand.rows[0]?.id;

      if (subStrandId) {
        await client.query(
          `INSERT INTO curriculum_record_revisions (
             entity_type, entity_id, country_code, curriculum_code, grade_level,
             subject_id, reason, source_reference, snapshot
           )
           SELECT 'sub_strand', css.id, 'KEN', 'CBC', $4, $2,
                  'lower-primary-language-hierarchy-repair', $3::jsonb, to_jsonb(css)
           FROM curriculum_sub_strands css WHERE css.id = $1`,
          [subStrandId, definition.subjectId, JSON.stringify(reference), gradeLabel],
        );
        await client.query(
          `UPDATE curriculum_sub_strands
           SET strand_id = $2, number = $3, title = $4, position = $5,
               outcomes = $6::jsonb, inquiry_questions = $7::jsonb,
               is_active = TRUE, updated_at = NOW()
           WHERE id = $1`,
          [
            subStrandId,
            strandId,
            subStrand.code,
            subStrand.title.trim(),
            subPosition,
            JSON.stringify(curriculumItems(subStrand.outcomes, 'outcome')),
            JSON.stringify(curriculumItems(subStrand.inquiryQuestions, 'inquiry')),
          ],
        );
      } else {
        const inserted = await client.query(
          `INSERT INTO curriculum_sub_strands (
             strand_id, number, title, type, description, position,
             outcomes, inquiry_questions, pages, is_active, updated_at
           ) VALUES ($1, $2, $3, 'knowledge', NULL, $4, $5::jsonb, $6::jsonb, '[]'::jsonb, TRUE, NOW())
           RETURNING id`,
          [
            strandId,
            subStrand.code,
            subStrand.title.trim(),
            subPosition,
            JSON.stringify(curriculumItems(subStrand.outcomes, 'outcome')),
            JSON.stringify(curriculumItems(subStrand.inquiryQuestions, 'inquiry')),
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
        [subStrandId, subStrand.code, subStrand.title.trim(), JSON.stringify(reference)],
      );
    }
  }

  return {
    subjectId: definition.subjectId,
    strands: canonicalStrands.length,
    subStrands: expectedSubStrands,
    changed: true,
  };
}

const source = JSON.parse(await readFile(sourcePath, 'utf8'));
const pool = new Pool({ connectionString: process.env.KITABU_DATABASE_URL });
const client = await pool.connect();

try {
  await client.query('BEGIN');
  const results = [];
  for (const definition of languageDefinitions) {
    const subject = (source.gradeSubjects ?? []).find(
      item => item.grade === targetGrade && item.subjectName === definition.sourceName,
    );
    if (!subject) throw new Error(`Missing ${gradeLabel} source subject: ${definition.sourceName}`);
    results.push(await repairSubject(client, subject, definition, sourcePath));
  }
  if (dryRun) await client.query('ROLLBACK');
  else await client.query('COMMIT');
  console.log(JSON.stringify({ grade: gradeLabel, results, dryRun }));
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}
