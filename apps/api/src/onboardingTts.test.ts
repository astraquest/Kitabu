import assert from 'node:assert/strict';
import test from 'node:test';

const { getLandingIntroTtsCue, getLandingTtsCue, LANDING_INTRO_TTS_CUES, PARENT_ONBOARDING_TTS_CUES } = await import('./onboardingTts.js');

test('landing TTS resolver exposes only the four curated intro-carousel cues', () => {
  assert.deepEqual(
    LANDING_INTRO_TTS_CUES.map(cue => cue.id),
    ['intro-slide-1', 'intro-slide-2', 'intro-slide-3', 'intro-slide-4']
  );
  assert.equal(getLandingIntroTtsCue('intro-slide-1')?.text, 'Every learner deserves a personal tutor who never gets tired of explaining.');
  assert.equal(getLandingIntroTtsCue('onboarding-role'), null);
});

test('landing TTS resolver exposes landing and parent catalog cue IDs', () => {
  assert.equal(getLandingTtsCue('intro-slide-1')?.text, 'Every learner deserves a personal tutor who never gets tired of explaining.');
  assert.equal(PARENT_ONBOARDING_TTS_CUES.length, 31);
  assert.equal(getLandingTtsCue('parent-role')?.text, 'Are you a parent or a teacher?');
  assert.equal(getLandingTtsCue('parent-role')?.language, undefined);
  assert.equal(getLandingTtsCue('parent-mascot-panda')?.text.includes('Rafiki the Panda'), true);
  assert.equal(getLandingTtsCue('intro-slide-4')?.language, 'sw');
  assert.equal(getLandingTtsCue('arbitrary-user-text'), null);
});
