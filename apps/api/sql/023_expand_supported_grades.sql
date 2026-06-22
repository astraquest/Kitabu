WITH new_supported_grades(grade_level, position) AS (
  VALUES
    ('Grade 5', 5),
    ('Grade 7', 7),
    ('Grade 8', 8),
    ('Grade 10', 10),
    ('Form 3', 11)
),
subjects(subject_id, subject_name, position) AS (
  VALUES
    ('mathematics', 'Mathematics', 1),
    ('english', 'English', 2),
    ('science', 'Science', 3),
    ('kiswahili', 'Kiswahili', 4),
    ('social_studies', 'Social Studies', 5),
    ('computer_science', 'Computer Science', 6)
),
strand_templates(position, title, sub_title) AS (
  VALUES
    (1, 'Core Concepts', 'Build essential knowledge and vocabulary.'),
    (2, 'Applied Practice', 'Use knowledge to solve school and daily-life problems.'),
    (3, 'Assessment and Reflection', 'Explain, review, and improve learning.')
),
seed_strands AS (
  INSERT INTO curriculum_strands (
    grade_level,
    subject_id,
    subject_name,
    number,
    title,
    sub_title,
    position
  )
  SELECT
    g.grade_level,
    s.subject_id,
    s.subject_name,
    st.position::text || '.0',
    s.subject_name || ' - ' || st.title,
    st.sub_title,
    st.position
  FROM new_supported_grades g
  CROSS JOIN subjects s
  CROSS JOIN strand_templates st
  ON CONFLICT (grade_level, subject_id, position) DO NOTHING
  RETURNING id, grade_level, subject_id, subject_name, position
),
all_strands AS (
  SELECT id, grade_level, subject_id, subject_name, position
  FROM seed_strands
  UNION
  SELECT cs.id, cs.grade_level, cs.subject_id, cs.subject_name, cs.position
  FROM curriculum_strands cs
  JOIN new_supported_grades g ON g.grade_level = cs.grade_level
  JOIN subjects s ON s.subject_id = cs.subject_id
  WHERE cs.position BETWEEN 1 AND 3
),
sub_templates(position, title, description) AS (
  VALUES
    (1, 'Foundations', 'Key facts, terms, and routines learners need before practice.'),
    (2, 'Language and Symbols', 'Subject vocabulary, notation, and clear explanation.'),
    (3, 'Guided Practice', 'Worked examples, checks for understanding, and feedback.'),
    (4, 'Application', 'Real-world tasks, projects, and problem solving.'),
    (5, 'Review and Mastery', 'Revision, reflection, remediation, and extension.')
)
INSERT INTO curriculum_sub_strands (
  strand_id,
  number,
  title,
  type,
  description,
  position,
  outcomes,
  inquiry_questions,
  pages
)
SELECT
  st.id,
  st.position::text || '.' || sub.position::text,
  sub.title,
  CASE
    WHEN sub.position IN (3, 4) THEN 'skill'
    WHEN sub.position = 5 THEN 'competence'
    ELSE 'knowledge'
  END,
  sub.description,
  sub.position,
  jsonb_build_array(
    jsonb_build_object('id', 'outcome-1', 'text', 'Describe the main ideas in ' || st.subject_name || ' for ' || st.grade_level || '.'),
    jsonb_build_object('id', 'outcome-2', 'text', 'Apply ' || st.subject_name || ' concepts to grade-appropriate tasks.'),
    jsonb_build_object('id', 'outcome-3', 'text', 'Explain answers clearly and correct mistakes using feedback.')
  ),
  jsonb_build_array(
    jsonb_build_object('id', 'inquiry-1', 'text', 'What do I already know about this topic?'),
    jsonb_build_object('id', 'inquiry-2', 'text', 'How can I use this learning outside class?')
  ),
  jsonb_build_array(
    jsonb_build_object(
      'title',
      st.subject_name || ' ' || sub.title,
      'content',
      'This lesson introduces ' || sub.title || ' for ' || st.grade_level || ' ' || st.subject_name || '. Learners define key ideas, study one worked example, answer practice questions, and record one reflection for revision.'
    )
  )
