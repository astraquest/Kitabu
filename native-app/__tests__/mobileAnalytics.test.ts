import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchKitabuApi } from '../src/services/runtimeConfig';

jest.mock('../src/services/runtimeConfig', () => ({
  fetchKitabuApi: jest.fn(() => Promise.resolve({
    ok: true,
    text: () => Promise.resolve(JSON.stringify({ accepted: false })),
  })),
}));

import {
  associateMobileAnalyticsUser,
  getMobileAnalyticsConsent,
  initializeMobileAnalytics,
  mobileAnalytics,
  resetMobileAnalyticsForTests,
  setMobileAnalyticsConsent,
  setMobileInstallAttribution,
  trackMobileAnalytics,
  updateMobileAnalyticsContext,
} from '../src/services/mobileAnalytics';

const values = new Map<string, string>();

beforeEach(() => {
  values.clear();
  resetMobileAnalyticsForTests();
  (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => Promise.resolve(values.get(key) ?? null));
  (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
    values.set(key, value);
    return Promise.resolve();
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation((key: string) => {
    values.delete(key);
    return Promise.resolve();
  });
  (AsyncStorage.getAllKeys as jest.Mock).mockImplementation(() => Promise.resolve(Array.from(values.keys())));
});

afterEach(() => {
  jest.clearAllMocks();
});

function readJson<T>(key: string): T {
  return JSON.parse(values.get(key) || 'null') as T;
}

test('does not persist identifiers, attribution, or queue before analytics consent', async () => {
  await initializeMobileAnalytics({ role: 'student' });
  await setMobileInstallAttribution({ utm_source: 'school-campaign' });
  expect(await trackMobileAnalytics('page_view', { path: '/' })).toBeNull();
  expect(values.has('kitabu_mobile_analytics_anonymous_id_v1')).toBe(false);
  expect(values.has('kitabu_mobile_analytics_session_id_v1')).toBe(false);
  expect(values.has('kitabu_mobile_analytics_first_attribution_v1')).toBe(false);
  expect(values.has('kitabu_mobile_analytics_queue_v1')).toBe(false);
});

test('necessary-only removes queued events and once markers while retaining consent preference', async () => {
  await initializeMobileAnalytics({ role: 'parent', appVersion: '1.2.7' });
  await setMobileAnalyticsConsent({ analytics: true, marketing: false });
  expect(values.has('kitabu_mobile_analytics_once_v1:first_open:app_install')).toBe(true);
  expect(values.has('kitabu_mobile_analytics_queue_v1')).toBe(true);

  await setMobileAnalyticsConsent({ analytics: false, marketing: false });
  await new Promise(resolve => setTimeout(resolve, 0));

  expect(values.has('kitabu_mobile_analytics_once_v1:first_open:app_install')).toBe(false);
  expect(values.has('kitabu_mobile_analytics_queue_v1')).toBe(false);
  expect(values.has('kitabu_mobile_analytics_anonymous_id_v1')).toBe(false);
  expect(values.has('kitabu_mobile_analytics_consent_v1')).toBe(true);
});

test('necessary-only removes every once marker beyond the queue bound', async () => {
  await initializeMobileAnalytics({ role: 'parent' });
  await setMobileAnalyticsConsent({ analytics: true, marketing: false });
  for (let index = 0; index < 125; index += 1) {
    values.set(`kitabu_mobile_analytics_once_v1:test:${index}`, '1');
  }

  await setMobileAnalyticsConsent({ analytics: false, marketing: false });
  await Promise.resolve();

  expect(Array.from(values.keys()).filter(key => key.startsWith('kitabu_mobile_analytics_once_v1:'))).toEqual([]);
  expect(values.has('kitabu_mobile_analytics_consent_v1')).toBe(true);
});

test('withdrawal synchronizes the existing anonymous ID before local cleanup', async () => {
  await initializeMobileAnalytics({ role: 'parent' });
  await setMobileAnalyticsConsent({ analytics: true, marketing: true });
  const anonymousId = values.get('kitabu_mobile_analytics_anonymous_id_v1');
  (fetchKitabuApi as jest.Mock).mockClear();

  await setMobileAnalyticsConsent({ analytics: false, marketing: false });
  await Promise.resolve();

  const consentCall = (fetchKitabuApi as jest.Mock).mock.calls.find(([path]) => path === '/analytics/consent');
  expect(consentCall).toBeDefined();
  expect(JSON.parse(String(consentCall?.[1]?.body))).toMatchObject({
    anonymousId,
    analytics: false,
    marketing: false,
    source: 'native',
  });
  expect(values.has('kitabu_mobile_analytics_anonymous_id_v1')).toBe(false);
});

test('initial necessary-only consent does not synchronize a generated identifier', async () => {
  await initializeMobileAnalytics({ role: null });
  (fetchKitabuApi as jest.Mock).mockClear();
  await setMobileAnalyticsConsent({ analytics: false, marketing: false });
  await new Promise(resolve => setTimeout(resolve, 0));
  const consentCall = (fetchKitabuApi as jest.Mock).mock.calls.find(([path]) => path === '/analytics/consent');
  expect(consentCall).toBeDefined();
  expect(JSON.parse(String(consentCall?.[1]?.body))).not.toHaveProperty('anonymousId');
});

test('consent persists IDs, retains bounded attribution, and emits first_open once', async () => {
  await initializeMobileAnalytics({ role: 'parent', grade: 'Grade 6', appVersion: '1.2.7' });
  await setMobileInstallAttribution({ utm_source: 'deep-link', gclid: 'gclid-123' });
  await setMobileAnalyticsConsent({ analytics: true, marketing: false });
  await setMobileAnalyticsConsent({ analytics: true, marketing: false });

  expect(values.get('kitabu_mobile_analytics_anonymous_id_v1')).toMatch(/^[0-9a-f-]{36}$/i);
  expect(values.get('kitabu_mobile_analytics_session_id_v1')).toMatch(/^[0-9a-f-]{36}$/i);
  expect(readJson<Record<string, string>>('kitabu_mobile_analytics_first_attribution_v1').utm_source).toBe('deep-link');
  const queue = readJson<Array<{ event: { name: string; clientDeliveredProviders: string[]; userId?: string; [key: string]: unknown } }>>('kitabu_mobile_analytics_queue_v1');
  expect(queue.filter(item => item.event.name === 'first_open')).toHaveLength(1);
  expect(queue[0]?.event.clientDeliveredProviders).toEqual([]);
  expect(queue[0]?.event.userId).toBeUndefined();
  expect(Object.keys(queue[0]?.event ?? {}).sort()).toEqual([
    'anonymousId',
    'appVersion',
    'attribution',
    'clientDeliveredProviders',
    'consent',
    'eventId',
    'name',
    'occurredAt',
    'platform',
    'properties',
    'sessionId',
    'source',
  ]);
});

test('student and unknown roles cannot receive marketing consent', async () => {
  await initializeMobileAnalytics({ role: 'student', grade: 'Grade 4' });
  await setMobileAnalyticsConsent({ analytics: true, marketing: true });
  expect(getMobileAnalyticsConsent()?.marketing).toBe(false);
});

test('stored marketing consent stays disabled through unknown-to-student startup', async () => {
  values.set('kitabu_mobile_analytics_consent_v1', JSON.stringify({
    version: 1,
    analytics: true,
    marketing: true,
    updatedAt: new Date().toISOString(),
  }));
  await initializeMobileAnalytics({ role: null });
  expect(getMobileAnalyticsConsent()?.marketing).toBe(false);
  updateMobileAnalyticsContext({ role: 'student' });
  expect(getMobileAnalyticsConsent()?.marketing).toBe(false);
});

test('association adds only the internal user ID', async () => {
  await initializeMobileAnalytics({ role: 'parent' });
  await setMobileAnalyticsConsent({ analytics: true, marketing: false });
  await associateMobileAnalyticsUser('user-123');
  await mobileAnalytics.track('signup_completed', { role: 'parent', entry_point: 'onboarding' });
  const queue = readJson<Array<{ event: { anonymousId: string; userId?: string } }>>('kitabu_mobile_analytics_queue_v1');
  expect(queue.some(item => item.event.anonymousId)).toBe(true);
  expect(queue.some(item => item.event.userId)).toBe(false);
});

test('accepted false responses retain events and retries remain bounded', async () => {
  await initializeMobileAnalytics({ role: 'teacher' });
  await setMobileAnalyticsConsent({ analytics: true, marketing: false });
  for (let index = 0; index < 110; index += 1) {
    await trackMobileAnalytics('page_view', { path: `/page-${index}` });
  }
  await mobileAnalytics.flush();
  const queue = readJson<Array<{ attempts: number }>>('kitabu_mobile_analytics_queue_v1');
  expect(queue.length).toBeLessThanOrEqual(100);
  expect(queue.some(item => item.attempts > 0)).toBe(true);
});
