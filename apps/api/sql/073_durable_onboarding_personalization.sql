-- Durable, bounded onboarding choices for future personalization surfaces.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS onboarding_personalization JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_onboarding_personalization_shape_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_onboarding_personalization_shape_check
      CHECK (
        onboarding_personalization IS NULL
        OR (
          jsonb_typeof(onboarding_personalization) = 'object'
          AND onboarding_personalization->>'version' = '1'
          AND octet_length(onboarding_personalization::text) <= 16000
        )
      );
  END IF;
END $$;
