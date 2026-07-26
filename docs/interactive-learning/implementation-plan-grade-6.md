# Kitabu Interactive Learning Runtime — Grade 6 Plan

Status: **Grade 6 runtime proof and immutable publishing workflow implemented; deployment pending**
Plan version: 1.3
Updated: 2026-07-26
Confirmed repository: `D:\APP BACKUPS\KITABU\kitabu-ai-progressive-release`

## Outcome

Build a stable Kitabu app shell once, then publish validated learning content from the server without a Play Store release whenever the required renderer is already installed. New renderer code, native capabilities, or a protocol major still require an app release.

The implementation order is:

1. Establish the safe, UI-independent runtime contract (Wave 0).
2. Integrate one real `structured-response` learner journey.
3. Integrate `classify-sort-match-rank` by adapting existing interaction mechanics.
4. Complete the first Kenya Grade 6 Mathematics sequence.
5. Add the smallest authoring and publishing workflow proven necessary by those slices.

The existing `ProgressiveLesson` remains the lesson sequence. Component scenes are step content, not a second scene graph.

## Authority

Use this order when implementation details disagree:

1. Versioned JSON Schemas in `packages/runtime-contracts/schemas/interactive-learning`.
2. Exported TypeScript contracts in `packages/runtime-contracts/src/interactive-learning`.
3. Valid, invalid, and adversarial fixtures plus their tests.
4. [Runtime contract v1.0.1 errata](runtime-contract-v1.0.1-errata.md).
5. The handbook for product intent only.

Stop and document a conflict instead of silently widening a contract or inventing a requirement.

## Current verified state

Wave 0 now exists as the private workspace package `@kitabu/runtime-contracts`. It contains no renderer and does not mean learner-facing components have shipped.

| Area | Current evidence | Status |
|---|---|---|
| Installed registry | Exact component/version registry and manifests; duplicate and incomplete entries rejected | Implemented and tested |
| Scene validation | Schema plus registry-backed semantic validation, component props, fallbacks, claims, actions, assets | Implemented and tested |
| Events and evidence | Version-pinned envelopes, traceability, duplicate/sequence handling, privacy checks | Implemented and tested |
| TIP dispatcher | Component-owned action validation with correlated applied/rejected results | Implemented and tested |
| Snapshots | Exact restore plus one direct component-owned migration | Implemented and tested |
| Capabilities | Deterministic renderer/input/offline/reduced-motion/device-tier selection | Implemented and tested |
| Assets | Trust, URI, digest, MIME, licence, provenance, and budget validation | Implemented and tested |
| Shared harness | Deterministic lifecycle, replay, snapshot, restore, and cross-attempt rejection | Implemented and tested |
| Content CLI | Grade 6 validation and repository-reference integrity checks from different working directories | Implemented and tested |
| Host decision | [Runtime host ADR](../adr/interactive-learning-runtime-host.md) preserves the current lesson architecture | Accepted |
| Native/API integration | Thin native scene guard/host uses the existing lesson and check flow; the API carries an optional learner-safe scene | First slice implemented and tested |
| Individual components | Native numeric/short-text `structured-response` renderer with deterministic normalization and accessibility tests | First slice implemented; release validation pending |
| Admin publishing | Platform-admin validate, installed-renderer preview, immutable draft, approval, publish and rollback pointer workflow | Implemented; deployment pending |

### Verification record

Verified against the working tree based on Git `HEAD` `01dddc3f942286f0ed68b74665c42156a3f5e963` on 2026-07-26. The runtime changes were uncommitted at verification time, so Wave 0 is not yet a release claim.

| Gate | Result |
|---|---|
| `npm run typecheck:runtime` | Passed |
| `npm run build:runtime` | Passed; public ESM import covered |
| `npm run test:runtime` | Passed: 160 tests, 0 failed, 0 skipped, 0 todo |
| `npm run validate:runtime` | Passed: 24 schema tests, both Grade 6 scenes, 9-file integrity check, and Wave 0 scope check |

The executable acceptance detail lives in [the Wave 0 test matrix](wave0-test-matrix.md).

## Next implementation milestone: usable vertical slice

Do not widen the kernel before proving it in the app.

Current slice evidence: the Grade 6 Whole Numbers opening step now carries a learner-safe `structured-response` scene, renders through the installed native host, accepts `700000` or `700,000`, and is graded by the existing server-authoritative attempt endpoint. Legacy lesson steps remain unchanged. Offline snapshot restore and release/rollback proof remain open before this milestone can be called complete.

### 1. Host integration

- Add a thin API adapter that validates an immutable bundle before delivery.
- Add a thin native adapter that validates the bundle again, resolves only an installed renderer, and keeps the last-known-good bundle.
- Pin active attempts to bundle, scene, component, and grader versions.
- Map current attempt/event persistence to the runtime envelopes; do not introduce an event-sourcing system.
- Persist snapshots and queued events with existing local-storage primitives.

