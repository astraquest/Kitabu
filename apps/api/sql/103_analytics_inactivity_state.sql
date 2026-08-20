-- Durable once-per-inactivity-episode state. This migration is intentionally
-- unapplied by this change and is safe to rerun.
CREATE TABLE IF NOT EXISTS analytics_inactivity_states (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_activity_at timestamptz NOT NULL,
  emitted_for_activity_at timestamptz,
  emitted_event_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_inactivity_states_activity_idx
  ON analytics_inactivity_states (last_activity_at, emitted_for_activity_at);
