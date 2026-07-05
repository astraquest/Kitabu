INSERT INTO feature_flags (key, enabled, description)
VALUES ('notifications.push', TRUE, 'Mobile push notifications via Expo push tokens.')
ON CONFLICT (key)
DO UPDATE SET
  enabled = TRUE,
  description = EXCLUDED.description,
  updated_at = NOW();
