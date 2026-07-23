import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const migrationPath = fileURLToPath(
  new URL('../sql/059_curriculum_grounding_views.sql', import.meta.url)
);
const migrationSql = readFileSync(migrationPath, 'utf8');
const databaseUrl = process.env.KITABU_TEST_DATABASE_URL?.trim();

const SHA256 = /^[a-f0-9]{64}$/;
const sealedGradeDirectories = [
  { gradeCode: 'G4', directory: 'kicd-2024-grade-4' },
  { gradeCode: 'G5', directory: 'kicd-2024-grade-5' },
  { gradeCode: 'G6', directory: 'kicd-2024-grade-6' },
  { gradeCode: 'G7', directory: 'kicd-2024-grade-7' },
  { gradeCode: 'G8', directory: 'kicd-2024-grade-8' },
  { gradeCode: 'G9', directory: 'kicd-2024-grade-9' },
  { gradeCode: 'G10', directory: 'kicd-2025-grade-10' },
  { gradeCode: 'G11', directory: 'kicd-2025-grade-11' },
  { gradeCode: 'G12', directory: 'kicd-2026-grade-12' }
] as const;

type CompletionCounts = {
  documents: number;
  pages: number;
  gradeSubjectCells: number;
  strands: number;
  subStrands: number;
  outcomes: number;
  inquiryQuestions: number;
  activities: number;
};

type FileBinding = {
  name?: string;
  path: string;
  byteLength: number;
  sha256: string;
};

type CompletionManifest = {
  schemaVersion: number;
  release: {
    countryCode: string;
    curriculumCode: string;
    gradeCode: string;
    revision: string;
    corpusSha256: string;
    runKey: string;
  };
  counts: CompletionCounts;
  logicalDigests: {
    normalized: string;
    legacy: string;
    sourcePages: string;
    apiProjection: string;
  };
  bindings: {
    artifacts: FileBinding[];
    importEvidence: FileBinding;
    retrievalEvidence: FileBinding;
    activeReleaseId: string | null;
  };
};

type SealedGradeFixture = {
  directory: string;
  gradeCode: string;
  manifestPath: string;
  manifest: CompletionManifest;
};

const curriculumRoot = fileURLToPath(new URL(
  '../data/curriculum/KEN/CBC/',
  import.meta.url
));

const sealedGradeFixtures = sealedGradeDirectories.flatMap(({ gradeCode, directory }) => {
  const manifestPath = path.join(curriculumRoot, directory, 'completion.json');
  if (!existsSync(manifestPath)) return [];
  return [{
    directory: path.dirname(manifestPath),
    gradeCode,
    manifestPath,
    manifest: JSON.parse(readFileSync(manifestPath, 'utf8')) as CompletionManifest
  }];
});
const missingSealedGrades = sealedGradeDirectories
  .filter(({ gradeCode }) => !sealedGradeFixtures.some(fixture => fixture.gradeCode === gradeCode))
  .map(({ gradeCode }) => gradeCode);
const sealedFixtureSkip = missingSealedGrades.length === 0
  ? false
  : `completion.json is not sealed for ${missingSealedGrades.join(', ')}`;

const expectedViewColumns = [
  'country_code', 'curriculum_code', 'version_code', 'release_id', 'release_key',
  'is_active', 'grade_id', 'grade_code', 'grade_name', 'grade_sequence', 'subject_id',
  'subject_code', 'subject_name', 'grade_subject_id', 'subject_display_order',
  'pathway_id', 'pathway_code', 'pathway_name', 'pathway_type', 'pathway_codes',
  'pathway_order_path', 'pathway_path', 'unit_id', 'parent_unit_id', 'strand_id',
  'strand_title', 'sub_strand_id', 'sub_strand_title', 'local_unit_type',
  'canonical_unit_type', 'unit_code', 'unit_title', 'unit_description',
  'unit_sequence', 'unit_depth', 'unit_sequence_path', 'unit_path', 'term',
  'suggested_periods', 'content_type', 'official_status', 'outcomes',
  'inquiry_questions', 'learning_activities', 'provenance'
];

