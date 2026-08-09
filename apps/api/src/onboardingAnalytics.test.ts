import assert from 'node:assert/strict';
import test from 'node:test';
import { onboardingSelectionEventSchema } from './server.js';

test('keeps legacy onboarding selection payloads valid with selection defaults', () => {
  const parsed = onboardingSelectionEventSchema.parse({
    sessionId: 'onboarding-session',
    stepKey: 'goal',
    optionKey: 'confidence',
    optionLabel: 'Feel more confident in class.'
  });

  assert.equal(parsed.eventType, 'selection');
  assert.equal(parsed.eventVersion, 1);
  assert.equal(parsed.stepIndex, 0);
});

test('bounds funnel event metadata and rejects unknown event types', () => {
  assert.throws(() => onboardingSelectionEventSchema.parse({
    sessionId: 'onboarding-session',
    stepKey: 'goal',
    optionKey: 'view',
    optionLabel: 'Goal',
    eventType: 'unknown'
  }));

  assert.throws(() => onboardingSelectionEventSchema.parse({
    sessionId: 'onboarding-session',
    stepKey: 'goal',
    optionKey: 'view',
    optionLabel: 'Goal',
    eventVersion: 0
  }));

  assert.throws(() => onboardingSelectionEventSchema.parse({
    sessionId: 'onboarding-session',
    stepKey: 'goal',
    optionKey: 'view',
    optionLabel: 'Goal',
    stepIndex: 101
  }));
});
