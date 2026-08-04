-- Consolidate the known legacy demo identities into one forward-only account.
-- The migration runner applies this file in one transaction; applied migrations remain immutable.

CREATE TEMP TABLE kitabu_demo_legacy_emails (
  email TEXT PRIMARY KEY
) ON COMMIT DROP;

INSERT INTO kitabu_demo_legacy_emails (email)
VALUES
  ('student@kitabu.ai'),
  ('teacher@kitabu.ai'),
  ('parent@kitabu.ai'),
  ('demostudent@kitabu.ai'),
  ('demoteacher@kitabu.ai'),
  ('demoparent@kitabu.ai');

-- If the canonical row does not exist, retain the first known legacy row and rename it.
DO $$
BEGIN
  UPDATE users
  SET email = 'demoaccount@kitabu.ai'
  WHERE id = (
    SELECT id
    FROM users
    WHERE lower(email) IN (SELECT email FROM kitabu_demo_legacy_emails)
      AND NOT EXISTS (
        SELECT 1 FROM users WHERE lower(email) = 'demoaccount@kitabu.ai'
      )
    ORDER BY CASE lower(email)
      WHEN 'student@kitabu.ai' THEN 1
      WHEN 'demostudent@kitabu.ai' THEN 2
      WHEN 'teacher@kitabu.ai' THEN 3
      WHEN 'demoteacher@kitabu.ai' THEN 4
      WHEN 'parent@kitabu.ai' THEN 5
      WHEN 'demoparent@kitabu.ai' THEN 6
      ELSE 7
    END, id
    LIMIT 1
  );

  INSERT INTO users (
    email,
    password_hash,
    full_name,
    status,
    email_verified,
    email_verified_at
  )
  SELECT
    'demoaccount@kitabu.ai',
    '$2b$12$MWSjrQjGgOlUwrmLCxQM5e06zQwbMEf1gHd1A2BDkWsx.Ow4fhbLW',
    'Kitabu Demo Account',
    'active',
    TRUE,
    NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE lower(email) = 'demoaccount@kitabu.ai'
  );
END $$;

CREATE TEMP TABLE kitabu_demo_canonical_user ON COMMIT DROP AS
SELECT id
FROM users
WHERE lower(email) = 'demoaccount@kitabu.ai';

CREATE TEMP TABLE kitabu_demo_legacy_users ON COMMIT DROP AS
SELECT id
FROM users
WHERE lower(email) IN (SELECT email FROM kitabu_demo_legacy_emails);

-- Avoid duplicate one-to-one rows before consolidating the remaining user foreign keys.
DELETE FROM user_billing_profiles legacy
USING kitabu_demo_legacy_users aliases
WHERE legacy.user_id = aliases.id
  AND EXISTS (
    SELECT 1
    FROM user_billing_profiles canonical
    WHERE canonical.user_id = (SELECT id FROM kitabu_demo_canonical_user)
  );

DELETE FROM totp_credentials legacy
USING kitabu_demo_legacy_users aliases
WHERE legacy.user_id = aliases.id
  AND EXISTS (
    SELECT 1
    FROM totp_credentials canonical
    WHERE canonical.user_id = (SELECT id FROM kitabu_demo_canonical_user)
  );

DELETE FROM learner_subject_display_preferences legacy
USING kitabu_demo_legacy_users aliases
WHERE legacy.user_id = aliases.id
  AND EXISTS (
    SELECT 1
    FROM learner_subject_display_preferences canonical
    WHERE canonical.user_id = (SELECT id FROM kitabu_demo_canonical_user)
  );

DELETE FROM user_auth_identities legacy
USING kitabu_demo_legacy_users aliases
WHERE legacy.user_id = aliases.id
  AND EXISTS (
    SELECT 1
    FROM user_auth_identities canonical
    WHERE canonical.user_id = (SELECT id FROM kitabu_demo_canonical_user)
      AND (
        canonical.provider = legacy.provider
        OR canonical.provider_subject = legacy.provider_subject
      )
  );

-- Remove legacy memberships/relationships that would collide with canonical rows.
DELETE FROM class_teachers legacy
USING kitabu_demo_legacy_users aliases
WHERE legacy.teacher_id = aliases.id
  AND EXISTS (
    SELECT 1
    FROM class_teachers canonical
    WHERE canonical.class_id = legacy.class_id
      AND canonical.teacher_id = (SELECT id FROM kitabu_demo_canonical_user)
  );

DELETE FROM class_students legacy
USING kitabu_demo_legacy_users aliases
WHERE legacy.student_id = aliases.id
  AND EXISTS (
    SELECT 1
    FROM class_students canonical
    WHERE canonical.class_id = legacy.class_id
      AND canonical.student_id = (SELECT id FROM kitabu_demo_canonical_user)
  );

DELETE FROM account_deletion_requests legacy
USING kitabu_demo_legacy_users aliases
WHERE legacy.user_id = aliases.id
  AND legacy.fulfilled_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM account_deletion_requests canonical
    WHERE canonical.user_id = (SELECT id FROM kitabu_demo_canonical_user)
      AND canonical.fulfilled_at IS NULL
  );

