import { localCalendarDay, shouldPlayStudentWelcomeCue } from './studentWelcomeCue';

describe('student welcome cue daily gate', () => {
  const morning = new Date(2026, 7, 10, 8, 15);

  it('uses the device local calendar day', () => {
    expect(localCalendarDay(morning)).toBe('2026-08-10');
    expect(shouldPlayStudentWelcomeCue('2026-08-09', morning)).toBe(true);
    expect(shouldPlayStudentWelcomeCue('2026-08-10', morning)).toBe(false);
  });

  it('allows the cue again after local midnight', () => {
    expect(shouldPlayStudentWelcomeCue('2026-08-10', new Date(2026, 7, 11, 0, 1))).toBe(true);
  });
});
