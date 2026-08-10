export const STUDENT_WELCOME_PLAYED_DAY_STORAGE_KEY = 'kitabu_student_welcome_played_day';

export function localCalendarDay(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function shouldPlayStudentWelcomeCue(
  lastPlayedDay: string | null | undefined,
  now: Date = new Date(),
): boolean {
  return lastPlayedDay !== localCalendarDay(now);
}
