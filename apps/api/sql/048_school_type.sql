ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS school_type TEXT NOT NULL DEFAULT 'day_school';

ALTER TABLE schools
  DROP CONSTRAINT IF EXISTS schools_school_type_valid;

ALTER TABLE schools
  ADD CONSTRAINT schools_school_type_valid
  CHECK (school_type IN ('day_school', 'boarding_school', 'day_and_boarding'));
