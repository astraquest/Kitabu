-- Remove production demonstration data while preserving the four operational QA accounts.
-- Applied migrations are immutable; this forward-only cleanup runs after all historical seeds.

CREATE TEMP TABLE cleanup_removed_users ON COMMIT DROP AS
SELECT id
FROM users
WHERE lower(email) NOT IN (
  'student@kitabu.ai',
  'parent@kitabu.ai',
  'teacher@kitabu.ai',
  'admin@kitabu.ai'
);

CREATE TEMP TABLE cleanup_removed_schools ON COMMIT DROP AS
SELECT id
FROM schools
WHERE id IN (
    '11111111-1111-4111-8111-111111111111'::uuid,
    '11111111-1111-4111-8111-222222222222'::uuid,
    '11111111-1111-4111-8111-333333333333'::uuid
  )
  OR slug IN (
    'kitabu-demo-school',
    'kisii-demo-school',
    'mombasa-demo-school',
    'smoke-test-school'
  );

-- These relations use SET NULL foreign keys. Delete their demonstration rows explicitly
-- so mock activity does not survive as anonymous production analytics.
DELETE FROM audit_logs
WHERE actor_user_id IN (SELECT id FROM cleanup_removed_users)
   OR school_id IN (SELECT id FROM cleanup_removed_schools);

DELETE FROM ai_generation_runs
WHERE user_id IN (SELECT id FROM cleanup_removed_users)
   OR school_id IN (SELECT id FROM cleanup_removed_schools);

DELETE FROM ai_usage_events
WHERE user_id IN (SELECT id FROM cleanup_removed_users)
   OR school_id IN (SELECT id FROM cleanup_removed_schools);

DELETE FROM content_reports
WHERE reporter_user_id IN (SELECT id FROM cleanup_removed_users)
   OR reviewer_user_id IN (SELECT id FROM cleanup_removed_users)
   OR school_id IN (SELECT id FROM cleanup_removed_schools);

DELETE FROM onboarding_selection_events
WHERE user_id IN (SELECT id FROM cleanup_removed_users)
   OR school_id IN (SELECT id FROM cleanup_removed_schools);

DELETE FROM subject_engagement_events
WHERE user_id IN (SELECT id FROM cleanup_removed_users)
   OR school_id IN (SELECT id FROM cleanup_removed_schools);

-- User-owned rows are removed by their ON DELETE CASCADE constraints.
DELETE FROM users
WHERE id IN (SELECT id FROM cleanup_removed_users);

-- Classes, assignments, submissions, and other school-owned mock rows cascade here.
-- The retained student and teacher accounts become intentionally school-independent.
DELETE FROM schools
WHERE id IN (SELECT id FROM cleanup_removed_schools);

DO $$
DECLARE
  remaining_users integer;
BEGIN
  SELECT COUNT(*) INTO remaining_users FROM users;

  IF remaining_users <> 4 THEN
    RAISE EXCEPTION 'Demo cleanup expected exactly 4 retained users, found %', remaining_users;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM users
    WHERE lower(email) NOT IN (
      'student@kitabu.ai',
      'parent@kitabu.ai',
      'teacher@kitabu.ai',
      'admin@kitabu.ai'
    )
  ) THEN
    RAISE EXCEPTION 'Demo cleanup left non-approved users behind';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM schools
    WHERE id IN (
        '11111111-1111-4111-8111-111111111111'::uuid,
        '11111111-1111-4111-8111-222222222222'::uuid,
        '11111111-1111-4111-8111-333333333333'::uuid
      )
      OR slug IN (
        'kitabu-demo-school',
        'kisii-demo-school',
        'mombasa-demo-school',
        'smoke-test-school'
      )
  ) THEN
    RAISE EXCEPTION 'Demo cleanup left a demonstration school behind';
  END IF;
END $$;
