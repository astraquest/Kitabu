# ADR: Interactive Learning Runtime Host

- **Status:** Accepted
- **Date:** 2026-07-26

## Decision

Wave 0 will introduce a small, UI-independent `runtime-contracts` package that owns the component registry loader, scene validation, event and evidence envelopes, tutor-intervention dispatch contracts, snapshots and migrations, capability negotiation, asset manifests, and their shared test harness.

The existing `ProgressiveLesson` model remains the owner of lesson order, progression, and completion. A component scene is the interactive content of a lesson step; it does not form a second lesson or scene graph.

API and native-app adapters will be added only when the core contracts are proven. They will translate existing Kitabu models and transport boundaries without moving product logic into the contracts package.

Wave 0 will not add learning-component UI, database tables or migrations. If an acceptance criterion cannot be met without either, implementation stops and records the conflict for an explicit follow-up decision.

## Consequences

- Existing lessons continue to work while the runtime is introduced incrementally.
- Server-authored scenes can be validated against one shared contract before delivery and again on-device.
- Runtime code stays deterministic, portable, and straightforward to test.
- UI, persistence, authoring tools, and individual learning components remain separate follow-up work.
- No competing scene graph, event-sourcing platform, or generalized plugin framework may be introduced in Wave 0.
