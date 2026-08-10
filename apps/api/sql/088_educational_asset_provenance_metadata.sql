ALTER TABLE educational_asset_provenance
  ADD COLUMN IF NOT EXISTS original_filename TEXT
    CHECK (original_filename IS NULL OR length(original_filename) <= 512),
  ADD COLUMN IF NOT EXISTS creator TEXT
    CHECK (creator IS NULL OR length(creator) <= 1000),
  ADD COLUMN IF NOT EXISTS creator_url TEXT
    CHECK (creator_url IS NULL OR creator_url ~ '^https?://[^[:space:]]+$'),
  ADD COLUMN IF NOT EXISTS license_version TEXT
    CHECK (license_version IS NULL OR length(license_version) <= 128),
  ADD COLUMN IF NOT EXISTS license_evidence TEXT
    CHECK (license_evidence IS NULL OR length(license_evidence) <= 4000);