Acceptance: the existing app can open a validated scene behind a feature flag, resume it, reject incompatible content safely, and leave existing lessons unchanged.

### 2. `structured-response`

Build only the modes needed by the first Grade 6 sequence: deterministic numeric response and normalized short text. Reuse current quiz and progressive-learning surfaces for prompt, input, feedback, retry, hint, progress, pause/resume, and completion.

Acceptance: one Grade 6 scene works online and offline, restores mid-scene, provides an accessible input path, emits traceable evidence, and syncs idempotently.

### 3. `classify-sort-match-rank`

Adapt existing `bucket_sort` and `sequence_builder` mechanics behind the new component contract. Include tap/keyboard alternatives; dragging must not be the only interaction.

Acceptance: the rank scene uses the same host lifecycle, evidence, snapshot, offline, and compatibility behavior without adding another runtime abstraction.

### 4. Kenya Grade 6 proof sequence

First subject: Mathematics, Numbers, Whole Numbers. Limit the first release to:

- place and total value;
- numbers in symbols;
- number words up to 100,000;
- ordering up to 100,000;
- rounding to the nearest thousand.

The journey should contain a short diagnostic, guided matching/ranking, one permitted tutor intervention after a demonstrated error, independent transfer, and a later retrieval item. Curriculum approval is separate from schema validity.

## Publishing milestone

After the vertical slice works, add the smallest workflow that supports:

`draft → validate → preview → curriculum review → approve immutable bundle → publish pointer → monitor → rollback`

Rules:

- Remote content is declarative data and verified assets only—never remote JavaScript, JSX, arbitrary HTML, or evaluator code.
- Practice answer logic may run locally only when explicitly non-secret. Protected assessment grading stays server-authoritative.
- Publishing creates an immutable bundle; promotion and rollback move a release pointer.
- Active attempts never change bundle or grader midway.
- An older client rejects incompatible content and retains its embedded or last-known-good bundle.

## Anti-overengineering gates

- Preserve `ProgressiveLesson`; no competing lesson graph.
- Keep one shared contracts package and thin host adapters.
- Add no framework, database table, service, or dependency without a current vertical-slice acceptance criterion that requires it.
- Add no factory, DI container, plugin marketplace, workflow DSL, generic migration graph, or event-sourcing platform.
- Add no abstraction without a current producer, consumer, and contract test.
- No placeholder production interfaces, silent fallbacks, remote executable content, or speculative component APIs.
- Runtime fixtures are proof data, not shipped components.
- Before adding more infrastructure, complete one learner-visible journey and measure its usability.

Wave 0 is larger than the original rough module/line targets, so future work must reduce or reuse before generalizing. Passing tests does not by itself justify more architecture.

## Explicitly deferred

- The rest of the handbook component catalogue.
- Three.js, image-to-3D, maps, advanced charts, simulations, voice tutoring, collaboration, and code sandboxes.
- General mastery engines, broad evidence ontologies, multi-step migration graphs, and cross-device state merging.
- A visual no-code composer, plugin platform, full asset pipeline, or analytics warehouse.

These remain product directions, but each must be earned by an approved Grade 6 lesson that cannot be delivered well with the existing runtime.

## Release definition of done

Wave 0 may be marked complete only after its changes are stabilized on one commit and all four gates pass on that same commit. The first usable milestone is complete only when a real Grade 6 lesson is validated, rendered in the app, accessible, resumable offline, synced idempotently, and safely rollable back without changing existing lessons.

No component should be described as shipped until its production renderer is connected to the learner app and the end-to-end milestone passes.

## Living decisions

Record future changes here with date, decision, evidence, and impact. Do not rewrite history.

| Date | Decision | Evidence and impact |
|---|---|---|
| 2026-07-26 | Use `D:\APP BACKUPS\KITABU\kitabu-ai-progressive-release` as the implementation repository | Confirmed target; replaces the earlier `KITABU-v2` assumption |
| 2026-07-26 | Retain `ProgressiveLesson` as sequence owner | Prevents a duplicate lesson graph |
| 2026-07-26 | Treat Wave 0 fixtures/manifests as contract proof, not learner components | Keeps status claims honest |
| 2026-07-26 | Start learner proof with Grade 6 Whole Numbers | Exercises two general components without specialist graphics or model grading |
| 2026-07-26 | Connect the first structured response through the existing lesson/check path | Proves component-scene delivery without a second lesson engine or new endpoint |
| 2026-07-26 | Store immutable bundles and move an audited channel pointer | Enables server-side content releases and rollback without Play Store publication |
