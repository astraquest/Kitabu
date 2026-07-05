-- School onboarding requests submitted from the public website (kitabu.ai/schools/demo).
-- Feeds the sales pipeline (Playbook P0-6). No auth: rate-limited public endpoint.
CREATE TABLE IF NOT EXISTS school_onboarding_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name TEXT NOT NULL,
  county TEXT NOT NULL,
  town TEXT,
  school_level TEXT NOT NULL CHECK (school_level IN ('junior', 'senior', 'junior_and_senior')),
  boarding_type TEXT NOT NULL CHECK (boarding_type IN ('day', 'boarding', 'day_and_boarding')),
  student_count INTEGER NOT NULL CHECK (student_count > 0),
  contact_phone TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'website',
  email_delivered BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_onboarding_requests_created_at
  ON school_onboarding_requests (created_at DESC);
