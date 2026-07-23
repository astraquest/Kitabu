-- Immutable, content-addressed curriculum releases with grade-level activation.
-- Existing curriculum rows remain valid with release_id = NULL. New release-owned
-- rows can be staged beside them and become visible only through an active pointer.

CREATE TABLE IF NOT EXISTS curriculum_framework_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL REFERENCES curriculum_frameworks(id) ON DELETE RESTRICT,
  version_code TEXT NOT NULL CHECK (BTRIM(version_code) <> ''),
  title TEXT NOT NULL CHECK (BTRIM(title) <> ''),
  effective_from DATE,
  effective_to DATE,
  source_id UUID REFERENCES curriculum_sources(id) ON DELETE SET NULL,
  content_sha256 TEXT NOT NULL CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (framework_id, content_sha256),
  UNIQUE (id, framework_id),
  CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from)
);

CREATE TABLE IF NOT EXISTS curriculum_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_version_id UUID NOT NULL,
  framework_id UUID NOT NULL,
  release_key TEXT NOT NULL CHECK (BTRIM(release_key) <> ''),
  content_sha256 TEXT NOT NULL CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  released_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT curriculum_releases_version_scope_fkey
    FOREIGN KEY (framework_version_id, framework_id)
    REFERENCES curriculum_framework_versions(id, framework_id) ON DELETE RESTRICT,
  UNIQUE (framework_version_id, release_key),
  UNIQUE (framework_version_id, content_sha256),
  UNIQUE (id, framework_id)
);

-- Release ownership is nullable so every row created through migrations 001-057
-- remains readable and writable through the existing compatibility paths.
ALTER TABLE curriculum_grade_subjects
  ADD COLUMN IF NOT EXISTS release_id UUID REFERENCES curriculum_releases(id) ON DELETE RESTRICT;

ALTER TABLE curriculum_units
  ADD COLUMN IF NOT EXISTS release_id UUID REFERENCES curriculum_releases(id) ON DELETE RESTRICT;

ALTER TABLE curriculum_learning_outcomes
  ADD COLUMN IF NOT EXISTS release_id UUID REFERENCES curriculum_releases(id) ON DELETE RESTRICT;

ALTER TABLE curriculum_inquiry_questions
  ADD COLUMN IF NOT EXISTS release_id UUID REFERENCES curriculum_releases(id) ON DELETE RESTRICT;

ALTER TABLE curriculum_learning_activities
  ADD COLUMN IF NOT EXISTS release_id UUID REFERENCES curriculum_releases(id) ON DELETE RESTRICT;

ALTER TABLE curriculum_strands
  ADD COLUMN IF NOT EXISTS release_id UUID REFERENCES curriculum_releases(id) ON DELETE RESTRICT;

ALTER TABLE curriculum_sub_strands
  ADD COLUMN IF NOT EXISTS release_id UUID REFERENCES curriculum_releases(id) ON DELETE RESTRICT;

ALTER TABLE curriculum_source_documents
  ADD COLUMN IF NOT EXISTS release_id UUID REFERENCES curriculum_releases(id) ON DELETE RESTRICT;

ALTER TABLE curriculum_ingestion_runs
  ADD COLUMN IF NOT EXISTS release_id UUID REFERENCES curriculum_releases(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS content_sha256 TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'curriculum_ingestion_runs'::regclass
      AND conname = 'curriculum_ingestion_runs_content_sha256_check'
  ) THEN
    ALTER TABLE curriculum_ingestion_runs
      ADD CONSTRAINT curriculum_ingestion_runs_content_sha256_check
      CHECK (content_sha256 IS NULL OR content_sha256 ~ '^[0-9a-f]{64}$') NOT VALID;
  END IF;
END $$;

ALTER TABLE curriculum_ingestion_runs
  VALIDATE CONSTRAINT curriculum_ingestion_runs_content_sha256_check;

-- Replace only natural-key constraints that would prevent a second release from
-- being staged. The partial legacy indexes preserve the pre-058 behavior for NULL.
ALTER TABLE curriculum_grade_subjects
  DROP CONSTRAINT IF EXISTS curriculum_grade_subjects_grade_id_subject_id_key;

