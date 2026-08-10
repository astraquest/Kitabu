ALTER TABLE educational_assets
  ADD COLUMN IF NOT EXISTS width INTEGER CHECK (width IS NULL OR width > 0),
  ADD COLUMN IF NOT EXISTS height INTEGER CHECK (height IS NULL OR height > 0),
  ADD COLUMN IF NOT EXISTS aspect_ratio NUMERIC(12, 6) CHECK (aspect_ratio IS NULL OR aspect_ratio > 0),
  ADD COLUMN IF NOT EXISTS visual_hash TEXT CHECK (visual_hash IS NULL OR visual_hash ~ '^[a-f0-9]{64}$');

ALTER TABLE educational_assets
  DROP CONSTRAINT IF EXISTS educational_assets_normalization_status_check;

ALTER TABLE educational_assets
  ADD CONSTRAINT educational_assets_normalization_status_check
  CHECK (normalization_status IN ('original-only', 'normalized', 'needs-normalization', 'quarantined', 'validated-original', 'normalized-copy'));

CREATE INDEX IF NOT EXISTS idx_educational_assets_visual_hash
  ON educational_assets (visual_hash)
  WHERE visual_hash IS NOT NULL;
