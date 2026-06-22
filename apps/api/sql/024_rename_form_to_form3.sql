WITH old_form_assignments AS (
  SELECT id
  FROM assignments
  WHERE grade_level = 'Form'
),
old_form_students AS (
  SELECT id
  FROM users
  WHERE grade_level = 'Form'
     OR email LIKE 'form.student%@students.kitabu.ai'
),
old_form_strands AS (
  SELECT id
  FROM curriculum_strands
  WHERE grade_level = 'Form'
),
old_form_sub_strands AS (
  SELECT css.id
  FROM curriculum_sub_strands css
  JOIN old_form_strands cs ON cs.id = css.strand_id
),
old_form_classes AS (
  SELECT id
  FROM classes
  WHERE grade_level = 'Form'
)
DELETE FROM user_curriculum_progress
WHERE user_id IN (SELECT id FROM old_form_students)
   OR sub_strand_id IN (SELECT id FROM old_form_sub_strands);

WITH old_form_assignments AS (
  SELECT id
  FROM assignments
  WHERE grade_level = 'Form'
),
old_form_students AS (
  SELECT id
  FROM users
  WHERE grade_level = 'Form'
     OR email LIKE 'form.student%@students.kitabu.ai'
)
DELETE FROM submissions
WHERE assignment_id IN (SELECT id FROM old_form_assignments)
   OR student_id IN (SELECT id FROM old_form_students);

WITH old_form_students AS (
  SELECT id
  FROM users
  WHERE grade_level = 'Form'
     OR email LIKE 'form.student%@students.kitabu.ai'
)
DELETE FROM mastery_scores
WHERE user_id IN (SELECT id FROM old_form_students);

WITH old_form_students AS (
  SELECT id
  FROM users
  WHERE grade_level = 'Form'
     OR email LIKE 'form.student%@students.kitabu.ai'
),
old_form_classes AS (
  SELECT id
  FROM classes
  WHERE grade_level = 'Form'
)
DELETE FROM class_students
WHERE class_id IN (SELECT id FROM old_form_classes)
   OR student_id IN (SELECT id FROM old_form_students);

WITH old_form_students AS (
  SELECT id
  FROM users
  WHERE grade_level = 'Form'
     OR email LIKE 'form.student%@students.kitabu.ai'
)
DELETE FROM parent_students
WHERE student_user_id IN (SELECT id FROM old_form_students);

WITH old_form_students AS (
  SELECT id
  FROM users
  WHERE grade_level = 'Form'
     OR email LIKE 'form.student%@students.kitabu.ai'
)
DELETE FROM subscriptions
WHERE user_id IN (SELECT id FROM old_form_students);

WITH old_form_students AS (
  SELECT id
  FROM users
  WHERE grade_level = 'Form'
     OR email LIKE 'form.student%@students.kitabu.ai'
)
DELETE FROM user_roles
WHERE user_id IN (SELECT id FROM old_form_students);

DELETE FROM assignments
WHERE grade_level = 'Form';

WITH old_form_strands AS (
  SELECT id
  FROM curriculum_strands
  WHERE grade_level = 'Form'
)
DELETE FROM curriculum_sub_strands
WHERE strand_id IN (SELECT id FROM old_form_strands);

DELETE FROM curriculum_strands
WHERE grade_level = 'Form';

DELETE FROM quiz_bank_questions
WHERE grade_level = 'Form';

WITH old_form_classes AS (
  SELECT id
  FROM classes
  WHERE grade_level = 'Form'
)
DELETE FROM class_teachers
WHERE class_id IN (SELECT id FROM old_form_classes);

DELETE FROM classes
WHERE grade_level = 'Form';

DELETE FROM users
WHERE grade_level = 'Form'
   OR email LIKE 'form.student%@students.kitabu.ai';
