-- Stable, read-only retrieval contract for normalized curriculum grounding.
--
-- Compatibility assumptions shared with 058:
--   * release_id remains nullable on pre-release normalized rows;
--   * those rows are exposed with version_code = 'unversioned';
--   * pathway-less subjects are exposed once with a NULL pathway;
--   * a subject mapped to a track is retrievable by either the track code or
--     any ancestor pathway code in pathway_codes.
--   * calls without an explicit version return only the active grade release,
--     or legacy unversioned rows when no release has been activated.
--
-- The view is intentionally additive. Existing curriculum_strands and
-- curriculum_sub_strands readers are unchanged.
CREATE OR REPLACE VIEW public.curriculum_grounding_content_v1
WITH (security_invoker = true)
AS
WITH RECURSIVE unit_tree AS (
  SELECT
    unit.id AS unit_id,
    unit.grade_subject_id,
    unit.release_id,
    unit.parent_unit_id,
    unit.local_unit_type,
    unit.canonical_unit_type,
    unit.local_code,
    unit.title,
    unit.description,
    unit.sequence,
    unit.term,
    unit.suggested_periods,
    unit.content_type,
    unit.official_status,
    unit.source_id,
    unit.metadata,
    1 AS unit_depth,
    ARRAY[unit.id]::uuid[] AS visited_unit_ids,
    ARRAY[unit.sequence]::integer[] AS unit_sequence_path,
    jsonb_build_array(jsonb_build_object(
      'id', unit.id,
      'code', unit.local_code,
      'type', unit.canonical_unit_type,
      'localType', unit.local_unit_type,
      'title', unit.title,
      'sequence', unit.sequence
    )) AS unit_path,
    CASE WHEN unit.canonical_unit_type = 'strand' THEN unit.id END AS strand_id,
    CASE WHEN unit.canonical_unit_type = 'strand' THEN unit.title END AS strand_title,
    CASE WHEN unit.canonical_unit_type = 'sub_strand' THEN unit.id END AS sub_strand_id,
    CASE WHEN unit.canonical_unit_type = 'sub_strand' THEN unit.title END AS sub_strand_title
  FROM public.curriculum_units AS unit
  WHERE unit.parent_unit_id IS NULL

  UNION ALL

  SELECT
    child.id,
    child.grade_subject_id,
    child.release_id,
    child.parent_unit_id,
    child.local_unit_type,
    child.canonical_unit_type,
    child.local_code,
    child.title,
    child.description,
    child.sequence,
    child.term,
    child.suggested_periods,
    child.content_type,
    child.official_status,
    child.source_id,
    child.metadata,
    parent.unit_depth + 1,
    parent.visited_unit_ids || child.id,
    parent.unit_sequence_path || child.sequence,
    parent.unit_path || jsonb_build_array(jsonb_build_object(
      'id', child.id,
      'code', child.local_code,
      'type', child.canonical_unit_type,
      'localType', child.local_unit_type,
      'title', child.title,
      'sequence', child.sequence
    )),
    CASE
      WHEN child.canonical_unit_type = 'strand' THEN child.id
      ELSE parent.strand_id
    END,
    CASE
      WHEN child.canonical_unit_type = 'strand' THEN child.title
      ELSE parent.strand_title
    END,
    CASE
      WHEN child.canonical_unit_type = 'sub_strand' THEN child.id
      ELSE parent.sub_strand_id
    END,
    CASE
      WHEN child.canonical_unit_type = 'sub_strand' THEN child.title
      ELSE parent.sub_strand_title
    END
  FROM public.curriculum_units AS child
  JOIN unit_tree AS parent
    ON parent.unit_id = child.parent_unit_id
   AND parent.grade_subject_id = child.grade_subject_id
   AND parent.release_id IS NOT DISTINCT FROM child.release_id
  WHERE NOT child.id = ANY(parent.visited_unit_ids)
),
pathway_tree AS (
  SELECT
    pathway.id AS pathway_id,
    pathway.release_id,
    pathway.framework_id,
    pathway.grade_id,
    pathway.parent_pathway_id,
    pathway.pathway_type,
    pathway.code AS pathway_code,
    pathway.name AS pathway_name,
    pathway.display_order,
    ARRAY[pathway.id]::uuid[] AS visited_pathway_ids,
    ARRAY[pathway.code]::text[] AS pathway_codes,
    ARRAY[pathway.display_order]::integer[] AS pathway_order_path,
    jsonb_build_array(jsonb_build_object(
      'id', pathway.id,
      'code', pathway.code,
      'name', pathway.name,
      'type', pathway.pathway_type,
      'displayOrder', pathway.display_order
    )) AS pathway_path
  FROM public.curriculum_pathways AS pathway
  WHERE pathway.parent_pathway_id IS NULL

  UNION ALL

  SELECT
    child.id,
    child.release_id,
    child.framework_id,
    child.grade_id,
    child.parent_pathway_id,
    child.pathway_type,
    child.code,
    child.name,
    child.display_order,
    parent.visited_pathway_ids || child.id,
    parent.pathway_codes || child.code,
    parent.pathway_order_path || child.display_order,
    parent.pathway_path || jsonb_build_array(jsonb_build_object(
      'id', child.id,
      'code', child.code,
      'name', child.name,
      'type', child.pathway_type,
      'displayOrder', child.display_order
    ))
  FROM public.curriculum_pathways AS child
  JOIN pathway_tree AS parent
    ON parent.pathway_id = child.parent_pathway_id
   AND parent.release_id = child.release_id
   AND parent.framework_id = child.framework_id
   AND parent.grade_id = child.grade_id
  WHERE NOT child.id = ANY(parent.visited_pathway_ids)
)
SELECT
  framework.country_code,
  framework.code AS curriculum_code,
  COALESCE(framework_version.version_code, 'unversioned') AS version_code,
  release.id AS release_id,
  release.release_key,
  CASE
    WHEN release.id IS NULL THEN active_release.release_id IS NULL
    ELSE COALESCE(active_release.release_id = release.id, FALSE)
  END AS is_active,
  grade.id AS grade_id,
  grade.grade_code,
  grade.local_name AS grade_name,
  grade.sequence AS grade_sequence,
  subject.id AS subject_id,
  subject.subject_code,
  subject.subject_name,
  grade_subject.id AS grade_subject_id,
  grade_subject.display_order AS subject_display_order,
  pathway.pathway_id,
  pathway.pathway_code,
  pathway.pathway_name,
  pathway.pathway_type,
  COALESCE(pathway.pathway_codes, ARRAY[]::text[]) AS pathway_codes,
  COALESCE(pathway.pathway_order_path, ARRAY[]::integer[]) AS pathway_order_path,
  COALESCE(pathway.pathway_path, '[]'::jsonb) AS pathway_path,
  tree.unit_id,
  tree.parent_unit_id,
  tree.strand_id,
  tree.strand_title,
  tree.sub_strand_id,
  tree.sub_strand_title,
  tree.local_unit_type,
  tree.canonical_unit_type,
  tree.local_code AS unit_code,
  tree.title AS unit_title,
  tree.description AS unit_description,
  tree.sequence AS unit_sequence,
  tree.unit_depth,
  tree.unit_sequence_path,
  tree.unit_path,
  tree.term,
  tree.suggested_periods,
  tree.content_type,
  tree.official_status,
  COALESCE(outcome_items.items, '[]'::jsonb) AS outcomes,
  COALESCE(question_items.items, '[]'::jsonb) AS inquiry_questions,
  COALESCE(activity_items.items, '[]'::jsonb) AS learning_activities,
  jsonb_build_object(
    'unitSource', CASE
      WHEN unit_source.id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'id', unit_source.id,
        'publisher', unit_source.publisher,
        'title', unit_source.title,
        'year', unit_source.year,
        'url', unit_source.url,
        'accessedOn', unit_source.accessed_on
      )
    END,
    'unitMetadata', tree.metadata,
    'citations', COALESCE(citation_items.items, '[]'::jsonb)
  ) AS provenance
