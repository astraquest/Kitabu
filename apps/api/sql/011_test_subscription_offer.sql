INSERT INTO subscription_plans (
  id,
  code,
  name,
  billing_cycle,
  price_ksh_cents,
  is_pro,
  is_hidden
)
VALUES (
  '30000000-0000-0000-0000-000000000099',
  'trial_monthly_1bob',
  'Test Monthly',
  'monthly',
  500,
  TRUE,
  TRUE
)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  billing_cycle = EXCLUDED.billing_cycle,
  price_ksh_cents = EXCLUDED.price_ksh_cents,
  is_pro = EXCLUDED.is_pro,
  is_hidden = EXCLUDED.is_hidden;
