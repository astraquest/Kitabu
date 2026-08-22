-- Stage B: only run after the schools catalog identity/count checkpoint has
-- been verified in deployment. The guard is intentionally database-backed so
-- a partial or out-of-order deployment cannot destroy the rollback source.
DO $$
DECLARE
  school_count BIGINT;
  catalog_count BIGINT;
  expected_count CONSTANT BIGINT := 37379;
BEGIN
  IF to_regclass('public.school_directory_records') IS NULL THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO catalog_count FROM school_directory_records;
  SELECT COUNT(*) INTO school_count
    FROM schools
   WHERE source_record_key IS NOT NULL;

  -- A disposable/fresh install has no legacy catalog to verify. Retire the
  -- empty rollback table immediately; populated upgrades remain fail-closed
  -- behind the full Stage A identity gate below.
  IF catalog_count = 0 AND school_count = 0 THEN
    DROP TABLE school_directory_records;
    RETURN;
  END IF;

  IF catalog_count <> expected_count OR school_count < expected_count THEN
    RAISE EXCEPTION 'school catalog retirement precondition failed: directory %, schools %', catalog_count, school_count;
  END IF;

  IF EXISTS (
    SELECT 1
      FROM school_directory_records d
      LEFT JOIN schools s ON s.source_record_key = d.source_record_key
     WHERE s.id IS NULL
  ) THEN
    RAISE EXCEPTION 'school catalog retirement precondition failed: source identity coverage is incomplete';
  END IF;

  DROP TABLE school_directory_records;
END $$;
