CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_deletion_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  fulfilled_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS account_deletion_requests_pending_user_idx
  ON account_deletion_requests (user_id)
  WHERE fulfilled_at IS NULL;

CREATE INDEX IF NOT EXISTS account_deletion_requests_due_idx
  ON account_deletion_requests (scheduled_deletion_at)
  WHERE fulfilled_at IS NULL;
