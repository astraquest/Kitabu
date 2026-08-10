ALTER TABLE educational_asset_provenance
  ADD COLUMN IF NOT EXISTS provider_key TEXT REFERENCES educational_asset_providers(provider_key) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS provider_asset_id TEXT,
  ADD COLUMN IF NOT EXISTS source_raw_url TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_educational_asset_provenance_provider_identity
  ON educational_asset_provenance (provider_key, provider_asset_id)
  WHERE provider_key IS NOT NULL AND provider_asset_id IS NOT NULL;
