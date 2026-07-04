CREATE TABLE IF NOT EXISTS ai_generation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  feature TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  provider TEXT,
  model TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  latency_ms INTEGER NOT NULL DEFAULT 0,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd_micros BIGINT NOT NULL DEFAULT 0,
  estimated_cost_ksh_cents BIGINT NOT NULL DEFAULT 0,
  cache_status TEXT NOT NULL DEFAULT 'not_checked',
  cache_key TEXT,
  prompt_hash TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  output_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ai_generation_runs_status_check
    CHECK (status IN ('pending', 'completed', 'failed', 'blocked')),
  CONSTRAINT ai_generation_runs_cache_status_check
    CHECK (cache_status IN ('not_checked', 'miss', 'hit', 'stored', 'bypassed')),
  CONSTRAINT ai_generation_runs_latency_check
    CHECK (latency_ms >= 0),
  CONSTRAINT ai_generation_runs_tokens_check
    CHECK (prompt_tokens >= 0 AND completion_tokens >= 0 AND total_tokens >= 0),
  CONSTRAINT ai_generation_runs_cost_check
    CHECK (estimated_cost_usd_micros >= 0 AND estimated_cost_ksh_cents >= 0)
);

CREATE TABLE IF NOT EXISTS ai_generation_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES ai_generation_runs(id) ON DELETE CASCADE,
  attempt_order INTEGER NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd_micros BIGINT NOT NULL DEFAULT 0,
  estimated_cost_ksh_cents BIGINT NOT NULL DEFAULT 0,
  error_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ai_generation_attempts_run_order_unique
    UNIQUE (run_id, attempt_order),
  CONSTRAINT ai_generation_attempts_status_check
    CHECK (status IN ('started', 'completed', 'failed')),
  CONSTRAINT ai_generation_attempts_attempt_order_check
    CHECK (attempt_order > 0),
  CONSTRAINT ai_generation_attempts_latency_check
    CHECK (latency_ms >= 0),
  CONSTRAINT ai_generation_attempts_tokens_check
    CHECK (prompt_tokens >= 0 AND completion_tokens >= 0 AND total_tokens >= 0),
  CONSTRAINT ai_generation_attempts_cost_check
    CHECK (estimated_cost_usd_micros >= 0 AND estimated_cost_ksh_cents >= 0)
);

CREATE TABLE IF NOT EXISTS ai_generation_cache (
  cache_key TEXT PRIMARY KEY,
  feature TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  value_json JSONB,
  value_text TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ai_generation_cache_value_check
    CHECK (value_json IS NOT NULL OR value_text IS NOT NULL)
);

ALTER TABLE ai_generation_attempts
  ADD COLUMN IF NOT EXISTS estimated_cost_usd_micros BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_cost_ksh_cents BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error_summary TEXT;

UPDATE ai_generation_runs
SET latency_ms = 0
WHERE latency_ms IS NULL;

ALTER TABLE ai_generation_runs
  ALTER COLUMN status SET DEFAULT 'pending',
  ALTER COLUMN latency_ms SET DEFAULT 0,
  ALTER COLUMN cache_status SET DEFAULT 'not_checked';

ALTER TABLE ai_generation_runs
  DROP CONSTRAINT IF EXISTS ai_generation_runs_status_check,
  DROP CONSTRAINT IF EXISTS ai_generation_runs_cache_status_check,
  DROP CONSTRAINT IF EXISTS ai_generation_runs_latency_check,
  DROP CONSTRAINT IF EXISTS ai_generation_runs_tokens_check,
  DROP CONSTRAINT IF EXISTS ai_generation_runs_cost_check;

UPDATE ai_generation_runs
SET cache_status = CASE cache_status
  WHEN 'disabled' THEN 'not_checked'
  WHEN 'bypass' THEN 'bypassed'
  ELSE cache_status
END
WHERE cache_status IN ('disabled', 'bypass');

