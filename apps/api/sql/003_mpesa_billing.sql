CREATE TABLE IF NOT EXISTS user_billing_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  mpesa_phone_number TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  plan_code TEXT NOT NULL,
  amount_ksh_cents BIGINT NOT NULL,
  phone_number TEXT NOT NULL,
  return_to TEXT NOT NULL DEFAULT 'dashboard',
  status TEXT NOT NULL DEFAULT 'pending',
  merchant_request_id TEXT UNIQUE,
  checkout_request_id TEXT UNIQUE,
  mpesa_receipt_number TEXT,
  result_code INTEGER,
  result_desc TEXT,
  raw_callback JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '10 minutes',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_requests_user_created_at ON payment_requests (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_payment_requests_checkout_request_id ON payment_requests (checkout_request_id);

INSERT INTO subscription_plans (id, code, name, billing_cycle, price_ksh_cents, is_pro)
VALUES
  ('30000000-0000-0000-0000-000000000001', 'weekly', 'Weekly', 'weekly', 10000, FALSE),
  ('30000000-0000-0000-0000-000000000002', 'monthly', 'Monthly', 'monthly', 25000, FALSE),
  ('30000000-0000-0000-0000-000000000003', 'annual', 'Annual', 'annual', 199900, FALSE),
  ('30000000-0000-0000-0000-000000000004', 'admin_weekly', 'Admin Weekly', 'weekly', 500, FALSE)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    billing_cycle = EXCLUDED.billing_cycle,
    price_ksh_cents = EXCLUDED.price_ksh_cents,
    is_pro = EXCLUDED.is_pro;

UPDATE subscriptions
SET plan_id = '30000000-0000-0000-0000-000000000004',
    billing_cycle = 'weekly',
    price_ksh_cents = 500,
    period_end = GREATEST(period_start + INTERVAL '7 days', NOW() + INTERVAL '6 days')
WHERE user_id IN (
  '20000000-0000-0000-0000-000000000003',
  '20000000-0000-0000-0000-000000000004'
);
