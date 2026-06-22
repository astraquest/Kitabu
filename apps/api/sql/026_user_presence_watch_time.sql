ALTER TABLE users
  ADD COLUMN IF NOT EXISTS presence_status TEXT NOT NULL DEFAULT 'offline',
  ADD COLUMN IF NOT EXISTS presence_last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS presence_session_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS watch_time_seconds BIGINT NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_presence_status_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_presence_status_check
      CHECK (presence_status IN ('online', 'offline'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS user_presence_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  auth_session_id TEXT,
  device_id TEXT,
  device_label TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds BIGINT NOT NULL DEFAULT 0,
  close_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_presence_sessions_user_active
  ON user_presence_sessions (user_id, ended_at, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_presence_status_seen
  ON users (presence_status, presence_last_seen_at DESC);
