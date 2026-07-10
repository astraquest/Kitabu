const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(value?: string | null): Date | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** "Mon 13 Jul" (adds the year when it differs from the current one). */
export function formatFriendlyDate(value?: string | null): string {
  const date = parseDate(value);
  if (!date) {
    return value ?? '';
  }
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString('en-KE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

/** "Due today" / "Due tomorrow" / "Due Mon 13 Jul" / "Overdue · Mon 6 Jul". */
export function formatDueLabel(value?: string | null): { label: string; overdue: boolean } {
  const date = parseDate(value);
  if (!date) {
    return { label: 'No due date', overdue: false };
  }
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const dayDiff = Math.floor((date.getTime() - startOfToday.getTime()) / DAY_MS);
  if (dayDiff < 0) {
    return { label: `Overdue · ${formatFriendlyDate(value)}`, overdue: true };
  }
  if (dayDiff === 0) {
    return { label: 'Due today', overdue: false };
  }
  if (dayDiff === 1) {
    return { label: 'Due tomorrow', overdue: false };
  }
  return { label: `Due ${formatFriendlyDate(value)}`, overdue: false };
}