test('defines an additive invoker-rights curriculum grounding contract', () => {
  assert.match(
    migrationSql,
    /CREATE OR REPLACE VIEW public\.curriculum_grounding_content_v1\s+WITH \(security_invoker = true\)/i
  );
  assert.match(
    migrationSql,
    /CREATE OR REPLACE FUNCTION public\.get_curriculum_grounding_v1\([\s\S]*?RETURNS SETOF public\.curriculum_grounding_content_v1/i
  );
  assert.match(migrationSql, /SECURITY INVOKER/i);
  assert.doesNotMatch(migrationSql, /SECURITY DEFINER/i);
  assert.doesNotMatch(migrationSql, /\b(?:DROP|TRUNCATE|DELETE|UPDATE|INSERT)\b/i);
});

test('preserves unit and pathway hierarchy without crossing release or grade scope', () => {
  assert.match(migrationSql, /WITH RECURSIVE unit_tree AS/i);
  assert.match(migrationSql, /parent\.grade_subject_id = child\.grade_subject_id/i);
  assert.match(migrationSql, /parent\.release_id IS NOT DISTINCT FROM child\.release_id/i);
  assert.match(migrationSql, /parent\.visited_unit_ids \|\| child\.id/i);
  assert.match(migrationSql, /WHERE NOT child\.id = ANY\(parent\.visited_unit_ids\)/i);
  assert.match(migrationSql, /parent\.release_id = child\.release_id/i);
  assert.match(migrationSql, /parent\.framework_id = child\.framework_id/i);
  assert.match(migrationSql, /parent\.grade_id = child\.grade_id/i);
  assert.match(migrationSql, /parent\.pathway_codes \|\| child\.code/i);
  assert.match(migrationSql, /unit_sequence_path/i);
  assert.match(migrationSql, /unit_path/i);
  assert.match(migrationSql, /pathway_path/i);
  assert.match(
    migrationSql,
    /grade_subject\.release_id IS NOT DISTINCT FROM tree\.release_id/i
  );
});

test('projects all grounding payloads with deterministic ordering and provenance', () => {
  assert.match(migrationSql, /AS outcomes/i);
  assert.match(migrationSql, /AS inquiry_questions/i);
  assert.match(migrationSql, /AS learning_activities/i);
  assert.match(migrationSql, /AS provenance/i);
  assert.match(migrationSql, /ORDER BY outcome\.sequence, outcome\.id/i);
  assert.match(migrationSql, /ORDER BY question\.sequence, question\.id/i);
  assert.match(migrationSql, /ORDER BY activity\.sequence, activity\.id/i);
  assert.match(migrationSql, /public\.curriculum_unit_citations/i);
  assert.match(migrationSql, /outcome\.release_id IS NOT DISTINCT FROM tree\.release_id/i);
  assert.match(migrationSql, /question\.release_id IS NOT DISTINCT FROM tree\.release_id/i);
  assert.match(migrationSql, /activity\.release_id IS NOT DISTINCT FROM tree\.release_id/i);
  assert.match(migrationSql, /public\.curriculum_source_documents/i);
  assert.match(migrationSql, /public\.curriculum_extraction_rows/i);
  assert.match(migrationSql, /'citations', COALESCE\(citation_items\.items, '\[\]'::jsonb\)/i);
});

test('filters the complete scope and keeps legacy normalized rows queryable', () => {
  for (const parameter of [
    'p_country_code',
    'p_curriculum_code',
    'p_version_code',
    'p_grade_code',
    'p_subject_code',
    'p_pathway_code'
  ]) {
    assert.match(migrationSql, new RegExp(`\\b${parameter}\\b`, 'i'));
  }

  assert.match(
    migrationSql,
    /COALESCE\(framework_version\.version_code, 'unversioned'\) AS version_code/i
  );
  assert.match(migrationSql, /public\.curriculum_grade_active_releases/i);
  assert.match(migrationSql, /p_version_code IS NULL AND grounding\.is_active/i);
  assert.match(migrationSql, /lower\(grounding\.country_code\) = lower\(btrim\(p_country_code\)\)/i);
  assert.match(migrationSql, /lower\(grounding\.curriculum_code\) = lower\(btrim\(p_curriculum_code\)\)/i);
  assert.match(migrationSql, /lower\(grounding\.version_code\) = lower\(btrim\(p_version_code\)\)/i);
  assert.match(migrationSql, /lower\(grounding\.grade_code\) = lower\(btrim\(p_grade_code\)\)/i);
  assert.match(migrationSql, /lower\(grounding\.subject_code\) = lower\(btrim\(p_subject_code\)\)/i);
  assert.match(migrationSql, /grounding\.pathway_id IS NULL/i);
  assert.match(migrationSql, /unnest\(grounding\.pathway_codes\)/i);
});

test('projects staged releases as inactive and keeps default retrieval active-only', () => {
  assert.match(
    migrationSql,
    /ELSE COALESCE\(active_release\.release_id = release\.id, FALSE\)\s+END AS is_active/i
  );
  assert.match(migrationSql, /p_version_code IS NULL AND grounding\.is_active/i);
  assert.match(
    migrationSql,
    /p_version_code IS NOT NULL[\s\S]*?grounding\.version_code[\s\S]*?p_version_code/i
  );
});

test('sealed Grades 4-12 manifests drive the retrieval fixtures', {
  skip: sealedFixtureSkip
}, () => {
  assert.deepEqual(
    sealedGradeFixtures.map(fixture => fixture.gradeCode),
    sealedGradeDirectories.map(fixture => fixture.gradeCode)
  );

  for (const fixture of sealedGradeFixtures) {
    const { manifest } = fixture;
    assert.equal(manifest.schemaVersion, 1, fixture.gradeCode);
    assert.equal(manifest.release.countryCode, 'KEN', fixture.gradeCode);
    assert.equal(manifest.release.curriculumCode, 'CBC', fixture.gradeCode);
    assert.equal(manifest.release.gradeCode, fixture.gradeCode, fixture.gradeCode);
    assert.match(manifest.release.corpusSha256, SHA256, fixture.gradeCode);
    assert.equal(
      manifest.release.runKey,
      `KEN:CBC:${manifest.release.revision}:${manifest.release.corpusSha256}`,
      fixture.gradeCode
    );

    for (const [key, value] of Object.entries(manifest.counts)) {
      assert.ok(Number.isSafeInteger(value) && value > 0, `${fixture.gradeCode} counts.${key}`);
    }
    for (const [key, value] of Object.entries(manifest.logicalDigests)) {
      assert.match(value, SHA256, `${fixture.gradeCode} logicalDigests.${key}`);
    }

    const bindings = [
      manifest.bindings.artifacts.find(item => item.name === 'normalized-curriculum.json'),
      manifest.bindings.importEvidence,
      manifest.bindings.retrievalEvidence
    ];
    for (const binding of bindings) {
      assert.ok(binding, `${fixture.gradeCode} required binding`);
      const artifactPath = path.resolve(fixture.directory, binding.path);
      const relativePath = path.relative(fixture.directory, artifactPath);
      assert.ok(
        relativePath !== '..' && !relativePath.startsWith(`..${path.sep}`) && !path.isAbsolute(relativePath),
        `${fixture.gradeCode} binding escapes its sealed directory`
      );
      const bytes = readFileSync(artifactPath);
      assert.equal(bytes.byteLength, binding.byteLength, artifactPath);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), binding.sha256, artifactPath);
    }
  }
});

