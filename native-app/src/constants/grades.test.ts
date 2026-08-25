import {
  completeSubjectSelection,
  requiredSubjectCountForGrade,
  toggleSubjectSelection,
} from './grades';

describe('requiredSubjectCountForGrade', () => {
  test.each([
    ['Grade 1', 7],
    ['Grade 3', 7],
    ['Grade 4', 8],
    ['Grade 6', 8],
    ['Grade 7', 9],
    ['Grade 9', 9],
    ['Grade 10', 7],
    ['Grade 12', 7],
  ])('%s requires %s subjects', (grade, expected) => {
    expect(requiredSubjectCountForGrade(grade)).toBe(expected);
  });

  test.each([undefined, null, '', 'Unknown Grade', 'Grade 13'])(
    'uses the legacy fallback for %s', grade => {
      expect(requiredSubjectCountForGrade(grade)).toBe(5);
    },
  );

  test('allows an onboarding learner to deselect at the exact count before replacing it', () => {
    const selected = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    expect(toggleSubjectSelection(selected, 'g', 7, true)).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(toggleSubjectSelection(selected, 'new', 7, true)).toEqual(selected);
    expect(toggleSubjectSelection(['a', 'b'], 'c', 3, true)).toEqual(['a', 'b', 'c']);
  });

  test('completes legacy selections only from the real curriculum order', () => {
    expect(completeSubjectSelection(['b', 'missing', 'b'], ['a', 'b', 'c', 'd'], 3))
      .toEqual(['b', 'a', 'c']);
  });
});