FROM all_strands st
CROSS JOIN sub_templates sub
ON CONFLICT (strand_id, position) DO NOTHING;

WITH new_supported_grades(grade_level) AS (
  VALUES
    ('Grade 5'),
    ('Grade 7'),
    ('Grade 8'),
    ('Grade 10'),
    ('Form 3')
)
INSERT INTO classes (school_id, name, grade_level)
SELECT
  '11111111-1111-4111-8111-111111111111'::uuid,
  grade_level || ' Demo Class',
  grade_level
FROM new_supported_grades
WHERE NOT EXISTS (
  SELECT 1
  FROM classes existing
  WHERE existing.school_id = '11111111-1111-4111-8111-111111111111'::uuid
    AND existing.grade_level = new_supported_grades.grade_level
    AND existing.name = new_supported_grades.grade_level || ' Demo Class'
);

WITH new_supported_grades(grade_level) AS (
  VALUES
    ('Grade 5'),
    ('Grade 7'),
    ('Grade 8'),
    ('Grade 10'),
    ('Form 3')
)
INSERT INTO class_teachers (class_id, teacher_id)
SELECT
  c.id,
  '20000000-0000-0000-0000-000000000002'::uuid
FROM classes c
JOIN new_supported_grades g ON g.grade_level = c.grade_level
WHERE c.school_id = '11111111-1111-4111-8111-111111111111'
ON CONFLICT (class_id, teacher_id) DO NOTHING;

WITH new_supported_grades(grade_level) AS (
  VALUES
    ('Grade 5'),
    ('Grade 7'),
    ('Grade 8'),
    ('Grade 10'),
    ('Form 3')
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
  FROM new_supported_grades g
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
  RETURNING id
)
INSERT INTO user_roles (user_id, role)
SELECT id, 'student'::user_role
FROM seed_users
ON CONFLICT (user_id, role) DO NOTHING;

WITH seed_students AS (
  SELECT id, grade_level
  FROM users
  WHERE email LIKE 'grade5.student%@students.kitabu.ai'
     OR email LIKE 'grade7.student%@students.kitabu.ai'
     OR email LIKE 'grade8.student%@students.kitabu.ai'
     OR email LIKE 'grade10.student%@students.kitabu.ai'
     OR email LIKE 'form3.student%@students.kitabu.ai'
)
INSERT INTO class_students (class_id, student_id)
SELECT c.id, s.id
FROM seed_students s
JOIN classes c
  ON c.school_id = '11111111-1111-4111-8111-111111111111'
 AND c.grade_level = s.grade_level
 AND c.name = s.grade_level || ' Demo Class'
ON CONFLICT (class_id, student_id) DO NOTHING;

WITH seed_students AS (
  SELECT id
  FROM users
  WHERE email LIKE 'grade%.student%@students.kitabu.ai'
     OR email LIKE 'form3.student%@students.kitabu.ai'
     OR email LIKE 'form4.student%@students.kitabu.ai'
),
parent_user AS (
  SELECT id
  FROM users
  WHERE email = 'parent@kitabu.ai'
  LIMIT 1
)
INSERT INTO parent_students (parent_user_id, student_user_id, relationship)
SELECT p.id, s.id, 'guardian'
FROM parent_user p
CROSS JOIN seed_students s
ON CONFLICT (parent_user_id, student_user_id) DO NOTHING;

WITH seed_students AS (
  SELECT id
  FROM users
  WHERE email LIKE 'grade5.student%@students.kitabu.ai'
     OR email LIKE 'grade7.student%@students.kitabu.ai'
     OR email LIKE 'grade8.student%@students.kitabu.ai'
     OR email LIKE 'grade10.student%@students.kitabu.ai'
     OR email LIKE 'form3.student%@students.kitabu.ai'
),
monthly_plan AS (
  SELECT id, billing_cycle, price_ksh_cents
  FROM subscription_plans
  WHERE code = 'monthly'
  LIMIT 1
)
INSERT INTO subscriptions (user_id, plan_id, billing_cycle, price_ksh_cents, period_start, period_end, status)
SELECT
  s.id,
  p.id,
  p.billing_cycle,
  p.price_ksh_cents,
  NOW() - INTERVAL '1 day',
  NOW() + INTERVAL '29 days',
  'active'
