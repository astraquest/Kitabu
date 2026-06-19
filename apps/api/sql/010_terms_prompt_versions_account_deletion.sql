ALTER TABLE users
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_version TEXT,
  ADD COLUMN IF NOT EXISTS privacy_version TEXT;

ALTER TABLE ai_usage_events
  ADD COLUMN IF NOT EXISTS prompt_version TEXT NOT NULL DEFAULT 'legacy';
