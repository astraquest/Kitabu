CREATE TABLE IF NOT EXISTS weekly_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_level TEXT NOT NULL,
  week_start DATE NOT NULL,
  title TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 20 CHECK (duration_minutes BETWEEN 5 AND 180),
  questions JSONB NOT NULL CHECK (jsonb_typeof(questions) = 'array'),
  opens_at TIMESTAMPTZ NOT NULL,
  closes_at TIMESTAMPTZ NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (grade_level, week_start),
  CHECK (closes_at > opens_at)
);

CREATE TABLE IF NOT EXISTS weekly_exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES weekly_exams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  answers JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(answers) = 'array'),
  score NUMERIC(5,2),
  correct_count INTEGER,
  total_questions INTEGER,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  UNIQUE (exam_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_weekly_exams_grade_window
  ON weekly_exams (grade_level, week_start DESC, is_published);

CREATE INDEX IF NOT EXISTS idx_weekly_exam_attempts_user
  ON weekly_exam_attempts (user_id, submitted_at DESC);

INSERT INTO feature_flags (key, enabled, description)
VALUES ('learning.weekly_exams', TRUE, 'Weekly mixed-subject learner exams with scored review.')
ON CONFLICT (key) DO UPDATE
SET enabled = EXCLUDED.enabled,
    description = EXCLUDED.description;
