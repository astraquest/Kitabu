# Changelog

All notable changes to the Kitabu Interactive Learning Runtime contracts are
recorded here. An `Unreleased` entry describes work in the repository and is
not a learner-facing release.

## [1.0.1] - Unreleased

### Added

- A shared Wave 0 contract package for the API, authored content, and learner
  app, with exact-version component registry loading and scene validation.
- Versioned runtime event and evidence envelopes with sequence and duplicate
  protection, plus learner-record privacy checks.
- Tutor Intervention Protocol authorization and dispatch with explicit action
  outcomes.
- Attempt-bound snapshots with exact restore and one direct, component-owned
  version migration.
- Capability negotiation with explicit fallback or rejection, and asset
  manifest validation for trust, provenance, licence, digest, and byte limits.
- Immutable content-bundle compatibility and attempt pinning.
- A deterministic headless lifecycle, replay, and restore test harness.
- JSON Schemas, valid and invalid fixtures, command-line content validation,
  fixture-integrity checks, and Kenya CBC Grade 6 Whole Numbers reference
  fixtures for `structured-response` and `classify-sort-match-rank` contracts.

### Tests

- Contract, schema, registry, scene, fallback, protocol, TIP, snapshot,
  capability, asset, privacy, bundle, harness, CLI, trace-determinism, and
  package-export coverage.

### Deferred

- Learner-facing learning component implementations and all React Native,
  DOM, Canvas, WebGL, and Three.js renderers.
- Authoring-dashboard and publishing workflows, a new lesson sequence or
  scene-graph system, mastery and analytics platforms, and generalized event
  sourcing.
- Chained snapshot migrations, voice tutoring, collaboration, 3D learning
  experiences, and arbitrary authored code.

The Grade 6 material in this version is executable contract and validation
data only; it does not announce a learner component or curriculum release.
