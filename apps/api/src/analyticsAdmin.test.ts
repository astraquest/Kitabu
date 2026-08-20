import assert from 'node:assert/strict';
import test from 'node:test';
import { ANALYTICS_GRADE_BAND_SQL, gradeBandForAnalytics } from './analytics.js';
import {
  adminAnalyticsQuerySchema,
  adminFunnelRowsToCsv,
  normalizeAdminAnalyticsDateRange
} from './analyticsAdmin.js';

test('admin query parser accepts bounded dimensions and rejects unknown filters', () => {
  const parsed = adminAnalyticsQuerySchema.parse({ role: 'parent', gradeBand: '4-6', subject: 'Mathematics', format: 'csv' });
  assert.equal(parsed.format, 'csv');
  assert.equal(parsed.gradeBand, '4-6');
  assert.equal(adminAnalyticsQuerySchema.safeParse({ gradeBand: '4–6' }).success, false);
  assert.equal(adminAnalyticsQuerySchema.safeParse({ userId: 'not-allowed' }).success, false);
});

test('grade segmentation has exactly four inclusive bands', () => {
  assert.equal(gradeBandForAnalytics('Grade 1'), '1-3');
  assert.equal(gradeBandForAnalytics('3'), '1-3');
  assert.equal(gradeBandForAnalytics('Grade 4'), '4-6');
  assert.equal(gradeBandForAnalytics(6), '4-6');
  assert.equal(gradeBandForAnalytics('Grade 7'), '7-9');
  assert.equal(gradeBandForAnalytics('9'), '7-9');
  assert.equal(gradeBandForAnalytics('Grade 10'), '10-12');
  assert.equal(gradeBandForAnalytics(12), '10-12');
});

test('invalid, unknown, and non-integral grades do not receive a marketing band', () => {
  for (const value of ['Grade 0', 'Grade 13', 'unknown', 'Grade 3.5', '', null, undefined]) {
    assert.equal(gradeBandForAnalytics(value), undefined, String(value));
  }
  assert.match(ANALYTICS_GRADE_BAND_SQL, /\^\[\^0-9\]\*\[0-9\]\{1,2\}\[\^0-9\]\*\$/);
});

test('admin date ranges default to 30 days and reject ranges over 400 days', () => {
  const now = new Date('2026-08-19T00:00:00.000Z');
  const defaultRange = normalizeAdminAnalyticsDateRange(undefined, undefined, now);
  assert.equal(defaultRange.to.toISOString(), now.toISOString());
  assert.equal(defaultRange.from.toISOString(), '2026-07-20T00:00:00.000Z');
  assert.throws(() => normalizeAdminAnalyticsDateRange(new Date('2025-06-01T00:00:00.000Z'), now, now), /400 days/);
  assert.throws(() => normalizeAdminAnalyticsDateRange(new Date('2026-08-20T00:00:00.000Z'), now, now), /Invalid analytics date range/);
});

test('admin CSV is aggregate-only and escapes formula injection/content delimiters', () => {
  const csv = adminFunnelRowsToCsv([{
    name: 'page_view',
    role: 'parent',
    gradeBand: '4-6',
    subject: 'Mathematics',
    source: 'website',
    platform: 'web',
    campaign: '=HYPERLINK("https://bad.example")',
    planCode: 'monthly,offer',
    events: 4,
    actors: 3
  }]);
  assert.match(csv, /"'=?HYPERLINK/);
  assert.match(csv, /"monthly,offer"/);
  assert.equal(csv.includes('"anonymous_id"'), false);
  assert.equal(csv.includes('"user_id"'), false);
  assert.equal(csv.includes('"grade"'), false);
  assert.equal(csv.includes('"userId"'), false);
  assert.equal(csv.includes('"anonymousId"'), false);
  assert.match(csv, /"gradeBand"/);
  const controlCsv = adminFunnelRowsToCsv([{
    name: 'page_view', role: 'parent', gradeBand: null, subject: '\t=SUM(1,1)', source: 'website', platform: 'web',
    campaign: '\r@bad', planCode: null, events: 1, actors: 1
  }]);
  assert.match(controlCsv, /"'\t=SUM/);
  assert.match(controlCsv, /"'\r@bad"/);
});
