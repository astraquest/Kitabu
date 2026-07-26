import assert from 'node:assert/strict';
import test from 'node:test';

import type { SceneDefinition } from '../../src/interactive-learning/contract.ts';
import {
  type ComponentSceneLike,
  type RegisteredComponentLike,
  type SceneValidationDependencies,
  type ValidationResult,
  validateComponentScene,
} from '../../src/interactive-learning/validation.ts';

const component: RegisteredComponentLike = {
  componentId: 'structured-response',
  componentVersion: '1.0.0',
  stateSchemaVersion: '1.0.0',
  capabilityTiers: ['lite', 'interactive'],
  supportedTutorActions: ['highlight', 'requestExplanation'],
  evidenceTypes: ['answer', 'explanation'],
};

const fallbackComponent: RegisteredComponentLike = {
  componentId: 'text-response',
  componentVersion: '1.0.0',
  stateSchemaVersion: '1.0.0',
  capabilityTiers: ['lite'],
  supportedTutorActions: ['highlight'],
  evidenceTypes: ['answer'],
};

function scene(
  sceneId: string,
  selectedComponent: RegisteredComponentLike = component,
): ComponentSceneLike {
  return {
    identity: { sceneId, schemaVersion: '1.0.1' },
    component: {
      componentId: selectedComponent.componentId,
      componentVersion: selectedComponent.componentVersion as `${number}.${number}.${number}`,
    },
    purpose: 'practice',
    prompt: { default: 'Answer the question.' },
    props: { answerType: 'number' },
    evidenceClaims: [{
      claimId: 'answer-claim',
      description: { default: 'The learner answers correctly.' },
      evidenceTypes: ['answer'],
    }],
    completion: {
      completionRuleId: 'answer-complete',
      kind: 'evidence-claims-met',
      requiredClaimIds: ['answer-claim'],
    },
    grader: { graderId: 'grade-6-answer', graderVersion: '1.0.0', mode: 'exact' },
    attemptPolicy: {
      maxAttempts: 3,
      feedbackTiming: 'on-submit',
      revealAnswer: 'after-completion',
    },
    tutorPermissions: [{ action: 'highlight', learnerCanUndo: true }],
    assets: {
      manifestId: `${sceneId}-assets`,
      assets: [{
        assetId: 'diagram',
        uri: 'https://cdn.kitabu.ai/diagram.svg',
        mimeType: 'image/svg+xml',
        licenseId: 'kitabu-owned',
        provenance: ['Kitabu'],
      }],
    },
    deterministicSeed: 'seed-1',
  };
}

const primaryScene = (): ComponentSceneLike => ({
  ...scene('grade-6-math-1'),
  fallback: { sceneId: 'grade-6-math-1-lite', preservesClaimIds: ['answer-claim'] },
});
const fallbackScene = (): ComponentSceneLike => scene('grade-6-math-1-lite', fallbackComponent);

function propsResult(props: unknown): ValidationResult<unknown> {
  const answerType = typeof props === 'object' && props !== null
    ? (props as { answerType?: unknown }).answerType
    : undefined;
  return answerType === 'number'
    ? { ok: true, value: props }
    : {
        ok: false,
        issues: [{ code: 'props.answer_type', message: 'answerType must be number', path: ['answerType'] }],
      };
}

let resolvedFallback: unknown = fallbackScene();
const dependencies: SceneValidationDependencies<ComponentSceneLike> = {
  structuralValidator: (input) => ({ ok: true, value: input as ComponentSceneLike }),
  findComponent: (componentId, componentVersion) =>
    [component, fallbackComponent].find((item) =>
      item.componentId === componentId && item.componentVersion === componentVersion),
  findScene: () => resolvedFallback,
  validateProps: (_registeredComponent, props) => propsResult(props),
  validateAsset: (asset) => asset.sha256 === 'bad-hash'
    ? {
        ok: false,
        issues: [{ code: 'asset.hash', message: 'Asset hash is invalid', path: ['sha256'] }],
      }
    : { ok: true, value: asset },
};

function issueCodes(result: ReturnType<typeof validateComponentScene>): string[] {
  assert.equal(result.ok, false);
  return result.ok ? [] : result.issues.map((item) => item.code);
}

test('accepts a nested registry-backed scene and its complete external fallback scene', () => {
  const value = primaryScene();
  resolvedFallback = fallbackScene();
  assert.deepEqual(validateComponentScene(value, dependencies), { ok: true, value });
});

test('returns structural failures before running semantic validation', () => {
  let componentLookupCalled = false;
  const result = validateComponentScene({}, {
    ...dependencies,
    structuralValidator: () => ({
      ok: false,
      issues: [{ code: 'scene.invalid', message: 'Invalid scene.', path: [] }],
    }),
    findComponent: () => {
      componentLookupCalled = true;
      return component;
    },
  });
  assert.deepEqual(issueCodes(result), ['scene.invalid']);
  assert.equal(componentLookupCalled, false);
});

test('rejects an unknown exact component version without silently upgrading it', () => {
  const value = primaryScene();
  value.component.componentVersion = '2.0.0';
  assert.ok(issueCodes(validateComponentScene(value, dependencies)).includes('component.not_registered'));
});

