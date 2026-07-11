ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS available_plan_codes TEXT[] NOT NULL DEFAULT ARRAY['monthly']::TEXT[];

UPDATE schools AS school
SET available_plan_codes = ARRAY[plan.code::TEXT]
FROM subscription_plans AS plan
WHERE plan.id = school.assigned_plan_id;

ALTER TABLE schools
  DROP CONSTRAINT IF EXISTS schools_available_plan_codes_valid;

ALTER TABLE schools
  ADD CONSTRAINT schools_available_plan_codes_valid
  CHECK (
    cardinality(available_plan_codes) BETWEEN 1 AND 3
    AND available_plan_codes <@ ARRAY['weekly', 'monthly', 'annual']::TEXT[]
  );
