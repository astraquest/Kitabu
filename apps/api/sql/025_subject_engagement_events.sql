CREATE TABLE IF NOT EXISTS subject_engagement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  grade_level TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  feature TEXT NOT NULL CHECK (feature IN ('lets_learn', 'library', 'take_quiz', 'quizme')),
  event_type TEXT NOT NULL DEFAULT 'interaction',
  duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subject_engagement_scope
  ON subject_engagement_events (school_id, grade_level, subject_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subject_engagement_user
  ON subject_engagement_events (user_id, created_at DESC);
