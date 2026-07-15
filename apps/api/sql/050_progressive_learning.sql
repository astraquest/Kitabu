CREATE TABLE IF NOT EXISTS progressive_lesson_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_attempt_id UUID NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  grade_level TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  lesson_key TEXT NOT NULL,
  lesson_version INTEGER NOT NULL CHECK (lesson_version > 0),
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed', 'needs_practice', 'abandoned')),
  current_step_id TEXT,
  checkpoint_score NUMERIC(5,2),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS progressive_lesson_attempts_user_idx
  ON progressive_lesson_attempts(user_id, last_activity_at DESC);

CREATE TABLE IF NOT EXISTS progressive_step_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_event_id UUID NOT NULL UNIQUE,
  attempt_id UUID NOT NULL REFERENCES progressive_lesson_attempts(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('guided', 'checkpoint')),
  attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
  response TEXT NOT NULL CHECK (char_length(response) BETWEEN 1 AND 160),
  is_correct BOOLEAN NOT NULL,
  misconception_code TEXT,
  response_latency_ms INTEGER NOT NULL DEFAULT 0 CHECK (response_latency_ms BETWEEN 0 AND 1800000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(attempt_id, step_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS progressive_step_attempts_attempt_idx
  ON progressive_step_attempts(attempt_id, created_at ASC);

CREATE TABLE IF NOT EXISTS progressive_lesson_progress (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  grade_level TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  lesson_key TEXT NOT NULL,
  best_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (best_score BETWEEN 0 AND 100),
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed', 'needs_practice')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, lesson_key)
);

CREATE INDEX IF NOT EXISTS progressive_lesson_progress_path_idx
  ON progressive_lesson_progress(user_id, grade_level, subject_id);

CREATE TABLE IF NOT EXISTS learning_reward_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  points INTEGER NOT NULL CHECK (points BETWEEN 0 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, source_type, source_id)
);

INSERT INTO feature_flags (key, enabled, description)
VALUES ('learning.progressive_math', TRUE, 'Use the progressive Mathematics learning path and deterministic lesson experience.')
ON CONFLICT (key) DO UPDATE
SET enabled = EXCLUDED.enabled,
    description = EXCLUDED.description;
