# Kitabu Interactive Learning Living Reference

Status: active implementation authority
Version: 1.3
Updated: 2026-07-27

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
| Interactive 3D specimen proof | Embedded African Monarch learning card implemented with Explore, Identify and Explain modes; not yet a runtime registry component |
| Reusable learning-asset library | `learning-assets/` registry created; African Monarch registered as `specimen.african-monarch.001` v1.0.0 with conditional 3D status |
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
- Maps, production 3D components, simulations, audio assessment, collaboration and code sandboxes remain deferred until a real Grade 6 activity needs them and the standalone proof meets its gates.

## Mobile presentation rules

- Design and verify at 390 × 844 first.
- Keep the asset, activity prompt, answer control and primary actions inside one phone viewport. Core learning must not require page scrolling.
- Show only the words needed for the current action. Put optional explanations in a floating glass-style detail panel.
- Keep touch targets, keyboard access and reduced-motion support intact when compacting the layout.
- Use the same container for lesson and assessment modes so authored content changes without a new app release.

## Interactive specimen content rules

- Specimen introductions and body-part notes use concise first-person language so the subject teaches the learner directly.
- Learner-visible scene definitions contain prompts and assets, but never answers or grading secrets.
- Identification grading crosses a server/API boundary. The standalone prototype's private grading module only simulates that boundary.
- Remote specimen packages use reviewed, versioned and hash-bound procedural img2threejs runtime bundles plus validated manifest, hotspot, camera and activity data. Authored lessons can reference a bundle but cannot inject or modify its JavaScript.
- Voice is a later enhancement using device/browser text-to-speech over the same first-person text. Do not create or manage recorded narration assets for this feature.

## Reusable 3D asset workflow

Use the parallel asset workflow for future interactive specimens:

1. Allocate a grade- and subject-neutral code in `learning-assets/registry.json`; never overwrite a published version.
2. Use the pinned upstream img2threejs v1.4.1 workflow. Prefer multiple matched references when depth, back, underside, asymmetry or attachments matter.
3. Treat generated side/back/turnaround images as synthetic planning evidence, not scientific truth.
4. Assign separate owners for reference generation, subject accuracy, geometry, materials, animation, hotspots, runtime tests and independent review. One owner writes each file or module.
5. Bind inputs by hash, then build the highest-risk articulated or identity-defining part first.
6. Reject billboards, flat cutouts and front-only shells. Require eight final turntable views, connected attachments, back/side/underside detail and a completed geometry audit.
7. Integrate once, test at 390 × 844 first, and verify one-screen operation, reduced-motion support, keyboard/touch access, fallback content, browser errors and measured render cost.
8. Keep conditional proofs out of production until their trusted procedural runtime is bundled, hash-bound and passes strict asset validation.

This saves time through parallel ownership without allowing multiple agents to overwrite the same asset or lowering the quality gates.

## Definition of done

The current programme is complete when the same immutable release passes all runtime, API and native checks; the two Grade 6 components render and restore safely; submissions sync idempotently; incompatible content falls back safely; platform admins can validate, preview, publish and roll back declarative bundles; and the release has a verified recovery path.

## Decision log

| Date | Decision | Reason |
|---|---|---|
| 2026-07-26 | Preserve `ProgressiveLesson` | Prevent duplicate sequencing and progress systems |
| 2026-07-26 | Start with Whole Numbers | Proves reusable input and ordering without specialist graphics |
| 2026-07-26 | Reuse existing attempts, API requests and AsyncStorage | Meets offline/idempotency needs without a new platform layer |
| 2026-07-26 | Require explicit move controls for ranking | Dragging cannot be the only accessible path |
| 2026-07-26 | Standardise parallel, single-owner 3D asset production | Speeds image, model, interaction and QA work while preventing file conflicts |
| 2026-07-26 | Keep the African Monarch proof standalone | Validates the technical approach before adding a production registry component |
| 2026-07-26 | Use one embedded specimen card for Explore, Identify and Explain | Keeps lesson and assessment presentation consistent and reusable |
| 2026-07-26 | Make phone learning a one-screen interaction | Prevents navigation fatigue and keeps the asset, prompt and action visible together |
| 2026-07-26 | Use first-person copy with later device TTS | Creates a conversational learning experience without a recorded-audio pipeline |
| 2026-07-27 | Store reusable assets under stable subject-neutral codes | Lets one object support many grades, subjects and activity types without duplication |
| 2026-07-27 | Pin img2threejs v1.4.1 and extend it with multi-view intake | Uses the latest shipped 1.4.x hardening while addressing single-view hidden-surface limits |
| 2026-07-27 | Fail 3D publication without all-around evidence | Prevents flat or front-only models from being presented as true 3D |