FROM seed_students s
CROSS JOIN monthly_plan p
WHERE NOT EXISTS (
  SELECT 1
  FROM subscriptions existing
  WHERE existing.user_id = s.id
    AND existing.status = 'active'
    AND NOW() BETWEEN existing.period_start AND existing.period_end
);

WITH new_supported_grades(grade_level) AS (
  VALUES
    ('Grade 5'),
    ('Grade 7'),
    ('Grade 8'),
    ('Grade 10'),
    ('Form 3')
),
assignment_seed(slot, subject, title_suffix) AS (
  VALUES
    (1, 'Mathematics', 'Number Practice'),
    (2, 'English', 'Reading Check'),
    (3, 'Science', 'Concept Review')
),
inserted_assignments AS (
  INSERT INTO assignments (
    school_id,
    class_id,
    teacher_id,
    title,
    description,
    due_at,
    grade_level,
    subject,
    questions
  )
  SELECT
    '11111111-1111-4111-8111-111111111111'::uuid,
    c.id,
    '20000000-0000-0000-0000-000000000002'::uuid,
    g.grade_level || ' ' || a.title_suffix,
    'Seeded assignment for production portal testing.',
    NOW() + (a.slot || ' days')::interval,
    g.grade_level,
    a.subject,
    jsonb_build_array(
      jsonb_build_object('id', 1, 'type', 'MCQ', 'text', 'Choose the best answer for this ' || a.subject || ' question.', 'options', jsonb_build_array('A', 'B', 'C', 'D'), 'correctAnswer', 'A', 'explanation', 'A is the seeded correct answer.'),
      jsonb_build_object('id', 2, 'type', 'TRUE_FALSE', 'text', 'This statement checks basic understanding.', 'options', jsonb_build_array('True', 'False'), 'correctAnswer', 'True', 'explanation', 'The seeded statement is true.'),
      jsonb_build_object('id', 3, 'type', 'SHORT_ANSWER', 'text', 'Explain one idea you learned.', 'correctAnswer', 'Key idea', 'explanation', 'Award marks for a clear grade-level explanation.')
    )
  FROM new_supported_grades g
  JOIN classes c
    ON c.school_id = '11111111-1111-4111-8111-111111111111'
   AND c.grade_level = g.grade_level
   AND c.name = g.grade_level || ' Demo Class'
  CROSS JOIN assignment_seed a
  WHERE NOT EXISTS (
    SELECT 1
    FROM assignments existing
    WHERE existing.school_id = '11111111-1111-4111-8111-111111111111'
      AND existing.grade_level = g.grade_level
      AND existing.title = g.grade_level || ' ' || a.title_suffix
  )
  RETURNING id, grade_level
),
all_seed_assignments AS (
  SELECT id, grade_level
  FROM inserted_assignments
  UNION
  SELECT id, grade_level
  FROM assignments
  WHERE school_id = '11111111-1111-4111-8111-111111111111'
    AND grade_level IN (SELECT grade_level FROM new_supported_grades)
    AND title IN (
      grade_level || ' Number Practice',
      grade_level || ' Reading Check',
      grade_level || ' Concept Review'
    )
),
seed_students AS (
  SELECT
    id,
    grade_level,
    row_number() OVER (PARTITION BY grade_level ORDER BY email) AS student_position
  FROM users
  WHERE email LIKE 'grade5.student%@students.kitabu.ai'
     OR email LIKE 'grade7.student%@students.kitabu.ai'
     OR email LIKE 'grade8.student%@students.kitabu.ai'
     OR email LIKE 'grade10.student%@students.kitabu.ai'
     OR email LIKE 'form3.student%@students.kitabu.ai'
)
INSERT INTO submissions (assignment_id, student_id, score, submitted_at, status, answers)
SELECT
  a.id,
  s.id,
  LEAST(98, 55 + (s.student_position * 7) + ((abs(hashtext(a.id::text)) % 20))),
  NOW() - ((s.student_position || ' hours')::interval),
  CASE WHEN s.student_position = 5 THEN 'Pending' ELSE 'Completed' END,
  jsonb_build_array(
    jsonb_build_object('questionId', 1, 'question', 'Choose the best answer.', 'answer', 'A', 'isCorrect', TRUE),
    jsonb_build_object('questionId', 2, 'question', 'True or false.', 'answer', 'True', 'isCorrect', TRUE),
    jsonb_build_object('questionId', 3, 'question', 'Explain one idea.', 'answer', 'Key idea', 'isCorrect', s.student_position <> 4)
  )
