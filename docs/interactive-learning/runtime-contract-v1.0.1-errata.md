# Kitabu Interactive Learning Runtime Contract v1.0.1 — Errata

Status: **implementation authority for Wave 0**
Supersedes: conflicting statements and examples in Handbook v1.0.0
Scope: contract corrections only; it does not add learning components or a new lesson graph

## Authority order

For Wave 0, implementations must follow this order:

1. Versioned JSON Schemas define accepted data at storage, network, import, and authoring boundaries.
2. Exported TypeScript contracts define compile-time use of data already validated at a boundary.
3. Cross-document semantic validators enforce rules JSON Schema cannot express, including installed component resolution, claim references, fallbacks, asset references, and permission intersections.
4. Conformance tests and fixtures prove the three layers agree.
5. The handbook explains intent only. An example that fails the layers above is invalid; it is not an exception.

Do not silently coerce, drop, or invent fields. A disagreement between an authoritative layer stops publication until the contract is versioned and the disagreement is resolved.

## Authoritative corrections

### 1. The two registries are different

- The **catalogue registry** is planning and discovery data. It may describe proposed or roadmap components and is never executable authority.
- The **installed registry** contains complete, schema-valid manifests for component versions compiled into the current app/runtime.
- Runtime resolution uses the exact `(componentId, componentVersion)` pair from the installed registry. IDs are not aliases and versions are not automatically upgraded.
- Server-authored content may reference only an installed, publishable version. Duplicate pairs, incomplete manifests, and roadmap-only entries fail closed.

### 2. Every runtime message is traceable

- Every event/message envelope requires a globally unique `eventId`, a scope-local `idempotencyKey`, a non-negative monotonic `sequence`, client timestamp, exact attempt/scene/component scope, and bundle/scene/component/grader version pins.
- Sequence order is scoped to `(sessionId, attemptId, sceneId, componentId)`; it is not global.
- Evidence must name its source event IDs. A missing or unknown source event makes evidence invalid.
- Duplicate `eventId` or idempotency key is acknowledged as a duplicate, never applied twice. Equal sequence with different identity is a conflict.
- In-memory duplicate guards are test/runtime helpers only. The host owns durable idempotency.

### 3. Fallbacks are complete scenes, not loose props

- Each fallback must resolve to an installed component version and pass that component's own props schema.
- Fallback asset references, claim references, tutor permissions, and completion/evidence rules receive the same validation as the preferred scene.
- A fallback must preserve every declared required learning claim or explicitly be rejected.
- Self-cycles, multi-node cycles, dangling claims, and unbounded fallback chains are invalid.
- Capability selection follows author-declared order and must report whether a fallback was used. It must never weaken learning or accessibility requirements silently.

### 4. TIP is permission-only and auditable

- A component declares supported tutor actions, valid states, semantic targets, parameter validators, and immutable assistance semantics.
- A scene may remove permissions; it cannot add an action or weaken component validation.
- Every request has an `actionId`. Exactly one applied or rejected result must correlate to it.
- Dispatch order is: validate request, declared action, scene permission, component state, live target, target permission, component-owned parameters, then execution.
- Components—not authored scene data—define whether an action changes assessable state, whether it is undoable, its evidence consequences, and its accessible equivalent.
- Tutor-applied work is always attributed to the tutor and is never eligible as independent learner evidence.

### 5. Snapshots are bound and migrations are explicit

- A snapshot is bound to exact attempt, bundle, scene, component, and state versions. It must not restore across a binding mismatch.
- Components own state migrations. Wave 0 supports one explicit direct migration step only; it does not search or chain a migration graph.
- Missing, ambiguous, or failed migrations deny restoration without mutating the stored snapshot.
- Restore validates structure and binding before migration. A successful migration returns upgraded state; persistence remains a host decision.

### 6. Capability negotiation fails closed

- The host supplies observed renderer, input, device-tier, reduced-motion, connectivity, and offline capabilities.
- The runtime chooses the first fully supported author-declared candidate; device heuristics do not reorder candidates.
- Reduced-motion support and a usable input path are mandatory. Offline selection requires an offline-ready candidate and locally verified assets.
- If no candidate is valid, return a structured rejection with reasons. Do not render a partial or inaccessible interaction.

### 7. Assets are immutable, bounded, and trusted

- Every asset requires a stable ID, absolute URI, kind, allowed MIME type, byte size, lower-case SHA-256, licence, and provenance.
- Hosts enforce allowed schemes/origins, per-asset and bundle budgets, and digest verification before use or offline availability.
- Scene references must resolve within the validated manifest. Undeclared URLs and executable schemes such as `javascript:` are forbidden.
- Raw learner media is not a content asset and must never be embedded in an event, evidence record, or snapshot.

### 8. Privacy is metadata plus host policy

- Every learner submission, evidence record, and snapshot declares a supported privacy class and a versioned server retention-policy reference.
- Raw audio, image, video, biometric, or pose data is stored outside envelopes as opaque blob references.
- The shared contract validates classification and references. Consent, encryption, deletion, access control, regional storage, and retention execution belong to the host/server and cannot be inferred from component props.
- Components receive only the minimum learner data needed for the current scene.

### 9. Secure examinations are a separate trust boundary

- The interactive runtime may render an examination scene, but it is not the authority for exam eligibility, timing, question release, attempt limits, final scoring, or result publication.
- The server is authoritative for exam session state and signed/version-pinned content. Client timestamps, local graders, snapshots, and offline queues are untrusted inputs.
- Tutor interventions, hints, solution reveal, arbitrary fallback, and author preview tooling are disabled unless the server-issued exam policy explicitly permits them.
- Secure-exam delivery requires a separately reviewed host adapter and threat model. Wave 0 contracts must not claim proctoring, tamper resistance, or high-stakes exam security.

## Publication gate

A scene or bundle may be published only when schema validation, installed-registry resolution, component props validation, semantic cross-reference validation, asset policy checks, and the shared conformance harness all pass. Preview must use the same validators. Runtime rejection remains mandatory because published data is not trusted merely because it came from Kitabu's server.

## Intentional non-goals

This errata does not introduce a plugin system, generic event-sourcing platform, migration graph, client-authoritative exam engine, new database, new scene graph, or component implementation. New requirements require a versioned contract change with fixtures and tests.
