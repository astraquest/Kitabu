ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone_number TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS phone_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  purpose TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  role user_role,
  full_name TEXT,
  email TEXT,
  password_hash TEXT,
  accepted_terms BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phone_verification_codes_lookup
  ON phone_verification_codes (phone_number, purpose, expires_at DESC);

INSERT INTO feature_flags (key, enabled, description)
VALUES
  ('auth.phone_sms', TRUE, 'Send SMS verification codes for phone sign-in and signup.'),
  ('auth.oauth_google', TRUE, 'Allow Google ID token sign-in and signup.')
ON CONFLICT (key) DO UPDATE
SET enabled = EXCLUDED.enabled,
    description = EXCLUDED.description;

UPDATE users
SET phone_number = '254700000001',
    phone_verified = TRUE,
    phone_verified_at = COALESCE(phone_verified_at, NOW())
WHERE email = 'student@kitabu.ai'
  AND phone_number IS NULL;
