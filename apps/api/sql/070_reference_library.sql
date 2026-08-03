-- Derived reference material for internal template generation.
-- This stores corrected learning content and generated-asset references only;
-- source photographs, EXIF, location data, and other capture metadata are excluded.

CREATE TABLE IF NOT EXISTS reference_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_key TEXT NOT NULL UNIQUE,
  country_code TEXT NOT NULL,
  curriculum_code TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  title TEXT NOT NULL,
  source_identity TEXT NOT NULL,
  source_checksum TEXT CHECK (source_checksum IS NULL OR source_checksum ~ '^[a-f0-9]{64}$'),
  content_checksum TEXT NOT NULL CHECK (content_checksum ~ '^[a-f0-9]{64}$'),
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reference_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES reference_documents(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL CHECK (page_number > 0),
  subject TEXT NOT NULL,
  learning_objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, page_number),
  CHECK (jsonb_typeof(learning_objectives) = 'array')
);

CREATE TABLE IF NOT EXISTS reference_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES reference_pages(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position > 0),
  title TEXT NOT NULL,
  instructions TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  prompt_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  visual_requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  template_guidance TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (page_id, position),
  CHECK (jsonb_typeof(prompt_data) = 'object'),
  CHECK (jsonb_typeof(skills) = 'array'),
  CHECK (jsonb_typeof(visual_requirements) = 'array')
);

CREATE TABLE IF NOT EXISTS reference_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES reference_documents(id) ON DELETE CASCADE,
  page_id UUID REFERENCES reference_pages(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES reference_activities(id) ON DELETE CASCADE,
  asset_key TEXT NOT NULL,
  relative_path TEXT NOT NULL,
  asset_type TEXT NOT NULL DEFAULT 'image',
  description TEXT,
  content_checksum TEXT NOT NULL CHECK (content_checksum ~ '^[a-f0-9]{64}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, asset_key),
  CHECK (relative_path <> ''),
  CHECK (relative_path !~ '(^|[\\\\/])\\.\\.([\\\\/]|$)'),
  CHECK (relative_path !~ '^([A-Za-z]:)?[\\\\/]'),
  CHECK ((activity_id IS NULL) OR (page_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_reference_documents_scope
  ON reference_documents (country_code, curriculum_code, grade_level, title);

CREATE INDEX IF NOT EXISTS idx_reference_pages_document_subject
  ON reference_pages (document_id, subject, page_number);

CREATE INDEX IF NOT EXISTS idx_reference_activities_page_position
  ON reference_activities (page_id, position);

CREATE INDEX IF NOT EXISTS idx_reference_activities_type
  ON reference_activities (activity_type);

CREATE INDEX IF NOT EXISTS idx_reference_activities_search
  ON reference_activities
  USING GIN (to_tsvector(
    'simple',
    coalesce(title, '') || ' ' || coalesce(instructions, '') || ' ' ||
    coalesce(template_guidance, '') || ' ' || coalesce(skills::text, '') || ' ' ||
    coalesce(prompt_data::text, '')
  ));

CREATE INDEX IF NOT EXISTS idx_reference_assets_document
  ON reference_assets (document_id, page_id, activity_id);