test('installed database exposes the stable invoker contract', {
  skip: databaseUrl ? false : 'KITABU_TEST_DATABASE_URL is not configured'
}, async () => {
  const pool = new pg.Pool({ connectionString: databaseUrl });

  try {
    const columns = await pool.query<{ column_name: string }>(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'curriculum_grounding_content_v1'
      ORDER BY ordinal_position
    `);
    assert.deepEqual(columns.rows.map(row => row.column_name), expectedViewColumns);

    const contract = await pool.query<{
      reloptions: string[];
      function_result: string;
      volatility: string;
      security_definer: boolean;
    }>(`
      SELECT
        view.reloptions,
        pg_get_function_result(function.oid) AS function_result,
        function.provolatile AS volatility,
        function.prosecdef AS security_definer
      FROM pg_class AS view
      CROSS JOIN pg_proc AS function
      WHERE view.oid = 'public.curriculum_grounding_content_v1'::regclass
        AND function.oid = to_regprocedure(
          'public.get_curriculum_grounding_v1(text,text,text,text,text,text)'
        )
    `);

    assert.deepEqual(contract.rows[0]?.reloptions, ['security_invoker=true']);
    assert.equal(contract.rows[0]?.function_result, 'SETOF curriculum_grounding_content_v1');
    assert.equal(contract.rows[0]?.volatility, 's');
    assert.equal(contract.rows[0]?.security_definer, false);
  } finally {
    await pool.end();
  }
});

test('installed sealed Grades 4-12 releases match exact 059 retrieval contracts', {
  skip: databaseUrl ? sealedFixtureSkip : 'KITABU_TEST_DATABASE_URL is not configured'
}, async () => {
  const pool = new pg.Pool({ connectionString: databaseUrl });

  try {
    for (const fixture of sealedGradeFixtures) {
      const { manifest, gradeCode } = fixture;
      const releaseResult = await pool.query<{
        releaseId: string;
        versionCode: string;
        active: boolean;
      }>(`
        SELECT
          release.id::text AS "releaseId",
          version.version_code AS "versionCode",
          EXISTS (
            SELECT 1
            FROM public.curriculum_grade_active_releases AS active_release
            JOIN public.curriculum_grades AS active_grade
              ON active_grade.id = active_release.grade_id
            WHERE active_release.release_id = release.id
              AND active_grade.grade_code = $2
          ) AS active
        FROM public.curriculum_releases AS release
        JOIN public.curriculum_framework_versions AS version
          ON version.id = release.framework_version_id
         AND version.framework_id = release.framework_id
        JOIN public.curriculum_frameworks AS framework
          ON framework.id = release.framework_id
        WHERE release.release_key = $1
          AND release.content_sha256 = $3
          AND framework.country_code = 'KEN'
          AND framework.code = 'CBC'
      `, [manifest.release.runKey, gradeCode, manifest.release.corpusSha256]);
      assert.equal(releaseResult.rowCount, 1, `${gradeCode} sealed release identity`);
      const release = releaseResult.rows[0];
      assert.ok(release, `${gradeCode} installed release`);

      const expectedResult = await pool.query<{
        databaseUnits: number;
        units: number;
        gradeSubjectCells: number;
        themes: number;
        strands: number;
        subStrands: number;
        outcomes: number;
        inquiryQuestions: number;
        activities: number;
        citations: number;
        projectionRows: number;
        depthCounts: Record<string, number>;
        projectionDepthCounts: Record<string, number>;
        subjectRows: unknown[];
        pathwayRows: Record<string, number>;
      }>(`
        WITH RECURSIVE scoped_subjects AS (
          SELECT
            grade_subject.id,
            grade_subject.display_order,
            subject.subject_code
          FROM public.curriculum_grade_subjects AS grade_subject
          JOIN public.curriculum_grades AS grade ON grade.id = grade_subject.grade_id
          JOIN public.curriculum_subject_catalog AS subject ON subject.id = grade_subject.subject_id
          WHERE grade_subject.release_id = $1::uuid
            AND grade.grade_code = $2
        ), unit_tree AS (
          SELECT unit.id, unit.grade_subject_id, unit.parent_unit_id,
            unit.canonical_unit_type, unit.sequence, 1 AS depth,
            ARRAY[unit.id]::uuid[] AS visited
          FROM public.curriculum_units AS unit
          JOIN scoped_subjects AS scoped ON scoped.id = unit.grade_subject_id
          WHERE unit.release_id = $1::uuid AND unit.parent_unit_id IS NULL
          UNION ALL
          SELECT child.id, child.grade_subject_id, child.parent_unit_id,
            child.canonical_unit_type, child.sequence, parent.depth + 1,
            parent.visited || child.id
          FROM public.curriculum_units AS child
          JOIN unit_tree AS parent
            ON parent.id = child.parent_unit_id
           AND parent.grade_subject_id = child.grade_subject_id
          WHERE child.release_id = $1::uuid
            AND NOT child.id = ANY(parent.visited)
        ), projected AS (
          SELECT unit.*, scoped.display_order, scoped.subject_code,
            pathway_subject.pathway_id, pathway.code AS pathway_code
          FROM unit_tree AS unit
          JOIN scoped_subjects AS scoped ON scoped.id = unit.grade_subject_id
          LEFT JOIN public.curriculum_pathway_subjects AS pathway_subject
            ON pathway_subject.grade_subject_id = scoped.id
           AND pathway_subject.release_id = $1::uuid
          LEFT JOIN public.curriculum_pathways AS pathway
            ON pathway.id = pathway_subject.pathway_id
           AND pathway.release_id = $1::uuid
        )
        SELECT
          (SELECT count(*)::int FROM public.curriculum_units AS unit
            JOIN scoped_subjects AS scoped ON scoped.id = unit.grade_subject_id
            WHERE unit.release_id = $1::uuid) AS "databaseUnits",
          (SELECT count(*)::int FROM unit_tree) AS units,
          (SELECT count(*)::int FROM scoped_subjects) AS "gradeSubjectCells",
          (SELECT count(*) FILTER (WHERE canonical_unit_type = 'unit')::int FROM unit_tree) AS themes,
          (SELECT count(*) FILTER (WHERE canonical_unit_type = 'strand')::int FROM unit_tree) AS strands,
          (SELECT count(*) FILTER (WHERE canonical_unit_type = 'sub_strand')::int FROM unit_tree) AS "subStrands",
          (SELECT count(*)::int FROM public.curriculum_learning_outcomes AS item
            JOIN unit_tree AS unit ON unit.id = item.unit_id
            WHERE item.release_id = $1::uuid) AS outcomes,
          (SELECT count(*)::int FROM public.curriculum_inquiry_questions AS item
            JOIN unit_tree AS unit ON unit.id = item.unit_id
            WHERE item.release_id = $1::uuid) AS "inquiryQuestions",
          (SELECT count(*)::int FROM public.curriculum_learning_activities AS item
            JOIN unit_tree AS unit ON unit.id = item.unit_id
            WHERE item.release_id = $1::uuid) AS activities,
          (SELECT count(*)::int FROM public.curriculum_unit_citations AS item
            JOIN unit_tree AS unit ON unit.id = item.unit_id
            WHERE item.release_id = $1::uuid) AS citations,
          (SELECT count(*)::int FROM projected) AS "projectionRows",
          COALESCE((SELECT jsonb_object_agg(depth, rows ORDER BY depth) FROM (
            SELECT depth, count(*)::int AS rows FROM unit_tree GROUP BY depth
          ) AS counts), '{}'::jsonb) AS "depthCounts",
          COALESCE((SELECT jsonb_object_agg(depth, rows ORDER BY depth) FROM (
            SELECT depth, count(*)::int AS rows FROM projected GROUP BY depth
          ) AS counts), '{}'::jsonb) AS "projectionDepthCounts",
          COALESCE((SELECT jsonb_agg(jsonb_build_object(
            'displayOrder', display_order, 'subjectCode', subject_code, 'rows', rows
          ) ORDER BY display_order, subject_code) FROM (
            SELECT display_order, subject_code, count(*)::int AS rows
            FROM projected GROUP BY display_order, subject_code
          ) AS counts), '[]'::jsonb) AS "subjectRows",
          COALESCE((SELECT jsonb_object_agg(pathway_code, rows ORDER BY pathway_code) FROM (
            SELECT COALESCE(pathway_code, 'common') AS pathway_code, count(*)::int AS rows
            FROM projected GROUP BY COALESCE(pathway_code, 'common')
          ) AS counts), '{}'::jsonb) AS "pathwayRows"
      `, [release.releaseId, gradeCode]);
      const expected = expectedResult.rows[0];
      assert.ok(expected, `${gradeCode} base hierarchy`);
      assert.equal(expected.databaseUnits, expected.units, `${gradeCode} connected unit hierarchy`);
      assert.deepEqual({
        gradeSubjectCells: expected.gradeSubjectCells,
        strands: expected.strands,
        subStrands: expected.subStrands,
        outcomes: expected.outcomes,
        inquiryQuestions: expected.inquiryQuestions,
        activities: expected.activities
      }, {
        gradeSubjectCells: manifest.counts.gradeSubjectCells,
        strands: manifest.counts.strands,
        subStrands: manifest.counts.subStrands,
        outcomes: manifest.counts.outcomes,
        inquiryQuestions: manifest.counts.inquiryQuestions,
        activities: manifest.counts.activities
      }, `${gradeCode} sealed base counts`);
      assert.equal(expected.citations, manifest.counts.subStrands, `${gradeCode} exact citations`);

      const actualResult = await pool.query<{
        projectionRows: number;
        units: number;
        gradeSubjectCells: number;
        themes: number;
        strands: number;
        subStrands: number;
        outcomes: number;
        inquiryQuestions: number;
        activities: number;
        citations: number;
        depthCounts: Record<string, number>;
        projectionDepthCounts: Record<string, number>;
        subjectRows: unknown[];
        pathwayRows: Record<string, number>;
        hierarchyErrors: number;
        scopeErrors: number;
        pathwayErrors: number;
        payloadErrors: number;
        payloadVariantErrors: number;
        citationSetErrors: number;
        citationIntegrityErrors: number;
        isActiveNulls: number;
      }>(`
        WITH grounding AS (
          SELECT * FROM public.get_curriculum_grounding_v1(
            'KEN', 'CBC', $2, $3, NULL, NULL
          ) WHERE release_id = $1::uuid
        ), grounding_units AS (
          SELECT DISTINCT ON (unit_id) * FROM grounding
          ORDER BY unit_id, pathway_order_path
        ), actual_citations AS (
          SELECT unit.unit_id, citation.value->>'id' AS citation_id
          FROM grounding_units AS unit
          CROSS JOIN LATERAL jsonb_array_elements(unit.provenance->'citations') AS citation(value)
        ), expected_citations AS (
          SELECT citation.unit_id, citation.id::text AS citation_id
          FROM public.curriculum_unit_citations AS citation
          JOIN grounding_units AS unit ON unit.unit_id = citation.unit_id
          WHERE citation.release_id = $1::uuid
        )
        SELECT
          (SELECT count(*)::int FROM grounding) AS "projectionRows",
          (SELECT count(*)::int FROM grounding_units) AS units,
          (SELECT count(DISTINCT grade_subject_id)::int FROM grounding_units) AS "gradeSubjectCells",
          (SELECT count(*) FILTER (WHERE canonical_unit_type = 'unit')::int FROM grounding_units) AS themes,
          (SELECT count(*) FILTER (WHERE canonical_unit_type = 'strand')::int FROM grounding_units) AS strands,
          (SELECT count(*) FILTER (WHERE canonical_unit_type = 'sub_strand')::int FROM grounding_units) AS "subStrands",
          (SELECT coalesce(sum(jsonb_array_length(outcomes)), 0)::int FROM grounding_units) AS outcomes,
          (SELECT coalesce(sum(jsonb_array_length(inquiry_questions)), 0)::int FROM grounding_units) AS "inquiryQuestions",
          (SELECT coalesce(sum(jsonb_array_length(learning_activities)), 0)::int FROM grounding_units) AS activities,
          (SELECT coalesce(sum(jsonb_array_length(provenance->'citations')), 0)::int FROM grounding_units) AS citations,
          COALESCE((SELECT jsonb_object_agg(unit_depth, rows ORDER BY unit_depth) FROM (
            SELECT unit_depth, count(*)::int AS rows FROM grounding_units GROUP BY unit_depth
          ) AS counts), '{}'::jsonb) AS "depthCounts",
          COALESCE((SELECT jsonb_object_agg(unit_depth, rows ORDER BY unit_depth) FROM (
            SELECT unit_depth, count(*)::int AS rows FROM grounding GROUP BY unit_depth
          ) AS counts), '{}'::jsonb) AS "projectionDepthCounts",
          COALESCE((SELECT jsonb_agg(jsonb_build_object(
            'displayOrder', subject_display_order, 'subjectCode', subject_code, 'rows', rows
          ) ORDER BY subject_display_order, subject_code) FROM (
            SELECT subject_display_order, subject_code, count(*)::int AS rows
            FROM grounding GROUP BY subject_display_order, subject_code
          ) AS counts), '[]'::jsonb) AS "subjectRows",
          COALESCE((SELECT jsonb_object_agg(pathway_code, rows ORDER BY pathway_code) FROM (
            SELECT COALESCE(pathway_code, 'common') AS pathway_code, count(*)::int AS rows
            FROM grounding GROUP BY COALESCE(pathway_code, 'common')
          ) AS counts), '{}'::jsonb) AS "pathwayRows",
          (SELECT count(*)::int FROM grounding WHERE
            cardinality(unit_sequence_path) <> unit_depth
            OR jsonb_array_length(unit_path) <> unit_depth
            OR unit_path->-1->>'id' <> unit_id::text
          ) AS "hierarchyErrors",
          (SELECT count(*)::int FROM grounding WHERE
            country_code <> 'KEN' OR curriculum_code <> 'CBC'
            OR version_code <> $2 OR release_id <> $1::uuid OR grade_code <> $3
            OR grade_sequence <> substring($3 FROM 2)::int
          ) AS "scopeErrors",
          (SELECT count(*)::int FROM grounding WHERE
            (pathway_id IS NULL AND (
              cardinality(pathway_codes) <> 0 OR cardinality(pathway_order_path) <> 0
              OR jsonb_array_length(pathway_path) <> 0
            )) OR (pathway_id IS NOT NULL AND (
              cardinality(pathway_codes) = 0
              OR cardinality(pathway_order_path) <> cardinality(pathway_codes)
              OR jsonb_array_length(pathway_path) <> cardinality(pathway_codes)
              OR pathway_path->-1->>'id' <> pathway_id::text
            ))
          ) AS "pathwayErrors",
          (SELECT count(*)::int FROM grounding_units WHERE
            (canonical_unit_type = 'sub_strand' AND (
              jsonb_array_length(outcomes) = 0
              OR jsonb_array_length(inquiry_questions) = 0
              OR jsonb_array_length(learning_activities) = 0
              OR jsonb_array_length(provenance->'citations') <> 1
            )) OR (canonical_unit_type <> 'sub_strand' AND (
              jsonb_array_length(outcomes) <> 0
              OR jsonb_array_length(inquiry_questions) <> 0
              OR jsonb_array_length(learning_activities) <> 0
              OR jsonb_array_length(provenance->'citations') <> 0
            ))
          ) AS "payloadErrors",
          (SELECT count(*)::int FROM (
            SELECT unit_id FROM grounding GROUP BY unit_id HAVING
              count(DISTINCT outcomes::text) <> 1
              OR count(DISTINCT inquiry_questions::text) <> 1
              OR count(DISTINCT learning_activities::text) <> 1
              OR count(DISTINCT provenance::text) <> 1
          ) AS inconsistent) AS "payloadVariantErrors",
          (SELECT count(*)::int FROM (
            (SELECT * FROM expected_citations EXCEPT ALL SELECT * FROM actual_citations)
            UNION ALL
            (SELECT * FROM actual_citations EXCEPT ALL SELECT * FROM expected_citations)
          ) AS difference) AS "citationSetErrors",
          (SELECT count(*)::int
           FROM grounding_units AS unit
           CROSS JOIN LATERAL jsonb_array_elements(unit.provenance->'citations') AS citation(value)
           WHERE citation.value->'source'->>'id' IS NULL
             OR citation.value->'document'->>'id' IS NULL
             OR COALESCE(citation.value->'document'->>'checksum', '') !~ '^[0-9a-f]{64}$'
             OR COALESCE(citation.value->'extraction', 'null'::jsonb) <> 'null'::jsonb
             OR COALESCE(citation.value->>'pageFrom', '') !~ '^[0-9]+$'
             OR COALESCE(citation.value->>'pageTo', '') !~ '^[0-9]+$'
             OR (citation.value->>'pageFrom')::int < 1
             OR (citation.value->>'pageTo')::int < (citation.value->>'pageFrom')::int
             OR jsonb_typeof(citation.value->'metadata'->'sourcePages') IS DISTINCT FROM 'array'
             OR jsonb_array_length(citation.value->'metadata'->'sourcePages')
                <> (citation.value->>'pageTo')::int - (citation.value->>'pageFrom')::int + 1
             OR COALESCE(citation.value->'metadata'->>'sourceTextSha256', '') !~ '^[0-9a-f]{64}$'
             OR EXISTS (
               SELECT 1
               FROM jsonb_array_elements(citation.value->'metadata'->'sourcePages')
                 WITH ORDINALITY AS page(value, position)
               WHERE CASE
                 WHEN page.value #>> '{}' ~ '^[0-9]+$'
                   THEN (page.value #>> '{}')::int
                     <> (citation.value->>'pageFrom')::int + page.position::int - 1
                 ELSE TRUE
               END
             )
          ) AS "citationIntegrityErrors",
          (SELECT count(*)::int FROM grounding WHERE is_active IS NULL) AS "isActiveNulls"
      `, [release.releaseId, release.versionCode, gradeCode]);
      const actual = actualResult.rows[0];
      assert.ok(actual, `${gradeCode} retrieval projection`);
      assert.deepEqual({
        projectionRows: actual.projectionRows,
        units: actual.units,
        gradeSubjectCells: actual.gradeSubjectCells,
        themes: actual.themes,
        strands: actual.strands,
        subStrands: actual.subStrands,
        outcomes: actual.outcomes,
        inquiryQuestions: actual.inquiryQuestions,
        activities: actual.activities,
        citations: actual.citations,
        depthCounts: actual.depthCounts,
        projectionDepthCounts: actual.projectionDepthCounts,
        subjectRows: actual.subjectRows,
        pathwayRows: actual.pathwayRows
      }, {
        projectionRows: expected.projectionRows,
        units: expected.units,
        gradeSubjectCells: expected.gradeSubjectCells,
        themes: expected.themes,
        strands: expected.strands,
        subStrands: expected.subStrands,
        outcomes: expected.outcomes,
        inquiryQuestions: expected.inquiryQuestions,
        activities: expected.activities,
        citations: expected.citations,
        depthCounts: expected.depthCounts,
        projectionDepthCounts: expected.projectionDepthCounts,
        subjectRows: expected.subjectRows,
        pathwayRows: expected.pathwayRows
      }, `${gradeCode} dynamic depth, payload, and pathway counts`);
      assert.deepEqual({
        hierarchyErrors: actual.hierarchyErrors,
        scopeErrors: actual.scopeErrors,
        pathwayErrors: actual.pathwayErrors,
        payloadErrors: actual.payloadErrors,
        payloadVariantErrors: actual.payloadVariantErrors,
        citationSetErrors: actual.citationSetErrors,
        citationIntegrityErrors: actual.citationIntegrityErrors,
        isActiveNulls: actual.isActiveNulls
      }, {
        hierarchyErrors: 0,
        scopeErrors: 0,
        pathwayErrors: 0,
        payloadErrors: 0,
        payloadVariantErrors: 0,
        citationSetErrors: 0,
        citationIntegrityErrors: 0,
        isActiveNulls: 0
      }, `${gradeCode} retrieval integrity`);

      const pathwayFilters = await pool.query<{ filterCode: string; expectedRows: number }>(`
        WITH grounding AS (
          SELECT * FROM public.get_curriculum_grounding_v1(
            'KEN', 'CBC', $2, $3, NULL, NULL
          ) WHERE release_id = $1::uuid
        ), filters AS (
          SELECT 'common'::text AS filter_code,
            count(*) FILTER (WHERE pathway_id IS NULL)::int AS expected_rows
          FROM grounding
          UNION ALL
          SELECT code, count(*)::int
          FROM grounding CROSS JOIN LATERAL unnest(pathway_codes) AS code
          GROUP BY code
        )
        SELECT filter_code AS "filterCode", expected_rows AS "expectedRows"
        FROM filters ORDER BY filter_code
      `, [release.releaseId, release.versionCode, gradeCode]);
      for (const filter of pathwayFilters.rows) {
        const filtered = await pool.query<{ rows: number }>(`
          SELECT count(*)::int AS rows
          FROM public.get_curriculum_grounding_v1('KEN', 'CBC', $2, $3, NULL, $4)
          WHERE release_id = $1::uuid
        `, [release.releaseId, release.versionCode, gradeCode, filter.filterCode]);
        assert.equal(
          filtered.rows[0]?.rows,
          filter.expectedRows,
          `${gradeCode} pathway filter ${filter.filterCode}`
        );
      }

      const isolation = await pool.query<{
        wrongCountry: number;
        wrongCurriculum: number;
        wrongVersion: number;
        wrongGrade: number;
        wrongSubject: number;
        wrongPathway: number;
        caseInsensitive: number;
        activeDefaultTarget: number;
      }>(`
        SELECT
          (SELECT count(*)::int FROM public.get_curriculum_grounding_v1(
            '__NO_COUNTRY__', 'CBC', $2, $3, NULL, NULL
          )) AS "wrongCountry",
          (SELECT count(*)::int FROM public.get_curriculum_grounding_v1(
            'KEN', '__NO_CURRICULUM__', $2, $3, NULL, NULL
          )) AS "wrongCurriculum",
          (SELECT count(*)::int FROM public.get_curriculum_grounding_v1(
            'KEN', 'CBC', $2 || ':missing', $3, NULL, NULL
          )) AS "wrongVersion",
          (SELECT count(*)::int FROM public.get_curriculum_grounding_v1(
            'KEN', 'CBC', $2, 'G0', NULL, NULL
          )) AS "wrongGrade",
          (SELECT count(*)::int FROM public.get_curriculum_grounding_v1(
            'KEN', 'CBC', $2, $3, '__NO_SUBJECT__', NULL
          )) AS "wrongSubject",
          (SELECT count(*)::int FROM public.get_curriculum_grounding_v1(
            'KEN', 'CBC', $2, $3, NULL, '__NO_PATHWAY__'
          )) AS "wrongPathway",
          (SELECT count(*)::int FROM public.get_curriculum_grounding_v1(
            'ken', 'cbc', lower($2), lower($3), NULL, NULL
          ) WHERE release_id = $1::uuid) AS "caseInsensitive",
          (SELECT count(*)::int FROM public.get_curriculum_grounding_v1(
            'KEN', 'CBC', NULL, $3, NULL, NULL
          ) WHERE release_id = $1::uuid) AS "activeDefaultTarget"
      `, [release.releaseId, release.versionCode, gradeCode]);
      assert.deepEqual(isolation.rows[0], {
        wrongCountry: 0,
        wrongCurriculum: 0,
        wrongVersion: 0,
        wrongGrade: 0,
        wrongSubject: 0,
        wrongPathway: 0,
        caseInsensitive: actual.projectionRows,
        activeDefaultTarget: release.active ? actual.projectionRows : 0
      }, `${gradeCode} scope isolation`);
    }
  } finally {
    await pool.end();
  }
});
