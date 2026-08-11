import type { AuthenticatedUser } from './types.js';

export const DAILY_STUDENT_WELCOME_TEXT = (firstName: string) =>
  `Hi ${firstName}, welcome back to Kitabu. Let’s get started.`;

const LOCAL_DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function extractFirstName(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const normalized = value
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f]/gu, '')
    .trim()
    .replace(/\s+/gu, ' ');
  const firstName = normalized.split(' ')[0] ?? '';
  return firstName.length > 0 && firstName.length <= 80 ? firstName : null;
}

export function buildDailyStudentWelcomeText(value: unknown): string | null {
  const firstName = extractFirstName(value);
  return firstName ? DAILY_STUDENT_WELCOME_TEXT(firstName) : null;
}

export function isValidLocalDateKey(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = LOCAL_DATE_KEY_PATTERN.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

export function getLocalCalendarDateKey(date = new Date()): string {
  const year = date.getFullYear().toString().padStart(4, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isStudentDailyWelcomeUser(
  user: Pick<AuthenticatedUser, 'roles'> | null | undefined,
): boolean {
  return Boolean(user?.roles.includes('student'));
}