FROM unit_tree AS tree
JOIN public.curriculum_grade_subjects AS grade_subject
  ON grade_subject.id = tree.grade_subject_id
 AND grade_subject.release_id IS NOT DISTINCT FROM tree.release_id
JOIN public.curriculum_grades AS grade
  ON grade.id = grade_subject.grade_id
JOIN public.curriculum_frameworks AS framework
  ON framework.id = grade_subject.framework_id
 AND framework.id = grade.framework_id
JOIN public.curriculum_subject_catalog AS subject
  ON subject.id = grade_subject.subject_id
 AND subject.country_code = framework.country_code
LEFT JOIN public.curriculum_releases AS release
  ON release.id = tree.release_id
 AND release.framework_id = framework.id
LEFT JOIN public.curriculum_framework_versions AS framework_version
  ON framework_version.id = release.framework_version_id
 AND framework_version.framework_id = framework.id
LEFT JOIN public.curriculum_grade_active_releases AS active_release
  ON active_release.grade_id = grade.id
 AND active_release.framework_id = framework.id
LEFT JOIN public.curriculum_pathway_subjects AS pathway_subject
  ON pathway_subject.grade_subject_id = grade_subject.id
 AND pathway_subject.release_id = release.id
 AND pathway_subject.grade_id = grade.id
