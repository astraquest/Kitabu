UPDATE subscription_plans
SET price_ksh_cents = CASE code
  WHEN 'weekly' THEN 15000
  WHEN 'monthly' THEN 30000
  WHEN 'annual' THEN 100000
  ELSE price_ksh_cents
END
WHERE code IN ('weekly', 'monthly', 'annual');
