import { createHash } from 'node:crypto';
import { z } from 'zod';
import { appConfig } from './config.js';

export const ANALYTICS_EVENT_NAMES = [
  'page_view',
  'landing_page_engaged',
  'app_download_clicked',
  'first_open',
  'signup_started',
  'signup_completed',
  'profile_setup_started',
  'onboarding_completed',
  'first_tutor_session',
  'learning_session_completed',
  'pricing_viewed',
  'checkout_started',
  'payment_not_completed',
  'purchase',
  'subscription_renewed',
  'purchase_refunded',
  'subscription_expired',
  'user_inactive'
] as const;

export type AnalyticsEventName = typeof ANALYTICS_EVENT_NAMES[number];
export type AnalyticsPlatform = 'web' | 'ios' | 'android' | 'server';
export type AnalyticsSource = 'website' | 'native' | 'server';

export const analyticsEventNameSchema = z.enum(ANALYTICS_EVENT_NAMES);
export const analyticsScalarSchema = z.union([
  z.string().trim().min(1).max(160),
  z.number().finite(),
  z.boolean(),
  z.null()
]);
export const analyticsConsentSchema = z.object({
  analytics: z.boolean().default(false),
  marketing: z.boolean().default(false)
}).strict();
export const analyticsAttributionSchema = z.object({
  utm_source: z.string().trim().max(120).optional(),
  utm_medium: z.string().trim().max(120).optional(),
  utm_campaign: z.string().trim().max(160).optional(),
  utm_content: z.string().trim().max(160).optional(),
  utm_term: z.string().trim().max(160).optional(),
  referrer: z.string().url().max(500).optional(),
  fbclid: z.string().trim().max(180).optional(),
  gclid: z.string().trim().max(180).optional(),
  ttclid: z.string().trim().max(180).optional(),
  fbp: z.string().trim().regex(/^fb\.1\.\d{10,16}\.[A-Za-z0-9._-]{1,180}$/).optional(),
  fbc: z.string().trim().regex(/^fb\.1\.\d{10,16}\.[A-Za-z0-9._-]{1,180}$/).optional(),
  ttp: z.string().trim().regex(/^[A-Za-z0-9._-]{1,180}$/).optional()
}).strict();

export const analyticsEventInputSchema = z.object({
  eventId: z.string().uuid(),
  name: analyticsEventNameSchema,
  occurredAt: z.string().datetime({ offset: true }),
  anonymousId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  platform: z.enum(['web', 'ios', 'android', 'server']),
  source: z.enum(['website', 'native', 'server']),
  appVersion: z.string().trim().max(80).optional(),
  properties: z.record(z.string().regex(/^[a-z][a-z0-9_]{0,47}$/), analyticsScalarSchema).default({}),
  consent: analyticsConsentSchema,
  clientDeliveredProviders: z.array(z.enum(['posthog', 'meta', 'tiktok', 'ga4'])).max(4).default([]),
  attribution: analyticsAttributionSchema.optional(),
  clientId: z.string().trim().max(160).optional(),
  appInstanceId: z.string().trim().max(160).optional()
}).strict().superRefine((value, context) => {
  const occurred = Date.parse(value.occurredAt);
  if (Math.abs(Date.now() - occurred) > 7 * 24 * 60 * 60 * 1000) {
    context.addIssue({ code: 'custom', path: ['occurredAt'], message: 'occurredAt must be within seven days of now' });
  }
  if (value.source === 'website' && value.platform !== 'web') {
    context.addIssue({ code: 'custom', path: ['platform'], message: 'website events must use web platform' });
  }
  if (value.source === 'native' && !['ios', 'android'].includes(value.platform)) {
    context.addIssue({ code: 'custom', path: ['platform'], message: 'native events must use ios or android platform' });
  }
});

export const analyticsConsentInputSchema = z.object({
  anonymousId: z.string().uuid().optional(),
  analytics: z.boolean(),
  marketing: z.boolean(),
  source: z.enum(['website', 'native']),
  platform: z.enum(['web', 'ios', 'android']),
  version: z.string().trim().min(1).max(40)
}).strict().superRefine((value, context) => {
  if (value.source === 'website' && value.platform !== 'web') {
    context.addIssue({ code: 'custom', path: ['platform'], message: 'website consent must use web platform' });
  }
  if (value.source === 'native' && !['ios', 'android'].includes(value.platform)) {
    context.addIssue({ code: 'custom', path: ['platform'], message: 'native consent must use ios or android platform' });
  }
});

