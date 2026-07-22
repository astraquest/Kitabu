# KICD Revised Lower Primary Curriculum (2024)

This directory is the versioned source of truth for Kenya CBC Grades 1–3 curriculum grounding in Kitabu.

- `source-pages.json` contains the complete page text and SHA-256 hash for all 1,404 pages from the eight official KICD Google Drive documents.
- `normalized-curriculum.json` contains 27 grade-subject cells with themes, strands, sub-strands, expected learning outcomes, key inquiry questions, learning activities, competencies, values, PCIs, cross-curricular links, assessment rubrics, lesson allocations, and page-level provenance.
- `validation-report.json` records coverage and the six inconsistencies or omissions present in the official source documents.

Validate the committed corpus without a database:

```sh
node apps/api/scripts/curriculum/import-kicd-grade1-3.mjs --dry-run
```

Regenerate the normalized files from the committed page corpus:

```sh
node apps/api/scripts/curriculum/extract-kicd-grade1-3.mjs
```

The production deployment runs validation, applies the schema migration, and performs the transactionally verified, idempotent import automatically.
