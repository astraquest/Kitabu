# Kitabu Interactive Learning Runtime Contracts

`@kitabu/runtime-contracts` is the small, shared compatibility boundary between
authored learning content, the API, and the learner app. It validates what the
server may send and defines how a compatible client handles it. It does not
render lessons.

## Authority

For Wave 0 implementation decisions, use this order:

1. The versioned TypeScript exports in `src/interactive-learning/`.
2. The JSON Schemas in `schemas/interactive-learning/`.
3. Valid and invalid fixtures in `fixtures/` and their tests.
4. The implementation handbook for intent and rationale.

If these disagree, stop and record the conflict. Do not silently broaden a
schema, guess a value, or add an automatic conversion.

Content must pin exact protocol, schema, component, grader, and bundle
versions. A runtime must reject incompatible content instead of selecting a
nearby version.

## What this package provides

- An exact-version installed component registry.
- Scene and component-prop validation, including fallbacks.
- Immutable content-bundle compatibility and attempt pinning.
- Versioned event/evidence envelopes with duplicate and sequence protection.
- Tutor Intervention Protocol (TIP) action authorization and dispatch.
- Snapshot validation, exact restore, and one direct component-owned migration.
- Capability negotiation with explicit rejection reasons and fallbacks.
- Asset trust, provenance, digest, licence, and byte-budget validation.
- Learner-record privacy checks, including raw-media reference rules.
- A deterministic headless harness for lifecycle, replay, and restore tests.
- JSON Schemas and Grade 6 reference fixtures.

The public API is exported from `@kitabu/runtime-contracts`. Its main entry
points are:

| Need | Public API |
| --- | --- |
| Registry | `createInstalledComponentRegistry` |
| Scene validation | `validateComponentScene`, `createSchemaLoader` |
| Bundle compatibility | `checkBundleCompatibility`, `pinAttemptToBundle` |
| Protocol | `validateRuntimeEnvelope`, `RuntimeEnvelopeDuplicateGuard` |
| Tutor actions | `createTutorInterventionDispatcher` |
| Snapshots | `validateSnapshot`, `canRestoreSnapshot`, `restoreSnapshot` |
| Capabilities | `selectRenderCapability` |
| Assets | `validateAssetManifest` |
| Privacy | `validateLearnerRecordPrivacy` |
| Test harness | `runInteractiveLearningHarness`, `HeadlessFakeComponentAdapter` |

Import types such as `SceneDefinition`, `ComponentManifest`,
`RuntimeEnvelope`, and `ComponentSnapshot` from the same package. Only exports
listed in `src/interactive-learning/index.ts` are compatibility commitments.

## Commands

Run these from the repository root:

```powershell
npm run build:runtime
npm run typecheck:runtime
npm run test:runtime
npm run validate:runtime
```

The latter two run when the corresponding package scripts are available. For
the compiled CLI tools:

```powershell
node packages/runtime-contracts/dist/cli/validate-content.js `
  --registry packages/runtime-contracts/fixtures/installed-registry `
  packages/runtime-contracts/fixtures/grade-6

node packages/runtime-contracts/dist/cli/check-fixture-integrity.js `
  --repository-root . `
  packages/runtime-contracts/fixtures/grade-6
```

Both commands return `0` for success, `1` for invalid content, and `2` for a
usage or input error. Validate authored content before publishing it and again
before a client attempts to load it.

## Grade 6 reference fixtures

`fixtures/grade-6/` is the first executable vertical slice. It currently
contains:

- Kenya CBC Grade 6 Mathematics source and provenance metadata.
- A Whole Numbers structured numeric-response scene.
- A Whole Numbers ranking scene using `classify-sort-match-rank`.
- An immutable content bundle and asset manifest.
- Valid capability, interaction-event, evidence, and snapshot examples.

`fixtures/installed-registry/` contains the exact component manifests required
by those scenes. The Grade 6 fixtures are contract examples and test data, not
a substitute for curriculum approval or learner-facing component UIs.

## Host integration order

For each lesson attempt, the host should:

1. Validate the published bundle and exact dependency locks.
2. Pin the attempt to that immutable bundle identity.
3. Validate the selected scene, its props, assets, claims, and fallback.
4. Negotiate a supported renderer or use the declared fallback.
5. Load the renderer with runtime context kept outside authored scene data.
6. Accept only valid, ordered, deduplicated events and evidence.
7. Save or restore only snapshots bound to the same attempt and scene.

Do not trust author-supplied answer keys, grader code, learner identity,
capability claims, or runtime state. Those belong to sealed host services or
runtime context.

## Boundaries and non-goals

Wave 0 deliberately does **not** include:

- React Native, DOM, Canvas, WebGL, or Three.js renderers.
- Individual learning component implementations.
- A second lesson sequence or scene-graph system.
- An authoring dashboard, content-generation agent, or publishing workflow.
- A mastery engine, analytics warehouse, or general event-sourcing platform.
- Chained or automatic snapshot migrations.
- Voice tutoring, collaboration, 3D content, or arbitrary authored code.

The existing Kitabu progressive lesson remains the sequence container. This
package supplies contracts and deterministic decisions only. New abstractions
should be added when a real host and a real component both require them, not in
anticipation of future component types.
