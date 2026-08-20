import { ANALYTICS_GRADE_BANDS, type AnalyticsGradeBand } from './analytics.js';
import { z } from 'zod';

export const ADMIN_ANALYTICS_DEFAULT_RANGE_DAYS = 30;
export const ADMIN_ANALYTICS_MAX_RANGE_DAYS = 400;

export const adminAnalyticsQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  format: z.enum(['json', 'csv']).default('json'),
  role: z.string().trim().min(1).max(40).optional(),
  gradeBand: z.enum(ANALYTICS_GRADE_BANDS).optional(),
  subject: z.string().trim().min(1).max(80).optional(),
  source: z.enum(['website', 'native', 'server']).optional(),
  platform: z.enum(['web', 'ios', 'android', 'server']).optional(),
  campaign: z.string().trim().max(160).optional(),
  planCode: z.string().trim().max(100).optional()
}).strict();

export type AdminAnalyticsDateRange = { from: Date; to: Date };

export function normalizeAdminAnalyticsDateRange(
  from?: Date,
  to?: Date,
  now = new Date()
): AdminAnalyticsDateRange {
  const end = to ?? now;
  const start = from ?? new Date(end.getTime() - ADMIN_ANALYTICS_DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start > end) {
    throw new Error('Invalid analytics date range');
  }
  if (end > new Date(now.getTime() + 24 * 60 * 60 * 1000)) {
    throw new Error('Analytics date range cannot be in the future');
  }
  if (end.getTime() - start.getTime() > ADMIN_ANALYTICS_MAX_RANGE_DAYS * 24 * 60 * 60 * 1000) {
    throw new Error(`Analytics date range cannot exceed ${ADMIN_ANALYTICS_MAX_RANGE_DAYS} days`);
  }
  return { from: start, to: end };
}

export type AdminFunnelRow = {
  name: string;
  role: string;
  gradeBand: AnalyticsGradeBand | null;
  subject: string | null;
  source: string;
  platform: string;
  campaign: string | null;
  planCode: string | null;
  events: number;
  actors: number;
};

const CSV_COLUMNS: Array<keyof AdminFunnelRow> = [
  'name', 'role', 'gradeBand', 'subject', 'source', 'platform', 'campaign', 'planCode', 'events', 'actors'
];

function csvCell(value: unknown) {
  const raw = value === null || value === undefined ? '' : String(value);
  const safe = /^[\t\r\n ]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function adminFunnelRowsToCsv(rows: AdminFunnelRow[]) {
  const header = CSV_COLUMNS.map(column => csvCell(column)).join(',');
  const body = rows.map(row => CSV_COLUMNS.map(column => csvCell(row[column])).join(','));
  return [header, ...body].join('\r\n') + '\r\n';
}

export function isAnalyticsGradeBand(value: string): value is AnalyticsGradeBand {
  return (ANALYTICS_GRADE_BANDS as readonly string[]).includes(value);
}
