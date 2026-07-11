ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS plan_prices_ksh_cents JSONB NOT NULL DEFAULT '{}'::JSONB;

UPDATE schools AS school
SET plan_prices_ksh_cents = prices.plan_prices
FROM (
  SELECT
    current_school.id AS school_id,
    JSONB_OBJECT_AGG(
      plan.code::TEXT,
      CASE
        WHEN plan.id = current_school.assigned_plan_id
          THEN COALESCE(current_school.subscription_price_ksh_cents, plan.price_ksh_cents)
        ELSE plan.price_ksh_cents
      END
    ) AS plan_prices
  FROM schools AS current_school
  JOIN subscription_plans AS plan
    ON plan.code::TEXT = ANY(current_school.available_plan_codes)
  GROUP BY current_school.id
) AS prices
WHERE prices.school_id = school.id;

ALTER TABLE schools
  DROP CONSTRAINT IF EXISTS schools_plan_prices_ksh_cents_object;

ALTER TABLE schools
  ADD CONSTRAINT schools_plan_prices_ksh_cents_object
  CHECK (JSONB_TYPEOF(plan_prices_ksh_cents) = 'object');
