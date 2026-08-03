# Reference library

The reference library preserves corrected, derived learning ideas for internal
template generation. It does not store source-book scans, source-page text,
EXIF, GPS, camera data, or other capture metadata.

## Local package

Each package is server-local and lives below:

```text
apps/api/data/reference-library/<country>/<curriculum>/<grade>/<document-key>/
  reference.json
  assets/
```

For PP1, use:

```text
apps/api/data/reference-library/KEN/CBC/PP1/orion-checkpoint-vol1/reference.json
```

`reference.json` uses this canonical shape (camel-case aliases are accepted by
the importer):

```json
{
  "document": {
    "document_key": "orion-checkpoint-vol1",
    "country_code": "KEN",
    "curriculum_code": "CBC",
    "grade_level": "PP1",
    "title": "PP1 Learning Activity References",
    "source_identity": "Orion Checkpoint Revision and Homework Book, Volume 1"
  },
  "assets": [
    { "path": "assets/counting-balls.svg", "type": "illustration" }
  ],
  "pages": [
    {
      "page_number": 2,
      "subject": "Mathematics",
      "learning_objectives": ["Count a group of objects accurately."],
      "assets": [],
      "activities": [
        {
          "order": 1,
          "title": "Count familiar objects",
          "instructions": "Count each group and say the number.",
          "activity_type": "counting",
          "prompt_data": { "groups": [{ "quantity": 3 }] },
          "skills": ["one-to-one counting"],
          "visual_requirements": ["Use original, child-friendly object drawings."],
          "template_guidance": "Vary objects and quantities in future templates.",
          "assets": []
        }
      ]
    }
  ]
}
```

Assets can be declared at document, page, or activity level. They may also be
referenced in `prompt_data` using `asset_path`, `asset_paths`, or `assets`. All
paths are relative to the package directory, must resolve inside it, and must
exist when the package is imported. The importer records a checksum for each
asset but never stores the binary in PostgreSQL.

## Import and retrieval

Validate without a database write:

```bash
npm run import:reference-library -w apps/api -- --dry-run
```

Import after migration 070 has been applied:

```bash
npm run import:reference-library -w apps/api -- --file data/reference-library/KEN/CBC/PP1/orion-checkpoint-vol1/reference.json
```

The import transaction upserts the document record and replaces that document's
pages, activities, and asset references with the complete current package. This
prevents corrected re-imports from leaving stale child records. It retains
corrected derived content, activity structure, template guidance, and local
generated-asset references. It deliberately does not invoke the curriculum PDF
importer.

Before writing, the importer compares the resolved content checksum and expected
page, activity, and asset counts with the stored target state. An exact match is
a zero-write skip, so rerunning an unchanged package does not churn IDs or
timestamps.

Platform administrators can retrieve this authoring-only material through:

- `GET /admin/reference-library/documents`
- `GET /admin/reference-library/documents/:documentKey?subject=&activityType=&query=`

The package directory is mounted read-only into API and worker containers,
excluded from Git/deploy rsync, and included in the local backup archive.
