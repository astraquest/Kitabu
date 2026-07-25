INSERT INTO curriculum_subjects (
  country_code, curriculum_code, subject_code, official_name, display_name, source_names
) VALUES
  ('KEN', 'CBC', 'hre', 'Hindu Religious Education Activities', 'HRE', '["Hindu Religious Education Activities", "Hindu Religious Education", "HRE"]'::jsonb),
  ('KEN', 'CBC', 'indigenous_languages', 'Indigenous Language Activities', 'Indigenous Languages', '["Indigenous Language Activities", "Indigenous Languages", "Indigenous Language"]'::jsonb)
ON CONFLICT (country_code, curriculum_code, subject_code) DO UPDATE
SET official_name = EXCLUDED.official_name,
    display_name = EXCLUDED.display_name,
    source_names = EXCLUDED.source_names,
    updated_at = NOW();

INSERT INTO curriculum_subject_aliases (
  country_code, curriculum_code, alias_key, alias_name, subject_code
)
SELECT 'KEN', 'CBC', normalize_curriculum_subject_alias(alias_name), alias_name, subject_code
FROM (VALUES
  ('HRE', 'hre'),
  ('Hindu Religious Education', 'hre'),
  ('Hindu Religious Education Activities', 'hre'),
  ('Indigenous Language Activities', 'indigenous_languages'),
  ('Indigenous Languages', 'indigenous_languages')
) AS aliases(alias_name, subject_code)
ON CONFLICT (country_code, curriculum_code, alias_key) DO UPDATE
SET alias_name = EXCLUDED.alias_name,
    subject_code = EXCLUDED.subject_code;
