import type { UserNarrationPreferenceRecord } from './repositories.js';

export const STUDENT_WELCOME_TTS_PREFIX = 'Hi ';
export const STUDENT_WELCOME_TTS_SUFFIX = ", welcome back to Kitabu. Let's get started";

export function normalizeStudentFirstName(fullName: string): string {
  return fullName.trim().replace(/\s+/g, ' ').split(' ')[0] ?? '';
}

export function buildStudentWelcomeTtsText(fullName: string): string | null {
  const firstName = normalizeStudentFirstName(fullName);
  return firstName ? `${STUDENT_WELCOME_TTS_PREFIX}${firstName}${STUDENT_WELCOME_TTS_SUFFIX}` : null;
}

export function canServeStudentWelcomeTts(input: {
  roles: readonly string[];
  preference: Pick<UserNarrationPreferenceRecord, 'enabled'> | null;
}): boolean {
  return input.roles.includes('student') && (input.preference === null || input.preference.enabled);
}
