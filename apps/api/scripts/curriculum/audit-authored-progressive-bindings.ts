import pg from 'pg';

import {
  listProgressiveLessonDefinitions,
  normalizeProgressiveSubjectId,
} from '../../src/progressiveLearning.js';

const { Pool } = pg;

const databaseUrl = process.env.KITABU_DATABASE_URL;
if (!databaseUrl) {
  throw new Error('KITABU_DATABASE_URL is required.');
}

const pool = new Pool({ connectionString: databaseUrl });

const normalize = (value: string) => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('en-KE')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

try {
  const topics = await pool.query<{
    id: string;
    canonical_key: string;
    grade_level: string;
    subject_code: string;
    strand: string;
    sub_strand: string;
    number: string | null;
  }>(`
    SELECT ct.id, ct.canonical_key, ct.grade_level, ct.subject_code,
           ccs.title AS strand, css.title AS sub_strand, css.number
    FROM curriculum_topics ct
    JOIN curriculum_canonical_strands ccs ON ccs.id = ct.canonical_strand_id
    JOIN curriculum_sub_strands css ON css.id = ct.sub_strand_id
    WHERE ct.is_active = TRUE AND ccs.is_active = TRUE
    ORDER BY ct.grade_level, ct.subject_code, ccs.position, ct.display_order
  `);

  const results = listProgressiveLessonDefinitions().map(lesson => {
    const subjectCode = normalizeProgressiveSubjectId(lesson.subjectId, lesson.grade);
    const scoped = topics.rows.filter(topic =>
      topic.grade_level === lesson.grade &&
      normalizeProgressiveSubjectId(topic.subject_code, topic.grade_level) === subjectCode
    );
    const explicit = lesson.curriculumTopicCode
      ? scoped.filter(topic => normalize(topic.number ?? '') === normalize(lesson.curriculumTopicCode ?? ''))
      : [];
    const exact = scoped.filter(topic =>
      normalize(topic.strand) === normalize(lesson.strand) &&
      normalize(topic.sub_strand) === normalize(lesson.subStrand)
    );
    const candidates = explicit.length > 0 ? explicit : exact;
    return {
      lessonKey: lesson.lessonKey,
      grade: lesson.grade,
      subjectCode,
      strand: lesson.strand,
      subStrand: lesson.subStrand,
      curriculumTopicCode: lesson.curriculumTopicCode ?? null,
      status: candidates.length === 1 ? 'bound' : candidates.length > 1 ? 'ambiguous' : 'unbound',
      candidates: candidates.map(topic => ({
        id: topic.id,
        canonicalKey: topic.canonical_key,
        number: topic.number,
        title: topic.sub_strand,
      })),
    };
  });

  const summary = results.reduce<Record<string, number>>((counts, result) => {
    counts[result.status] = (counts[result.status] ?? 0) + 1;
    return counts;
  }, {});

  console.log(JSON.stringify({
    summary: { total: results.length, ...summary },
    unresolved: process.argv.includes('--summary-only')
      ? undefined
      : results.filter(result => result.status !== 'bound'),
  }, null, 2));
} finally {
  await pool.end();
}
