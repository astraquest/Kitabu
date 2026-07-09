CREATE TABLE IF NOT EXISTS content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  source TEXT NOT NULL,
  content_role TEXT NOT NULL DEFAULT 'model',
  reason TEXT NOT NULL DEFAULT 'unsafe_ai_content',
  content_text TEXT NOT NULL,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'open',
  reviewer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewer_note TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT content_reports_source_check
    CHECK (char_length(source) BETWEEN 2 AND 80),
  CONSTRAINT content_reports_content_role_check
    CHECK (content_role IN ('model', 'user', 'message', 'attachment', 'other')),
  CONSTRAINT content_reports_reason_check
    CHECK (reason IN ('unsafe_ai_content', 'inaccurate', 'privacy', 'abuse', 'other')),
  CONSTRAINT content_reports_status_check
    CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  CONSTRAINT content_reports_content_text_check
    CHECK (char_length(content_text) BETWEEN 1 AND 8000)
);

CREATE INDEX IF NOT EXISTS idx_content_reports_created_at
  ON content_reports (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_reports_status_created_at
  ON content_reports (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_reports_reporter_created_at
  ON content_reports (reporter_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_reports_school_created_at
  ON content_reports (school_id, created_at DESC);
