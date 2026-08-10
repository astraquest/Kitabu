ALTER TABLE educational_assets
  ADD COLUMN IF NOT EXISTS visual_type TEXT NOT NULL DEFAULT 'ILLUSTRATION' CHECK (visual_type IN ('VOCABULARY_IMAGE', 'ICON', 'PHOTO', 'ILLUSTRATION', 'SCIENTIFIC_DIAGRAM', 'MAP', 'CHEMICAL_STRUCTURE', 'UI_ICON')),
  ADD COLUMN IF NOT EXISTS subtopic TEXT,
  ADD COLUMN IF NOT EXISTS keywords TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS synonyms TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS grade_min INTEGER,
  ADD COLUMN IF NOT EXISTS grade_max INTEGER,
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS contains_text BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS alt_text TEXT,
  ADD COLUMN IF NOT EXISTS educational_description TEXT,
  ADD COLUMN IF NOT EXISTS normalization_status TEXT NOT NULL DEFAULT 'original-only' CHECK (normalization_status IN ('original-only', 'normalized', 'needs-normalization', 'quarantined')),
  ADD CONSTRAINT educational_assets_grade_range_check CHECK (grade_min IS NULL OR grade_max IS NULL OR grade_min <= grade_max);

CREATE TABLE IF NOT EXISTS educational_asset_curriculum_units (
  asset_id UUID NOT NULL REFERENCES educational_assets(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES curriculum_units(id) ON DELETE CASCADE,
  relationship_metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(relationship_metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (asset_id, unit_id)
);

CREATE INDEX IF NOT EXISTS idx_educational_assets_classification
  ON educational_assets (production_status, visual_type, grade_min, grade_max);
CREATE INDEX IF NOT EXISTS idx_educational_asset_curriculum_units_unit
  ON educational_asset_curriculum_units (unit_id, asset_id);
