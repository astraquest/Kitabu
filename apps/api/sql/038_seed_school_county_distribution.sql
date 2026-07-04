-- Keep demo seed data representative across the counties used in local/admin QA.
WITH monthly_plan AS (
  SELECT id
  FROM subscription_plans
  WHERE code = 'monthly'
  LIMIT 1
),
seed_schools(id, name, slug, location, principal, phone, email) AS (
  VALUES
    (
      '11111111-1111-4111-8111-111111111111'::uuid,
      'Kitabu Demo School',
      'kitabu-demo-school',
      'Nairobi County',
      'Mrs. Ruth Wanjiku',
      '+254700000111',
      'admin@kitabudemo.example'
    ),
    (
      '11111111-1111-4111-8111-222222222222'::uuid,
      'Kisii Demo School',
      'kisii-demo-school',
      'Kisii County',
      'Mr. Evans Ogembo',
      '+254700000222',
      'admin@kisiidemo.example'
    ),
    (
      '11111111-1111-4111-8111-333333333333'::uuid,
      'Mombasa Demo School',
      'mombasa-demo-school',
      'Mombasa County',
      'Mrs. Fatuma Hassan',
      '+254700000333',
      'admin@mombasademo.example'
    )
)
INSERT INTO schools (
  id,
  name,
  slug,
  status,
  location,
  principal,
  phone,
  email,
  assigned_plan_id,
  available_grades
)
SELECT
  seed_schools.id,
  seed_schools.name,
  seed_schools.slug,
  'active',
  seed_schools.location,
  seed_schools.principal,
  seed_schools.phone,
  seed_schools.email,
  monthly_plan.id,
  ARRAY['Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Form 3', 'Form 4']::text[]
FROM seed_schools
CROSS JOIN monthly_plan
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    status = EXCLUDED.status,
    location = EXCLUDED.location,
    principal = EXCLUDED.principal,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    assigned_plan_id = EXCLUDED.assigned_plan_id,
    available_grades = EXCLUDED.available_grades;

WITH seed_schools(id) AS (
  VALUES
    ('11111111-1111-4111-8111-111111111111'::uuid),
    ('11111111-1111-4111-8111-222222222222'::uuid),
    ('11111111-1111-4111-8111-333333333333'::uuid)
),
supported_grades(grade_level) AS (
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
)
INSERT INTO classes (school_id, name, grade_level)
SELECT
  seed_schools.id,
  supported_grades.grade_level || ' Demo Class',
  supported_grades.grade_level
FROM seed_schools
CROSS JOIN supported_grades
WHERE NOT EXISTS (
  SELECT 1
  FROM classes existing
  WHERE existing.school_id = seed_schools.id
    AND existing.grade_level = supported_grades.grade_level
    AND existing.name = supported_grades.grade_level || ' Demo Class'
);

INSERT INTO class_teachers (class_id, teacher_id)
SELECT
  classes.id,
  teacher.id
FROM classes
CROSS JOIN users teacher
WHERE teacher.id = '20000000-0000-0000-0000-000000000002'::uuid
  AND classes.school_id IN (
    '11111111-1111-4111-8111-111111111111'::uuid,
    '11111111-1111-4111-8111-222222222222'::uuid,
    '11111111-1111-4111-8111-333333333333'::uuid
  )
  AND classes.name = classes.grade_level || ' Demo Class'
ON CONFLICT (class_id, teacher_id) DO NOTHING;

WITH student_targets AS (
  SELECT
    id,
    CASE
      WHEN email ~ '^(grade[0-9]+|form[34])\.student(1|4)@students\.kitabu\.ai$'
        THEN '11111111-1111-4111-8111-111111111111'::uuid
      WHEN email ~ '^(grade[0-9]+|form[34])\.student(2|5)@students\.kitabu\.ai$'
        THEN '11111111-1111-4111-8111-222222222222'::uuid
      WHEN email ~ '^(grade[0-9]+|form[34])\.student3@students\.kitabu\.ai$'
        THEN '11111111-1111-4111-8111-333333333333'::uuid
    END AS school_id
  FROM users
  WHERE email ~ '^(grade[0-9]+|form[34])\.student[1-5]@students\.kitabu\.ai$'
)
UPDATE users
SET school_id = student_targets.school_id,
    updated_at = NOW()
FROM student_targets
WHERE users.id = student_targets.id
  AND student_targets.school_id IS NOT NULL;

UPDATE users
SET school_id = '11111111-1111-4111-8111-111111111111'::uuid,
    updated_at = NOW()
WHERE email = 'student@kitabu.ai';

WITH seeded_students AS (
  SELECT id
  FROM users
  WHERE email ~ '^(grade[0-9]+|form[34])\.student[1-5]@students\.kitabu\.ai$'
)
DELETE FROM class_students
USING seeded_students
WHERE class_students.student_id = seeded_students.id;

WITH seeded_students AS (
  SELECT id, school_id, grade_level
  FROM users
  WHERE email ~ '^(grade[0-9]+|form[34])\.student[1-5]@students\.kitabu\.ai$'
    AND school_id IS NOT NULL
    AND grade_level IS NOT NULL
)
INSERT INTO class_students (class_id, student_id)
SELECT classes.id, seeded_students.id
FROM seeded_students
JOIN classes
  ON classes.school_id = seeded_students.school_id
 AND classes.grade_level = seeded_students.grade_level
 AND classes.name = seeded_students.grade_level || ' Demo Class'
ON CONFLICT (class_id, student_id) DO NOTHING;
