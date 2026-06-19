CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('student', 'teacher', 'school_admin', 'platform_admin', 'parent');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_cycle') THEN
    CREATE TYPE billing_cycle AS ENUM ('weekly', 'monthly', 'annual');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_usage_status') THEN
    CREATE TYPE ai_usage_status AS ENUM ('allowed', 'blocked', 'failed', 'completed');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified_at TIMESTAMPTZ,
  must_rotate_password BOOLEAN NOT NULL DEFAULT FALSE,
  is_break_glass BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_rotate_password BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_break_glass BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  PRIMARY KEY (user_id, role)
);

CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS class_teachers (
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (class_id, teacher_id)
);

CREATE TABLE IF NOT EXISTS class_students (
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (class_id, student_id)
);

CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score NUMERIC(5,2),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  billing_cycle billing_cycle NOT NULL,
  price_ksh_cents BIGINT NOT NULL,
  is_pro BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  billing_cycle billing_cycle NOT NULL,
  price_ksh_cents BIGINT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
  return_to TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  merchant_request_id TEXT UNIQUE,
  checkout_request_id TEXT UNIQUE,
  mpesa_receipt_number TEXT,
  result_code INTEGER,
  result_desc TEXT,
  raw_callback JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  feature TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd_micros BIGINT NOT NULL DEFAULT 0,
  fx_rate_ksh_per_usd NUMERIC(10,4) NOT NULL,
  estimated_cost_ksh_cents BIGINT NOT NULL DEFAULT 0,
  status ai_usage_status NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  replaced_by_token_id UUID REFERENCES refresh_tokens(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  session_binding_hash TEXT NOT NULL DEFAULT '',
  device_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS session_binding_hash TEXT;
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS device_label TEXT;

UPDATE refresh_tokens
SET session_id = COALESCE(session_id, encode(gen_random_bytes(16), 'hex')),
    session_binding_hash = COALESCE(NULLIF(session_binding_hash, ''), token_hash)
WHERE session_id IS NULL
   OR session_binding_hash IS NULL
   OR session_binding_hash = '';

ALTER TABLE refresh_tokens ALTER COLUMN session_id SET NOT NULL;
ALTER TABLE refresh_tokens ALTER COLUMN session_binding_hash SET NOT NULL;

CREATE TABLE IF NOT EXISTS totp_credentials (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  secret TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_school_id ON users (school_id);
CREATE INDEX IF NOT EXISTS idx_classes_school_id ON classes (school_id);
CREATE INDEX IF NOT EXISTS idx_assignments_school_id ON assignments (school_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_period ON subscriptions (user_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_user_created_at ON ai_usage_events (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_school_created_at ON ai_usage_events (school_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created_at ON audit_logs (actor_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_expires_at ON password_reset_tokens (user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_expires_at ON email_verification_tokens (user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_session ON refresh_tokens (user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_user_created_at ON payment_requests (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_payment_requests_checkout_request_id ON payment_requests (checkout_request_id);

DO $$
DECLARE
  has_assigned_plan BOOLEAN;
  monthly_plan_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM schools WHERE slug = 'kitabu-demo-school') THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'schools'
      AND column_name = 'assigned_plan_id'
  ) INTO has_assigned_plan;

  IF has_assigned_plan THEN
    SELECT id
    INTO monthly_plan_id
    FROM subscription_plans
    WHERE code = 'monthly'
    LIMIT 1;

    INSERT INTO schools (id, name, slug, status, assigned_plan_id, location)
    VALUES (
      '11111111-1111-1111-1111-111111111111',
      'Kitabu Demo School',
      'kitabu-demo-school',
      'active',
      monthly_plan_id,
      ''
    );
  ELSE
    INSERT INTO schools (id, name, slug, status)
    VALUES (
      '11111111-1111-4111-8111-111111111111',
      'Kitabu Demo School',
      'kitabu-demo-school',
      'active'
    );
  END IF;
END $$;

INSERT INTO users (id, school_id, email, password_hash, full_name, status)
VALUES
  (
    '20000000-0000-0000-0000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    'student@kitabu.ai',
    '$2b$12$MWSjrQjGgOlUwrmLCxQM5e06zQwbMEf1gHd1A2BDkWsx.Ow4fhbLW',
    'Kitabu Test Student',
    'active'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '11111111-1111-4111-8111-111111111111',
    'teacher@kitabu.ai',
    '$2b$12$MWSjrQjGgOlUwrmLCxQM5e06zQwbMEf1gHd1A2BDkWsx.Ow4fhbLW',
    'Kitabu Test Teacher',
    'active'
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    NULL,
    'admin@kitabu.ai',
    '$2b$12$MWSjrQjGgOlUwrmLCxQM5e06zQwbMEf1gHd1A2BDkWsx.Ow4fhbLW',
    'Kitabu Test Admin',
    'active'
  )
ON CONFLICT (email) DO NOTHING;

UPDATE users
SET email_verified = TRUE,
    email_verified_at = COALESCE(email_verified_at, NOW())
WHERE email IN (
  'student@kitabu.ai',
  'teacher@kitabu.ai',
  'admin@kitabu.ai'
);

INSERT INTO user_roles (user_id, role)
VALUES
  ('20000000-0000-0000-0000-000000000001', 'student'),
  ('20000000-0000-0000-0000-000000000002', 'teacher'),
  ('20000000-0000-0000-0000-000000000003', 'school_admin'),
  ('20000000-0000-0000-0000-000000000003', 'platform_admin')
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO subscription_plans (id, code, name, billing_cycle, price_ksh_cents, is_pro)
VALUES
  ('30000000-0000-0000-0000-000000000001', 'weekly', 'Weekly', 'weekly', 10000, FALSE),
  ('30000000-0000-0000-0000-000000000002', 'monthly', 'Monthly', 'monthly', 25000, FALSE),
  ('30000000-0000-0000-0000-000000000003', 'annual', 'Annual', 'annual', 199900, FALSE),
  ('30000000-0000-0000-0000-000000000004', 'admin_weekly', 'Admin Weekly', 'weekly', 500, FALSE)
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  billing_cycle = EXCLUDED.billing_cycle,
  price_ksh_cents = EXCLUDED.price_ksh_cents,
  is_pro = EXCLUDED.is_pro;

INSERT INTO subscriptions (id, user_id, plan_id, billing_cycle, price_ksh_cents, period_start, period_end, status)
VALUES
  (
    '40000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000002',
    'monthly',
    25000,
    NOW() - INTERVAL '1 day',
    NOW() + INTERVAL '29 days',
    'active'
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000002',
    'monthly',
    25000,
    NOW() - INTERVAL '1 day',
    NOW() + INTERVAL '29 days',
    'active'
  ),
  (
    '40000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000004',
    'weekly',
    500,
    NOW() - INTERVAL '1 day',
    NOW() + INTERVAL '6 days',
    'active'
  )
ON CONFLICT (id) DO NOTHING;
