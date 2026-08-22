CREATE TABLE IF NOT EXISTS school_directory_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_record_key TEXT NOT NULL UNIQUE,
  school_name TEXT NOT NULL,
  level TEXT NOT NULL,
  county TEXT,
  sub_county TEXT,
  school_type TEXT,
  day_boarding TEXT,
  gender TEXT,
  sponsor TEXT,
  school_code TEXT NOT NULL CHECK (school_code ~ '^[0-9]{1,9}$'),
  latitude NUMERIC(8,6) NOT NULL CHECK (latitude BETWEEN -5 AND 5.5),
  longitude NUMERIC(9,6) NOT NULL CHECK (longitude BETWEEN 33.5 AND 42.5),
  data_source TEXT NOT NULL,
  source_workbook_sha256 TEXT NOT NULL CHECK (source_workbook_sha256 ~ '^[0-9a-f]{64}$'),
  source_row_number INTEGER NOT NULL CHECK (source_row_number > 1),
  source_row_sha256 TEXT NOT NULL CHECK (source_row_sha256 ~ '^[0-9a-f]{64}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_directory_county
  ON school_directory_records (county);

CREATE INDEX IF NOT EXISTS idx_school_directory_school_code
  ON school_directory_records (school_code);

CREATE INDEX IF NOT EXISTS idx_school_directory_level
  ON school_directory_records (level);
