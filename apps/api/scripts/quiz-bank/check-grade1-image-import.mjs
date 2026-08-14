import { config as loadEnv } from 'dotenv';
import pg from 'pg';

loadEnv({ path: new URL('../../.env', import.meta.url) });
const pool = new pg.Pool({ connectionString: process.env.KITABU_DATABASE_URL });

try {
  const questions = await pool.query(
    `SELECT subject_id, count(*)::int AS questions, count(image_key)::int AS image_questions,
            array_agg(DISTINCT image_key ORDER BY image_key) FILTER (WHERE image_key IS NOT NULL) AS image_keys
     FROM quiz_bank_questions
     WHERE grade_level = $1 AND subject_id = ANY($2)
     GROUP BY subject_id ORDER BY subject_id`,
    ['Grade 1', ['english', 'mathematics']],
  );
  const topics = await pool.query(
    `SELECT id, code, title FROM curriculum_topics
     WHERE grade_level = $1 AND subject_code = $2 AND code = ANY($3)
     ORDER BY code`,
    ['Grade 1', 'english', ['1.1', '2.1', '3.1']],
  );
  const mathematicsNodes = await pool.query(
    `SELECT ccs.id AS canonical_strand_id, ccs.code AS strand_code, ccs.title AS strand_title,
            css.id AS sub_strand_id, css.number AS sub_strand_code, css.title AS sub_strand_title,
            css.outcomes, ct.id AS topic_id, ct.code AS topic_code, ct.title AS topic_title
     FROM curriculum_canonical_strands ccs
     JOIN curriculum_topics ct ON ct.canonical_strand_id = ccs.id AND ct.is_active = TRUE
     JOIN curriculum_sub_strands css ON css.id = ct.sub_strand_id
     WHERE ccs.country_code = 'KEN' AND ccs.curriculum_code = 'CBC'
       AND ccs.grade_level = 'Grade 1' AND ccs.subject_code = 'mathematics' AND ccs.is_active = TRUE
     ORDER BY ccs.position, ct.display_order`,
  );
  const mathematicsFallbackNodes = await pool.query(
    `SELECT cs.id AS strand_id, cs.number AS strand_code, cs.title AS strand_title,
            css.id AS sub_strand_id, css.number AS sub_strand_code, css.title AS sub_strand_title,
            css.outcomes, ct.id AS topic_id, ct.code AS topic_code, ct.title AS topic_title
     FROM curriculum_strands cs
     JOIN curriculum_sub_strands css ON css.strand_id = cs.id AND css.is_active = TRUE
     LEFT JOIN curriculum_topics ct ON ct.sub_strand_id = css.id AND ct.is_active = TRUE
     WHERE cs.country_code = 'KEN' AND cs.curriculum_code = 'CBC'
       AND cs.grade_level = 'Grade 1' AND cs.subject_id IN ('math', 'mathematics') AND cs.is_active = TRUE
     ORDER BY cs.position, css.position, ct.position`,
  );
  const baseUrl = process.env.KITABU_SUPABASE_URL?.replace(/\/$/, '');
  if (!baseUrl) throw new Error('KITABU_SUPABASE_URL is required for image verification.');
  const images = await Promise.all(['apple', 'banana', 'ball', 'book', 'cat', 'dog'].map(async name => {
    const response = await fetch(`${baseUrl}/storage/v1/render/image/public/question-images/image-library/v1/${name}.png?width=1024&quality=90`);
    return {
      name,
      status: response.status,
      contentType: response.headers.get('content-type'),
      cacheControl: response.headers.get('cache-control'),
      bytes: (await response.arrayBuffer()).byteLength,
    };
  }));
  if (images.some(image => image.status !== 200 || !image.contentType?.startsWith('image/png') || !/max-age=(?:31536000|[3-9]\d{7}|[1-9]\d{8,})/.test(image.cacheControl ?? '') || image.bytes === 0)) {
    throw new Error('Grade 1 image verification failed.');
  }
  console.log(JSON.stringify({ questions: questions.rows, topics: topics.rows, mathematicsNodes: mathematicsNodes.rows, mathematicsFallbackNodes: mathematicsFallbackNodes.rows, images }));
} finally {
  await pool.end();
}
