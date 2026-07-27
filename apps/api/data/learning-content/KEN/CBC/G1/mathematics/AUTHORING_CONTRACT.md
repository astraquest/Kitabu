# Grade 1 Mathematics authoring contract

The database curriculum is authoritative.  Each outcome file represents exactly one
stored Grade 1 Mathematical Activities learning outcome, and must retain its strand,
sub-strand, official outcome text, and source identifier.

Each file contains a `mission` with six ordered interactions: warm-up, model,
guided practice, independent practice, transfer, and exit check.  Every interaction
uses a supported lower-primary interaction mode and supplies deterministic answer
data, an immediate feedback message, a gentle retry hint, and a progression level.

## Naming and provenance

`curriculum.strand`, `curriculum.subStrand`, and `curriculum.outcomeText` are immutable
imported curriculum fields. `mission.title` must exactly equal
`curriculum.outcomeText`. A shorter or themed presentation alias may be introduced
only after explicit product approval, must be stored in a separate presentation-only
field, and must record its approval provenance. The compiler rejects undocumented
aliases so generated labels cannot be confused with official curriculum taxonomy.

Use short child-facing language, familiar Kenyan settings, tap alternatives for all
drag actions, and no unapproved scope expansion.  Mathematical bounds in a stored
outcome are hard limits (for example, no regrouping and totals up to 50).

## Common interaction shape

Keep each interaction self-contained. In addition to its phase, progression level,
prompt, deterministic `answer`, `feedback`, and `retryHint`, use the following
fields where applicable:

- `mode`: `picture-choice`, `number-input`, or `classify-sort-match-rank`.
- `activityMode`: required with `classify-sort-match-rank`; one of `classify`,
  `sort`, `match`, `rank`, or `pattern`.
- `objects` or `availableObjects`: stable object ids shown to the learner.
- `choices` for one-choice responses; `sequence` and `targetSlots` for ordered or
  pattern responses; `targets` for classify or match responses.
- `tapAlternative` whenever the visual presentation could be dragged.

The `answer` is a scalar for a choice/input, an ordered array for a sequence or
pattern, and an object mapping item ids to target ids for classify or match. These
fields clarify existing missions without invalidating an equivalent supported
interaction shape.

Files are independently owned: `outcomes/<strand>/<sub-strand>/<outcome>.json`.
Only the compiler owns aggregate indexes and generated bundles.