LEFT JOIN pathway_tree AS pathway
  ON pathway.pathway_id = pathway_subject.pathway_id
 AND pathway.release_id = release.id
 AND pathway.framework_id = framework.id
 AND pathway.grade_id = grade.id
LEFT JOIN public.curriculum_sources AS unit_source
  ON unit_source.id = tree.source_id
LEFT JOIN LATERAL (
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', outcome.id,
      'type', outcome.local_type,
      'statement', outcome.statement,
      'competencyDomain', outcome.competency_domain,
      'sequence', outcome.sequence,
      'officialStatus', outcome.official_status,
      'metadata', outcome.metadata,
      'source', CASE
        WHEN source.id IS NULL THEN NULL
        ELSE jsonb_build_object(
          'id', source.id,
          'publisher', source.publisher,
          'title', source.title,
          'year', source.year,
          'url', source.url
        )
      END
    ) ORDER BY outcome.sequence, outcome.id
  ) AS items
  FROM public.curriculum_learning_outcomes AS outcome
  LEFT JOIN public.curriculum_sources AS source ON source.id = outcome.source_id
  WHERE outcome.unit_id = tree.unit_id
    AND outcome.release_id IS NOT DISTINCT FROM tree.release_id
) AS outcome_items ON TRUE
LEFT JOIN LATERAL (
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', question.id,
      'outcomeId', question.outcome_id,
      'question', question.question,
      'sourceType', question.source_type,
      'status', question.status,
      'sequence', question.sequence,
      'metadata', question.metadata,
      'source', CASE
        WHEN source.id IS NULL THEN NULL
        ELSE jsonb_build_object(
          'id', source.id,
          'publisher', source.publisher,
          'title', source.title,
          'year', source.year,
          'url', source.url
        )
      END
    ) ORDER BY question.sequence, question.id
  ) AS items
  FROM public.curriculum_inquiry_questions AS question
  LEFT JOIN public.curriculum_sources AS source ON source.id = question.source_id
  WHERE question.unit_id = tree.unit_id
    AND question.release_id IS NOT DISTINCT FROM tree.release_id
) AS question_items ON TRUE
LEFT JOIN LATERAL (
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', activity.id,
      'outcomeId', activity.outcome_id,
      'type', activity.activity_type,
      'activity', activity.activity,
      'resources', activity.resources,
      'assessmentNote', activity.assessment_note,
      'sequence', activity.sequence,
      'metadata', activity.metadata,
      'source', CASE
        WHEN source.id IS NULL THEN NULL
        ELSE jsonb_build_object(
          'id', source.id,
          'publisher', source.publisher,
          'title', source.title,
          'year', source.year,
          'url', source.url
        )
      END
    ) ORDER BY activity.sequence, activity.id
  ) AS items
  FROM public.curriculum_learning_activities AS activity
  LEFT JOIN public.curriculum_sources AS source ON source.id = activity.source_id
  WHERE activity.unit_id = tree.unit_id
    AND activity.release_id IS NOT DISTINCT FROM tree.release_id
) AS activity_items ON TRUE
LEFT JOIN LATERAL (
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', citation.id,
      'pageFrom', citation.page_from,
      'pageTo', citation.page_to,
      'locator', citation.locator,
      'excerpt', citation.excerpt,
      'metadata', citation.metadata,
      'source', CASE
        WHEN source.id IS NULL THEN NULL
        ELSE jsonb_build_object(
          'id', source.id,
          'publisher', source.publisher,
          'title', source.title,
          'year', source.year,
          'url', source.url,
          'accessedOn', source.accessed_on
        )
      END,
      'document', CASE
        WHEN document.id IS NULL THEN NULL
        ELSE jsonb_build_object(
          'id', document.id,
          'title', document.official_title,
          'publisher', document.publisher,
          'url', document.source_url,
          'checksum', document.downloaded_file_checksum
        )
      END,
      'extraction', CASE
        WHEN extraction.id IS NULL THEN NULL
        ELSE jsonb_build_object(
          'id', extraction.id,
          'pageNumber', extraction.page_number,
          'rowOrder', extraction.row_order,
          'confidence', extraction.extraction_confidence,
          'parserName', extraction.parser_name,
          'parserVersion', extraction.parser_version
        )
      END
    ) ORDER BY citation.page_from NULLS LAST, citation.page_to NULLS LAST, citation.id
  ) AS items
  FROM public.curriculum_unit_citations AS citation
  LEFT JOIN public.curriculum_sources AS source ON source.id = citation.source_id
  LEFT JOIN public.curriculum_source_documents AS document ON document.id = citation.source_document_id
  LEFT JOIN public.curriculum_extraction_rows AS extraction ON extraction.id = citation.extraction_row_id
  WHERE citation.unit_id = tree.unit_id
    AND citation.release_id = release.id
) AS citation_items ON TRUE;

