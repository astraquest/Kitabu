CREATE TABLE IF NOT EXISTS parent_students (
  parent_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL DEFAULT 'guardian',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (parent_user_id, student_user_id),
  CHECK (parent_user_id <> student_user_id)
);

CREATE INDEX IF NOT EXISTS idx_parent_students_student
  ON parent_students (student_user_id);

INSERT INTO users (
  id,
  school_id,
  email,
  password_hash,
  full_name,
  status,
  email_verified,
  email_verified_at,
  gender,
  grade_level,
  onboarding_completed,
  terms_accepted_at,
  terms_version,
  privacy_version
)
VALUES (
  '20000000-0000-0000-0000-000000000004',
  NULL,
  'parent@kitabu.ai',
  '$2b$12$MWSjrQjGgOlUwrmLCxQM5e06zQwbMEf1gHd1A2BDkWsx.Ow4fhbLW',
  'Kitabu Test Parent',
  'active',
  TRUE,
  NOW(),
  'not_specified',
  NULL,
  TRUE,
  NOW(),
  '2026-06-17',
  '2026-06-17'
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role)
VALUES ('20000000-0000-0000-0000-000000000004', 'parent')
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO parent_students (parent_user_id, student_user_id, relationship)
VALUES (
  '20000000-0000-0000-0000-000000000004',
  '20000000-0000-0000-0000-000000000001',
  'guardian'
)
ON CONFLICT (parent_user_id, student_user_id) DO NOTHING;
