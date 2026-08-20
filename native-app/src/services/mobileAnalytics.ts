import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { buildKitabuRequestHeaders } from './requestHelpers';
import { fetchKitabuApi } from './runtimeConfig';
import {
  dispatchAppsFlyerEvent,
  resetAppsFlyerForTests,
  setAppsFlyerAnalyticsConsent,
  stopAppsFlyer,
} from './appsFlyerAttribution';

export const MOBILE_ANALYTICS_CONSENT_VERSION = 1;
export const MOBILE_ANALYTICS_MAX_QUEUE = 100;
export const MOBILE_ANALYTICS_MAX_QUEUE_BYTES = 240_000;
export const MOBILE_ANALYTICS_MAX_ATTEMPTS = 3;

export type MobileAnalyticsEventName =
  | 'page_view'
  | 'landing_page_engaged'
  | 'app_download_clicked'
  | 'first_open'
  | 'signup_started'
  | 'signup_completed'
  | 'profile_setup_started'
  | 'onboarding_completed'
  | 'first_tutor_session'
  | 'learning_session_completed'
  | 'pricing_viewed'
  | 'checkout_started'
  | 'payment_not_completed'
  | 'purchase'
  | 'subscription_renewed'
  | 'purchase_refunded'
  | 'subscription_expired'
  | 'user_inactive';

export type MobileAnalyticsConsent = {
  version: typeof MOBILE_ANALYTICS_CONSENT_VERSION;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
};

export type MobileAnalyticsRole =
  | 'student'
  | 'parent'
  | 'teacher'
  | 'other'
  | 'school_admin'
  | 'platform_admin'
  | 'sales_agent'
  | null
  | undefined;

export function isAdultMarketingRole(role: MobileAnalyticsRole) {
  return (
    role === 'parent' ||
    role === 'teacher' ||
    role === 'school_admin' ||
    role === 'platform_admin' ||
    role === 'sales_agent'
  );
}

export type MobileAnalyticsAttribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
  fbclid?: string;
  gclid?: string;
  ttclid?: string;
};

export type MobileAnalyticsContext = {
  role?: MobileAnalyticsRole;
  userId?: string | null;
  grade?: string | null;
  appVersion?: string | null;
};

type MobileAnalyticsState = {
  consent: MobileAnalyticsConsent | null;
  anonymousId: string | null;
  sessionId: string | null;
  firstAttribution: MobileAnalyticsAttribution;
  latestAttribution: MobileAnalyticsAttribution;
  context: MobileAnalyticsContext;
  initialized: boolean;
};

type QueuedEvent = {
  event: MobileAnalyticsEvent;
  attempts: number;
};

export type MobileAnalyticsEvent = {
  eventId: string;
  name: MobileAnalyticsEventName;
  occurredAt: string;
  anonymousId: string;
  sessionId: string;
  platform: 'ios' | 'android';
  source: 'native';
  appVersion?: string;
  properties: Record<string, string | number | boolean | null>;
  consent: { analytics: boolean; marketing: boolean };
  clientDeliveredProviders: never[];
  attribution?: MobileAnalyticsAttribution;
};

const CONSENT_KEY = 'kitabu_mobile_analytics_consent_v1';
const ANONYMOUS_ID_KEY = 'kitabu_mobile_analytics_anonymous_id_v1';
const SESSION_ID_KEY = 'kitabu_mobile_analytics_session_id_v1';
const FIRST_ATTRIBUTION_KEY = 'kitabu_mobile_analytics_first_attribution_v1';
const LATEST_ATTRIBUTION_KEY = 'kitabu_mobile_analytics_latest_attribution_v1';
const QUEUE_KEY = 'kitabu_mobile_analytics_queue_v1';
const ONCE_PREFIX = 'kitabu_mobile_analytics_once_v1:';
const FETCH_TIMEOUT_MS = 8_000;

const state: MobileAnalyticsState = {
  consent: null,
  anonymousId: null,
  sessionId: null,
  firstAttribution: {},
  latestAttribution: {},
  context: {},
  initialized: false,
};

const listeners = new Set<(consent: MobileAnalyticsConsent | null) => void>();
let initialization: Promise<void> | null = null;
let sending = false;
let uuidCounter = 0;

