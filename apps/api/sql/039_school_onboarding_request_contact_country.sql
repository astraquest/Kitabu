-- Extend existing school onboarding requests without mutating applied migration 037.
ALTER TABLE school_onboarding_requests
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT;

UPDATE school_onboarding_requests
SET country = COALESCE(NULLIF(country, ''), 'Kenya')
WHERE country IS NULL OR country = '';

ALTER TABLE school_onboarding_requests
  ALTER COLUMN country SET DEFAULT 'Kenya',
  ALTER COLUMN country SET NOT NULL,
  ALTER COLUMN county DROP NOT NULL;
