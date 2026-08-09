-- Versioned onboarding funnel events. Existing selection clients remain valid
-- through the selection defaults while newer clients can record the full funnel.
ALTER TABLE onboarding_selection_events
  ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'selection',
  ADD COLUMN IF NOT EXISTS event_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS step_index INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'onboarding_selection_events_funnel_event_check'
  ) THEN
    ALTER TABLE onboarding_selection_events
      ADD CONSTRAINT onboarding_selection_events_funnel_event_check
      CHECK (
        char_length(event_type) BETWEEN 1 AND 32
        AND event_type IN (
          'view',
          'selection',
          'skip',
          'back',
          'complete',
          'permission_result',
          'drop_off'
        )
        AND event_version BETWEEN 1 AND 10
        AND step_index BETWEEN 0 AND 100
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_onboarding_selection_events_funnel_type
  ON onboarding_selection_events (event_type, event_version, step_index, created_at DESC);
