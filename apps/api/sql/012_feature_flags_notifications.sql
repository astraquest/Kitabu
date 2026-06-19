CREATE TABLE IF NOT EXISTS feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'in_app',
  status TEXT NOT NULL DEFAULT 'unread',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES user_notifications(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  provider_message_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  token TEXT NOT NULL,
  device_id TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (platform, token)
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created
  ON user_notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_status
  ON user_notifications (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_user_created
  ON notification_deliveries (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user
  ON user_push_tokens (user_id, enabled);

INSERT INTO feature_flags (key, enabled, description)
VALUES
  ('payments.mpesa_sms', TRUE, 'Send SMS notifications for important M-Pesa payment outcomes.'),
  ('notifications.in_app', TRUE, 'Persist user-facing in-app notifications.'),
  ('notifications.push', FALSE, 'Mobile push notifications via FCM or Expo push tokens.'),
  ('analytics.posthog', FALSE, 'Product analytics event capture.'),
  ('observability.sentry', FALSE, 'Sentry exception reporting.'),
  ('auth.oauth_google', FALSE, 'Google OAuth login.'),
  ('auth.oauth_apple', FALSE, 'Apple login for iOS.'),
  ('billing.paypal', FALSE, 'PayPal checkout for international users.')
ON CONFLICT (key)
DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = NOW();
