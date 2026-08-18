UPDATE subscription_plans
SET name = 'Free 1-Month Trial',
    price_ksh_cents = 0,
    is_hidden = TRUE
WHERE code = 'trial_monthly_1bob';
