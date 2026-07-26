import assert from 'node:assert/strict';
import test from 'node:test';

import type { SceneDefinition } from '../../src/interactive-learning/contract.ts';
import {
  type ComponentSceneLike,
  type RegisteredComponentLike,
  type SceneValidationDependencies,
  validateComponentScene,
} from '../../src/interactive-learning/validation.ts';

const component: RegisteredComponentLike = {
  componentId: 'structured-response',
  componentVersion: '1.0.0',
  stateSchemaVersion: '1.0.0',
  capabilityTiers: ['lite'],
  supportedTutorActions: [],
  evidenceTypes: ['answer'],
};

function makeScene(sceneId: string, claimId = 'place-value'): SceneDefinition<Record<string, unknown>> {
  return {
    identity: { sceneId, sceneVersion: '1.0.0', schemaVersion: '1.0.1' },
    component: { componentId: component.componentId, componentVersion: '1.0.0' },
    purpose: 'practice',
    prompt: { default: 'What is the value of 7 in 472,105?' },
    props: { answerType: 'number' },
    evidenceClaims: [{
      claimId,
      description: { default: 'Finds the total value of a digit.' },
      evidenceTypes: ['answer'],
    }],
    completion: {
      completionRuleId: 'submitted',
      kind: 'evidence-claims-met',
      requiredClaimIds: [claimId],
    },
    grader: { graderId: 'grade-6-place-value', graderVersion: '1.0.0', mode: 'exact' },
    attemptPolicy: {
      maxAttempts: 3,
      feedbackTiming: 'on-submit',
      revealAnswer: 'after-completion',
    },
    tutorPermissions: [],
    assets: { manifestId: `${sceneId}-assets`, assets: [] },
  };
}

function withFallback(
  scene: ComponentSceneLike,
  targetSceneId: string,
  preservesClaimIds: readonly string[] = ['place-value'],
): ComponentSceneLike {
  return {
    ...scene,
    fallback: { sceneId: targetSceneId, preservesClaimIds: [...preservesClaimIds] },
  };
}

function dependenciesFor(
  scenes: readonly ComponentSceneLike[],
): SceneValidationDependencies<ComponentSceneLike> {
  const scenesById = new Map(scenes.map((scene) => [scene.identity.sceneId, scene]));
  return {
    structuralValidator: (input) => ({ ok: true, value: input as ComponentSceneLike }),
    findComponent: (componentId, componentVersion) =>
      componentId === component.componentId && componentVersion === component.componentVersion
        ? component
        : undefined,
    validateProps: (_registeredComponent, props) =>
      typeof props === 'object' && props !== null && (props as { answerType?: unknown }).answerType === 'number'
        ? { ok: true, value: props }
        : {
            ok: false,
            issues: [{ code: 'props.answer_type', message: 'answerType must be number', path: ['answerType'] }],
          },
    findScene: (sceneId) => scenesById.get(sceneId),
  };
}

function issueCodes(result: ReturnType<typeof validateComponentScene>): string[] {
  assert.equal(result.ok, false);
  return result.ok ? [] : result.issues.map((item) => item.code);
}

test('resolves and validates a complete external fallback scene', () => {
  const fallback = makeScene('grade-6-place-value-lite');
  const primary = withFallback(makeScene('grade-6-place-value'), fallback.identity.sceneId);

  assert.deepEqual(
    validateComponentScene(primary, dependenciesFor([primary, fallback])),
    { ok: true, value: primary },
  );
});

test('rejects a fallback whose target is missing from the published scene set', () => {
  const primary = withFallback(makeScene('grade-6-place-value'), 'missing-lite-scene');

  assert.ok(
    issueCodes(validateComponentScene(primary, dependenciesFor([primary])))
      .includes('fallback.scene_not_found'),
  );
});

test('requires every preserved claim to exist in both the source and target scenes', () => {
  const fallback = makeScene('grade-6-place-value-lite', 'different-claim');
  const primary = withFallback(
    makeScene('grade-6-place-value'),
    fallback.identity.sceneId,
    ['place-value', 'missing-primary-claim'],
  );

  const codes = issueCodes(validateComponentScene(primary, dependenciesFor([primary, fallback])));
  assert.ok(codes.includes('fallback.unknown_primary_claim'));
  assert.ok(codes.includes('fallback.unpreserved_claim'));
});

test('rejects a self-referencing fallback cycle', () => {
  const scene = withFallback(makeScene('grade-6-self-cycle'), 'grade-6-self-cycle');

  assert.ok(
    issueCodes(validateComponentScene(scene, dependenciesFor([scene])))
      .includes('fallback.cycle'),
  );
});

test('rejects a two-scene fallback cycle', () => {
  const first = withFallback(makeScene('grade-6-cycle-a'), 'grade-6-cycle-b');
  const second = withFallback(makeScene('grade-6-cycle-b'), 'grade-6-cycle-a');

  assert.ok(
    issueCodes(validateComponentScene(first, dependenciesFor([first, second])))
      .includes('fallback.cycle'),
  );
});

test('accepts a valid acyclic fallback chain', () => {
  const primary = withFallback(makeScene('grade-6-primary'), 'grade-6-lite');
  const lite = withFallback(makeScene('grade-6-lite'), 'grade-6-minimal');
  const minimal = makeScene('grade-6-minimal');

  assert.deepEqual(
    validateComponentScene(primary, dependenciesFor([primary, lite, minimal])),
    { ok: true, value: primary },
  );
});
