import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createTutorInterventionDispatcher,
  type TutorActionDescriptor,
} from '../../src/interactive-learning/tip.ts';

const highlightDescriptor = (): TutorActionDescriptor<{ color: string }> => ({
  action: 'highlight',
  permittedStates: ['ready.active'],
  acceptsTarget: (targetId) => targetId.startsWith('term-'),
  validateParameters: (parameters) => {
    if (
      typeof parameters === 'object' &&
      parameters !== null &&
      'color' in parameters &&
      typeof parameters.color === 'string'
    ) {
      return { ok: true, value: { color: parameters.color } };
    }
    return { ok: false, message: 'color is required' };
  },
  assistanceEffect: {
    kind: 'attention',
    changesAssessableState: false,
    learnerMayUndo: false,
    evidenceConsequences: ['Record highlight as tutor assistance.'],
    accessibilityEquivalent: 'Announce the highlighted term.',
  },
});

const request = {
  actionId: 'tip-action-1',
  action: 'highlight' as const,
  targetId: 'term-numerator',
  parameters: { color: 'accent' },
};

const context = {
  componentState: 'ready.active',
  availableTargetIds: new Set(['term-numerator', 'other-target']),
  scenePermittedActions: ['highlight'] as const,
};

test('applies a declared and scene-permitted action with validated parameters', () => {
  const calls: unknown[] = [];
  const dispatcher = createTutorInterventionDispatcher(
    [highlightDescriptor()],
    (action, targetId, parameters) => {
      calls.push({ action, targetId, parameters });
      return { changed: true };
    },
  );

  const result = dispatcher.dispatch(request, context);

  assert.equal(result.status, 'applied');
  assert.deepEqual(calls, [
    {
      action: 'highlight',
      targetId: 'term-numerator',
      parameters: { color: 'accent' },
    },
  ]);
  if (result.status === 'applied') {
    assert.deepEqual(result.result, { changed: true });
    assert.equal(result.assistance.attribution, 'tutor');
    assert.equal(result.assistance.independentEvidenceEligible, false);
    assert.equal(result.assistance.changesAssessableState, false);
  }
});

test('rejects an action restricted by the scene without executing it', () => {
  let executed = false;
  const dispatcher = createTutorInterventionDispatcher(
    [highlightDescriptor()],
    () => {
      executed = true;
    },
  );

  const result = dispatcher.dispatch(request, {
    ...context,
    scenePermittedActions: [],
  });

  assert.equal(result.status, 'rejected');
  if (result.status === 'rejected') {
    assert.equal(result.code, 'action-not-permitted-by-scene');
  }
  assert.equal(executed, false);
});

test('rejects an action the component does not declare', () => {
  const dispatcher = createTutorInterventionDispatcher([], () => undefined);
  const result = dispatcher.dispatch(request, context);

  assert.equal(result.status, 'rejected');
  if (result.status === 'rejected') {
    assert.equal(result.code, 'action-not-declared');
  }
});

test('rejects an action outside its permitted component state', () => {
  const dispatcher = createTutorInterventionDispatcher(
    [highlightDescriptor()],
    () => undefined,
  );
  const result = dispatcher.dispatch(request, {
    ...context,
    componentState: 'completed',
  });

  assert.equal(result.status, 'rejected');
  if (result.status === 'rejected') {
    assert.equal(result.code, 'state-not-permitted');
  }
});

test('distinguishes missing targets from component-disallowed targets', () => {
  const dispatcher = createTutorInterventionDispatcher(
    [highlightDescriptor()],
    () => undefined,
  );

  const missing = dispatcher.dispatch(
    { ...request, targetId: 'term-denominator' },
    context,
  );
  assert.equal(missing.status, 'rejected');
  if (missing.status === 'rejected') assert.equal(missing.code, 'target-not-found');

  const disallowed = dispatcher.dispatch(
    { ...request, targetId: 'other-target' },
    context,
  );
  assert.equal(disallowed.status, 'rejected');
  if (disallowed.status === 'rejected') {
    assert.equal(disallowed.code, 'target-not-permitted');
  }
});

test('rejects invalid parameters and does not call the handler', () => {
  let executed = false;
  const dispatcher = createTutorInterventionDispatcher(
    [highlightDescriptor()],
    () => {
      executed = true;
    },
  );
  const result = dispatcher.dispatch(
    { ...request, parameters: { shade: 3 } },
    context,
  );

  assert.equal(result.status, 'rejected');
  if (result.status === 'rejected') {
    assert.equal(result.code, 'invalid-parameters');
    assert.equal(result.message, 'color is required');
  }
  assert.equal(executed, false);
});

test('rejects handler failures without exposing the thrown error', () => {
  const dispatcher = createTutorInterventionDispatcher(
    [highlightDescriptor()],
    () => {
      throw new Error('secret implementation detail');
    },
  );
  const result = dispatcher.dispatch(request, context);

  assert.equal(result.status, 'rejected');
  if (result.status === 'rejected') {
    assert.equal(result.code, 'execution-failed');
    assert.equal(result.message.includes('secret'), false);
  }
});

test('rejects duplicate component action descriptors at construction', () => {
  assert.throws(
    () =>
      createTutorInterventionDispatcher(
        [highlightDescriptor(), highlightDescriptor()],
        () => undefined,
      ),
    /Duplicate tutor action descriptor: highlight/,
  );
});

test('correlates both applied and rejected results to the request actionId', () => {
  const dispatcher = createTutorInterventionDispatcher(
    [highlightDescriptor()],
    () => undefined,
  );
  const applied = dispatcher.dispatch(
    { ...request, actionId: 'applied-correlation' },
    context,
  );
  const rejected = dispatcher.dispatch(
    {
      ...request,
      actionId: 'rejected-correlation',
      parameters: undefined,
    },
    context,
  );

  assert.equal(applied.actionId, 'applied-correlation');
  assert.equal(rejected.actionId, 'rejected-correlation');
});
