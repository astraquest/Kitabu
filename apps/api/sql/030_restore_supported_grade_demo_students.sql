DELETE FROM class_students cs
WHERE NOT EXISTS (
  SELECT 1
  FROM users u
  WHERE u.id = cs.student_id
);

DELETE FROM parent_students ps
WHERE NOT EXISTS (
  SELECT 1
  FROM users u
  WHERE u.id = ps.student_user_id
);

DELETE FROM subscriptions s
WHERE NOT EXISTS (
  SELECT 1
  FROM users u
  WHERE u.id = s.user_id
);

WITH supported_grades(grade_level) AS (
  VALUES
    ('Grade 4'),
    ('Grade 5'),
    ('Grade 6'),
    ('Grade 7'),
    ('Grade 8'),
    ('Grade 9'),
    ('Grade 10'),
    ('Form 3'),
    ('Form 4')
),
student_seed(first_name, last_name, student_position, gender) AS (
  VALUES
    ('Amina', 'Otieno', 1, 'female'),
    ('Brian', 'Kamau', 2, 'male'),
    ('Cynthia', 'Wanjiku', 3, 'female'),
    ('David', 'Mwangi', 4, 'male'),
    ('Esther', 'Njeri', 5, 'female')
),
seed_users AS (
  INSERT INTO users (
    school_id,
    email,
    password_hash,
    full_name,
    status,
    email_verified,
    email_verified_at,
    must_rotate_password,
    gender,
    grade_level,
    onboarding_completed,
    terms_accepted_at,
    terms_version,
    privacy_version
  )
  SELECT
    '11111111-1111-4111-8111-111111111111'::uuid,
    lower(replace(g.grade_level, ' ', '') || '.student' || s.student_position || '@students.kitabu.ai'),
    '$2b$12$VY6IMSidKcYsjbjyjfz9JuQxS1eQljjCZn8dtBnMesp8d74SJfjIm',
    s.first_name || ' ' || s.last_name,
    'active',
    TRUE,
    NOW(),
    TRUE,
    s.gender,
    g.grade_level,
    TRUE,
    NOW(),
    '2026-06',
    '2026-06'
  FROM supported_grades g
  CROSS JOIN student_seed s
  ON CONFLICT (email) DO UPDATE
  SET school_id = EXCLUDED.school_id,
      full_name = EXCLUDED.full_name,
      status = EXCLUDED.status,
      email_verified = TRUE,
      gender = EXCLUDED.gender,
      grade_level = EXCLUDED.grade_level,
      onboarding_completed = TRUE,
      updated_at = NOW()
  RETURNING id, grade_level
)
INSERT INTO user_roles (user_id, role)
SELECT id, 'student'::user_role
FROM seed_users
ON CONFLICT (user_id, role) DO NOTHING;

WITH seed_students AS (
  SELECT id, grade_level
  FROM users
  WHERE email LIKE 'grade%.student%@students.kitabu.ai'
     OR email LIKE 'form3.student%@students.kitabu.ai'
     OR email LIKE 'form4.student%@students.kitabu.ai'
)
INSERT INTO class_students (class_id, student_id)
SELECT c.id, s.id
FROM seed_students s
JOIN classes c
  ON c.school_id = '11111111-1111-4111-8111-111111111111'
 AND c.grade_level = s.grade_level
 AND c.name = s.grade_level || ' Demo Class'
ON CONFLICT (class_id, student_id) DO NOTHING;