-- Deduplicate every non-partial unique key containing a single-column user foreign key.
-- This covers composite memberships and user-scoped progress/preferences added by later migrations.
DO $$
DECLARE
  foreign_key RECORD;
  unique_index RECORD;
  unique_predicate TEXT;
  alias_unique_predicate TEXT;
BEGIN
  FOR foreign_key IN
    SELECT
      child_table.oid AS child_table_oid,
      child_namespace.nspname AS child_schema,
      child_table.relname AS child_table,
      child_column.attname AS child_column,
      child_column.attnum AS child_attnum
    FROM pg_constraint constraint_row
    JOIN pg_class child_table ON child_table.oid = constraint_row.conrelid
    JOIN pg_namespace child_namespace ON child_namespace.oid = child_table.relnamespace
    JOIN pg_attribute child_column
      ON child_column.attrelid = child_table.oid
     AND child_column.attnum = constraint_row.conkey[1]
    WHERE constraint_row.contype = 'f'
      AND constraint_row.confrelid = 'public.users'::regclass
      AND array_length(constraint_row.conkey, 1) = 1
      AND array_length(constraint_row.confkey, 1) = 1
      AND child_table.relname NOT IN ('user_roles', 'parent_students')
  LOOP
    FOR unique_index IN
      SELECT indexrelid
      FROM pg_index
      WHERE indrelid = foreign_key.child_table_oid
        AND indisunique
        AND indpred IS NULL
        AND foreign_key.child_attnum = ANY(indkey)
    LOOP
      SELECT string_agg(
        CASE
          WHEN index_column.attnum = foreign_key.child_attnum THEN 'TRUE'
          ELSE format(
            'legacy.%I IS NOT DISTINCT FROM canonical.%I',
            index_column.attname,
            index_column.attname
          )
        END,
        ' AND ' ORDER BY index_key.ordinality
      )
      INTO unique_predicate
      FROM pg_index index_row
      CROSS JOIN LATERAL unnest(index_row.indkey) WITH ORDINALITY AS index_key(attnum, ordinality)
      JOIN pg_attribute index_column
        ON index_column.attrelid = index_row.indrelid
       AND index_column.attnum = index_key.attnum
      WHERE index_row.indexrelid = unique_index.indexrelid;

      EXECUTE format(
        'DELETE FROM %I.%I AS legacy USING %I.%I AS canonical, kitabu_demo_legacy_users AS aliases WHERE legacy.%I = aliases.id AND canonical.%I = (SELECT id FROM kitabu_demo_canonical_user) AND legacy.ctid <> canonical.ctid AND %s',
        foreign_key.child_schema,
        foreign_key.child_table,
        foreign_key.child_schema,
        foreign_key.child_table,
        foreign_key.child_column,
        foreign_key.child_column,
        unique_predicate
      );

      alias_unique_predicate := replace(unique_predicate, 'canonical.', 'survivor.');
      EXECUTE format(
        'DELETE FROM %I.%I AS legacy USING %I.%I AS survivor, kitabu_demo_legacy_users AS aliases, kitabu_demo_legacy_users AS survivor_aliases WHERE legacy.%I = aliases.id AND survivor.%I = survivor_aliases.id AND legacy.ctid > survivor.ctid AND %s',
        foreign_key.child_schema,
        foreign_key.child_table,
        foreign_key.child_schema,
        foreign_key.child_table,
        foreign_key.child_column,
        foreign_key.child_column,
        alias_unique_predicate
      );
    END LOOP;
  END LOOP;
END $$;

-- A match cannot become a self-match when both players are demo aliases/canonical.
DELETE FROM chess_matches
WHERE challenger_user_id IN (
    SELECT id FROM kitabu_demo_legacy_users
    UNION
    SELECT id FROM kitabu_demo_canonical_user
  )
  AND opponent_user_id IN (
    SELECT id FROM kitabu_demo_legacy_users
    UNION
    SELECT id FROM kitabu_demo_canonical_user
  );

-- A demo parent-to-demo-student relationship would become a self-reference.
DELETE FROM parent_students
WHERE parent_user_id IN (SELECT id FROM kitabu_demo_legacy_users)
   OR student_user_id IN (SELECT id FROM kitabu_demo_legacy_users);

INSERT INTO user_roles (user_id, role)
SELECT (SELECT id FROM kitabu_demo_canonical_user), role
FROM user_roles
WHERE user_id IN (SELECT id FROM kitabu_demo_legacy_users)
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO user_roles (user_id, role)
SELECT (SELECT id FROM kitabu_demo_canonical_user), role::user_role
FROM (VALUES ('student'), ('teacher'), ('parent')) AS required_roles(role)
ON CONFLICT (user_id, role) DO NOTHING;

-- Reconcile the partial active-subscription key before repointing legacy users.
-- Survivor rule: keep the oldest existing canonical active row; when none exists,
-- keep the oldest legacy active row. Ties are broken by subscription id. Cancel
-- every other active row before changing user_id so subscription history is kept
-- without violating uq_subscriptions_one_active_per_user.
DO $$
DECLARE
  subscription_survivor_id UUID;
