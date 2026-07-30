-- Keep an existing TOTP credential active while a replacement is being verified.
-- A pending secret prevents setup/begin from silently disabling the current factor.
ALTER TABLE totp_credentials
  ADD COLUMN IF NOT EXISTS pending_secret TEXT;
