ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS sales_agent_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS available_grades TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS subscription_price_ksh_cents BIGINT;

ALTER TABLE schools
  DROP CONSTRAINT IF EXISTS schools_subscription_price_non_negative;

ALTER TABLE schools
  ADD CONSTRAINT schools_subscription_price_non_negative
  CHECK (subscription_price_ksh_cents IS NULL OR subscription_price_ksh_cents >= 0);

CREATE INDEX IF NOT EXISTS idx_schools_sales_agent_user_id
  ON schools (sales_agent_user_id);