BEGIN
  SELECT subscriptions.id
  INTO subscription_survivor_id
  FROM subscriptions
  WHERE subscriptions.user_id = (SELECT id FROM kitabu_demo_canonical_user)
    AND subscriptions.status = 'active'
  ORDER BY subscriptions.created_at, subscriptions.id
  LIMIT 1;

  IF subscription_survivor_id IS NULL THEN
    SELECT subscriptions.id
    INTO subscription_survivor_id
    FROM subscriptions
    WHERE subscriptions.user_id IN (SELECT id FROM kitabu_demo_legacy_users)
      AND subscriptions.status = 'active'
    ORDER BY subscriptions.created_at, subscriptions.id
    LIMIT 1;
  END IF;

  UPDATE subscriptions
  SET status = 'cancelled'
  WHERE subscriptions.user_id IN (
      SELECT id FROM kitabu_demo_legacy_users
      UNION ALL
      SELECT id FROM kitabu_demo_canonical_user
    )
    AND subscriptions.status = 'active'
    AND (
      subscription_survivor_id IS NULL
      OR subscriptions.id <> subscription_survivor_id
    );

  UPDATE subscriptions
  SET user_id = (SELECT id FROM kitabu_demo_canonical_user)
  WHERE subscriptions.user_id IN (SELECT id FROM kitabu_demo_legacy_users);

  IF (
    SELECT COUNT(*)
    FROM subscriptions
    WHERE user_id = (SELECT id FROM kitabu_demo_canonical_user)
      AND status = 'active'
  ) > 1 THEN
    RAISE EXCEPTION 'Demo account consolidation left multiple active subscriptions';
  END IF;
END $$;

-- Repoint single-column user foreign keys so non-cascading audit/content rows remain valid.
DO $$
DECLARE
  foreign_key RECORD;
BEGIN
  FOR foreign_key IN
    SELECT
      child_namespace.nspname AS child_schema,
      child_table.relname AS child_table,
      child_column.attname AS child_column
    FROM pg_constraint constraint_row
    JOIN pg_class child_table ON child_table.oid = constraint_row.conrelid
    JOIN pg_namespace child_namespace ON child_namespace.oid = child_table.relnamespace
    JOIN pg_attribute child_column
      ON child_column.attrelid = child_table.oid
     AND child_column.attnum = constraint_row.conkey[1]
    WHERE constraint_row.contype = 'f'
      AND constraint_row.confrelid = 'public.users'::regclass
      AND array_length(constraint_row.conkey, 1) = 1
      AND array_length(constraint_row.confkey, 1) = 1
      AND child_table.relname NOT IN ('user_roles', 'parent_students')
  LOOP
    EXECUTE format(
      'UPDATE %I.%I SET %I = (SELECT id FROM kitabu_demo_canonical_user) WHERE %I IN (SELECT id FROM kitabu_demo_legacy_users)',
      foreign_key.child_schema,
      foreign_key.child_table,
      foreign_key.child_column,
      foreign_key.child_column
    );
  END LOOP;
END $$;

DELETE FROM user_roles
WHERE user_id IN (SELECT id FROM kitabu_demo_legacy_users);

-- User-owned rows with ON DELETE CASCADE are removed with these narrowly targeted aliases.
DELETE FROM users
WHERE id IN (SELECT id FROM kitabu_demo_legacy_users);

DELETE FROM user_roles
WHERE user_id = (SELECT id FROM kitabu_demo_canonical_user)
  AND role NOT IN ('student', 'teacher', 'parent');

DO $$
DECLARE
  canonical_role_count INTEGER;
BEGIN
  IF (SELECT COUNT(*) FROM users WHERE lower(email) = 'demoaccount@kitabu.ai') <> 1 THEN
    RAISE EXCEPTION 'Demo account consolidation expected exactly one canonical user';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM users
    WHERE lower(email) IN (SELECT email FROM kitabu_demo_legacy_emails)
  ) THEN
    RAISE EXCEPTION 'Demo account consolidation left a legacy demo identity';
  END IF;

  SELECT COUNT(*)
  INTO canonical_role_count
  FROM user_roles
  WHERE user_id = (SELECT id FROM kitabu_demo_canonical_user);

  IF canonical_role_count <> 3
     OR EXISTS (
       SELECT 1
       FROM user_roles
       WHERE user_id = (SELECT id FROM kitabu_demo_canonical_user)
         AND role NOT IN ('student', 'teacher', 'parent')
     )
     OR EXISTS (
       SELECT 1
       FROM (VALUES ('student'::user_role), ('teacher'::user_role), ('parent'::user_role)) AS required(role)
       WHERE NOT EXISTS (
         SELECT 1
         FROM user_roles
         WHERE user_id = (SELECT id FROM kitabu_demo_canonical_user)
           AND role = required.role
       )
     ) THEN
    RAISE EXCEPTION 'Demo account consolidation produced an invalid canonical role set';
  END IF;
END $$;
