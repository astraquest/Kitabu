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
  '1.1',
  'Pre-number activities',
  sub_strand.description,
  1,
  'curriculum_document',
  jsonb_build_object('source', 'KICD Grade 1 Mathematical Activities 2024', 'seed', 'grade1-mathematics-first-outcome-publication'),
  'KEN',
  'CBC',
  'Grade 1',
  'mathematics',
  strand.position,
  TRUE
FROM curriculum_sub_strands sub_strand
JOIN curriculum_strands strand ON strand.id = sub_strand.strand_id
WHERE strand.country_code = 'KEN'
  AND strand.curriculum_code = 'CBC'
  AND strand.grade_level = 'Grade 1'
  AND strand.subject_id IN ('math', 'mathematics')
  AND sub_strand.number = '1.1'
  AND sub_strand.title = 'Number Concept'
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
