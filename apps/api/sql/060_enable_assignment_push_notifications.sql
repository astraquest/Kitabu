INSERT INTO feature_flags (key, enabled, description)
VALUES (
  'notifications.push',
  TRUE,
  'Deliver assignment and account notifications through registered Expo push tokens.'
)
ON CONFLICT (key)
DO UPDATE SET
  enabled = TRUE,
  description = EXCLUDED.description,
  updated_at = NOW();