ALTER TABLE curriculum_strands
  DROP CONSTRAINT IF EXISTS curriculum_strands_scope_grade_subject_position_key;

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT constraint_row.conname
    FROM pg_constraint AS constraint_row
    WHERE constraint_row.conrelid = 'curriculum_source_documents'::regclass
      AND constraint_row.contype = 'u'
      AND (
        SELECT ARRAY_AGG(attribute_row.attname ORDER BY key_row.ordinality)
        FROM UNNEST(constraint_row.conkey) WITH ORDINALITY AS key_row(attnum, ordinality)
        JOIN pg_attribute AS attribute_row
          ON attribute_row.attrelid = constraint_row.conrelid
         AND attribute_row.attnum = key_row.attnum
      ) = ARRAY[
        'country_code', 'curriculum_code', 'grade_local_level',
        'subject', 'official_title'
      ]::name[]
  LOOP
    EXECUTE FORMAT(
      'ALTER TABLE curriculum_source_documents DROP CONSTRAINT %I',
      constraint_name
    );
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS curriculum_grade_subjects_legacy_scope_uidx
  ON curriculum_grade_subjects (grade_id, subject_id)
  WHERE release_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS curriculum_grade_subjects_release_scope_uidx
  ON curriculum_grade_subjects (release_id, grade_id, subject_id)
  WHERE release_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS curriculum_strands_legacy_scope_uidx
  ON curriculum_strands (
    country_code, curriculum_code, grade_level, subject_id, position
  )
  WHERE release_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS curriculum_strands_release_scope_uidx
  ON curriculum_strands (
    release_id, country_code, curriculum_code, grade_level, subject_id, position
  )
  WHERE release_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS curriculum_source_documents_legacy_scope_uidx
  ON curriculum_source_documents (
    country_code, curriculum_code, grade_local_level, subject, official_title
  )
  WHERE release_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS curriculum_source_documents_release_scope_uidx
  ON curriculum_source_documents (
    release_id, country_code, curriculum_code, grade_local_level, subject, official_title
  )
  WHERE release_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS curriculum_ingestion_runs_content_sha256_uidx
  ON curriculum_ingestion_runs (content_sha256)
  WHERE content_sha256 IS NOT NULL;

-- These redundant-looking keys let composite foreign keys prove that related
-- rows belong to the same release (and, where applicable, the same grade).
CREATE UNIQUE INDEX IF NOT EXISTS curriculum_grades_id_framework_uidx
  ON curriculum_grades (id, framework_id);

CREATE UNIQUE INDEX IF NOT EXISTS curriculum_grade_subjects_id_release_uidx
  ON curriculum_grade_subjects (id, release_id);

CREATE UNIQUE INDEX IF NOT EXISTS curriculum_grade_subjects_id_release_grade_uidx
  ON curriculum_grade_subjects (id, release_id, grade_id);

CREATE UNIQUE INDEX IF NOT EXISTS curriculum_units_id_release_uidx
  ON curriculum_units (id, release_id);

CREATE UNIQUE INDEX IF NOT EXISTS curriculum_strands_id_release_uidx
  ON curriculum_strands (id, release_id);

CREATE UNIQUE INDEX IF NOT EXISTS curriculum_source_documents_id_release_uidx
  ON curriculum_source_documents (id, release_id);

