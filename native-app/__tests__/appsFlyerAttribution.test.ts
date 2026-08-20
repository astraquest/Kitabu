import Constants from 'expo-constants';
import { Platform } from 'react-native';

import {
  dispatchAppsFlyerEvent,
  getAppsFlyerStatus,
  projectAppsFlyerEvent,
  resetAppsFlyerForTests,
  sanitizeAppsFlyerConversionData,
  setAppsFlyerAnalyticsConsent,
  setAppsFlyerModuleForTests,
} from '../src/services/appsFlyerAttribution';
import type { MobileAnalyticsEvent } from '../src/services/mobileAnalytics';

const extra = Constants.expoConfig?.extra as Record<string, unknown>;

function fakeModule() {
  let conversionCallback: ((payload: unknown) => void) | null = null;
  return {
    onInstallConversionData: jest.fn((callback: (payload: unknown) => void) => {
      conversionCallback = callback;
      return jest.fn();
    }),
    initSdk: jest.fn((_options: unknown, success?: () => void) => {
      success?.();
    }),
    startSdk: jest.fn(),
    stop: jest.fn(),
    disableAppSetId: jest.fn(),
    logEvent: jest.fn(),
    emitConversion(payload: unknown) {
      conversionCallback?.(payload);
    },
  };
}

beforeEach(() => {
  (Platform as unknown as { OS: string }).OS = 'android';
  extra.kitabuAppsFlyerDevKey = 'test-dev-key';
  resetAppsFlyerForTests();
});

afterEach(() => {
  delete extra.kitabuAppsFlyerDevKey;
  resetAppsFlyerForTests();
});

test('does not initialize or start before analytics consent', async () => {
  const module = fakeModule();
  setAppsFlyerModuleForTests(module);

  await setAppsFlyerAnalyticsConsent(false, jest.fn());

  expect(module.initSdk).not.toHaveBeenCalled();
  expect(module.startSdk).not.toHaveBeenCalled();
});

test('starts with manualStart and re-enables after withdrawal', async () => {
  const module = fakeModule();
  setAppsFlyerModuleForTests(module);

  await setAppsFlyerAnalyticsConsent(true, jest.fn());
  expect(module.disableAppSetId).toHaveBeenCalledTimes(1);
  expect(module.initSdk).toHaveBeenCalledWith(expect.objectContaining({
    devKey: 'test-dev-key',
    isDebug: false,
    manualStart: true,
    onInstallConversionDataListener: true,
  }), expect.any(Function), expect.any(Function));
  expect(module.startSdk).toHaveBeenCalledTimes(1);

  await setAppsFlyerAnalyticsConsent(true, jest.fn());
  expect(module.startSdk).toHaveBeenCalledTimes(1);

  await setAppsFlyerAnalyticsConsent(false, jest.fn());
  expect(module.stop).toHaveBeenCalledWith(true, expect.any(Function));

  await setAppsFlyerAnalyticsConsent(true, jest.fn());
  expect(module.stop).toHaveBeenCalledWith(false, expect.any(Function));
  expect(module.startSdk).toHaveBeenCalledTimes(2);
});

test('missing dev key fails open without SDK calls', async () => {
  const module = fakeModule();
  delete extra.kitabuAppsFlyerDevKey;
  setAppsFlyerModuleForTests(module);

  expect(await setAppsFlyerAnalyticsConsent(true, jest.fn())).toBe(false);
  expect(getAppsFlyerStatus()).toBe('unavailable');
  expect(module.initSdk).not.toHaveBeenCalled();
});

test('conversion data keeps only bounded campaign fields', () => {
  expect(sanitizeAppsFlyerConversionData({
    data: {
      media_source: 'play-store',
      af_channel: 'paid-social',
      campaign: 'august-parent-campaign',
      af_adset: 'parents',
      af_keywords: 'revision',
      email: 'child@example.com',
      customer_user_id: 'user-123',
      advertising_id: 'aaid-value',
    },
  })).toEqual({
    utm_source: 'play-store',
    utm_medium: 'paid-social',
    utm_campaign: 'august-parent-campaign',
    utm_content: 'parents',
    utm_term: 'revision',
  });
});

test('event projection excludes identity, role, grade, subject, and content', () => {
  const event: MobileAnalyticsEvent = {
    eventId: '11111111-1111-4111-8111-111111111111',
    name: 'purchase',
    occurredAt: '2026-08-19T10:00:00.000Z',
    anonymousId: '22222222-2222-4222-8222-222222222222',
    sessionId: '33333333-3333-4333-8333-333333333333',
    platform: 'android',
    source: 'native',
    appVersion: '1.2.7',
    properties: {
      plan_code: 'monthly_parent',
      billing_cycle: 'monthly',
      amount_ksh_cents: 129900,
      role: 'parent',
      grade: 'Grade 6',
      subject: 'Mathematics',
      answer: 'secret answer',
      email: 'child@example.com',
    },
    consent: { analytics: true, marketing: true },
    clientDeliveredProviders: [],
  };
  const projected = projectAppsFlyerEvent(event);

  expect(projected).toEqual({
    eventName: 'af_purchase',
    eventValues: {
      event_id: event.eventId,
      app_version: '1.2.7',
      af_content_id: 'monthly_parent',
      af_subscription: 'monthly',
      af_revenue: 1299,
      af_currency: 'KES',
    },
  });
  expect(projected?.eventValues).not.toHaveProperty('anonymousId');
  expect(projected?.eventValues).not.toHaveProperty('sessionId');
  expect(projected?.eventValues).not.toHaveProperty('grade');
  expect(projected?.eventValues).not.toHaveProperty('role');
  expect(projected?.eventValues).not.toHaveProperty('subject');
});

test('accepted safe event is delivered best-effort after start', async () => {
  const module = fakeModule();
  setAppsFlyerModuleForTests(module);
  await setAppsFlyerAnalyticsConsent(true, jest.fn());

  const event: MobileAnalyticsEvent = {
    eventId: '44444444-4444-4444-8444-444444444444',
    name: 'checkout_started',
    occurredAt: '2026-08-19T10:00:00.000Z',
    anonymousId: '55555555-5555-4555-8555-555555555555',
    sessionId: '66666666-6666-4666-8666-666666666666',
    platform: 'android',
    source: 'native',
    properties: { plan_code: 'monthly_parent', billing_cycle: 'monthly' },
    consent: { analytics: true, marketing: false },
    clientDeliveredProviders: [],
  };

  expect(dispatchAppsFlyerEvent(event)).toBe(true);
  expect(module.logEvent).toHaveBeenCalledWith('af_initiated_checkout', {
    event_id: event.eventId,
    af_content_id: 'monthly_parent',
    af_subscription: 'monthly',
  });
});