const ALLOWED_PROPERTIES: Record<MobileAnalyticsEventName, readonly string[]> = {
  page_view: ['path', 'page_title', 'locale'],
  landing_page_engaged: ['engagement_type', 'engagement_seconds', 'scroll_percent'],
  app_download_clicked: ['store', 'platform', 'placement', 'destination_class'],
  first_open: ['install_source'],
  signup_started: ['role', 'entry_point'],
  signup_completed: ['role', 'entry_point'],
  profile_setup_started: ['role', 'grade'],
  onboarding_completed: ['role', 'grade', 'subject_count'],
  first_tutor_session: ['subject', 'grade'],
  learning_session_completed: ['subject', 'grade', 'duration_seconds', 'completed'],
  pricing_viewed: ['plan_code', 'billing_cycle', 'source_page'],
  checkout_started: ['plan_code', 'billing_cycle', 'amount_ksh_cents'],
  payment_not_completed: ['plan_code', 'billing_cycle', 'payment_method', 'failure_code'],
  purchase: ['plan_code', 'billing_cycle', 'amount_ksh_cents', 'payment_method', 'provider'],
  subscription_renewed: ['plan_code', 'billing_cycle', 'amount_ksh_cents', 'payment_method'],
  purchase_refunded: ['plan_code', 'amount_ksh_cents', 'provider'],
  subscription_expired: ['plan_code', 'billing_cycle'],
  user_inactive: ['days_inactive', 'last_surface'],
};

const CANONICAL_NAMES = new Set<MobileAnalyticsEventName>(Object.keys(ALLOWED_PROPERTIES) as MobileAnalyticsEventName[]);

function uuid() {
  const cryptoSource = (globalThis as { crypto?: { randomUUID?: () => string; getRandomValues?: (bytes: Uint8Array) => Uint8Array } }).crypto;
  if (cryptoSource?.randomUUID) return cryptoSource.randomUUID();
  if (cryptoSource?.getRandomValues) {
    const bytes = cryptoSource.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] % 16) + 0x40;
  bytes[8] = (bytes[8] % 64) + 0x80;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  }
  uuidCounter += 1;
  return `00000000-0000-4000-8000-${String(Date.now() + uuidCounter).slice(-12).padStart(12, '0')}`;
}

function bounded(value: unknown, max = 160) {
  return typeof value === 'string' ? value.trim().slice(0, max) : value;
}

function parseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function normalizeRole(value: unknown): MobileAnalyticsRole {
  return typeof value === 'string' && ['student', 'parent', 'teacher', 'other', 'school_admin', 'platform_admin', 'sales_agent'].includes(value)
    ? value as MobileAnalyticsRole
    : null;
}

export function normalizeGrade(value: unknown) {
  return typeof value === 'string' && value.trim() ? bounded(value, 32) as string : null;
}

export function sanitizeAttribution(input?: MobileAnalyticsAttribution | null): MobileAnalyticsAttribution {
  const output: MobileAnalyticsAttribution = {};
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'ttclid'] as const) {
    const value = bounded(input?.[key], 180);
    if (typeof value === 'string' && value) output[key] = value;
  }
  const referrer = bounded(input?.referrer, 500);
  if (typeof referrer === 'string' && /^https?:\/\//i.test(referrer)) output.referrer = referrer;
  return output;
}

function sanitizeProperties(name: MobileAnalyticsEventName, input?: Record<string, unknown>) {
  const allowed = new Set(ALLOWED_PROPERTIES[name]);
  const output: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(input ?? {})) {
    if (!allowed.has(key)) continue;
    if (key === 'grade') {
      const grade = normalizeGrade(value);
      if (grade) output.grade = grade;
    } else if (typeof value === 'string') {
      output[key] = bounded(value) as string;
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      output[key] = value as number;
    } else if (typeof value === 'boolean' || value === null) {
      output[key] = value as boolean | null;
    }
  }
  return output;
}