test('validates props on both complete scenes at their authored paths', () => {
  const value = primaryScene();
  value.props = { answerType: 'essay' };
  const invalidFallback = fallbackScene();
  invalidFallback.props = {};
  resolvedFallback = invalidFallback;

  const result = validateComponentScene(value, dependencies);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.deepEqual(
      result.issues.filter((item) => item.code === 'props.answer_type').map((item) => item.path),
      [['props', 'answerType'], ['fallback', 'props', 'answerType']],
    );
  }
});

test('rejects missing fallback scenes and claims not represented by both scenes', () => {
  const value = primaryScene();
  value.fallback = {
    sceneId: 'grade-6-math-1-lite',
    preservesClaimIds: ['missing-primary', 'answer-claim'],
  };
  resolvedFallback = undefined;
  assert.ok(issueCodes(validateComponentScene(value, dependencies)).includes('fallback.scene_not_found'));

  const incompleteFallback = fallbackScene();
  incompleteFallback.evidenceClaims = [];
  resolvedFallback = incompleteFallback;
  const codes = issueCodes(validateComponentScene(value, dependencies));
  assert.ok(codes.includes('fallback.unknown_primary_claim'));
  assert.ok(codes.includes('fallback.unpreserved_claim'));
});

test('rejects duplicate and dangling claims plus unsupported evidence and tutor actions', () => {
  const value = primaryScene();
  value.evidenceClaims = [
    ...value.evidenceClaims,
    {
      claimId: 'answer-claim',
      description: { default: 'Duplicate.' },
      evidenceTypes: ['observation'],
    },
  ];
  value.completion.requiredClaimIds = ['missing-claim'];
  value.tutorPermissions = [{ action: 'focusCamera', learnerCanUndo: false }];
  resolvedFallback = fallbackScene();

  const codes = issueCodes(validateComponentScene(value, dependencies));
  assert.ok(codes.includes('claim.duplicate_id'));
  assert.ok(codes.includes('completion.unknown_claim'));
  assert.ok(codes.includes('evidence_type.not_supported'));
  assert.ok(codes.includes('tutor_action.not_supported'));
});

test('rejects duplicate asset IDs, JavaScript URIs, and asset-validator failures', () => {
  const value = primaryScene();
  const asset = value.assets.assets[0];
  value.assets.assets = [
    { ...asset, assetId: 'unsafe', uri: ' javascript:alert(1)' },
    { ...asset, assetId: 'unsafe', sha256: 'bad-hash' },
  ];
  resolvedFallback = fallbackScene();

  const codes = issueCodes(validateComponentScene(value, dependencies));
  assert.ok(codes.includes('asset.duplicate_id'));
  assert.ok(codes.includes('asset.unsafe_uri'));
  assert.ok(codes.includes('asset.hash'));
});

test('uses the canonical SceneDefinition contract without a parallel flat shape', () => {
  const value: SceneDefinition = primaryScene();
  assert.equal(validateComponentScene(value, dependencies).ok, true);
});

test('requires explicit grader and complete attempt policy for learner-evaluated scenes', () => {
  const value = primaryScene();
  delete value.grader;
  value.attemptPolicy = { maxAttempts: 2 };
  resolvedFallback = fallbackScene();

  const codes = issueCodes(validateComponentScene(value, dependencies));
  assert.ok(codes.includes('grader.required'));
  assert.equal(codes.filter((code) => code === 'attempt_policy.incomplete').length, 2);
});

test('rejects exposed grader implementation details after permissive structural parsing', () => {
  const value = primaryScene();
  value.grader = {
    graderId: 'grade-6-answer',
    graderVersion: '1.0.0',
    mode: 'exact',
    config: { correctAnswer: 700_000 },
  };
  resolvedFallback = fallbackScene();

  assert.ok(issueCodes(validateComponentScene(value, dependencies)).includes('grader.not_opaque'));
});

test('rejects a self-referencing fallback with an actionable cycle path', () => {
  const value = scene('self-cycle');
  value.fallback = { sceneId: 'self-cycle', preservesClaimIds: ['answer-claim'] };
  const result = validateComponentScene(value, {
    ...dependencies,
    findScene: () => value,
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    const cycle = result.issues.find((item) => item.code === 'fallback.cycle');
    assert.deepEqual(cycle?.path, ['fallback', 'sceneId']);
    assert.match(cycle?.message ?? '', /self-cycle -> self-cycle/);
  }
});

test('rejects a two-scene fallback cycle at the edge that closes the loop', () => {
  const first = scene('cycle-a');
  const second = scene('cycle-b');
  first.fallback = { sceneId: 'cycle-b', preservesClaimIds: ['answer-claim'] };
  second.fallback = { sceneId: 'cycle-a', preservesClaimIds: ['answer-claim'] };
  const scenes = new Map([[first.identity.sceneId, first], [second.identity.sceneId, second]]);
  const result = validateComponentScene(first, {
    ...dependencies,
    findScene: (sceneId) => scenes.get(sceneId),
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    const cycle = result.issues.find((item) => item.code === 'fallback.cycle');
    assert.deepEqual(cycle?.path, ['fallback', 'fallback', 'sceneId']);
    assert.match(cycle?.message ?? '', /cycle-a -> cycle-b -> cycle-a/);
  }
});
