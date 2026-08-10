-- Preserve the applied assessment narration queue before introducing the general TTS queue.
DO $$
BEGIN
  IF to_regclass('public.tts_jobs') IS NOT NULL
     AND to_regclass('public.assessment_tts_jobs') IS NULL THEN
    ALTER TABLE tts_jobs RENAME TO assessment_tts_jobs;
  END IF;

  IF to_regclass('public.tts_queue') IS NOT NULL
     AND to_regclass('public.assessment_tts_queue') IS NULL THEN
    ALTER TABLE tts_queue RENAME TO assessment_tts_queue;
  END IF;

  IF to_regclass('public.idx_tts_jobs_poll') IS NOT NULL
     AND to_regclass('public.idx_assessment_tts_jobs_poll') IS NULL THEN
    ALTER INDEX idx_tts_jobs_poll RENAME TO idx_assessment_tts_jobs_poll;
  END IF;

  IF to_regclass('public.idx_tts_queue_claim') IS NOT NULL
     AND to_regclass('public.idx_assessment_tts_queue_claim') IS NULL THEN
    ALTER INDEX idx_tts_queue_claim RENAME TO idx_assessment_tts_queue_claim;
  END IF;
END $$;

-- General durable TTS artifacts and jobs are separate from assessment narration.
CREATE TABLE IF NOT EXISTS tts_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  normalized_text TEXT NOT NULL,
  avatar_voice TEXT NOT NULL,
  gemini_voice TEXT NOT NULL,
  gemini_model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  mime_type TEXT,
  content_hash TEXT,
  audio_data BYTEA,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tts_artifacts_status_check CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
  CONSTRAINT tts_artifacts_retry_count_check CHECK (retry_count >= 0),
  CONSTRAINT tts_artifacts_audio_check CHECK (
    (status = 'ready' AND audio_data IS NOT NULL AND mime_type IS NOT NULL AND content_hash IS NOT NULL)
    OR status <> 'ready'
  )
);

CREATE TABLE IF NOT EXISTS tts_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL UNIQUE REFERENCES tts_artifacts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  last_error TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tts_jobs_status_check CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  CONSTRAINT tts_jobs_attempts_check CHECK (attempts >= 0)
);

CREATE INDEX IF NOT EXISTS idx_tts_artifacts_status_retry
  ON tts_artifacts (status, next_retry_at);

CREATE INDEX IF NOT EXISTS idx_tts_artifacts_content_hash
  ON tts_artifacts (content_hash)
  WHERE content_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tts_jobs_claim
  ON tts_jobs (status, available_at, locked_at);

CREATE INDEX IF NOT EXISTS idx_tts_jobs_artifact_status
  ON tts_jobs (artifact_id, status);
