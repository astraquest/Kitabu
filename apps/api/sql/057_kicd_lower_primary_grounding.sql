-- Durable normalized curriculum storage and provenance for official curriculum imports.
CREATE TABLE IF NOT EXISTS curriculum_countries (
  code TEXT PRIMARY KEY CHECK (code = UPPER(code) AND LENGTH(code) = 3),
  name TEXT NOT NULL,
  default_curriculum_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS curriculum_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL REFERENCES curriculum_countries(code) ON DELETE RESTRICT,
  publisher TEXT NOT NULL,
  title TEXT NOT NULL,
  year INTEGER,
  url TEXT,
  accessed_on DATE,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (country_code, publisher, title)
);

CREATE TABLE IF NOT EXISTS curriculum_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL REFERENCES curriculum_countries(code) ON DELETE RESTRICT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  publisher TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'retired')),
  effective_from DATE,
  effective_to DATE,
  source_id UUID REFERENCES curriculum_sources(id) ON DELETE SET NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (country_code, code)
);

CREATE TABLE IF NOT EXISTS curriculum_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL REFERENCES curriculum_frameworks(id) ON DELETE CASCADE,
  grade_code TEXT NOT NULL,
  local_name TEXT NOT NULL,
  canonical_stage TEXT NOT NULL DEFAULT '',
  sequence INTEGER NOT NULL,
  typical_age_min INTEGER,
  typical_age_max INTEGER,
  notes TEXT NOT NULL DEFAULT '',
  source_id UUID REFERENCES curriculum_sources(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (framework_id, grade_code),
  UNIQUE (framework_id, local_name)
);

CREATE TABLE IF NOT EXISTS curriculum_subject_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL REFERENCES curriculum_countries(code) ON DELETE RESTRICT,
  subject_code TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  learning_area TEXT NOT NULL DEFAULT '',
  language_code TEXT,
  notes TEXT NOT NULL DEFAULT '',
  source_id UUID REFERENCES curriculum_sources(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (country_code, subject_code)
);

CREATE TABLE IF NOT EXISTS curriculum_grade_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL REFERENCES curriculum_frameworks(id) ON DELETE CASCADE,
  grade_id UUID NOT NULL REFERENCES curriculum_grades(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES curriculum_subject_catalog(id) ON DELETE RESTRICT,
  is_compulsory BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  source_id UUID REFERENCES curriculum_sources(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (grade_id, subject_id)
);

CREATE TABLE IF NOT EXISTS curriculum_ingestion_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  data_version INTEGER NOT NULL DEFAULT 1,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT NOT NULL DEFAULT '',
  country_code TEXT,
  curriculum_code TEXT NOT NULL DEFAULT '',
  run_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS curriculum_source_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL,
  curriculum_code TEXT NOT NULL,
  grade_local_level TEXT NOT NULL,
  subject TEXT NOT NULL,
  official_title TEXT NOT NULL,
  publisher TEXT NOT NULL,
  edition_year INTEGER,
  source_url TEXT,
  downloaded_file_checksum TEXT,
  object_key TEXT,
  extraction_status TEXT NOT NULL DEFAULT 'discovered',
  review_status TEXT NOT NULL DEFAULT 'pending',
  last_processed_page INTEGER NOT NULL DEFAULT 0,
  error_message TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  run_id UUID REFERENCES curriculum_ingestion_runs(id) ON DELETE SET NULL,
  grade_code TEXT,
  local_level TEXT,
  source_url_status TEXT NOT NULL DEFAULT 'official',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (country_code, curriculum_code, grade_local_level, subject, official_title)
);

CREATE TABLE IF NOT EXISTS curriculum_extraction_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_document_id UUID NOT NULL REFERENCES curriculum_source_documents(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  row_order INTEGER NOT NULL,
  detected_headers JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_text TEXT NOT NULL,
  extraction_confidence NUMERIC,
  parser_name TEXT NOT NULL DEFAULT '',
  parser_version TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'extracted',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  normalized_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_document_id, page_number, row_order)
);