async function get(key: string) {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

async function set(key: string, value: string) {
  try {
    await AsyncStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

async function remove(key: string) {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // Analytics persistence is best effort and never blocks app use.
  }
}

async function syncMobileAnalyticsConsent(input: { analytics: boolean; marketing: boolean; anonymousId?: string | null }) {
  try {
    const body = {
      ...(input.anonymousId ? { anonymousId: input.anonymousId } : {}),
      analytics: input.analytics,
      marketing: input.marketing,
      source: 'native',
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      version: String(MOBILE_ANALYTICS_CONSENT_VERSION),
    };
    let headers: HeadersInit = { 'Content-Type': 'application/json' };
    try {
      headers = await buildKitabuRequestHeaders(undefined, true, true);
    } catch {
      // Consent sync is also valid for unauthenticated necessary-only users.
    }
    await fetchKitabuApi('/analytics/consent', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } catch {
    // Consent withdrawal remains local and fail-safe if the server is offline.
  }
}

async function clearAnalyticsStorage(resetMemory = true) {
  let onceKeys: string[] = [];
  try {
    onceKeys = (await AsyncStorage.getAllKeys()).filter(key => key.startsWith(ONCE_PREFIX));
  } catch {
    // Analytics cleanup is best effort and never blocks necessary-only use.
  }
  const removalKeys = [
    remove(ANONYMOUS_ID_KEY),
    remove(SESSION_ID_KEY),
    remove(FIRST_ATTRIBUTION_KEY),
    remove(LATEST_ATTRIBUTION_KEY),
    remove(QUEUE_KEY),
  ];
  await Promise.all(removalKeys);
  // Keep cleanup bounded per batch without silently leaving old event markers
  // behind when a user withdraws analytics consent.
  for (let index = 0; index < onceKeys.length; index += 50) {
    await Promise.all(onceKeys.slice(index, index + 50).map(remove));
  }
  state.anonymousId = null;
  state.sessionId = null;
  if (resetMemory) {
    state.firstAttribution = {};
    state.latestAttribution = {};
  }
}

async function ensureIdentity() {
  if (!state.anonymousId) state.anonymousId = (await get(ANONYMOUS_ID_KEY)) || uuid();
  if (!state.sessionId) state.sessionId = (await get(SESSION_ID_KEY)) || uuid();
  await Promise.all([set(ANONYMOUS_ID_KEY, state.anonymousId), set(SESSION_ID_KEY, state.sessionId)]);
}

async function persistAttribution() {
  await Promise.all([
    set(FIRST_ATTRIBUTION_KEY, JSON.stringify(state.firstAttribution)),
    set(LATEST_ATTRIBUTION_KEY, JSON.stringify(state.latestAttribution)),
  ]);
}

async function loadPersistedAttribution() {
  const storedFirst = sanitizeAttribution(parseJson<MobileAnalyticsAttribution>(await get(FIRST_ATTRIBUTION_KEY)));
  const storedLatest = sanitizeAttribution(parseJson<MobileAnalyticsAttribution>(await get(LATEST_ATTRIBUTION_KEY)));
  state.latestAttribution = { ...storedLatest, ...state.latestAttribution };
  state.firstAttribution = Object.keys(storedFirst).length
    ? storedFirst
    : Object.keys(state.firstAttribution).length
      ? state.firstAttribution
      : state.latestAttribution;
}

async function loadConsent() {
  const stored = parseJson<MobileAnalyticsConsent>(await get(CONSENT_KEY));
  state.consent = stored?.version === MOBILE_ANALYTICS_CONSENT_VERSION
    ? { ...stored, marketing: Boolean(stored.marketing && isAdultMarketingRole(state.context.role)) }
    : null;
}

async function queueEvents() {
  return parseJson<QueuedEvent[]>(await get(QUEUE_KEY)) ?? [];
}

async function saveQueue(queue: QueuedEvent[]) {
  return set(QUEUE_KEY, JSON.stringify(queue));
}

async function enqueue(event: MobileAnalyticsEvent) {
  const queue = await queueEvents();
  if (queue.some(item => item.event.eventId === event.eventId)) return true;
  queue.push({ event, attempts: 0 });
  while (queue.length > MOBILE_ANALYTICS_MAX_QUEUE || JSON.stringify(queue).length > MOBILE_ANALYTICS_MAX_QUEUE_BYTES) queue.shift();
  return saveQueue(queue);
}

function notify() {
  listeners.forEach(listener => listener(state.consent));
}

function syncAppsFlyerConsent() {
  const eligible = Boolean(state.consent?.analytics && isAdultMarketingRole(state.context.role));
  setAppsFlyerAnalyticsConsent(eligible, attribution => {
    setMobileInstallAttribution(attribution).catch(() => undefined);
  }).catch(() => undefined);
}

async function buildEvent(name: MobileAnalyticsEventName, properties?: Record<string, unknown>): Promise<MobileAnalyticsEvent | null> {
  if (!state.consent?.analytics || !state.anonymousId || !state.sessionId) return null;
  const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : null;
  if (!platform) return null;
  const role = normalizeRole(properties?.role ?? state.context.role);
  const sanitized = sanitizeProperties(name, { ...properties, role: role ?? undefined });
  if (name === 'profile_setup_started' || name === 'onboarding_completed') {
    const grade = normalizeGrade(properties?.grade ?? state.context.grade);
    if (grade) sanitized.grade = grade;
  }
  return {
    eventId: uuid(),
    name,
    occurredAt: new Date().toISOString(),
    anonymousId: state.anonymousId,
    sessionId: state.sessionId,
    platform,
    source: 'native',
    ...(state.context.appVersion ? { appVersion: state.context.appVersion } : {}),
    properties: sanitized,
    consent: { analytics: true, marketing: Boolean(state.consent.marketing && isAdultMarketingRole(state.context.role)) },
    clientDeliveredProviders: [],
    attribution: state.latestAttribution,
  };
}

async function emitOnce(name: MobileAnalyticsEventName, key: string, properties?: Record<string, unknown>) {
  if (!state.consent?.analytics) return null;
  const onceKey = `${ONCE_PREFIX}${name}:${key}`;
  const existing = await get(onceKey);
  if (existing) return existing;
  const event = await buildEvent(name, properties);
  if (!event || !(await enqueue(event))) return null;
  await set(onceKey, event.eventId);
  dispatchAppsFlyerEvent(event);
  flushMobileAnalytics().catch(() => undefined);
  return event.eventId;
}

async function emitFirstOpen() {
  return emitOnce('first_open', 'app_install', {
    install_source: state.latestAttribution.utm_source ?? 'unknown',
  });
}

export async function initializeMobileAnalytics(context: MobileAnalyticsContext = {}) {
  state.context = { ...state.context, ...context };
  if (initialization) return initialization;
  initialization = (async () => {
    await loadConsent();
    if (!state.consent?.analytics) {
      await clearAnalyticsStorage(false);
      state.initialized = true;
      notify();
      return;
    }
    await ensureIdentity();
    await loadPersistedAttribution();
    syncAppsFlyerConsent();
    await emitFirstOpen();
    state.initialized = true;
    notify();
  })().catch(() => {
    state.initialized = true;
  });
  return initialization;
}

export function updateMobileAnalyticsContext(context: MobileAnalyticsContext) {
  state.context = { ...state.context, ...context };
  if (state.consent?.marketing && !isAdultMarketingRole(state.context.role)) {
    state.consent = { ...state.consent, marketing: false, updatedAt: new Date().toISOString() };
    set(CONSENT_KEY, JSON.stringify(state.consent)).catch(() => undefined);
    notify();
  }
  syncAppsFlyerConsent();
}

export function getMobileAnalyticsConsent() {
  return state.consent;
}

export function subscribeMobileAnalyticsConsent(listener: (consent: MobileAnalyticsConsent | null) => void) {
  listeners.add(listener);
  listener(state.consent);
  return () => listeners.delete(listener);
}

export async function setMobileAnalyticsConsent(input: { analytics: boolean; marketing: boolean }) {
  await initializeMobileAnalytics();
  const previousAnonymousId = input.analytics ? null : await get(ANONYMOUS_ID_KEY);
  const next: MobileAnalyticsConsent = {
    version: MOBILE_ANALYTICS_CONSENT_VERSION,
    analytics: Boolean(input.analytics),
    marketing: Boolean(input.marketing && isAdultMarketingRole(state.context.role)),
    updatedAt: new Date().toISOString(),
  };
  state.consent = next;
  await set(CONSENT_KEY, JSON.stringify(next));
  if (!next.analytics) {
    syncMobileAnalyticsConsent({ analytics: false, marketing: false, anonymousId: previousAnonymousId }).catch(() => undefined);
    await clearAnalyticsStorage();
    stopAppsFlyer();
    notify();
    return next;
  }
  await ensureIdentity();
  await loadPersistedAttribution();
  await persistAttribution();
  syncMobileAnalyticsConsent({ analytics: true, marketing: next.marketing, anonymousId: state.anonymousId }).catch(() => undefined);
  syncAppsFlyerConsent();
  await emitFirstOpen();
  notify();
  return next;
}

export async function setMobileInstallAttribution(input: MobileAnalyticsAttribution) {
  const next = sanitizeAttribution(input);
  state.latestAttribution = { ...state.latestAttribution, ...next };
  if (!Object.keys(state.firstAttribution).length) state.firstAttribution = { ...state.latestAttribution };
  if (state.consent?.analytics) await persistAttribution();
}

export async function associateMobileAnalyticsUser(userId: string | null) {
  state.context.userId = userId?.trim() || null;
  if (state.consent?.analytics) flushMobileAnalytics().catch(() => undefined);
}

export async function trackMobileAnalytics(name: MobileAnalyticsEventName, properties?: Record<string, unknown>) {
  await initializeMobileAnalytics();
  if (!CANONICAL_NAMES.has(name) || !state.consent?.analytics) return null;
  const event = await buildEvent(name, properties);
  if (!event || !(await enqueue(event))) return null;
  dispatchAppsFlyerEvent(event);
  flushMobileAnalytics().catch(() => undefined);
  return event.eventId;
}

export async function trackMobileAnalyticsOnce(name: MobileAnalyticsEventName, key: string, properties?: Record<string, unknown>) {
  await initializeMobileAnalytics();
  return emitOnce(name, key, properties);
}

export async function flushMobileAnalytics() {
  if (sending || !state.consent?.analytics) return;
  const queue = await queueEvents();
  const batch = queue.slice(0, 20);
  if (!batch.length) return;
  sending = true;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetchKitabuApi('/analytics/events', {
      method: 'POST',
      signal: controller.signal,
      headers: await buildKitabuRequestHeaders(undefined, true, true),
      body: JSON.stringify({ events: batch.map(item => item.event) }),
    });
    const responseText = (await response.text()).slice(0, 2048);
    const payload = parseJson<{ accepted?: boolean }>(responseText);
    if (!response.ok || payload?.accepted !== true) throw new Error('analytics_not_accepted');
    if (!state.consent?.analytics) return;
    const sentIds = new Set(batch.map(item => item.event.eventId));
    await saveQueue(queue.filter(item => !sentIds.has(item.event.eventId)));
  } catch {
    if (!state.consent?.analytics) return;
    const failedIds = new Set(batch.map(item => item.event.eventId));
    const latest = await queueEvents();
    const retried = latest.map(item => failedIds.has(item.event.eventId)
      ? { ...item, attempts: item.attempts + 1 }
      : item);
    await saveQueue(retried.filter(item => item.attempts < MOBILE_ANALYTICS_MAX_ATTEMPTS));
  } finally {
    clearTimeout(timeout);
    sending = false;
  }
}

export function resetMobileAnalyticsForTests() {
  state.consent = null;
  state.anonymousId = null;
  state.sessionId = null;
  state.firstAttribution = {};
  state.latestAttribution = {};
  state.context = {};
  state.initialized = false;
  initialization = null;
  sending = false;
  stopAppsFlyer();
  resetAppsFlyerForTests();
}

export const mobileAnalytics = {
  initialize: initializeMobileAnalytics,
  updateContext: updateMobileAnalyticsContext,
  getConsent: getMobileAnalyticsConsent,
  setConsent: setMobileAnalyticsConsent,
  setInstallAttribution: setMobileInstallAttribution,
  associateUser: associateMobileAnalyticsUser,
  track: trackMobileAnalytics,
  trackOnce: trackMobileAnalyticsOnce,
  flush: flushMobileAnalytics,
};

export function getMobileAnalyticsAppVersion() {
  return Constants.expoConfig?.version ?? 'unknown';
}
