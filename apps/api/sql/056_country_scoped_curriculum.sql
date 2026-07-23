ALTER TABLE curriculum_strands
  ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'KEN',
  ADD COLUMN IF NOT EXISTS curriculum_code TEXT NOT NULL DEFAULT 'CBC';

UPDATE curriculum_strands
SET country_code = 'KEN'
WHERE BTRIM(country_code) = '';

UPDATE curriculum_strands
SET curriculum_code = 'CBC'
WHERE BTRIM(curriculum_code) = '';

ALTER TABLE curriculum_strands
  DROP CONSTRAINT IF EXISTS curriculum_strands_grade_level_subject_id_position_key;

ALTER TABLE curriculum_strands
  ADD CONSTRAINT curriculum_strands_scope_grade_subject_position_key
  UNIQUE (country_code, curriculum_code, grade_level, subject_id, position);

CREATE INDEX IF NOT EXISTS curriculum_strands_scope_grade_subject_idx
  ON curriculum_strands (country_code, curriculum_code, grade_level, subject_id, position);
