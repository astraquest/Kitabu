ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS pilot_status TEXT NOT NULL DEFAULT 'not_enrolled',
  ADD COLUMN IF NOT EXISTS pilot_start_date DATE,
  ADD COLUMN IF NOT EXISTS pilot_end_date DATE,
  ADD COLUMN IF NOT EXISTS pilot_target_students INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pilot_onboarding_stage INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pilot_notes TEXT;

ALTER TABLE schools DROP CONSTRAINT IF EXISTS schools_pilot_status_check;
ALTER TABLE schools ADD CONSTRAINT schools_pilot_status_check
  CHECK (pilot_status IN ('not_enrolled', 'onboarding', 'active', 'paused', 'completed'));

ALTER TABLE schools DROP CONSTRAINT IF EXISTS schools_pilot_stage_check;
ALTER TABLE schools ADD CONSTRAINT schools_pilot_stage_check
  CHECK (pilot_onboarding_stage BETWEEN 0 AND 4);

ALTER TABLE schools DROP CONSTRAINT IF EXISTS schools_pilot_dates_check;
ALTER TABLE schools ADD CONSTRAINT schools_pilot_dates_check
  CHECK (pilot_end_date IS NULL OR pilot_start_date IS NULL OR pilot_end_date >= pilot_start_date);

INSERT INTO feature_flags (key, enabled, description)
VALUES ('schools.pilot_management', TRUE, 'School pilot onboarding stages and engagement reporting.')
ON CONFLICT (key) DO UPDATE
SET enabled = EXCLUDED.enabled,
    description = EXCLUDED.description;
