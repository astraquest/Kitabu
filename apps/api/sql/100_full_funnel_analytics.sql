-- First-party, minimized funnel event store. Client payloads are sanitized before insertion.
CREATE TABLE IF NOT EXISTS analytics_events (
  event_id uuid PRIMARY KEY,
  name text NOT NULL,
  occurred_at timestamptz NOT NULL,
  anonymous_id uuid NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  session_id uuid,
  platform text NOT NULL CHECK (platform IN ('web', 'ios', 'android', 'server')),
  source text NOT NULL CHECK (source IN ('website', 'native', 'server')),
  app_version text,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  analytics_consent boolean NOT NULL DEFAULT false,
  marketing_consent boolean NOT NULL DEFAULT false,
  first_attribution jsonb NOT NULL DEFAULT '{}'::jsonb,
  latest_attribution jsonb NOT NULL DEFAULT '{}'::jsonb,
  client_id text,
  app_instance_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT analytics_events_properties_object CHECK (jsonb_typeof(properties) = 'object'),
  CONSTRAINT analytics_events_first_attribution_object CHECK (jsonb_typeof(first_attribution) = 'object'),
  CONSTRAINT analytics_events_latest_attribution_object CHECK (jsonb_typeof(latest_attribution) = 'object')
);

CREATE INDEX IF NOT EXISTS analytics_events_occurred_at_idx ON analytics_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_anonymous_id_idx ON analytics_events (anonymous_id, occurred_at);
CREATE INDEX IF NOT EXISTS analytics_events_user_id_idx ON analytics_events (user_id, occurred_at);
CREATE INDEX IF NOT EXISTS analytics_events_name_dimensions_idx ON analytics_events (name, source, platform, occurred_at);

CREATE TABLE IF NOT EXISTS analytics_event_deliveries (
  event_id uuid NOT NULL REFERENCES analytics_events(event_id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('posthog', 'meta', 'tiktok', 'ga4')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed', 'skipped')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_attempt_at timestamptz,
  delivered_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, provider)
);

CREATE INDEX IF NOT EXISTS analytics_event_deliveries_retry_idx
  ON analytics_event_deliveries (status, last_attempt_at);
