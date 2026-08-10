ALTER TABLE tts_artifacts
  ADD COLUMN IF NOT EXISTS identity_key TEXT,
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS voice TEXT,
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER,
  ADD COLUMN IF NOT EXISTS storage_backend TEXT,
  ADD COLUMN IF NOT EXISTS storage_key TEXT,
  ADD COLUMN IF NOT EXISTS storage_url TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS learner_needed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 0;

UPDATE tts_artifacts
SET identity_key = COALESCE(identity_key, cache_key),
    provider = COALESCE(provider, 'gemini'),
    model = COALESCE(model, gemini_model),
    voice = COALESCE(voice, gemini_voice),
    generated_at = COALESCE(generated_at, completed_at)
WHERE identity_key IS NULL OR provider IS NULL OR model IS NULL OR voice IS NULL;

ALTER TABLE tts_artifacts
  ALTER COLUMN identity_key SET NOT NULL,
  ALTER COLUMN provider SET DEFAULT 'cartesia',
  ALTER COLUMN model SET DEFAULT '',
  ALTER COLUMN voice SET DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_tts_artifacts_identity_key
  ON tts_artifacts (identity_key);

ALTER TABLE tts_artifacts DROP CONSTRAINT IF EXISTS tts_artifacts_audio_check;
ALTER TABLE tts_artifacts ADD CONSTRAINT tts_artifacts_ready_storage_check CHECK (
  status <> 'ready'
  OR (
    content_hash IS NOT NULL
    AND mime_type IS NOT NULL
    AND (
      (audio_data IS NOT NULL AND octet_length(audio_data) > 0)
      OR (storage_key IS NOT NULL AND length(storage_key) > 0)
    )
  )
);

ALTER TABLE tts_jobs
  ADD COLUMN IF NOT EXISTS learner_needed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS tts_provider_usage_daily (
  provider TEXT NOT NULL,
  usage_date DATE NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  character_count INTEGER NOT NULL DEFAULT 0,
  last_request_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (provider, usage_date),
  CONSTRAINT tts_provider_usage_daily_counts_check CHECK (request_count >= 0 AND character_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_tts_jobs_priority_claim
  ON tts_jobs (status, available_at, learner_needed DESC, priority DESC, created_at);
