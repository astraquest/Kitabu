ALTER TABLE quiz_bank_questions
  DROP CONSTRAINT IF EXISTS quiz_bank_questions_image_key_check;

ALTER TABLE quiz_bank_questions
  ADD CONSTRAINT quiz_bank_questions_image_key_check
  CHECK (image_key IS NULL OR image_key ~ E'^image-library/v1/[a-z0-9]+(?:-[a-z0-9]+)*\\.png$');

INSERT INTO curriculum_topics (
  sub_strand_id,
  code,
  title,
  description,
  position,
  source_kind,
  source_reference,
  country_code,
  curriculum_code,
  grade_level,
  subject_code,
  display_order,
  is_active
)
SELECT
  sub_strand.id,
  sub_strand.number,
  sub_strand.title,
  sub_strand.description,
  1,
  'curriculum_document',
  jsonb_build_object('source', 'KICD Lower Primary Curriculum Design', 'seed', 'grade1-english-topic-publication'),
  'KEN',
  'CBC',
  'Grade 1',
  'english',
  strand.position,
  TRUE
FROM curriculum_sub_strands sub_strand
JOIN curriculum_strands strand ON strand.id = sub_strand.strand_id
WHERE strand.grade_level = 'Grade 1'
  AND strand.subject_id = 'english'
  AND sub_strand.number IN ('1.1', '2.1', '3.1')
ON CONFLICT (sub_strand_id, position) DO UPDATE
SET code = EXCLUDED.code,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    country_code = EXCLUDED.country_code,
    curriculum_code = EXCLUDED.curriculum_code,
    grade_level = EXCLUDED.grade_level,
    subject_code = EXCLUDED.subject_code,
    display_order = EXCLUDED.display_order,
    is_active = TRUE,
    updated_at = NOW();
