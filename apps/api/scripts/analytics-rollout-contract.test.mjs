import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = new URL('../../../', import.meta.url);
const read = relative => readFileSync(new URL(relative, root), 'utf8');

test('analytics provider configuration keeps public IDs and server secrets separate', () => {
  const web = read('apps/web/analytics-config.js');
  const env = read('apps/api/.env.example');
  assert.match(web, /metaPixelId:\s*'1385983863052002'/);
  assert.match(web, /tiktokPixelCode:\s*'DA31J43C77U41MKSOLRG'/);
  assert.match(web, /ga4MeasurementId:\s*'G-51LWM65FP4'/);
  assert.doesNotMatch(web, /access[_-]?token|api[_-]?secret|KITABU_POSTHOG_KEY/i);
  for (const key of [
    'KITABU_POSTHOG_KEY',
    'KITABU_META_CAPI_ACCESS_TOKEN',
    'KITABU_TIKTOK_EVENTS_ACCESS_TOKEN',
    'KITABU_GA4_API_SECRET'
  ]) assert.match(env, new RegExp(`^${key}=`, 'm'));
  assert.match(env, /server-only/i);
});

test('analytics migrations are ordered and preserve delivery foreign-key safety', () => {
  const names = [
    'apps/api/sql/100_full_funnel_analytics.sql',
    'apps/api/sql/101_analytics_consent_states.sql',
    'apps/api/sql/102_analytics_delivery_leases.sql',
    'apps/api/sql/103_analytics_inactivity_state.sql'
  ];
  const sql = names.map(read);
  assert.match(sql[0], /CREATE TABLE IF NOT EXISTS analytics_events/);
  assert.match(sql[1], /CREATE TABLE IF NOT EXISTS analytics_consent_states/);
  assert.match(sql[2], /ALTER TABLE analytics_event_deliveries/);
  assert.match(sql[3], /CREATE TABLE IF NOT EXISTS analytics_inactivity_states/);
  assert.match(sql[0], /REFERENCES analytics_events\(event_id\) ON DELETE CASCADE/);
  assert.match(sql[1], /REFERENCES users\(id\) ON DELETE CASCADE/);
  assert.match(sql[3], /REFERENCES users\(id\) ON DELETE CASCADE/);
  assert.match(sql[2], /ADD COLUMN IF NOT EXISTS next_attempt_at/);
});

test('native AppsFlyer configuration is environment-fed and not hardcoded', () => {
  const config = read('native-app/app.config.js');
  const docs = read('native-app/README.md');
  assert.match(config, /KITABU_APPSFLYER_DEV_KEY/);
  assert.match(docs, /manualStart/);
  assert.match(docs, /AD_ID/);
  assert.doesNotMatch(config, /DA31J43C77U41MKSOLRG|1385983863052002|G-[A-Z0-9]+/);
});
