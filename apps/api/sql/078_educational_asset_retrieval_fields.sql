ALTER TABLE educational_assets
  ADD COLUMN IF NOT EXISTS subject TEXT,
  ADD COLUMN IF NOT EXISTS topic TEXT,
  ADD COLUMN IF NOT EXISTS grade_level TEXT;

CREATE INDEX IF NOT EXISTS idx_educational_assets_learner_retrieval
  ON educational_assets (production_status, subject, topic, grade_level, media_type, title);