CREATE UNIQUE INDEX IF NOT EXISTS curriculum_extraction_rows_id_document_uidx
  ON curriculum_extraction_rows (id, source_document_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'curriculum_grade_subjects'::regclass
      AND conname = 'curriculum_grade_subjects_release_framework_fkey'
  ) THEN
    ALTER TABLE curriculum_grade_subjects
      ADD CONSTRAINT curriculum_grade_subjects_release_framework_fkey
      FOREIGN KEY (release_id, framework_id)
      REFERENCES curriculum_releases(id, framework_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'curriculum_units'::regclass
      AND conname = 'curriculum_units_grade_subject_release_fkey'
  ) THEN
    ALTER TABLE curriculum_units
      ADD CONSTRAINT curriculum_units_grade_subject_release_fkey
      FOREIGN KEY (grade_subject_id, release_id)
      REFERENCES curriculum_grade_subjects(id, release_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'curriculum_units'::regclass
      AND conname = 'curriculum_units_parent_release_fkey'
  ) THEN
    ALTER TABLE curriculum_units
      ADD CONSTRAINT curriculum_units_parent_release_fkey
      FOREIGN KEY (parent_unit_id, release_id)
      REFERENCES curriculum_units(id, release_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'curriculum_sub_strands'::regclass
      AND conname = 'curriculum_sub_strands_strand_release_fkey'
  ) THEN
    ALTER TABLE curriculum_sub_strands
      ADD CONSTRAINT curriculum_sub_strands_strand_release_fkey
      FOREIGN KEY (strand_id, release_id)
      REFERENCES curriculum_strands(id, release_id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS curriculum_grade_active_releases (
  grade_id UUID PRIMARY KEY,
  framework_id UUID NOT NULL,
  release_id UUID NOT NULL,
  activated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT curriculum_grade_active_releases_grade_scope_fkey
    FOREIGN KEY (grade_id, framework_id)
    REFERENCES curriculum_grades(id, framework_id) ON DELETE CASCADE,
  CONSTRAINT curriculum_grade_active_releases_release_scope_fkey
    FOREIGN KEY (release_id, framework_id)
    REFERENCES curriculum_releases(id, framework_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS curriculum_pathways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID NOT NULL REFERENCES curriculum_releases(id) ON DELETE RESTRICT,
  framework_id UUID NOT NULL,
  grade_id UUID NOT NULL,
  parent_pathway_id UUID,
  pathway_type TEXT NOT NULL DEFAULT 'pathway'
    CHECK (pathway_type IN ('pathway', 'track')),
  code TEXT NOT NULL CHECK (BTRIM(code) <> ''),
  name TEXT NOT NULL CHECK (BTRIM(name) <> ''),
  description TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  source_id UUID REFERENCES curriculum_sources(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT curriculum_pathways_release_scope_fkey
    FOREIGN KEY (release_id, framework_id)
    REFERENCES curriculum_releases(id, framework_id) ON DELETE RESTRICT,
  CONSTRAINT curriculum_pathways_grade_scope_fkey
    FOREIGN KEY (grade_id, framework_id)
    REFERENCES curriculum_grades(id, framework_id) ON DELETE RESTRICT,
  UNIQUE (id, release_id, grade_id),
  CHECK (
    (pathway_type = 'pathway' AND parent_pathway_id IS NULL)
    OR (pathway_type = 'track' AND parent_pathway_id IS NOT NULL)
  )
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'curriculum_pathways'::regclass
      AND conname = 'curriculum_pathways_parent_scope_fkey'
  ) THEN
    ALTER TABLE curriculum_pathways
      ADD CONSTRAINT curriculum_pathways_parent_scope_fkey
      FOREIGN KEY (parent_pathway_id, release_id, grade_id)
      REFERENCES curriculum_pathways(id, release_id, grade_id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS curriculum_pathways_root_code_uidx
  ON curriculum_pathways (release_id, grade_id, code)
  WHERE parent_pathway_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS curriculum_pathways_track_code_uidx
  ON curriculum_pathways (release_id, grade_id, parent_pathway_id, code)
  WHERE parent_pathway_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS curriculum_selection_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID NOT NULL,
  grade_id UUID NOT NULL,
  pathway_id UUID NOT NULL,
  code TEXT NOT NULL CHECK (BTRIM(code) <> ''),
  name TEXT NOT NULL CHECK (BTRIM(name) <> ''),
  min_selections INTEGER NOT NULL DEFAULT 0 CHECK (min_selections >= 0),
  max_selections INTEGER NOT NULL CHECK (max_selections > 0),
  display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT curriculum_selection_groups_pathway_scope_fkey
    FOREIGN KEY (pathway_id, release_id, grade_id)
    REFERENCES curriculum_pathways(id, release_id, grade_id) ON DELETE RESTRICT,
  UNIQUE (pathway_id, code),
  UNIQUE (id, release_id, grade_id, pathway_id),
  CHECK (min_selections <= max_selections)
);

CREATE TABLE IF NOT EXISTS curriculum_pathway_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID NOT NULL,
  grade_id UUID NOT NULL,
  pathway_id UUID NOT NULL,
  selection_group_id UUID NOT NULL,
  grade_subject_id UUID NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT curriculum_pathway_subjects_group_scope_fkey
    FOREIGN KEY (selection_group_id, release_id, grade_id, pathway_id)
    REFERENCES curriculum_selection_groups(id, release_id, grade_id, pathway_id)
    ON DELETE RESTRICT,
  CONSTRAINT curriculum_pathway_subjects_grade_subject_scope_fkey
    FOREIGN KEY (grade_subject_id, release_id, grade_id)
    REFERENCES curriculum_grade_subjects(id, release_id, grade_id)
    ON DELETE RESTRICT,
  UNIQUE (selection_group_id, grade_subject_id)
);

CREATE TABLE IF NOT EXISTS curriculum_unit_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID NOT NULL,
  unit_id UUID NOT NULL,
  source_id UUID REFERENCES curriculum_sources(id) ON DELETE RESTRICT,
  source_document_id UUID,
  extraction_row_id UUID,
  page_from INTEGER,
  page_to INTEGER,
  locator TEXT NOT NULL DEFAULT '',
  excerpt TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT curriculum_unit_citations_unit_scope_fkey
    FOREIGN KEY (unit_id, release_id)
    REFERENCES curriculum_units(id, release_id) ON DELETE RESTRICT,
  CONSTRAINT curriculum_unit_citations_document_scope_fkey
    FOREIGN KEY (source_document_id, release_id)
    REFERENCES curriculum_source_documents(id, release_id) ON DELETE RESTRICT,
  CONSTRAINT curriculum_unit_citations_extraction_row_fkey
    FOREIGN KEY (extraction_row_id, source_document_id)
    REFERENCES curriculum_extraction_rows(id, source_document_id) ON DELETE RESTRICT,
  CHECK (source_id IS NOT NULL OR source_document_id IS NOT NULL),
  CHECK (extraction_row_id IS NULL OR source_document_id IS NOT NULL),
  CHECK (
    (page_from IS NULL AND page_to IS NULL)
    OR (page_from > 0 AND page_to >= page_from)
  )
);

CREATE INDEX IF NOT EXISTS curriculum_framework_versions_framework_idx
  ON curriculum_framework_versions (framework_id, version_code);
CREATE INDEX IF NOT EXISTS curriculum_releases_framework_released_idx
  ON curriculum_releases (framework_id, released_at DESC);
CREATE INDEX IF NOT EXISTS curriculum_grade_active_releases_release_idx
  ON curriculum_grade_active_releases (release_id, grade_id);
CREATE INDEX IF NOT EXISTS curriculum_grade_subjects_release_grade_idx
  ON curriculum_grade_subjects (release_id, grade_id, display_order)
  WHERE release_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS curriculum_units_release_grade_subject_idx
  ON curriculum_units (release_id, grade_subject_id, parent_unit_id, sequence)
  WHERE release_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS curriculum_learning_outcomes_release_unit_idx
  ON curriculum_learning_outcomes (release_id, unit_id, sequence)
  WHERE release_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS curriculum_inquiry_questions_release_unit_idx
  ON curriculum_inquiry_questions (release_id, unit_id, sequence)
  WHERE release_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS curriculum_learning_activities_release_unit_idx
  ON curriculum_learning_activities (release_id, unit_id, sequence)
  WHERE release_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS curriculum_strands_release_grade_subject_idx
  ON curriculum_strands (release_id, grade_level, subject_id, position)
  WHERE release_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS curriculum_sub_strands_release_strand_idx
  ON curriculum_sub_strands (release_id, strand_id, position)
  WHERE release_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS curriculum_source_documents_release_idx
  ON curriculum_source_documents (release_id, grade_code, subject);
CREATE INDEX IF NOT EXISTS curriculum_ingestion_runs_release_idx
  ON curriculum_ingestion_runs (release_id, started_at DESC);
CREATE INDEX IF NOT EXISTS curriculum_pathways_release_grade_idx
  ON curriculum_pathways (release_id, grade_id, parent_pathway_id, display_order);
CREATE INDEX IF NOT EXISTS curriculum_selection_groups_pathway_idx
  ON curriculum_selection_groups (release_id, grade_id, pathway_id, display_order);
CREATE INDEX IF NOT EXISTS curriculum_pathway_subjects_pathway_idx
  ON curriculum_pathway_subjects (release_id, grade_id, pathway_id, display_order);
CREATE INDEX IF NOT EXISTS curriculum_pathway_subjects_grade_subject_idx
  ON curriculum_pathway_subjects (grade_subject_id);
CREATE INDEX IF NOT EXISTS curriculum_unit_citations_unit_idx
  ON curriculum_unit_citations (release_id, unit_id, page_from);
CREATE INDEX IF NOT EXISTS curriculum_unit_citations_source_document_idx
  ON curriculum_unit_citations (source_document_id, page_from)
  WHERE source_document_id IS NOT NULL;

-- Normalized child rows inherit their unit release. Callers cannot attach a child
-- to a different release, while pre-058 unit trees continue to inherit NULL.
CREATE OR REPLACE FUNCTION curriculum_inherit_unit_release()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  owning_release_id UUID;
BEGIN
  SELECT release_id
  INTO owning_release_id
  FROM curriculum_units
  WHERE id = NEW.unit_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Curriculum unit % does not exist', NEW.unit_id;
  END IF;

  IF NEW.release_id IS NOT NULL
     AND NEW.release_id IS DISTINCT FROM owning_release_id THEN
    RAISE EXCEPTION 'Curriculum child release % does not match unit % release %',
      NEW.release_id, NEW.unit_id, owning_release_id;
  END IF;

  NEW.release_id := owning_release_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS curriculum_learning_outcomes_inherit_release
  ON curriculum_learning_outcomes;
CREATE TRIGGER curriculum_learning_outcomes_inherit_release
  BEFORE INSERT OR UPDATE OF unit_id, release_id ON curriculum_learning_outcomes
  FOR EACH ROW EXECUTE FUNCTION curriculum_inherit_unit_release();

DROP TRIGGER IF EXISTS curriculum_inquiry_questions_inherit_release
  ON curriculum_inquiry_questions;
CREATE TRIGGER curriculum_inquiry_questions_inherit_release
  BEFORE INSERT OR UPDATE OF unit_id, release_id ON curriculum_inquiry_questions
  FOR EACH ROW EXECUTE FUNCTION curriculum_inherit_unit_release();

DROP TRIGGER IF EXISTS curriculum_learning_activities_inherit_release
  ON curriculum_learning_activities;
CREATE TRIGGER curriculum_learning_activities_inherit_release
  BEFORE INSERT OR UPDATE OF unit_id, release_id ON curriculum_learning_activities
  FOR EACH ROW EXECUTE FUNCTION curriculum_inherit_unit_release();

-- Release-owned content is append-only. An idempotent write may refresh updated_at,
-- but changing data or deleting it requires creating a new release instead.
CREATE OR REPLACE FUNCTION curriculum_prevent_release_content_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.release_id IS NOT NULL THEN
      RAISE EXCEPTION 'Release-owned rows in % are immutable', TG_TABLE_NAME;
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.release_id IS NOT NULL
     AND (TO_JSONB(NEW) - 'updated_at') IS DISTINCT FROM
         (TO_JSONB(OLD) - 'updated_at') THEN
    RAISE EXCEPTION 'Release-owned rows in % are immutable', TG_TABLE_NAME;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'curriculum_grade_subjects',
    'curriculum_units',
    'curriculum_learning_outcomes',
    'curriculum_inquiry_questions',
    'curriculum_learning_activities',
    'curriculum_strands',
    'curriculum_sub_strands',
    'curriculum_source_documents'
  ]
  LOOP
    EXECUTE FORMAT(
      'DROP TRIGGER IF EXISTS curriculum_release_content_immutable ON %I',
      table_name
    );
    EXECUTE FORMAT(
      'CREATE TRIGGER curriculum_release_content_immutable '
      'BEFORE UPDATE OR DELETE ON %I FOR EACH ROW '
      'EXECUTE FUNCTION curriculum_prevent_release_content_mutation()',
      table_name
    );
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION curriculum_prevent_immutable_row_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Rows in % are immutable; create a new curriculum release', TG_TABLE_NAME;
END;
$$;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'curriculum_framework_versions',
    'curriculum_releases',
    'curriculum_pathways',
    'curriculum_selection_groups',
    'curriculum_pathway_subjects',
    'curriculum_unit_citations'
  ]
  LOOP
    EXECUTE FORMAT(
      'DROP TRIGGER IF EXISTS curriculum_row_immutable ON %I',
      table_name
    );
    EXECUTE FORMAT(
      'CREATE TRIGGER curriculum_row_immutable '
      'BEFORE UPDATE OR DELETE ON %I FOR EACH ROW '
      'EXECUTE FUNCTION curriculum_prevent_immutable_row_mutation()',
      table_name
    );
  END LOOP;
END $$;

-- Activation is the only mutable release control. Flipping release_id back to an
-- earlier staged release is the rollback operation; content rows are never rewritten.
CREATE OR REPLACE FUNCTION curriculum_validate_active_grade_release()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM curriculum_grade_subjects
    WHERE grade_id = NEW.grade_id
      AND release_id = NEW.release_id
  ) THEN
    RAISE EXCEPTION 'Release % has no curriculum content for grade %',
      NEW.release_id, NEW.grade_id;
  END IF;

  NEW.activated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS curriculum_grade_active_releases_validate
  ON curriculum_grade_active_releases;
CREATE TRIGGER curriculum_grade_active_releases_validate
  BEFORE INSERT OR UPDATE OF grade_id, framework_id, release_id
  ON curriculum_grade_active_releases
  FOR EACH ROW EXECUTE FUNCTION curriculum_validate_active_grade_release();
