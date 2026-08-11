import assert from 'node:assert/strict';
import test from 'node:test';

const { getLandingIntroTtsCue, getLandingTtsCue, LANDING_INTRO_TTS_CUES } = await import('./onboardingTts.js');

test('landing TTS resolver exposes only the four curated intro-carousel cues', () => {
  assert.deepEqual(
    LANDING_INTRO_TTS_CUES.map(cue => cue.id),
    ['intro-slide-1', 'intro-slide-2', 'intro-slide-3', 'intro-slide-4']
  );
  assert.equal(getLandingIntroTtsCue('intro-slide-1')?.text, 'Every learner deserves a personal tutor who never gets tired of explaining.');
  assert.equal(getLandingIntroTtsCue('onboarding-role'), null);
});

test('landing TTS resolver exposes only catalog cue IDs, including English onboarding cues', () => {
  assert.equal(getLandingTtsCue('intro-slide-1')?.text, 'Every learner deserves a personal tutor who never gets tired of explaining.');
  assert.equal(getLandingTtsCue('onboarding-role')?.text, 'Who are you?');
  assert.equal(getLandingTtsCue('onboarding-role')?.language, undefined);
  assert.equal(getLandingTtsCue('intro-slide-4')?.language, 'sw');
  assert.equal(getLandingTtsCue('arbitrary-user-text'), null);
});
