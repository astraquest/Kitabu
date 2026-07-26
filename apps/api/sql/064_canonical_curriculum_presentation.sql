CREATE TABLE IF NOT EXISTS curriculum_grade_subject_identities (
  country_code TEXT NOT NULL,
  curriculum_code TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  subject_code TEXT NOT NULL,
  official_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  source_names JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
  active_source_release_id UUID REFERENCES curriculum_releases(id) ON DELETE RESTRICT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (country_code, curriculum_code, grade_level, subject_code),
  FOREIGN KEY (country_code, curriculum_code, subject_code)
    REFERENCES curriculum_subjects(country_code, curriculum_code, subject_code)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_curriculum_grade_subject_identities_release
  ON curriculum_grade_subject_identities (active_source_release_id, grade_level, subject_code);

CREATE TABLE IF NOT EXISTS curriculum_canonical_strands (
  id UUID PRIMARY KEY,
  country_code TEXT NOT NULL,
  curriculum_code TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  subject_code TEXT NOT NULL,
  canonical_key TEXT NOT NULL,
  code TEXT,
  title TEXT NOT NULL,
  position INTEGER NOT NULL,
  active_source_release_id UUID NOT NULL REFERENCES curriculum_releases(id) ON DELETE RESTRICT,
  source_reference JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (country_code, curriculum_code, grade_level, subject_code)
    REFERENCES curriculum_grade_subject_identities(country_code, curriculum_code, grade_level, subject_code)
    ON DELETE RESTRICT,
  UNIQUE (country_code, curriculum_code, grade_level, canonical_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_curriculum_canonical_strands_active_position
  ON curriculum_canonical_strands (
    country_code, curriculum_code, grade_level, subject_code, position
  ) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_curriculum_canonical_strands_grade
  ON curriculum_canonical_strands (
    country_code, curriculum_code, grade_level, subject_code, position
  ) WHERE is_active = TRUE;

ALTER TABLE curriculum_topics
  ADD COLUMN IF NOT EXISTS canonical_strand_id UUID
    REFERENCES curriculum_canonical_strands(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS canonical_key TEXT,
  ADD COLUMN IF NOT EXISTS country_code TEXT,
  ADD COLUMN IF NOT EXISTS curriculum_code TEXT,
  ADD COLUMN IF NOT EXISTS grade_level TEXT,
  ADD COLUMN IF NOT EXISTS subject_code TEXT,
  ADD COLUMN IF NOT EXISTS display_order INTEGER,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_curriculum_topics_canonical_key
  ON curriculum_topics (country_code, curriculum_code, grade_level, canonical_key)
  WHERE canonical_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_curriculum_topics_canonical_strand
  ON curriculum_topics (canonical_strand_id, display_order)
  WHERE canonical_strand_id IS NOT NULL AND is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_curriculum_topics_grade_subject
  ON curriculum_topics (country_code, curriculum_code, grade_level, subject_code, display_order)
  WHERE canonical_key IS NOT NULL AND is_active = TRUE;