export type AnalyticsConsent = z.infer<typeof analyticsConsentSchema>;
export type AnalyticsAttribution = z.infer<typeof analyticsAttributionSchema>;
export type AnalyticsEventInput = z.infer<typeof analyticsEventInputSchema>;
export type AnalyticsConsentInput = z.infer<typeof analyticsConsentInputSchema>;

const ALLOWED_PROPERTIES: Record<AnalyticsEventName, readonly string[]> = {
  page_view: ['path', 'page_title', 'locale'],
  landing_page_engaged: ['path', 'engagement_seconds', 'scroll_percent', 'engagement_type'],
  app_download_clicked: ['store', 'platform', 'placement', 'path', 'destination_class'],
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
  user_inactive: ['days_inactive', 'last_surface']
};

const SENSITIVE_PROPERTY_NAMES = new Set([
  'name', 'full_name', 'email', 'phone', 'phone_number', 'raw_phone', 'school', 'school_name',
  'tutor_content', 'answer', 'answers', 'free_form', 'content', 'password', 'token', 'secret',
  'payment_credentials', 'learner_id', 'raw_learner_id'
]);

export function sanitizeAnalyticsProperties(name: AnalyticsEventName, properties: Record<string, unknown>) {
  const allowed = new Set(ALLOWED_PROPERTIES[name]);
  const sanitized: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (!allowed.has(key) || SENSITIVE_PROPERTY_NAMES.has(key) || key.includes('email') || key.includes('phone')) continue;
    if (typeof value === 'string') sanitized[key] = value.slice(0, 160);
    else if (typeof value === 'number' && Number.isFinite(value)) sanitized[key] = value;
    else if (typeof value === 'boolean' || value === null) sanitized[key] = value;
  }
  return sanitized;
}

export function sanitizeAnalyticsEvent(input: AnalyticsEventInput, userId?: string | null) {
  const attribution = input.attribution ?? {};
  const consentedAttribution = input.consent.marketing
    ? attribution
    : { ...attribution, fbp: undefined, fbc: undefined, ttp: undefined };
  return {
    ...input,
    userId: userId ?? null,
    occurredAt: new Date(input.occurredAt),
    properties: sanitizeAnalyticsProperties(input.name, input.properties),
    clientDeliveredProviders: input.clientDeliveredProviders,
    attribution: consentedAttribution,
    clientId: input.consent.analytics ? input.clientId ?? null : null,
    appInstanceId: input.consent.analytics ? input.appInstanceId ?? null : null
  };
}

