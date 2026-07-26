import { adaptStructuredResponseCompletion } from '../src/features/interactiveLearning/eventAdapter';

const completion = {
  response: ' 42 ',
  clientEventId: 'client-event-7',
  isCorrect: true,
};

const context = {
  sessionId: 'session-1',
  sceneId: 'scene-1',
  attemptId: 'attempt-1',
  componentId: 'structured-response',
  sequence: 7,
  clientTimestamp: '2026-07-26T16:00:01.000Z',
  versions: {
    bundleId: 'bundle-1',
    bundleVersion: '1.0.0',
    sceneVersion: '1.0.0',
    componentVersion: '1.0.0',
    graderId: 'sealed-answer',
    graderVersion: '1.0.0',
  },
  claimId: 'claim-1',
  completionRuleId: 'submit-once',
  scorerId: 'deterministic-scorer',
  scorerVersion: '1.0.0',
  responseLatencyMs: 1250,
  retentionPolicyId: 'learner-submissions',
  retentionPolicyVersion: '1.0.0',
  evidenceRetentionPolicyId: 'learning-evidence',
  evidenceRetentionPolicyVersion: '1.0.0',
};

test('preserves the progressive response string and client event identity', () => {
  const adapted = adaptStructuredResponseCompletion(completion, context);

  expect(adapted.progressive).toEqual({
    clientEventId: 'client-event-7',
    response: ' 42 ',
    responseLatencyMs: 1250,
  });
  expect(adapted.event.eventId).toBe(adapted.progressive.clientEventId);
  expect(adapted.event.payload.response).toBe(adapted.progressive.response);
});

test('creates traceable, version-pinned answer evidence', () => {
  const adapted = adaptStructuredResponseCompletion(completion, context);

  expect(adapted.evidence.sourceEventIds).toEqual([adapted.event.eventId]);
  expect(adapted.evidence.claim).toEqual({
    claimId: 'claim-1',
    evidenceType: 'answer',
    polarity: 'supports',
    strength: 1,
    confidence: 1,
    data: { correct: true },
  });
  expect(adapted.evidence.pins).toMatchObject({
    bundleId: 'bundle-1',
    sceneId: 'scene-1',
    componentId: 'structured-response',
    sessionId: 'session-1',
    attemptId: 'attempt-1',
  });
});

test('maps an incorrect completion to contradicting evidence', () => {
  const adapted = adaptStructuredResponseCompletion(
    { ...completion, isCorrect: false },
    context,
  );

  expect(adapted.evidence.claim.polarity).toBe('contradicts');
  expect(adapted.evidence.claim.data.correct).toBe(false);
});

test('is deterministic and does not synthesize identity or timestamps', () => {
  expect(adaptStructuredResponseCompletion(completion, context)).toEqual(
    adaptStructuredResponseCompletion(completion, context),
  );
});
