-- Educational assets are copied into Kitabu-controlled storage. Source URLs below
-- are immutable provenance records and must never be exposed as learner-serving URLs.

CREATE TABLE IF NOT EXISTS educational_asset_providers (
  provider_key TEXT PRIMARY KEY CHECK (provider_key ~ '^[a-z0-9][a-z0-9._-]{0,99}$'),
  display_name TEXT NOT NULL CHECK (btrim(display_name) <> ''),
  homepage_url TEXT NOT NULL CHECK (homepage_url ~ '^https?://'),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS educational_asset_import_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key TEXT NOT NULL REFERENCES educational_asset_providers(provider_key) ON DELETE RESTRICT,
  importer_key TEXT NOT NULL CHECK (importer_key ~ '^[a-z0-9][a-z0-9._-]{0,99}$'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  discovered_count BIGINT NOT NULL DEFAULT 0 CHECK (discovered_count >= 0),
  downloaded_count BIGINT NOT NULL DEFAULT 0 CHECK (downloaded_count >= 0),
  imported_count BIGINT NOT NULL DEFAULT 0 CHECK (imported_count >= 0),
  duplicate_count BIGINT NOT NULL DEFAULT 0 CHECK (duplicate_count >= 0),
  rejected_count BIGINT NOT NULL DEFAULT 0 CHECK (rejected_count >= 0),
  quarantined_count BIGINT NOT NULL DEFAULT 0 CHECK (quarantined_count >= 0),
  error_count BIGINT NOT NULL DEFAULT 0 CHECK (error_count >= 0),
  checkpoint JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(checkpoint) = 'object'),
  cursor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (completed_at IS NULL OR started_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_educational_asset_import_runs_provider_status
  ON educational_asset_import_runs (provider_key, status, started_at DESC);

CREATE TABLE IF NOT EXISTS educational_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (btrim(title) <> ''),
  description TEXT,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'audio', 'video', 'document', 'vector')),
  mime_type TEXT NOT NULL CHECK (btrim(mime_type) <> ''),
  content_sha256 TEXT NOT NULL UNIQUE CHECK (content_sha256 ~ '^[a-f0-9]{64}$'),
  byte_size BIGINT NOT NULL CHECK (byte_size >= 0),
  storage_backend TEXT NOT NULL DEFAULT 'local' CHECK (storage_backend = 'local'),
  storage_key TEXT NOT NULL UNIQUE CHECK (
    btrim(storage_key) <> ''
    AND storage_key !~ '(^|[\\/])\.\.([\\/]|$)'
    AND storage_key !~ '^([A-Za-z]:)?[\\/]'
  ),
  production_status TEXT NOT NULL DEFAULT 'draft' CHECK (production_status IN ('draft', 'review', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS educational_asset_provenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES educational_assets(id) ON DELETE RESTRICT,
  source_url TEXT NOT NULL CHECK (btrim(source_url) <> ''),
  source_name TEXT NOT NULL CHECK (btrim(source_name) <> ''),
  source_license TEXT NOT NULL CHECK (source_license IN (
    'CC0-1.0', 'PUBLIC-DOMAIN', 'MIT', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', 'CC-BY-3.0', 'CC-BY-4.0', 'CC-BY-SA-3.0', 'CC-BY-SA-4.0',
    'CC-BY-NC-4.0', 'CC-BY-NC-SA-4.0', 'CC-BY-ND-4.0', 'CC-BY-NC-ND-4.0',
    'ALL-RIGHTS-RESERVED', 'PROPRIETARY', 'UNKNOWN'
  )),
  source_license_url TEXT,
  provider_key TEXT REFERENCES educational_asset_providers(provider_key) ON DELETE RESTRICT,
  provider_asset_id TEXT,
  source_raw_url TEXT,
  attribution TEXT,
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_educational_asset_provenance_provider_identity
  ON educational_asset_provenance (provider_key, provider_asset_id)
  WHERE provider_key IS NOT NULL AND provider_asset_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_educational_assets_production
  ON educational_assets (production_status, media_type, created_at DESC);

CREATE OR REPLACE FUNCTION prevent_educational_asset_provenance_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Educational asset provenance is immutable';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS educational_asset_provenance_immutable ON educational_asset_provenance;
CREATE TRIGGER educational_asset_provenance_immutable
  BEFORE UPDATE OR DELETE ON educational_asset_provenance
  FOR EACH ROW EXECUTE FUNCTION prevent_educational_asset_provenance_mutation();
