import {
  LOWER_PRIMARY_GRADES,
  LOWER_PRIMARY_SUBJECTS,
  SUPPORTED_GRADES,
} from '../src/constants/grades';

describe('Lower Primary curriculum availability', () => {
  it('publishes Grades 1-3 before the existing supported grades', () => {
    expect(LOWER_PRIMARY_GRADES).toEqual(['Grade 1', 'Grade 2', 'Grade 3']);
    expect(SUPPORTED_GRADES.slice(0, 4)).toEqual(['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4']);
  });

  it('exposes only the requested Lower Primary subjects', () => {
    expect(LOWER_PRIMARY_SUBJECTS).toEqual([
      'English',
      'Kiswahili',
      'Mathematics',
      'Environmental',
      'CRE',
      'IRE',
      'Hygiene and Nutrition',
      'Creative Activities',
    ]);
  });
});
