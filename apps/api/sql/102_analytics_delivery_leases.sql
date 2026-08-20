-- Durable, bounded retry leases for analytics provider delivery.
-- This migration is intentionally unapplied by this change.
ALTER TABLE analytics_event_deliveries
  ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS lease_owner text,
  ADD COLUMN IF NOT EXISTS lease_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS analytics_event_deliveries_claim_idx
  ON analytics_event_deliveries (next_attempt_at, created_at)
  WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS analytics_event_deliveries_lease_idx
  ON analytics_event_deliveries (lease_expires_at)
  WHERE lease_owner IS NOT NULL;
