-- Authoritative current consent, separate from event history so withdrawal
-- immediately governs later server lifecycle delivery.
CREATE TABLE IF NOT EXISTS analytics_consent_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_id uuid UNIQUE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  analytics_consent boolean NOT NULL DEFAULT false,
  marketing_consent boolean NOT NULL DEFAULT false,
  source text NOT NULL CHECK (source IN ('website', 'native')),
  platform text NOT NULL CHECK (platform IN ('web', 'ios', 'android')),
  consent_version text NOT NULL,
  first_attribution jsonb NOT NULL DEFAULT '{}'::jsonb,
  latest_attribution jsonb NOT NULL DEFAULT '{}'::jsonb,
  client_id text,
  app_instance_id text,
  consented_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT analytics_consent_states_subject_check CHECK (anonymous_id IS NOT NULL OR user_id IS NOT NULL),
  CONSTRAINT analytics_consent_states_attribution_check CHECK (
    jsonb_typeof(first_attribution) = 'object' AND jsonb_typeof(latest_attribution) = 'object'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS analytics_consent_states_user_idx
  ON analytics_consent_states (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS analytics_consent_states_updated_idx
  ON analytics_consent_states (updated_at DESC);