export function deterministicPaymentEventId(
  name: 'purchase' | 'payment_not_completed',
  paymentRequestId: string,
  providerReceiptOrCheckoutId: string
) {
  const digest = createHash('sha256').update(`kitabu:${name}:${paymentRequestId}:${providerReceiptOrCheckoutId}`).digest('hex');
  const hex = `${digest.slice(0, 8)}-${digest.slice(8, 12)}-4${digest.slice(13, 16)}-8${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
  return hex;
}

export function deterministicInactivityEventId(userId: string, lastActivityAt: Date | string) {
  const occurredAt = lastActivityAt instanceof Date ? lastActivityAt.toISOString() : new Date(lastActivityAt).toISOString();
  const digest = createHash('sha256').update(`kitabu:user_inactive:${userId}:${occurredAt}`).digest('hex');
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-4${digest.slice(13, 16)}-8${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
}

export type AnalyticsProvider = 'posthog' | 'meta' | 'tiktok' | 'ga4';

export type AnalyticsConsentContextLike = {
  anonymousId: string;
  analytics: boolean;
  marketing: boolean;
  latestAttribution: Record<string, unknown>;
  clientId: string | null;
  appInstanceId: string | null;
};

export function resolveServerAnalyticsContext(userId: string, context: AnalyticsConsentContextLike | null | undefined) {
  return {
    anonymousId: context?.anonymousId ?? userId,
    consent: { analytics: context?.analytics ?? false, marketing: context?.marketing ?? false },
    attribution: context?.latestAttribution ?? {},
    clientId: context?.clientId ?? undefined,
    appInstanceId: context?.appInstanceId ?? undefined
  };
}

const META_EVENT_NAMES: Record<AnalyticsEventName, string> = {
  page_view: 'PageView', landing_page_engaged: 'LandingPageEngaged', app_download_clicked: 'AppDownloadClicked',
  first_open: 'FirstOpen', signup_started: 'SignupStarted', signup_completed: 'CompleteRegistration',
  profile_setup_started: 'ProfileSetupStarted', onboarding_completed: 'OnboardingCompleted',
  first_tutor_session: 'FirstTutorSession', learning_session_completed: 'LearningSessionCompleted',
  pricing_viewed: 'ViewContent', checkout_started: 'InitiateCheckout', payment_not_completed: 'PaymentNotCompleted',
  purchase: 'Purchase', subscription_renewed: 'SubscriptionRenewed', purchase_refunded: 'PurchaseRefunded',
  subscription_expired: 'SubscriptionExpired', user_inactive: 'UserInactive'
};
const TIKTOK_EVENT_NAMES: Record<AnalyticsEventName, string> = {
  page_view: 'ViewContent', landing_page_engaged: 'LandingPageEngaged', app_download_clicked: 'AppDownloadClicked',
  first_open: 'FirstOpen', signup_started: 'SignupStarted', signup_completed: 'CompleteRegistration',
  profile_setup_started: 'ProfileSetupStarted', onboarding_completed: 'OnboardingCompleted',
  first_tutor_session: 'FirstTutorSession', learning_session_completed: 'LearningSessionCompleted',
  pricing_viewed: 'ViewContent', checkout_started: 'InitiateCheckout', payment_not_completed: 'PaymentNotCompleted',
  purchase: 'CompletePayment', subscription_renewed: 'SubscriptionRenewed', purchase_refunded: 'PurchaseRefunded',
  subscription_expired: 'SubscriptionExpired', user_inactive: 'UserInactive'
};
const GA4_EVENT_NAMES: Record<AnalyticsEventName, string> = {
  page_view: 'page_view', landing_page_engaged: 'landing_page_engaged', app_download_clicked: 'app_download_clicked',
  first_open: 'first_open', signup_started: 'signup_started', signup_completed: 'sign_up',
  profile_setup_started: 'profile_setup_started', onboarding_completed: 'onboarding_completed',
  first_tutor_session: 'first_tutor_session', learning_session_completed: 'learning_session_completed',
  pricing_viewed: 'view_item', checkout_started: 'begin_checkout', payment_not_completed: 'payment_not_completed',
  purchase: 'purchase', subscription_renewed: 'subscription_renewed', purchase_refunded: 'purchase_refunded',
  subscription_expired: 'subscription_expired', user_inactive: 'user_inactive'
};

export function providerEventName(provider: AnalyticsProvider, name: AnalyticsEventName) {
  if (provider === 'meta') return META_EVENT_NAMES[name];
  if (provider === 'tiktok') return TIKTOK_EVENT_NAMES[name];
  if (provider === 'ga4') return GA4_EVENT_NAMES[name];
  return name;
}

export function hashProviderExternalId(value: string) {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

export const ANALYTICS_GRADE_BANDS = ['1-3', '4-6', '7-9', '10-12'] as const;
export type AnalyticsGradeBand = typeof ANALYTICS_GRADE_BANDS[number];

/** The one first-party grade segmentation contract used by providers/reports. */
export function gradeBandForAnalytics(grade: unknown): AnalyticsGradeBand | undefined {
  if (typeof grade !== 'string' && typeof grade !== 'number') return undefined;
  const matches = String(grade).trim().match(/\d+/g);
  if (!matches || matches.length !== 1) return undefined;
  const numeric = Number(matches[0]);
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > 12) return undefined;
  if (numeric <= 3) return '1-3';
  if (numeric <= 6) return '4-6';
  if (numeric <= 9) return '7-9';
  return '10-12';
}

// Kept beside the TypeScript mapping so SQL aggregation cannot drift from
// provider/admin segmentation. It returns NULL for unknown/out-of-range grades.
export const ANALYTICS_GRADE_BAND_SQL = `CASE
  WHEN COALESCE(e.properties->>'grade', '') ~ '^[^0-9]*[0-9]{1,2}[^0-9]*$'
    AND NULLIF(substring(e.properties->>'grade' FROM '[0-9]+'), '')::int BETWEEN 1 AND 3 THEN '1-3'
  WHEN COALESCE(e.properties->>'grade', '') ~ '^[^0-9]*[0-9]{1,2}[^0-9]*$'
    AND NULLIF(substring(e.properties->>'grade' FROM '[0-9]+'), '')::int BETWEEN 4 AND 6 THEN '4-6'
  WHEN COALESCE(e.properties->>'grade', '') ~ '^[^0-9]*[0-9]{1,2}[^0-9]*$'
    AND NULLIF(substring(e.properties->>'grade' FROM '[0-9]+'), '')::int BETWEEN 7 AND 9 THEN '7-9'
  WHEN COALESCE(e.properties->>'grade', '') ~ '^[^0-9]*[0-9]{1,2}[^0-9]*$'
    AND NULLIF(substring(e.properties->>'grade' FROM '[0-9]+'), '')::int BETWEEN 10 AND 12 THEN '10-12'
  ELSE NULL
END`;

function providerProperties(provider: AnalyticsProvider, input: ReturnType<typeof sanitizeAnalyticsEvent>) {
  const props: Record<string, unknown> = { ...input.properties, platform: input.platform, source: input.source };
  if (provider !== 'posthog') {
    const role = typeof props.role === 'string' ? props.role : undefined;
    const grade = typeof props.grade === 'string' ? props.grade : undefined;
    delete props.grade;
    if (input.consent.marketing && role === 'parent' && grade) {
      const band = gradeBandForAnalytics(grade);
      if (band) props.grade_band = band;
    }
  }
  return props;
}

function eventSourceUrl(input: ReturnType<typeof sanitizeAnalyticsEvent>) {
  if (input.source !== 'website') return undefined;
  const path = typeof input.properties.path === 'string' && input.properties.path.startsWith('/')
    ? input.properties.path
    : '/';
  return new URL(path, appConfig.KITABU_LANDING_WEB_BASE_URL).toString();
}

export function eligibleAnalyticsProviders(
  consent: AnalyticsConsent,
  clientDeliveredProviders: readonly AnalyticsProvider[] = [],
  context?: { source?: AnalyticsSource; role?: string | null }
): AnalyticsProvider[] {
  const nativeRole = context?.source === 'native' ? context.role : undefined;
  const nativeProviderEligible = context?.source !== 'native' || isNativeAnalyticsProviderRole(nativeRole);
  if (!nativeProviderEligible) return [];
  const serverMarketingEligible = context?.source !== 'server' || isNativeAnalyticsProviderRole(context.role);
  const providers: AnalyticsProvider[] = [];
  if (consent.analytics && appConfig.KITABU_POSTHOG_KEY) providers.push('posthog');
  if (consent.marketing && serverMarketingEligible && appConfig.KITABU_META_CAPI_ACCESS_TOKEN && appConfig.KITABU_META_PIXEL_ID) providers.push('meta');
  if (consent.marketing && serverMarketingEligible && appConfig.KITABU_TIKTOK_EVENTS_ACCESS_TOKEN && appConfig.KITABU_TIKTOK_PIXEL_CODE) providers.push('tiktok');
  if (consent.analytics && appConfig.KITABU_GA4_MEASUREMENT_ID && appConfig.KITABU_GA4_API_SECRET && !clientDeliveredProviders.includes('ga4')) providers.push('ga4');
  return providers;
}

export function isNativeAnalyticsProviderRole(role: string | null | undefined) {
  return ['parent', 'teacher', 'school_admin', 'platform_admin', 'sales_agent'].includes(role ?? '');
}

export function buildProviderPayload(provider: AnalyticsProvider, input: ReturnType<typeof sanitizeAnalyticsEvent>) {
  const props = providerProperties(provider, input);
  const externalId = hashProviderExternalId(input.userId ?? input.anonymousId);
  const eventName = providerEventName(provider, input.name);
  switch (provider) {
    case 'posthog':
      return { api_key: appConfig.KITABU_POSTHOG_KEY, event: eventName, distinct_id: input.userId ?? input.anonymousId, properties: { ...props, $session_id: input.sessionId, $anon_distinct_id: input.anonymousId }, timestamp: input.occurredAt.toISOString(), uuid: input.eventId };
    case 'meta':
      return { data: [{ event_name: eventName, event_time: Math.floor(input.occurredAt.getTime() / 1000), event_id: input.eventId, action_source: input.source === 'website' ? 'website' : input.source === 'native' ? 'app' : 'system_generated', event_source_url: eventSourceUrl(input), user_data: { external_id: [externalId], fbp: input.consent.marketing ? input.attribution.fbp : undefined, fbc: input.consent.marketing ? input.attribution.fbc : undefined }, custom_data: props }] };
    case 'tiktok':
      return { event_source: input.source === 'website' ? 'web' : 'app', event_source_id: appConfig.KITABU_TIKTOK_PIXEL_CODE, data: [{ event: eventName, event_id: input.eventId, event_time: Math.floor(input.occurredAt.getTime() / 1000), context: { user: { external_id: externalId, ttp: input.consent.marketing ? input.attribution.ttp : undefined, ttclid: input.consent.marketing ? input.attribution.ttclid : undefined }, page: eventSourceUrl(input) ? { url: eventSourceUrl(input) } : undefined }, properties: props }] };
    case 'ga4':
      return { client_id: input.clientId ?? input.anonymousId, user_id: input.userId ? externalId : undefined, events: [{ name: eventName, params: { ...props, event_id: input.eventId } }] };
  }
}

function providerRequest(provider: AnalyticsProvider, input: ReturnType<typeof sanitizeAnalyticsEvent>) {
  const timeout = appConfig.KITABU_ANALYTICS_PROVIDER_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const payload = buildProviderPayload(provider, input);
  const target = provider === 'posthog'
    ? `${appConfig.KITABU_POSTHOG_HOST.replace(/\/$/, '')}/i/v0/e/`
    : provider === 'meta'
      ? `https://graph.facebook.com/v25.0/${appConfig.KITABU_META_PIXEL_ID}/events`
      : provider === 'tiktok'
        ? 'https://business-api.tiktok.com/open_api/v1.3/event/track/'
        : `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(appConfig.KITABU_GA4_MEASUREMENT_ID ?? '')}&api_secret=${encodeURIComponent(appConfig.KITABU_GA4_API_SECRET ?? '')}`;
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (provider === 'meta' && appConfig.KITABU_META_CAPI_ACCESS_TOKEN) headers.Authorization = `Bearer ${appConfig.KITABU_META_CAPI_ACCESS_TOKEN}`;
  if (provider === 'tiktok' && appConfig.KITABU_TIKTOK_EVENTS_ACCESS_TOKEN) headers['Access-Token'] = appConfig.KITABU_TIKTOK_EVENTS_ACCESS_TOKEN;
  return fetch(target, { method: 'POST', headers, body: JSON.stringify(payload), signal: controller.signal })
    .then(async response => {
      // TikTok and Meta return useful rejection details in a JSON body even
      // when the HTTP request itself succeeds. Read only those bodies and
      // reduce them to a bounded acceptance result; never retain or log the
      // provider response text.
      const body = response.ok && (provider === 'meta' || provider === 'tiktok')
        ? (await response.text()).slice(0, 4096)
        : '';
      const accepted = providerResponseAccepted(provider, response.status, body);
      return {
        ok: accepted,
        status: response.status,
        error: accepted ? undefined : response.ok ? 'provider_rejected' : `http_${response.status}`
      };
    })
    .finally(() => clearTimeout(timer));
}

