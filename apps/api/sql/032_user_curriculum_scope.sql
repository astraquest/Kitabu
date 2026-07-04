ALTER TABLE users
  ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'KEN',
  ADD COLUMN IF NOT EXISTS curriculum_code TEXT NOT NULL DEFAULT 'CBC';

UPDATE users
SET country_code = COALESCE(NULLIF(country_code, ''), 'KEN'),
    curriculum_code = COALESCE(NULLIF(curriculum_code, ''), 'CBC');

CREATE INDEX IF NOT EXISTS idx_users_curriculum_scope
  ON users (country_code, curriculum_code, grade_level);
