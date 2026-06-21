DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM schools
    WHERE id = '11111111-1111-4111-8111-111111111111'
  ) THEN
    INSERT INTO schools (id, name, slug, status)
    VALUES (
      '11111111-1111-4111-8111-111111111111',
      'Kitabu Demo School',
      'kitabu-demo-school',
      'active'
    )
    ON CONFLICT (slug) DO NOTHING;
  END IF;
END $$;

-- Do not delete existing users here. This migration normalizes the known test
-- accounts only; production and pilot data must survive repeated migration runs.

INSERT INTO users (
  id,
  school_id,
  email,
  password_hash,
  full_name,
  status,
  email_verified,
  email_verified_at,
  must_rotate_password,
  is_break_glass
)
VALUES
  (
    '20000000-0000-0000-0000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    'student@kitabu.ai',
    '$2b$12$MWSjrQjGgOlUwrmLCxQM5e06zQwbMEf1gHd1A2BDkWsx.Ow4fhbLW',
    'Kitabu Test Student',
    'active',
    TRUE,
    NOW(),
    FALSE,
    FALSE
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '11111111-1111-4111-8111-111111111111',
    'teacher@kitabu.ai',
    '$2b$12$MWSjrQjGgOlUwrmLCxQM5e06zQwbMEf1gHd1A2BDkWsx.Ow4fhbLW',
    'Kitabu Test Teacher',
    'active',
    TRUE,
    NOW(),
    FALSE,
    FALSE
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    NULL,
    'admin@kitabu.ai',
    '$2b$12$MWSjrQjGgOlUwrmLCxQM5e06zQwbMEf1gHd1A2BDkWsx.Ow4fhbLW',
    'Kitabu Test Admin',
    'active',
    TRUE,
    NOW(),
    FALSE,
    FALSE
  )
ON CONFLICT (email) DO UPDATE SET
  school_id = EXCLUDED.school_id,
  password_hash = EXCLUDED.password_hash,
  full_name = EXCLUDED.full_name,
  status = EXCLUDED.status,
  email_verified = EXCLUDED.email_verified,
  email_verified_at = NOW(),
  must_rotate_password = EXCLUDED.must_rotate_password,
  is_break_glass = EXCLUDED.is_break_glass;

UPDATE users
SET
  id = CASE email
    WHEN 'student@kitabu.ai' THEN '20000000-0000-0000-0000-000000000001'::uuid
    WHEN 'teacher@kitabu.ai' THEN '20000000-0000-0000-0000-000000000002'::uuid
    WHEN 'admin@kitabu.ai' THEN '20000000-0000-0000-0000-000000000003'::uuid
    ELSE id
  END,
  school_id = CASE email
    WHEN 'student@kitabu.ai' THEN '11111111-1111-4111-8111-111111111111'::uuid
    WHEN 'teacher@kitabu.ai' THEN '11111111-1111-4111-8111-111111111111'::uuid
    ELSE NULL
  END,
  password_hash = '$2b$12$MWSjrQjGgOlUwrmLCxQM5e06zQwbMEf1gHd1A2BDkWsx.Ow4fhbLW',
  full_name = CASE email
    WHEN 'student@kitabu.ai' THEN 'Kitabu Test Student'
    WHEN 'teacher@kitabu.ai' THEN 'Kitabu Test Teacher'
    WHEN 'admin@kitabu.ai' THEN 'Kitabu Test Admin'
    ELSE full_name
  END,
  status = 'active',
  email_verified = TRUE,
  email_verified_at = NOW(),
  must_rotate_password = FALSE,
  is_break_glass = FALSE
WHERE email IN ('student@kitabu.ai', 'teacher@kitabu.ai', 'admin@kitabu.ai');

DELETE FROM user_roles
WHERE user_id IN (
  SELECT id
  FROM users
  WHERE email IN ('student@kitabu.ai', 'teacher@kitabu.ai', 'admin@kitabu.ai')
);

INSERT INTO user_roles (user_id, role)
SELECT id, 'student'::user_role
FROM users
WHERE email = 'student@kitabu.ai'
UNION ALL
SELECT id, 'teacher'::user_role
FROM users
WHERE email = 'teacher@kitabu.ai'
UNION ALL
SELECT id, 'school_admin'::user_role
FROM users
WHERE email = 'admin@kitabu.ai'
UNION ALL
SELECT id, 'platform_admin'::user_role
FROM users
WHERE email = 'admin@kitabu.ai'
ON CONFLICT (user_id, role) DO NOTHING;