export function providerResponseAccepted(provider: AnalyticsProvider, status: number, body: string) {
  if (status < 200 || status >= 300) return false;
  if (provider === 'posthog' || provider === 'ga4') return true;

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return false;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;

  if (provider === 'tiktok') {
    return (parsed as { code?: unknown }).code === 0;
  }

  const meta = parsed as { error?: unknown; events_received?: unknown };
  if (Object.prototype.hasOwnProperty.call(meta, 'error')) return false;
  return typeof meta.events_received === 'number'
    && Number.isFinite(meta.events_received)
    && meta.events_received >= 1;
}

export async function dispatchAnalyticsEvent(
  input: ReturnType<typeof sanitizeAnalyticsEvent>,
  providersOrLog?: readonly AnalyticsProvider[] | ((data: unknown, message: string) => void),
  maybeLog?: (data: unknown, message: string) => void
) {
  // Callers that have just persisted an event must pass the exact provider
  // allowlist approved with that insert. The legacy two-argument logger form
  // remains available for direct/server callers, but native events without a
  // verified role fail closed here too.
  const providers = Array.isArray(providersOrLog)
    ? providersOrLog
    : eligibleAnalyticsProviders(input.consent, input.clientDeliveredProviders, {
        source: input.source as AnalyticsSource,
        role: null
      });
  const log: ((data: unknown, message: string) => void) | undefined = Array.isArray(providersOrLog)
    ? maybeLog
    : typeof providersOrLog === 'function' ? providersOrLog : undefined;
  const results: Array<{ provider: AnalyticsProvider; ok: boolean; status?: number; error?: string }> = [];
  for (const provider of providers) {
    try {
      const result = await providerRequest(provider, input);
      results.push({ provider, ok: result.ok, status: result.status, error: result.error });
      log?.({ eventId: input.eventId, name: input.name, destination: provider, properties: input.properties, status: result.status, ...(result.error ? { error: result.error } : {}) }, 'analytics provider delivery');
    } catch (error) {
      results.push({ provider, ok: false, error: error instanceof Error ? error.name : 'delivery_failed' });
      log?.({ eventId: input.eventId, name: input.name, destination: provider, error: error instanceof Error ? error.name : 'delivery_failed' }, 'analytics provider delivery failed');
    }
  }
  return results;
}