COMMENT ON VIEW public.curriculum_grounding_content_v1 IS
  'Normalized curriculum units with hierarchy, release/version/pathway scope, ordered grounding content, and source provenance.';

CREATE OR REPLACE FUNCTION public.get_curriculum_grounding_v1(
  p_country_code text,
  p_curriculum_code text,
  p_version_code text DEFAULT NULL,
  p_grade_code text DEFAULT NULL,
  p_subject_code text DEFAULT NULL,
  p_pathway_code text DEFAULT NULL
)
RETURNS SETOF public.curriculum_grounding_content_v1
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
  SELECT grounding.*
  FROM public.curriculum_grounding_content_v1 AS grounding
  WHERE lower(grounding.country_code) = lower(btrim(p_country_code))
    AND lower(grounding.curriculum_code) = lower(btrim(p_curriculum_code))
    AND (
      (p_version_code IS NULL AND grounding.is_active)
      OR (
        p_version_code IS NOT NULL
        AND lower(grounding.version_code) = lower(btrim(p_version_code))
      )
    )
    AND (
      p_grade_code IS NULL
      OR lower(grounding.grade_code) = lower(btrim(p_grade_code))
    )
    AND (
      p_subject_code IS NULL
      OR lower(grounding.subject_code) = lower(btrim(p_subject_code))
    )
    AND (
      p_pathway_code IS NULL
      OR (
        lower(btrim(p_pathway_code)) = 'common'
        AND grounding.pathway_id IS NULL
      )
      OR lower(btrim(p_pathway_code)) = ANY (
        SELECT lower(code) FROM unnest(grounding.pathway_codes) AS code
      )
    )
  ORDER BY
    grounding.grade_sequence,
    grounding.subject_display_order,
    grounding.subject_code,
    grounding.pathway_order_path,
    grounding.unit_sequence_path,
    grounding.unit_id;
$function$;

COMMENT ON FUNCTION public.get_curriculum_grounding_v1(text, text, text, text, text, text) IS
  'Retrieves normalized curriculum grounding by country/curriculum and optional version, grade, subject, and pathway/track. Use pathway common for unmapped common subjects.';
