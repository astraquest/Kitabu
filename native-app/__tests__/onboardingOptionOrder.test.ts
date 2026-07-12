import { shuffleOptions, stableShuffledOptions } from '../src/utils/onboardingOptionOrder';

describe('onboarding option order', () => {
  test('shuffles a copy without mutating the canonical options', () => {
    const options = ['a', 'b', 'c', 'd'];

    expect(shuffleOptions(options, () => 0)).toEqual(['b', 'c', 'd', 'a']);
    expect(options).toEqual(['a', 'b', 'c', 'd']);
  });

  test('keeps each question order stable for the onboarding session', () => {
    const cache = new Map<string, readonly unknown[]>();
    const options = ['a', 'b', 'c'];
    const first = stableShuffledOptions(cache, 'student-en-goal', options);
    const second = stableShuffledOptions(cache, 'student-en-goal', options);

    expect(second).toBe(first);
    expect(second).toEqual(expect.arrayContaining(options));
  });

  test('stores independent orders for different roles and questions', () => {
    const cache = new Map<string, readonly unknown[]>();
    const options = ['a', 'b', 'c'];

    const studentGoals = stableShuffledOptions(cache, 'student-en-goal', options);
    const parentConcerns = stableShuffledOptions(cache, 'parent-en-concern', options);

    expect(cache.size).toBe(2);
    expect(parentConcerns).not.toBe(studentGoals);
  });
});
