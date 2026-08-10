-- Durable, content-addressed narration for authored learner assessment content.
-- Raw assessment text is retained only as the generation input; telemetry must use
-- identity hashes and lifecycle state rather than text or answers.
CREATE TABLE IF NOT EXISTS tts_assets (
  identity_sha256 TEXT PRIMARY KEY CHECK (identity_sha256 ~ '^[a-f0-9]{64}$'),
  canonical_text TEXT NOT NULL,
  language_code TEXT NOT NULL,
  voice_profile TEXT NOT NULL,
  provider_voice TEXT NOT NULL,
  speaking_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'ready', 'failed', 'unavailable')),
  storage_path TEXT,
  public_url TEXT,
  duration_ms INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
  byte_size BIGINT CHECK (byte_size IS NULL OR byte_size >= 0),
  provider_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS assessment_tts_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_sha256 TEXT NOT NULL UNIQUE REFERENCES tts_assets(identity_sha256) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  provider_job_name TEXT,
  provider_submission_token TEXT NOT NULL UNIQUE,
  provider_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'submitting', 'submitted', 'polling', 'completed', 'failed', 'uncertain')),
  error_code TEXT,
  error_message TEXT,
  submitted_at TIMESTAMPTZ,
  last_polled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assessment_tts_queue (
  identity_sha256 TEXT PRIMARY KEY REFERENCES tts_assets(identity_sha256) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 0,
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempts INTEGER NOT NULL DEFAULT 0,
  locked_by TEXT,
  lease_expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'done', 'failed')),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assessment_tts_queue_claim
  ON assessment_tts_queue (status, available_at, priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_assessment_tts_jobs_poll
  ON assessment_tts_jobs (status, last_polled_at, updated_at);

-- Server-authored generated quiz descriptors. Clients receive only the opaque
-- session id; narration resolution never accepts the generated text itself.
CREATE TABLE IF NOT EXISTS assessment_narration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  generation_run_id UUID REFERENCES ai_generation_runs(id) ON DELETE SET NULL,
  source TEXT NOT NULL CHECK (source IN ('quiz_generation', 'curriculum_quiz_generation')),
  subject_name TEXT,
  context TEXT,
  questions JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX IF NOT EXISTS idx_assessment_narration_sessions_user
  ON assessment_narration_sessions (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS user_narration_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  selected_profile TEXT NOT NULL DEFAULT 'Samora' CHECK (selected_profile IN ('Samora', 'Barake', 'Judith', 'Bella')),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
