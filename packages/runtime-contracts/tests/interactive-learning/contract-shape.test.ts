import assert from 'node:assert/strict';
import test from 'node:test';

import {
  INTERACTIVE_LEARNING_PROTOCOL_VERSION,
  type EvidencePayload,
  type GraderReference,
  type LoadRequest,
  type MessageEnvelope,
  type RuntimeContext,
  type SceneDefinition,
} from '../../src/interactive-learning/contract.ts';

type RuntimeOnlySceneKey =
  | 'locale'
  | 'capabilities'
  | 'accessibility'
  | 'sessionId'
  | 'attemptId'
  | 'restore'
  | 'restoreState';

const authoredSceneExcludesRuntimeFields: RuntimeOnlySceneKey extends keyof SceneDefinition
  ? false
  : true = true;

const graderReferenceExcludesLearnerVisibleConfig: 'config' extends keyof GraderReference
  ? false
  : true = true;

const scene: SceneDefinition<{ mode: string }> = {
  identity: {
    sceneId: 'g6-whole-numbers-place-value',
    schemaVersion: '1.0.1',
  },
  component: {
    componentId: 'structured-response',
    componentVersion: '1.0.0',
  },
  purpose: 'practice',
  prompt: { default: 'What is the value of 7 in 374,219?' },
  props: { mode: 'numeric' },
  evidenceClaims: [
    {
      claimId: 'place-value-total-value',
      description: { default: 'Finds the total value of a digit.' },
      evidenceTypes: ['answer'],
    },
  ],
  completion: {
    completionRuleId: 'submit-once',
    kind: 'submitted',
  },
  tutorPermissions: [],
  assets: { manifestId: 'g6-whole-numbers-assets-v1', assets: [] },
  attemptPolicy: {
    maxAttempts: 2,
    feedbackTiming: 'on-submit',
    revealAnswer: 'after-completion',
  },
};

const runtime: RuntimeContext = {
  identity: { sessionId: 'session-1', attemptId: 'attempt-1' },
  locale: 'en-KE',
  capabilities: {
    tiers: ['lite'],
    renderers: ['native'],
    online: false,
  },
  accessibility: { reducedMotion: true, inputMode: 'touch' },
};

test('authored scenes contain reusable content but no learner or device context', () => {
  assert.equal(authoredSceneExcludesRuntimeFields, true);
  assert.equal(graderReferenceExcludesLearnerVisibleConfig, true);
  assert.equal('locale' in scene, false);
  assert.equal('capabilities' in scene, false);
  assert.equal('accessibility' in scene, false);
  assert.equal('attemptId' in scene, false);
  assert.equal('restore' in scene, false);
  assert.equal('restoreState' in scene, false);
});

test('load requests add runtime context and optional restore outside the authored scene', () => {
  const request: LoadRequest<{ mode: string }> = { scene, runtime };

  assert.equal(request.scene.identity.sceneId, 'g6-whole-numbers-place-value');
  assert.equal(request.runtime.identity.attemptId, 'attempt-1');
  assert.equal(request.restore, undefined);
});

test('event and evidence identities provide an auditable source chain', () => {
  const interactionEventId = 'event-interaction-1';
  const evidence: EvidencePayload = {
    evidenceId: 'evidence-1',
    claimId: 'place-value-total-value',
    evidenceType: 'answer',
    polarity: 'supports',
    strength: 1,
    sourceEventIds: [interactionEventId],
    scorer: {
      id: 'exact-number',
      version: '1.0.0',
      kind: 'deterministic',
    },
  };
  const envelope: MessageEnvelope<'EVIDENCE', EvidencePayload> = {
    eventId: 'event-evidence-1',
    type: 'EVIDENCE',
    protocolVersion: INTERACTIVE_LEARNING_PROTOCOL_VERSION,
    sessionId: runtime.identity.sessionId,
    sceneId: scene.identity.sceneId,
    attemptId: runtime.identity.attemptId,
    componentId: scene.component.componentId,
    sequence: 2,
    idempotencyKey: 'evidence-1',
    clientTimestamp: '2026-07-26T16:00:00.000Z',
    versions: {
      bundleId: 'kenya-grade-6-mathematics',
      bundleVersion: '1.0.0',
      sceneVersion: '1.0.0',
      componentVersion: scene.component.componentVersion,
      graderId: 'exact-number',
      graderVersion: '1.0.0',
    },
    privacy: {
      privacyClass: 'ordinary-learning-event',
      retentionPolicyId: 'learning-evidence-default',
      retentionPolicyVersion: '1.0.0',
    },
    payload: evidence,
  };

  assert.equal(envelope.eventId, 'event-evidence-1');
  assert.equal(envelope.attemptId, 'attempt-1');
  assert.equal(envelope.payload.evidenceId, 'evidence-1');
  assert.deepEqual(envelope.payload.sourceEventIds, [interactionEventId]);
});
