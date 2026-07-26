import assert from 'node:assert/strict';
import test from 'node:test';

import {
  type RuntimeEnvelope,
  type RuntimeVersionPins,
  validateRuntimeEnvelope,
} from '../../src/interactive-learning/protocol.ts';
import {
  type ComponentSnapshot,
  type SnapshotBinding,
  restoreSnapshot,
} from '../../src/interactive-learning/snapshot.ts';

interface FakeState {
  response: string;
  submitted: boolean;
  sequence: number;
}

interface LifecycleTrace {
  events: RuntimeEnvelope[];
  evidence: RuntimeEnvelope[];
  snapshot: ComponentSnapshot<FakeState>;
}

const versions: RuntimeVersionPins = {
  bundleId: 'kenya-grade-6-mathematics',
  bundleVersion: '1.0.0',
  sceneVersion: '1.0.0',
  componentVersion: '1.0.0',
  graderId: 'exact-whole-number-grader',
  graderVersion: '1.0.0',
};

const binding: SnapshotBinding = {
  attemptId: 'attempt-grade-6-001',
  bundleId: versions.bundleId,
  bundleRevision: 'release-grade-6-mathematics-001',
  sceneId: 'whole-numbers-place-value-001',
  sceneRevision: 'scene-whole-numbers-place-value-001',
  componentId: 'structured-response',
  componentVersion: versions.componentVersion,
  stateVersion: '1.0.0',
};

const checkpoint: ComponentSnapshot<FakeState> = {
  snapshotSchemaVersion: '1.0.1',
  ...binding,
  sequence: 1,
  state: { response: '700000', submitted: false, sequence: 1 },
  savedAt: '2026-07-26T16:00:00.000Z',
};

function envelope(
  sequence: number,
  type: string,
  payload: unknown,
): RuntimeEnvelope {
  return {
    eventId: `event-${sequence}`,
    idempotencyKey: `attempt-grade-6-001:${sequence}:${type}`,
    type: type as RuntimeEnvelope['type'],
    protocolVersion: '1.0.1',
    sessionId: 'session-grade-6-001',
    sceneId: binding.sceneId,
    attemptId: binding.attemptId,
    componentId: binding.componentId,
    sequence,
    clientTimestamp: `2026-07-26T16:00:0${sequence}.000Z`,
    versions,
    privacy: {
      privacyClass: 'ordinary-learning-event',
      retentionPolicyId: 'standard-learning-events',
      retentionPolicyVersion: '1.0.0',
    },
    payload,
  };
}

/** A deliberately small stand-in for a component's deterministic transition. */
function continueLifecycle(state: FakeState): LifecycleTrace {
  const submitted = envelope(state.sequence + 1, 'SUBMITTED', {
    response: state.response,
  });
  const evidence = envelope(state.sequence + 2, 'EVIDENCE', {
    evidenceId: 'evidence-place-value-001',
    claimId: 'identifies-place-value',
    evidenceType: 'answer',
    polarity: state.response === '700000' ? 'supports' : 'contradicts',
    strength: 1,
    sourceEventIds: [submitted.eventId],
    scorer: {
      id: versions.graderId,
      version: versions.graderVersion,
      kind: 'deterministic',
    },
  });
  const completed = envelope(state.sequence + 3, 'COMPLETED', {
    completionRuleId: 'submitted-with-evidence',
  });

  const snapshot: ComponentSnapshot<FakeState> = {
    snapshotSchemaVersion: '1.0.1',
    ...binding,
    sequence: completed.sequence,
    state: { ...state, submitted: true, sequence: completed.sequence },
    savedAt: completed.clientTimestamp,
  };

  return { events: [submitted, evidence, completed], evidence: [evidence], snapshot };
}

function assertAllIdentitiesArePinned(trace: LifecycleTrace): void {
  for (const event of trace.events) {
    assert.equal(validateRuntimeEnvelope(event).ok, true);
    assert.ok(event.eventId);
    assert.ok(event.idempotencyKey);
    for (const [name, value] of Object.entries(event.versions)) {
      assert.ok(value, `${name} must be pinned`);
    }
  }

  for (const field of [
    'attemptId',
    'bundleId',
    'bundleRevision',
    'sceneId',
    'sceneRevision',
    'componentId',
    'componentVersion',
    'stateVersion',
  ] as const) {
    assert.ok(trace.snapshot[field], `snapshot ${field} must be pinned`);
  }
}

test('exact restore reproduces the same event, evidence, and snapshot trace', () => {
  const uninterrupted = continueLifecycle(checkpoint.state);
  const restored = restoreSnapshot<FakeState>(checkpoint, binding);

  assert.equal(restored.ok, true);
  if (!restored.ok) return;

  const resumed = continueLifecycle(restored.state);

  assert.deepEqual(resumed, uninterrupted);
  assertAllIdentitiesArePinned(uninterrupted);
  assertAllIdentitiesArePinned(resumed);
});