FROM all_seed_assignments a
JOIN seed_students s ON s.grade_level = a.grade_level
ON CONFLICT (assignment_id, student_id) DO UPDATE
SET score = EXCLUDED.score,
    submitted_at = EXCLUDED.submitted_at,
    status = EXCLUDED.status,
    answers = EXCLUDED.answers;

WITH seed_students AS (
  SELECT
    id,
    row_number() OVER (ORDER BY grade_level, email) AS student_position
  FROM users
  WHERE email LIKE 'grade5.student%@students.kitabu.ai'
     OR email LIKE 'grade7.student%@students.kitabu.ai'
     OR email LIKE 'grade8.student%@students.kitabu.ai'
     OR email LIKE 'grade10.student%@students.kitabu.ai'
     OR email LIKE 'form3.student%@students.kitabu.ai'
),
subjects(subject_id) AS (
  VALUES ('mathematics'), ('english'), ('science'), ('kiswahili'), ('social_studies'), ('computer_science')
)
INSERT INTO mastery_scores (
  user_id,
  subject_id,
  sub_strand_key,
  mastery_score,
  correctness_history,
  confidence_history,
  avg_latency_ms,
  attempt_count,
  last_practiced_at,
  updated_at
)
SELECT
  s.id,
  subj.subject_id,
  'foundations',
  ROUND((0.45 + ((s.student_position + abs(hashtext(subj.subject_id))) % 45) / 100.0)::numeric, 4),
  jsonb_build_array(TRUE, s.student_position % 3 <> 0, TRUE),
  jsonb_build_array(3, 4, 5),
  42000 + (s.student_position * 1000),
  3,
  NOW() - ((s.student_position || ' days')::interval),
  NOW()
FROM seed_students s
CROSS JOIN subjects subj
ON CONFLICT (user_id, subject_id, sub_strand_key) DO UPDATE
SET mastery_score = EXCLUDED.mastery_score,
    correctness_history = EXCLUDED.correctness_history,
    confidence_history = EXCLUDED.confidence_history,
    avg_latency_ms = EXCLUDED.avg_latency_ms,
    attempt_count = EXCLUDED.attempt_count,
    last_practiced_at = EXCLUDED.last_practiced_at,
    updated_at = NOW();

