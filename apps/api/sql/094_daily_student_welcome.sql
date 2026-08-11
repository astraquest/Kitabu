CREATE TABLE IF NOT EXISTS daily_student_welcome_deliveries (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  local_date DATE NOT NULL,
  welcome_text TEXT NOT NULL,
  artifact_key TEXT NOT NULL,
  voice TEXT NOT NULL,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, local_date)
);