CREATE TABLE IF NOT EXISTS curriculum_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_subject_id UUID NOT NULL REFERENCES curriculum_grade_subjects(id) ON DELETE CASCADE,
  parent_unit_id UUID REFERENCES curriculum_units(id) ON DELETE CASCADE,
  local_unit_type TEXT NOT NULL DEFAULT 'unit',
  canonical_unit_type TEXT NOT NULL DEFAULT 'unit' CHECK (canonical_unit_type IN ('strand', 'sub_strand', 'topic', 'unit', 'competency')),
  local_code TEXT,
  title TEXT NOT NULL,
  description TEXT,
  sequence INTEGER NOT NULL,
  term TEXT,
  suggested_periods INTEGER,
  content_type TEXT NOT NULL DEFAULT 'knowledge' CHECK (content_type IN ('knowledge', 'skill', 'competence')),
  official_status TEXT NOT NULL DEFAULT 'official' CHECK (official_status IN ('official', 'generated', 'reviewed', 'draft')),
  source_id UUID REFERENCES curriculum_sources(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  lesson_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS curriculum_learning_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES curriculum_units(id) ON DELETE CASCADE,
  local_type TEXT NOT NULL DEFAULT 'learning_outcome',
  statement TEXT NOT NULL,
  competency_domain TEXT NOT NULL DEFAULT '',
  sequence INTEGER NOT NULL,
  official_status TEXT NOT NULL DEFAULT 'official' CHECK (official_status IN ('official', 'generated', 'reviewed', 'draft')),
  source_id UUID REFERENCES curriculum_sources(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (unit_id, sequence)
);

CREATE TABLE IF NOT EXISTS curriculum_inquiry_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES curriculum_units(id) ON DELETE CASCADE,
  outcome_id UUID REFERENCES curriculum_learning_outcomes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'official' CHECK (source_type IN ('official', 'generated', 'reviewed')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'retired')),
  sequence INTEGER NOT NULL,
  reviewer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  source_id UUID REFERENCES curriculum_sources(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (unit_id, sequence)
);

CREATE TABLE IF NOT EXISTS curriculum_learning_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES curriculum_units(id) ON DELETE CASCADE,
  outcome_id UUID REFERENCES curriculum_learning_outcomes(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL DEFAULT 'learning_experience',
  activity TEXT NOT NULL,
  resources JSONB NOT NULL DEFAULT '[]'::jsonb,
  assessment_note TEXT NOT NULL DEFAULT '',
  sequence INTEGER NOT NULL,
  source_id UUID REFERENCES curriculum_sources(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (unit_id, sequence)
);

CREATE TABLE IF NOT EXISTS curriculum_coverage_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL REFERENCES curriculum_countries(code) ON DELETE RESTRICT,
  curriculum_code TEXT NOT NULL,
  report_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'review_needed' CHECK (status IN ('review_needed', 'approved', 'gap_documented', 'seeded', 'failed')),
  report JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS curriculum_term_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL REFERENCES curriculum_countries(code) ON DELETE RESTRICT,
  framework_id UUID NOT NULL REFERENCES curriculum_frameworks(id) ON DELETE CASCADE,
  canonical_field TEXT NOT NULL,
  local_term TEXT NOT NULL,
  applies_to TEXT NOT NULL DEFAULT '',
  required BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT NOT NULL DEFAULT '',
  source_id UUID REFERENCES curriculum_sources(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (country_code, framework_id, canonical_field, local_term)
);

ALTER TABLE curriculum_strands
  ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'KEN',
  ADD COLUMN IF NOT EXISTS curriculum_code TEXT NOT NULL DEFAULT 'CBC',
  ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES curriculum_sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE curriculum_sub_strands
  ADD COLUMN IF NOT EXISTS suggested_lessons INTEGER,
  ADD COLUMN IF NOT EXISTS learning_activities JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS core_competencies JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS curriculum_values JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS pertinent_contemporary_issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cross_curricular_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES curriculum_sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS curriculum_units_grade_subject_parent_sequence_idx
  ON curriculum_units (grade_subject_id, parent_unit_id, sequence);
CREATE INDEX IF NOT EXISTS curriculum_units_source_idx ON curriculum_units (source_id);
CREATE INDEX IF NOT EXISTS curriculum_extraction_rows_document_page_idx
  ON curriculum_extraction_rows (source_document_id, page_number);
CREATE INDEX IF NOT EXISTS curriculum_strands_source_idx ON curriculum_strands (source_id);
CREATE INDEX IF NOT EXISTS curriculum_strands_scope_grade_subject_idx
  ON curriculum_strands (country_code, curriculum_code, grade_level, subject_id, position);
CREATE INDEX IF NOT EXISTS curriculum_sub_strands_source_idx ON curriculum_sub_strands (source_id);