ALTER TABLE ai_generation_runs
  ADD CONSTRAINT ai_generation_runs_status_check
    CHECK (status IN ('pending', 'completed', 'failed', 'blocked')),
  ADD CONSTRAINT ai_generation_runs_cache_status_check
    CHECK (cache_status IN ('not_checked', 'miss', 'hit', 'stored', 'bypassed')),
  ADD CONSTRAINT ai_generation_runs_latency_check
    CHECK (latency_ms >= 0),
  ADD CONSTRAINT ai_generation_runs_tokens_check
    CHECK (prompt_tokens >= 0 AND completion_tokens >= 0 AND total_tokens >= 0),
  ADD CONSTRAINT ai_generation_runs_cost_check
    CHECK (estimated_cost_usd_micros >= 0 AND estimated_cost_ksh_cents >= 0);

UPDATE ai_generation_attempts
SET latency_ms = 0
WHERE latency_ms IS NULL;

ALTER TABLE ai_generation_attempts
  ALTER COLUMN latency_ms SET DEFAULT 0;

ALTER TABLE ai_generation_attempts
  DROP CONSTRAINT IF EXISTS ai_generation_attempts_status_check,
  DROP CONSTRAINT IF EXISTS ai_generation_attempts_attempt_order_check,
  DROP CONSTRAINT IF EXISTS ai_generation_attempts_latency_check,
  DROP CONSTRAINT IF EXISTS ai_generation_attempts_tokens_check,
  DROP CONSTRAINT IF EXISTS ai_generation_attempts_cost_check;

ALTER TABLE ai_generation_attempts
  ADD CONSTRAINT ai_generation_attempts_status_check
    CHECK (status IN ('started', 'completed', 'failed')),
  ADD CONSTRAINT ai_generation_attempts_attempt_order_check
    CHECK (attempt_order > 0),
  ADD CONSTRAINT ai_generation_attempts_latency_check
    CHECK (latency_ms >= 0),
  ADD CONSTRAINT ai_generation_attempts_tokens_check
    CHECK (prompt_tokens >= 0 AND completion_tokens >= 0 AND total_tokens >= 0),
  ADD CONSTRAINT ai_generation_attempts_cost_check
    CHECK (estimated_cost_usd_micros >= 0 AND estimated_cost_ksh_cents >= 0);

ALTER TABLE ai_generation_cache
  DROP CONSTRAINT IF EXISTS ai_generation_cache_value_check;

ALTER TABLE ai_generation_cache
  ADD CONSTRAINT ai_generation_cache_value_check
    CHECK (value_json IS NOT NULL OR value_text IS NOT NULL);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'ai_generation_runs'
      AND column_name = 'fx_rate_ksh_per_usd'
  ) THEN
    ALTER TABLE ai_generation_runs
      ALTER COLUMN fx_rate_ksh_per_usd SET DEFAULT 0;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'ai_generation_cache'
      AND column_name = 'response_kind'
  ) THEN
    ALTER TABLE ai_generation_cache
      ALTER COLUMN response_kind SET DEFAULT 'content';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'ai_generation_cache'
      AND column_name = 'prompt_hash'
  ) THEN
    ALTER TABLE ai_generation_cache
      ALTER COLUMN prompt_hash SET DEFAULT '';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ai_generation_runs_user_created_at
  ON ai_generation_runs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_generation_runs_subscription_created_at
  ON ai_generation_runs (subscription_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_generation_runs_school_feature_created_at
  ON ai_generation_runs (school_id, feature, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_generation_runs_feature_model_created_at
  ON ai_generation_runs (feature, provider, model, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_generation_runs_cache_status_created_at
  ON ai_generation_runs (cache_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_generation_attempts_provider_model_status
  ON ai_generation_attempts (provider, model, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_generation_cache_feature_prompt_schema
  ON ai_generation_cache (feature, prompt_version, schema_version);

CREATE INDEX IF NOT EXISTS idx_ai_generation_cache_expires_at_active
  ON ai_generation_cache (expires_at)
  WHERE expires_at IS NOT NULL;
