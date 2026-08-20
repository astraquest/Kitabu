import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { MobileAnalyticsAttribution, MobileAnalyticsEvent, MobileAnalyticsEventName } from './mobileAnalytics';

type AppsFlyerConversionPayload = {
  data?: Record<string, unknown>;
};

type AppsFlyerModule = {
  onInstallConversionData?: (callback: (payload: AppsFlyerConversionPayload) => void) => (() => void) | void;
  initSdk: (options: {
    devKey: string;
    isDebug: false;
    onInstallConversionDataListener: true;
    onDeepLinkListener: false;
    manualStart: true;
  }, success?: () => void, failure?: (error?: unknown) => void) => void | Promise<unknown>;
  startSdk: () => void;
  stop: (isStopped: boolean, success?: () => void) => void;
  disableAppSetId?: () => void;
  logEvent: (eventName: string, eventValues: Record<string, string | number | boolean>) => void;
};

type AppsFlyerStatus = 'unavailable' | 'initialized' | 'started' | 'stopped';

const APPSFLYER_EVENTS: Partial<Record<MobileAnalyticsEventName, string>> = {
  page_view: 'af_content_view',
  signup_completed: 'af_complete_registration',
  onboarding_completed: 'af_tutorial_completion',
  first_tutor_session: 'kitabu_first_tutor_session',
  learning_session_completed: 'af_level_achieved',
  pricing_viewed: 'af_content_view',
  checkout_started: 'af_initiated_checkout',
  purchase: 'af_purchase',
  subscription_renewed: 'af_subscribe',
};

const MAX_ATTRIBUTION_VALUE = 180;
const MAX_APP_VERSION = 64;

let appsFlyerModuleOverride: AppsFlyerModule | null | undefined;
let appsFlyerModule: AppsFlyerModule | null = null;
let status: AppsFlyerStatus = 'unavailable';
let conversionUnsubscribe: (() => void) | null = null;
let sentEventIds = new Set<string>();

function bounded(value: unknown, max: number) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}

function getModule(): AppsFlyerModule | null {
  if (appsFlyerModuleOverride !== undefined) return appsFlyerModuleOverride;
  if (appsFlyerModule) return appsFlyerModule;
  try {
    const loaded = require('react-native-appsflyer') as { default?: AppsFlyerModule };
    appsFlyerModule = loaded.default ?? loaded as AppsFlyerModule;
  } catch {
    appsFlyerModule = null;
  }
  return appsFlyerModule;
}

export function getAppsFlyerDevKey() {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  return bounded(extra?.kitabuAppsFlyerDevKey, 256);
}

export function sanitizeAppsFlyerConversionData(payload: unknown): MobileAnalyticsAttribution {
  const data = payload && typeof payload === 'object' && 'data' in payload
    ? (payload as AppsFlyerConversionPayload).data
    : null;
  if (!data || typeof data !== 'object') return {};

  const output: MobileAnalyticsAttribution = {};
  const source = bounded(data.media_source, MAX_ATTRIBUTION_VALUE);
  const medium = bounded(data.af_channel, MAX_ATTRIBUTION_VALUE);
  const campaign = bounded(data.campaign, MAX_ATTRIBUTION_VALUE);
  const content = bounded(data.af_adset ?? data.adset, MAX_ATTRIBUTION_VALUE);
  const term = bounded(data.af_keywords, MAX_ATTRIBUTION_VALUE);
  if (source) output.utm_source = source;
  if (medium) output.utm_medium = medium;
  if (campaign) output.utm_campaign = campaign;
  if (content) output.utm_content = content;
  if (term) output.utm_term = term;
  return output;
}

export function projectAppsFlyerEvent(event: MobileAnalyticsEvent) {
  const eventName = APPSFLYER_EVENTS[event.name];
  if (!eventName) return null;

  const output: Record<string, string | number | boolean> = { event_id: event.eventId };
  const appVersion = bounded(event.appVersion, MAX_APP_VERSION);
  if (appVersion) output.app_version = appVersion;

  const planCode = bounded(event.properties.plan_code, MAX_ATTRIBUTION_VALUE);
  const billingCycle = bounded(event.properties.billing_cycle, MAX_ATTRIBUTION_VALUE);
  if (planCode) output.af_content_id = planCode;
  if (billingCycle) output.af_subscription = billingCycle;

  const amountCents = event.properties.amount_ksh_cents;
  if (typeof amountCents === 'number' && Number.isFinite(amountCents) && amountCents >= 0 && amountCents <= 100_000_000) {
    output.af_revenue = Math.round(amountCents) / 100;
    output.af_currency = 'KES';
  }
  if (event.properties.completed === true) output.completed = true;
  return { eventName, eventValues: output };
}

