# Kitabu Interactive Learning Living Reference

Status: active implementation authority
Version: 1.0
Updated: 2026-07-26

This document is the concise operational index for the Kitabu Interactive Learning Runtime. Detailed decisions remain in `implementation-plan-grade-6.md`, the runtime schemas, TypeScript contracts, fixtures, test matrix, and ADR. When they disagree, schemas and exported contracts win.

## Product objective

Ship the app shell and reusable renderers through the Play Store, then publish compatible, declarative learning scenes from the server without shipping new app code. Remote content may contain validated data and verified assets only—never remote JavaScript, JSX, arbitrary HTML, or grading secrets.

`ProgressiveLesson` owns lesson sequence and progress. Component scenes are reusable step content. There is no second lesson graph.

## Current delivery state

| Capability | State |
|---|---|
| Wave 0 contracts, registry, validation, evidence, TIP, snapshots, capabilities, assets, bundle checks, harness and CLI | Implemented; 160 tests |
| Native `structured-response` numeric and short-text renderer | Implemented |
| Native `classify-sort-match-rank` ranked-list renderer with non-drag controls | Implemented |
| Grade 6 Whole Numbers structured response and ordering activities | Connected to the existing lesson and server grading |
| Local response restore and idempotent offline check queue | Implemented using existing AsyncStorage and attempt APIs |
| Immutable server publishing, local preview, approval, promotion and rollback | Implemented; migration 067 and platform-admin portal |
| Play Store release | Separate delivery operation; implementation is release-ready but not deployed by this programme |

## Required completion path

1. Keep all Wave 0 gates green.
2. Prove both installed renderers in Grade 6 Whole Numbers.
3. Verify accessible input, offline restore, queued sync and exact version rejection.
4. Add the smallest platform-admin workflow: validate, preview, approve immutable bundle, publish pointer and rollback pointer.
5. Run full API, native, runtime and release-readiness checks.
6. Only then prepare a controlled Play Store release.

## Anti-slop gates

- Add no component until a real approved Grade 6 activity needs it.
- Add no new framework, service, database table or dependency when an existing Kitabu primitive satisfies the acceptance criterion.
- Keep answers and grader configuration server-side.
- Reject unknown versions and invalid scenes visibly; never silently reinterpret them.
- Every abstraction needs a current producer, consumer and contract test.
- Maps, 3D, simulations, audio assessment, collaboration and code sandboxes remain deferred until this Grade 6 proof is stable and measured.

## Definition of done

The current programme is complete when the same immutable release passes all runtime, API and native checks; the two Grade 6 components render and restore safely; submissions sync idempotently; incompatible content falls back safely; platform admins can validate, preview, publish and roll back declarative bundles; and the release has a verified recovery path.

## Decision log

| Date | Decision | Reason |
|---|---|---|
| 2026-07-26 | Preserve `ProgressiveLesson` | Prevent duplicate sequencing and progress systems |
| 2026-07-26 | Start with Whole Numbers | Proves reusable input and ordering without specialist graphics |
| 2026-07-26 | Reuse existing attempts, API requests and AsyncStorage | Meets offline/idempotency needs without a new platform layer |
| 2026-07-26 | Require explicit move controls for ranking | Dragging cannot be the only accessible path |
