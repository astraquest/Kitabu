ALTER TABLE curriculum_strands
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE curriculum_sub_strands
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS curriculum_record_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('strand', 'sub_strand', 'topic')),
  entity_id UUID NOT NULL,
  country_code TEXT NOT NULL,
  curriculum_code TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  source_reference JSONB NOT NULL DEFAULT '{}'::jsonb,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_curriculum_record_revisions_entity
  ON curriculum_record_revisions (entity_type, entity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS curriculum_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_strand_id UUID NOT NULL REFERENCES curriculum_sub_strands(id) ON DELETE CASCADE,
  code TEXT,
  title TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL,
  source_kind TEXT NOT NULL DEFAULT 'curriculum_document',
  source_reference JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sub_strand_id, position)
);

CREATE INDEX IF NOT EXISTS idx_curriculum_topics_sub_strand
  ON curriculum_topics (sub_strand_id, position);

CREATE INDEX IF NOT EXISTS idx_curriculum_topics_title_search
  ON curriculum_topics USING GIN (to_tsvector('simple', title));

CREATE TABLE IF NOT EXISTS curriculum_subjects (
  country_code TEXT NOT NULL,
  curriculum_code TEXT NOT NULL,
  subject_code TEXT NOT NULL,
  official_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  source_names JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (country_code, curriculum_code, subject_code)
);

CREATE TABLE IF NOT EXISTS curriculum_subject_aliases (
  country_code TEXT NOT NULL,
  curriculum_code TEXT NOT NULL,
  alias_key TEXT NOT NULL,
  alias_name TEXT NOT NULL,
  subject_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (country_code, curriculum_code, alias_key),
  FOREIGN KEY (country_code, curriculum_code, subject_code)
    REFERENCES curriculum_subjects(country_code, curriculum_code, subject_code)
    ON DELETE CASCADE
);

CREATE OR REPLACE FUNCTION normalize_curriculum_subject_alias(value TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
RETURNS NULL ON NULL INPUT
AS $$
  SELECT regexp_replace(lower(trim(value)), '[^a-z0-9]+', '', 'g')
$$;

INSERT INTO curriculum_subjects (
  country_code, curriculum_code, subject_code, official_name, display_name, source_names
) VALUES
  ('KEN', 'CBC', 'mathematics', 'Mathematical Activities', 'Mathematics', '["Mathematical Activities", "Mathematics", "Math"]'::jsonb),
  ('KEN', 'CBC', 'english', 'English Language Activities', 'English', '["English Language Activities", "English"]'::jsonb),
  ('KEN', 'CBC', 'kiswahili', 'Kiswahili Language Activities', 'Kiswahili', '["Kiswahili Language Activities", "Kiswahili"]'::jsonb),
  ('KEN', 'CBC', 'environmental', 'Environmental Activities', 'Environmental', '["Environmental Activities", "Environmental"]'::jsonb),
  ('KEN', 'CBC', 'creative_activities', 'Creative Activities', 'Creative Activities', '["Creative Activities"]'::jsonb),
  ('KEN', 'CBC', 'cre', 'Christian Religious Education Activities', 'CRE', '["Christian Religious Education Activities", "Christian Religious Education", "CRE"]'::jsonb),
  ('KEN', 'CBC', 'ire', 'Islamic Religious Education Activities', 'IRE', '["Islamic Religious Education Activities", "Islamic Religious Education", "IRE"]'::jsonb),
  ('KEN', 'CBC', 'hygiene_nutrition', 'Hygiene and Nutrition', 'Hygiene & Nutrition', '["Hygiene and Nutrition", "Hygiene & Nutrition"]'::jsonb)
ON CONFLICT (country_code, curriculum_code, subject_code) DO UPDATE
SET official_name = EXCLUDED.official_name,
    display_name = EXCLUDED.display_name,
    source_names = EXCLUDED.source_names,
    updated_at = NOW();

INSERT INTO curriculum_subject_aliases (
  country_code, curriculum_code, alias_key, alias_name, subject_code
)
SELECT 'KEN', 'CBC', normalize_curriculum_subject_alias(alias_name), alias_name, subject_code
FROM (VALUES
  ('Mathematics', 'mathematics'), ('Mathematical Activities', 'mathematics'), ('Math', 'mathematics'),
  ('English', 'english'), ('English Language Activities', 'english'),
  ('Kiswahili', 'kiswahili'), ('Kiswahili Language Activities', 'kiswahili'),
  ('Environmental', 'environmental'), ('Environmental Activities', 'environmental'),
  ('Creative Activities', 'creative_activities'),
  ('CRE', 'cre'), ('Christian Religious Education Activities', 'cre'), ('Christian Religious Education', 'cre'),
  ('IRE', 'ire'), ('Islamic Religious Education Activities', 'ire'), ('Islamic Religious Education', 'ire'),
  ('Hygiene and Nutrition', 'hygiene_nutrition'), ('hygiene_nutrition', 'hygiene_nutrition')
) AS aliases(alias_name, subject_code)
ON CONFLICT (country_code, curriculum_code, alias_key) DO UPDATE
SET alias_name = EXCLUDED.alias_name,
    subject_code = EXCLUDED.subject_code;