function registerConversionListener(onAttribution: (attribution: MobileAnalyticsAttribution) => void) {
  if (!appsFlyerModule?.onInstallConversionData || conversionUnsubscribe) return;
  try {
    const unregister = appsFlyerModule.onInstallConversionData(payload => {
      onAttribution(sanitizeAppsFlyerConversionData(payload));
    });
    conversionUnsubscribe = typeof unregister === 'function' ? unregister : null;
  } catch {
    conversionUnsubscribe = null;
  }
}

async function initializeSdk(onAttribution: (attribution: MobileAnalyticsAttribution) => void) {
  if (Platform.OS !== 'android') return false;
  const devKey = getAppsFlyerDevKey();
  appsFlyerModule = getModule();
  if (!devKey || !appsFlyerModule) {
    status = 'unavailable';
    return false;
  }
  if (status === 'initialized' || status === 'started' || status === 'stopped') return true;

  registerConversionListener(onAttribution);
  try {
    appsFlyerModule.disableAppSetId?.();
  } catch {
    // Optional privacy hardening must not block first-party analytics.
  }
  let succeeded = false;
  await new Promise<void>(resolve => {
    let settled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      succeeded = ok;
      resolve();
    };
    timeout = setTimeout(() => finish(false), 3_000);
    try {
      const result = appsFlyerModule?.initSdk({
        devKey,
        isDebug: false,
        onInstallConversionDataListener: true,
        onDeepLinkListener: false,
        manualStart: true,
      }, () => finish(true), () => finish(false));
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        (result as Promise<unknown>).then(() => finish(true)).catch(() => finish(false));
      }
    } catch {
      finish(false);
    }
  });
  status = succeeded ? 'initialized' : 'unavailable';
  return succeeded;
}

export async function setAppsFlyerAnalyticsConsent(
  analyticsConsent: boolean,
  onAttribution: (attribution: MobileAnalyticsAttribution) => void,
) {
  if (!analyticsConsent) {
    stopAppsFlyer();
    return false;
  }
  if (!(await initializeSdk(onAttribution)) || !appsFlyerModule) return false;
  if (status === 'started') return true;
  try {
    if (status === 'stopped') {
      appsFlyerModule.stop(false, () => undefined);
    }
    appsFlyerModule.startSdk();
    status = 'started';
    return true;
  } catch {
    status = 'unavailable';
    return false;
  }
}

export function stopAppsFlyer() {
  if (appsFlyerModule && (status === 'started' || status === 'initialized')) {
    try {
      appsFlyerModule.stop(true, () => undefined);
      status = 'stopped';
    } catch {
      status = 'unavailable';
    }
  }
}

export function dispatchAppsFlyerEvent(event: MobileAnalyticsEvent) {
  if (status !== 'started' || !appsFlyerModule || sentEventIds.has(event.eventId)) return false;
  const projected = projectAppsFlyerEvent(event);
  if (!projected) return false;
  sentEventIds.add(event.eventId);
  try {
    appsFlyerModule.logEvent(projected.eventName, projected.eventValues);
    return true;
  } catch {
    return false;
  }
}

export function getAppsFlyerStatus() {
  return status;
}

export function resetAppsFlyerForTests() {
  try {
    if (appsFlyerModule && status === 'started') appsFlyerModule.stop(true, () => undefined);
  } catch {
    // Test cleanup must not fail the analytics suite.
  }
  appsFlyerModuleOverride = undefined;
  appsFlyerModule = null;
  status = 'unavailable';
  conversionUnsubscribe?.();
  conversionUnsubscribe = null;
  sentEventIds = new Set<string>();
}

export function setAppsFlyerModuleForTests(module: AppsFlyerModule | null) {
  appsFlyerModuleOverride = module;
  appsFlyerModule = null;
}
