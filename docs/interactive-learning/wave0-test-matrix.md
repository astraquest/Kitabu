# Wave 0 test matrix

Status: implementation gate
Scope: interactive-learning runtime foundation only

Wave 0 is accepted only when every row below passes from the repository root. A green type check alone is not acceptance. Tests must exercise both a valid path and the listed rejection paths.

## Required commands

| Gate | Command | Pass condition |
|---|---|---|
| Runtime types | `npm run typecheck:runtime` | No TypeScript errors. |
| Runtime unit tests | `npm run test:runtime` | All runtime-contract tests pass; zero skipped or todo tests in the acceptance set. |
| Authored-content validation | `npm run validate:runtime` | The Grade 6 fixtures pass and every fixture under `fixtures/invalid` is rejected. |
| Package build | `npm run build:runtime` | The package builds and its public entry point can be imported. |

Do not substitute a direct `node --test --experimental-strip-types` invocation for the package test command. The runtime source uses TypeScript syntax that Node's strip-only loader does not fully support.

## Executable acceptance matrix

| Area | Required behavior | Executable coverage |
|---|---|---|
| Contract boundary | Authored scenes contain reusable content only; learner, attempt, device and restore context enter through the load request. Event and evidence identities form an auditable chain. | `tests/interactive-learning/contract-shape.test.ts` |
| Registry loader | Load validated manifests as immutable entries; reject duplicate component/version pairs; resolve exact versions only; reject missing versions and range or `latest` lookup. | `tests/interactive-learning/registry.test.ts`; invalid registry fixtures via `tests/cli/validate-content.test.ts` |
| Scene validation | Cross-check the scene against the installed exact component version; validate primary and fallback props; reject duplicate or dangling claims, unsupported evidence and tutor actions, unsafe assets and mismatched restore snapshots. Never silently upgrade. | `tests/interactive-learning/validation.test.ts`; invalid scene and fallback fixtures via `tests/cli/validate-content.test.ts` |
| Release bundle | Accept only supported protocol/schema/app-build combinations; lock exact component and grader versions; prevent channel drift; pin each attempt to one immutable bundle identity. | `tests/interactive-learning/bundle.test.ts` |
| Events and evidence | Require version-pinned envelopes, unique event IDs and scoped idempotency keys; distinguish duplicate, stale and conflicting sequences. Repeating identical input must produce the same event/evidence trace. | `tests/interactive-learning/protocol.test.ts`; `tests/interactive-learning/trace-determinism.test.ts` |
| Tutor intervention | Apply only actions declared by the component and permitted by the scene and current state; validate parameters before execution; return safe failures; correlate every applied or rejected result with `actionId`. | `tests/interactive-learning/tip.test.ts`; invalid TIP fixtures via `tests/cli/validate-content.test.ts` |
| Snapshots and migration | Restore only an exact attempt/bundle/scene/component identity; require a component-owned migration for version changes; support one direct migration; reject missing, chained or failed migrations without partial restore. | `tests/interactive-learning/snapshot.test.ts`; invalid snapshot fixtures via `tests/cli/validate-content.test.ts` |
| Capability negotiation | Select the preferred supported renderer deterministically; honor input alternatives, reduced motion, offline mode and device tier; use only declared fallbacks and return stable rejection reasons. | `tests/interactive-learning/capabilities.test.ts`; invalid capability fixtures via `tests/cli/validate-content.test.ts` |
| Asset manifest | Allow only declared trusted assets; reject unsafe schemes/origins, duplicate IDs, bad MIME/digests, missing licence/provenance and budget overflow; verify content through the host digest hook. | `tests/interactive-learning/assets.test.ts`; invalid asset fixtures via `tests/cli/validate-content.test.ts` |
| Privacy boundary | Require versioned retention metadata; keep raw audio/image/video out of event payloads by using blob references; reject embedded media data URLs while allowing ordinary learner text. | `tests/interactive-learning/privacy.test.ts` |
| Shared harness | Enforce lifecycle order; reproduce traces for identical input; restore into a fresh adapter; reject cross-attempt snapshots. | `tests/interactive-learning/harness.test.ts` |
| Stable failures | Validation and dispatch failures remain serializable and expose stable area, code and path fields without leaking thrown errors. | `tests/interactive-learning/errors.test.ts` |
| Grade 6 proof | Validate the Whole Numbers structured-response and rank scenes, installed registry manifests, asset manifest and immutable bundle together. The CLI must work from both repository and package directories and return non-zero for invalid content. | `tests/cli/validate-content.test.ts`; `fixtures/grade-6/*`; `fixtures/installed-registry/*` |
| Package surface | A consumer can import the built package's public runtime API without reaching into internal paths. | `tests/package-smoke.test.mjs` |

## Acceptance rules

1. Fix the implementation or fixture that caused a failure; do not weaken an assertion merely to turn the gate green.
2. Every production bug found in a Wave 0 boundary receives a failing regression test before the fix.
3. No network, database, mobile UI or clock dependency is allowed in the runtime unit suite. Inject time, IDs and digest checks where needed.
4. The Grade 6 fixtures are proof data, not individual learning-component implementations.
5. Any required database migration, new scene graph, UI component, plugin system or event-sourcing platform is a scope conflict and stops Wave 0 for an explicit decision.

## Completion record

Record the exact commit, UTC time and results of the four required commands in the implementation handoff. Wave 0 is complete only when all four commands pass on the same commit.
