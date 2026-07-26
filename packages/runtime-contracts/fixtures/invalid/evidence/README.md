# Invalid evidence fixtures

These fixtures define rejection cases for the evidence boundary.

- `missing-source-event-ids.json`, `bad-confidence-strength.json`,
  `unpinned-scorer-grader.json`, and `privacy-retention-errors.json` violate the
  standalone evidence-envelope schema.
- `dangling-claim.json` is structurally valid but must fail scene-aware
  validation because its claim is not declared by the pinned scene.
- `forged-independent-after-assistance.json` is structurally valid but must fail
  trace-aware validation: tutor-attributed assistance cannot be presented as
  independent evidence.

Keeping structural and cross-document failures separate prevents a schema pass
from being mistaken for complete evidence validation.
