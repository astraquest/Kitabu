CREATE TABLE IF NOT EXISTS user_auth_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_subject TEXT NOT NULL,
  provider_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_subject),
  UNIQUE (user_id, provider)
);

ALTER TABLE phone_verification_codes
  DROP CONSTRAINT IF EXISTS phone_verification_codes_purpose_check;

ALTER TABLE phone_verification_codes
  ADD CONSTRAINT phone_verification_codes_purpose_check
  CHECK (purpose IN ('login', 'signup'));

CREATE INDEX IF NOT EXISTS idx_user_auth_identities_user
  ON user_auth_identities (user_id);
