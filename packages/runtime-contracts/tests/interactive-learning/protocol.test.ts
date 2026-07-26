import assert from 'node:assert/strict';
import test from 'node:test';

import {
  RuntimeEnvelopeDuplicateGuard,
  type RuntimeEnvelope,
  validateEvidenceEnvelope,
  validateRuntimeEnvelope,
} from '../../src/interactive-learning/protocol.ts';

const envelope = (overrides: Partial<RuntimeEnvelope> = {}): RuntimeEnvelope => ({
  eventId: 'event-1',
  idempotencyKey: 'submit-1',
  type: 'SUBMITTED',
  protocolVersion: '1.0.1',
  sessionId: 'session-1',
  sceneId: 'scene-1',
  attemptId: 'attempt-1',
  componentId: 'structured-response',
  sequence: 1,
  clientTimestamp: '2026-07-26T16:00:00.000Z',
  versions: {
    bundleId: 'grade-6-math',
    bundleVersion: '1.0.0',
    sceneVersion: '1.0.0',
    componentVersion: '1.0.0',
    graderId: 'kitabu.sealed-numeric-answer',
    graderVersion: '1.0.0',
  },
  privacy: {
    privacyClass: 'ordinary-learning-event',
    retentionPolicyId: 'learner-records',
    retentionPolicyVersion: '1.0.0',
  },
  payload: { answer: '12' },
  ...overrides,
});

const evidence = () => ({
  schemaVersion: '1.0.1',
  evidenceId: 'evidence-1',
  sourceEventIds: ['event-1'],
  claim: { claimId: 'claim-1', evidenceType: 'answer', polarity: 'supports', strength: 1, confidence: 0.9 },
  scorer: {
    scorerId: 'deterministic-scorer', scorerVersion: '1.0.0', kind: 'deterministic',
    graderId: 'exact-answer', graderVersion: '1.0.0',
  },
  assistance: { level: 0, attribution: 'none', independentEvidenceEligible: true, tutorActionIds: [] },
  privacy: {
    privacyClass: 'ordinary-learning-event',
    retention: { policyId: 'learner-records', policyVersion: '1.0.0' },
  },
  pins: {
    bundleId: 'grade-6-math', bundleVersion: '1.0.0', sceneId: 'scene-1', sceneVersion: '1.0.0',
    componentId: 'structured-response', componentVersion: '1.0.0', sessionId: 'session-1', attemptId: 'attempt-1',
  },
});

test('accepts a complete, version-pinned envelope', () => {
  const candidate = envelope();
  assert.deepEqual(validateRuntimeEnvelope(candidate), { ok: true, value: candidate });
});

test('rejects missing identity and invalid sequence data', () => {
  const result = validateRuntimeEnvelope({
    ...envelope(),
    eventId: '',
    attemptId: '   ',
    sequence: -1,
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.deepEqual(
      result.issues.map((issue) => issue.path),
      ['eventId', 'attemptId', 'sequence'],
    );
  }
});

test('rejects incompatible protocol, grader and retention metadata', () => {
  const candidate = envelope() as unknown as Record<string, unknown>;
  candidate.protocolVersion = '1.0.0';
  candidate.versions = { ...(candidate.versions as object), graderId: '' };
  candidate.privacy = {
    privacyClass: 'ordinary-learning-event',
    retentionPolicyId: 'learner-records',
    retentionPolicyVersion: 'latest',
  };

  const result = validateRuntimeEnvelope(candidate);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.deepEqual(result.issues.map((issue) => issue.path), [
      'protocolVersion',
      'versions.graderId',
      'privacy.retentionPolicyVersion',
    ]);
  }
});

test('accepts traceable, version-pinned independent evidence', () => {
  const candidate = evidence();
  assert.deepEqual(validateEvidenceEnvelope(candidate), { ok: true, value: candidate });
});

test('rejects unbounded and falsely independent assisted evidence', () => {
  const candidate = evidence();
  candidate.claim.strength = 1.1;
  candidate.assistance = {
    level: 1, attribution: 'tutor', independentEvidenceEligible: true, tutorActionIds: ['tip-1'],
  };
  const result = validateEvidenceEnvelope(candidate);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.deepEqual(result.issues.map((issue) => issue.path), [
      'claim.strength',
      'assistance.independentEvidenceEligible',
    ]);
  }
});

test('treats repeated event IDs and scoped idempotency keys as duplicates', () => {
  const guard = new RuntimeEnvelopeDuplicateGuard();
  assert.deepEqual(guard.accept(envelope()), { accepted: true, status: 'accepted' });
  assert.deepEqual(guard.accept(envelope()), {
    accepted: false,
    status: 'duplicate',
    originalEventId: 'event-1',
  });
  assert.deepEqual(
    guard.accept(envelope({ eventId: 'event-2', sequence: 2 })),
    { accepted: false, status: 'duplicate', originalEventId: 'event-1' },
  );
});

test('distinguishes sequence conflicts from stale sequence numbers', () => {
  const guard = new RuntimeEnvelopeDuplicateGuard();
  assert.equal(guard.accept(envelope({ sequence: 2 })).accepted, true);

  assert.deepEqual(
    guard.accept(
      envelope({
        eventId: 'event-conflict',
        idempotencyKey: 'submit-conflict',
        sequence: 2,
      }),
    ),
    { accepted: false, status: 'sequence-conflict', originalEventId: 'event-1' },
  );
  assert.deepEqual(
    guard.accept(
      envelope({
        eventId: 'event-stale',
        idempotencyKey: 'submit-stale',
        sequence: 1,
      }),
    ),
    { accepted: false, status: 'stale-sequence', latestSequence: 2 },
  );
});
