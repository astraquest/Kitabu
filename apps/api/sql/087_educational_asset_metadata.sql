ALTER TABLE educational_assets
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE educational_assets
  DROP CONSTRAINT IF EXISTS educational_assets_metadata_object_check;

ALTER TABLE educational_assets
  ADD CONSTRAINT educational_assets_metadata_object_check
  CHECK (jsonb_typeof(metadata) = 'object');