WITH seed_students AS (
  SELECT
    id,
    grade_level,
    row_number() OVER (PARTITION BY grade_level ORDER BY email) AS student_position
  FROM users
  WHERE email LIKE 'grade5.student%@students.kitabu.ai'
     OR email LIKE 'grade7.student%@students.kitabu.ai'
     OR email LIKE 'grade8.student%@students.kitabu.ai'
     OR email LIKE 'grade10.student%@students.kitabu.ai'
     OR email LIKE 'form3.student%@students.kitabu.ai'
),
ranked_sub_strands AS (
  SELECT
    cs.grade_level,
    css.id,
    row_number() OVER (PARTITION BY cs.grade_level ORDER BY cs.subject_id, cs.position, css.position) AS content_position
  FROM curriculum_strands cs
  JOIN curriculum_sub_strands css ON css.strand_id = cs.id
  JOIN (
    VALUES
      ('Grade 5'),
      ('Grade 7'),
      ('Grade 8'),
      ('Grade 10'),
      ('Form 3')
  ) AS new_supported_grades(grade_level) ON new_supported_grades.grade_level = cs.grade_level
)
INSERT INTO user_curriculum_progress (
  user_id,
  sub_strand_id,
  quiz_score,
  completed_at,
  updated_at,
  passed,
  attempt_count,
  last_attempt_at
)
SELECT
  s.id,
  r.id,
  LEAST(100, 62 + (s.student_position * 5) + r.content_position),
  NOW() - ((r.content_position || ' days')::interval),
  NOW(),
  TRUE,
  1 + (r.content_position % 3),
  NOW() - ((r.content_position || ' days')::interval)
FROM seed_students s
JOIN ranked_sub_strands r ON r.grade_level = s.grade_level
WHERE r.content_position <= 8
ON CONFLICT (user_id, sub_strand_id) DO UPDATE
SET quiz_score = EXCLUDED.quiz_score,
    completed_at = EXCLUDED.completed_at,
    updated_at = NOW(),
    passed = EXCLUDED.passed,
    attempt_count = EXCLUDED.attempt_count,
    last_attempt_at = EXCLUDED.last_attempt_at;

WITH new_supported_grades(grade_level, grade_position) AS (
  VALUES
    ('Grade 5', 5),
    ('Grade 7', 7),
    ('Grade 8', 8),
    ('Grade 10', 10),
    ('Form 3', 11)
),
subjects(subject_id, subject_name, subject_position) AS (
  VALUES
    ('mathematics', 'Mathematics', 1),
    ('english', 'English', 2),
    ('science', 'Science', 3),
    ('kiswahili', 'Kiswahili', 4),
    ('social_studies', 'Social Studies', 5),
    ('computer_science', 'Computer Science', 6)
),
numbers AS (
  SELECT generate_series(1, 100) AS question_number
)
INSERT INTO quiz_bank_questions (
  grade_level,
  subject_id,
  subject_name,
  strand_title,
  sub_strand_title,
  question_number,
  type,
  prompt,
  options,
  correct_answer,
  explanation,
  difficulty,
  source
)
SELECT
  g.grade_level,
  s.subject_id,
  s.subject_name,
  s.subject_name || ' Practice Strand ' || (((n.question_number - 1) % 3) + 1),
  'Fallback Practice Set ' || (((n.question_number - 1) % 5) + 1),
  n.question_number,
  'MCQ',
  g.grade_level || ' ' || s.subject_name || ' fallback question ' || n.question_number || ': choose the option labelled as the correct answer for this practice item.',
  jsonb_build_array(
    'Correct answer',
    'Close distractor',
    'Common mistake',
    'Unrelated option'
  ),
  'Correct answer',
  'The option labelled "Correct answer" is the seeded answer key for fallback question ' || n.question_number || '.',
  1 + ((n.question_number + g.grade_position + s.subject_position) % 5),
  'seed'
FROM new_supported_grades g
JOIN numbers n ON TRUE
JOIN LATERAL (
  SELECT *
  FROM subjects
  WHERE subject_position = (((n.question_number - 1) % 6) + 1)
) s ON TRUE
ON CONFLICT (grade_level, question_number) DO UPDATE
SET subject_id = EXCLUDED.subject_id,
    subject_name = EXCLUDED.subject_name,
    strand_title = EXCLUDED.strand_title,
    sub_strand_title = EXCLUDED.sub_strand_title,
    type = EXCLUDED.type,
    prompt = EXCLUDED.prompt,
    options = EXCLUDED.options,
    correct_answer = EXCLUDED.correct_answer,
    explanation = EXCLUDED.explanation,
    difficulty = EXCLUDED.difficulty,
    source = EXCLUDED.source,
    updated_at = NOW();
