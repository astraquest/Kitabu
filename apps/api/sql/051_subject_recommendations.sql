CREATE TABLE IF NOT EXISTS learner_subject_display_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'automatic' CHECK (mode IN ('automatic', 'manual')),
  onboarding_subject_ids TEXT[] NOT NULL DEFAULT '{}',
  manual_subject_ids TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subject_recommendation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  grade_level TEXT NOT NULL,
  surface TEXT NOT NULL CHECK (surface IN ('chat', 'dashboard')),
  event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'selection')),
  subject_id TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 5),
  reason TEXT NOT NULL,
  strategy_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subject_recommendation_events_user
  ON subject_recommendation_events (user_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subject_recommendation_events_grade
  ON subject_recommendation_events (grade_level, event_type, subject_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subject_recommendation_events_recommendation
  ON subject_recommendation_events (recommendation_id, user_id);
