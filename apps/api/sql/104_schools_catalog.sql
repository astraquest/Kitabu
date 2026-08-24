-- Stage A: make schools the single operational/catalog entity while retaining
-- school_directory_records for rollback until the guarded Stage B migration.
ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS source_record_key TEXT,
  ADD COLUMN IF NOT EXISTS source_workbook_sha256 TEXT,
  ADD COLUMN IF NOT EXISTS source_row_number INTEGER,
  ADD COLUMN IF NOT EXISTS source_row_sha256 TEXT,
  ADD COLUMN IF NOT EXISTS catalog_level TEXT,
  ADD COLUMN IF NOT EXISTS county TEXT,
  ADD COLUMN IF NOT EXISTS sub_county TEXT,
  ADD COLUMN IF NOT EXISTS catalog_school_type TEXT,
  ADD COLUMN IF NOT EXISTS day_boarding TEXT,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS sponsor TEXT,
  ADD COLUMN IF NOT EXISTS school_code TEXT,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(8,6),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS data_source TEXT,
  ADD COLUMN IF NOT EXISTS lead_status TEXT NOT NULL DEFAULT 'customer',
  ADD COLUMN IF NOT EXISTS selection_count BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_selected_at TIMESTAMPTZ;

ALTER TABLE schools
  DROP CONSTRAINT IF EXISTS schools_source_record_key_format,
  ADD CONSTRAINT schools_source_record_key_format
    CHECK (source_record_key IS NULL OR source_record_key ~ '^(knec:[0-9]{1,9}|source:[0-9a-f]{64})$'),
  DROP CONSTRAINT IF EXISTS schools_source_workbook_sha256_format,
  ADD CONSTRAINT schools_source_workbook_sha256_format
    CHECK (source_workbook_sha256 IS NULL OR source_workbook_sha256 ~ '^[0-9a-f]{64}$'),
  DROP CONSTRAINT IF EXISTS schools_source_row_sha256_format,
  ADD CONSTRAINT schools_source_row_sha256_format
    CHECK (source_row_sha256 IS NULL OR source_row_sha256 ~ '^[0-9a-f]{64}$'),
  DROP CONSTRAINT IF EXISTS schools_source_row_number_valid,
  ADD CONSTRAINT schools_source_row_number_valid
    CHECK (source_row_number IS NULL OR source_row_number > 1),
  DROP CONSTRAINT IF EXISTS schools_school_code_format,
  ADD CONSTRAINT schools_school_code_format
    CHECK (school_code IS NULL OR school_code ~ '^[0-9]{1,9}$'),
  DROP CONSTRAINT IF EXISTS schools_catalog_coordinates_valid,
  ADD CONSTRAINT schools_catalog_coordinates_valid
    CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude BETWEEN -5 AND 5.5 AND longitude BETWEEN 33.5 AND 42.5)),
  DROP CONSTRAINT IF EXISTS schools_lead_status_valid,
  ADD CONSTRAINT schools_lead_status_valid
    CHECK (lead_status IN ('prospect', 'customer', 'inactive')),
  DROP CONSTRAINT IF EXISTS schools_selection_count_valid,
  ADD CONSTRAINT schools_selection_count_valid
    CHECK (selection_count >= 0);

CREATE UNIQUE INDEX IF NOT EXISTS idx_schools_source_record_key
  ON schools (source_record_key)
  WHERE source_record_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_schools_catalog_search
  ON schools (lower(name), lower(COALESCE(county, location)), id);

CREATE INDEX IF NOT EXISTS idx_schools_catalog_county
  ON schools (lower(county), lower(name), id)
  WHERE county IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_schools_catalog_code
  ON schools (school_code)
  WHERE school_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_schools_prospect_search
  ON schools (lead_status, lower(name), id);

CREATE INDEX IF NOT EXISTS idx_schools_popularity
  ON schools (selection_count DESC, last_selected_at DESC NULLS LAST, lower(name), id);
