CREATE TABLE IF NOT EXISTS diagnostic_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  subjects TEXT[] NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  result_summary JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS diagnostic_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES diagnostic_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  sub_strand_key TEXT NOT NULL,
  answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  confidence_score INTEGER NOT NULL CHECK (confidence_score BETWEEN 1 AND 5),
  response_latency_ms INTEGER NOT NULL CHECK (response_latency_ms >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, question_id)
);

CREATE TABLE IF NOT EXISTS mastery_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL,
  sub_strand_key TEXT NOT NULL,
  mastery_score NUMERIC(5,4) NOT NULL DEFAULT 0,
  correctness_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  avg_latency_ms INTEGER NOT NULL DEFAULT 0,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_practiced_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, subject_id, sub_strand_key)
);

CREATE TABLE IF NOT EXISTS confidence_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL,
  sub_strand_key TEXT NOT NULL,
  question_id TEXT,
  confidence_score INTEGER NOT NULL CHECK (confidence_score BETWEEN 1 AND 5),
  response_latency_ms INTEGER NOT NULL CHECK (response_latency_ms >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS spaced_repetition_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL,
  sub_strand_key TEXT NOT NULL,
  next_review_date DATE NOT NULL,
  interval_days INTEGER NOT NULL DEFAULT 1,
  ease_factor NUMERIC(4,2) NOT NULL DEFAULT 2.50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, subject_id, sub_strand_key)
);

CREATE INDEX IF NOT EXISTS idx_diagnostic_sessions_user_status
  ON diagnostic_sessions (user_id, kind, status, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_diagnostic_answers_session
  ON diagnostic_answers (session_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_mastery_scores_user_subject
  ON mastery_scores (user_id, subject_id, mastery_score);

CREATE INDEX IF NOT EXISTS idx_confidence_records_user_substrand
  ON confidence_records (user_id, subject_id, sub_strand_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_spaced_repetition_due
  ON spaced_repetition_schedules (user_id, next_review_date);
