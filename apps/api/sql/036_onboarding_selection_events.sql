CREATE TABLE IF NOT EXISTS onboarding_selection_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_session_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  step_key TEXT NOT NULL,
  option_key TEXT NOT NULL,
  option_label TEXT NOT NULL,
  role TEXT,
  county TEXT,
  grade_level TEXT,
  country_code TEXT,
  curriculum_code TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT onboarding_selection_events_session_check
    CHECK (char_length(anonymous_session_id) BETWEEN 8 AND 160),
  CONSTRAINT onboarding_selection_events_step_check
    CHECK (char_length(step_key) BETWEEN 1 AND 80),
  CONSTRAINT onboarding_selection_events_option_check
    CHECK (char_length(option_key) BETWEEN 1 AND 160 AND char_length(option_label) BETWEEN 1 AND 240)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_selection_events_created_at
  ON onboarding_selection_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_onboarding_selection_events_session
  ON onboarding_selection_events (anonymous_session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_onboarding_selection_events_user
  ON onboarding_selection_events (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_onboarding_selection_events_school_step
  ON onboarding_selection_events (school_id, step_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_onboarding_selection_events_step_option
  ON onboarding_selection_events (step_key, option_key, created_at DESC);
