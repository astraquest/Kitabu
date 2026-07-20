ALTER TABLE payment_requests
  ADD COLUMN IF NOT EXISTS provider_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provider_query_response JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_requests_mpesa_receipt_number
  ON payment_requests (mpesa_receipt_number)
  WHERE mpesa_receipt_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_one_active_per_user
  ON subscriptions (user_id)
  WHERE status = 'active';
