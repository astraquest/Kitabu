import {
  claimAnalyticsDeliveryBatch,
  findAnalyticsUserRoles,
  findCurrentAnalyticsConsentContext,
  releaseAnalyticsDeliveryLease,
  skipAnalyticsDeliveriesForEvent,
  type AnalyticsDeliveryClaim
} from './repositories.js';
import { withTransaction } from './repositories.js';
import {
  dispatchAnalyticsEvent,
  eligibleAnalyticsProviders,
  isNativeAnalyticsProviderRole,
  type AnalyticsConsent,
  type AnalyticsProvider,
  type AnalyticsSource
} from './analytics.js';

export type AnalyticsWorkerConfig = {
  owner: string;
  batchSize: number;
  maxAttempts: number;
  leaseMs: number;
  baseBackoffMs: number;
  maxBackoffMs: number;
};

type RetryEvent = ReturnType<typeof import('./analytics.js').sanitizeAnalyticsEvent>;

export type AnalyticsWorkerDependencies = {
  claimDeliveries: (owner: string, batchSize: number, maxAttempts: number, leaseMs: number) => Promise<AnalyticsDeliveryClaim[]>;
  findConsent: (userId: string | null, anonymousId: string | null) => Promise<{
    anonymousId: string;
    analytics: boolean;
    marketing: boolean;
    firstAttribution: Record<string, unknown>;
    latestAttribution: Record<string, unknown>;
    clientId: string | null;
    appInstanceId: string | null;
  } | null>;
  findRoles: (userId: string) => Promise<string[]>;
  dispatch: (event: RetryEvent, providers: readonly AnalyticsProvider[], log?: (data: unknown, message: string) => void) => Promise<Array<{ provider: AnalyticsProvider; ok: boolean; status?: number; error?: string }>>;
  complete: (eventId: string, provider: AnalyticsProvider, owner: string, status: 'delivered' | 'failed' | 'skipped', error: string | undefined, nextAttemptAt: Date | null) => Promise<void>;
  skipAll: (eventId: string, reason: string) => Promise<void>;
  log?: (data: unknown, message: string) => void;
  now?: () => Date;
};

const defaultDependencies: AnalyticsWorkerDependencies = {
  claimDeliveries: (owner, batchSize, maxAttempts, leaseMs) => withTransaction(client =>
    claimAnalyticsDeliveryBatch(client, owner, batchSize, maxAttempts, leaseMs)
  ),
  findConsent: findCurrentAnalyticsConsentContext,
  findRoles: findAnalyticsUserRoles,
  dispatch: dispatchAnalyticsEvent,
  complete: (eventId, provider, owner, status, error, nextAttemptAt) => withTransaction(client =>
    releaseAnalyticsDeliveryLease(client, eventId, provider, owner, status, error, nextAttemptAt)
  ),
  skipAll: (eventId, reason) => withTransaction(client => skipAnalyticsDeliveriesForEvent(client, eventId, reason)),
  log: (data, message) => console.info(message, data)
};

export function analyticsRetryDelayMs(attempts: number, baseMs: number, maxMs: number) {
  const exponent = Math.max(0, Math.min(30, attempts - 1));
  return Math.min(Math.max(1, maxMs), Math.max(1, baseMs) * (2 ** exponent));
}

function safeErrorClass(error: unknown) {
  return error instanceof Error ? error.name.slice(0, 80) : 'delivery_failed';
}

function retryEventWithConsent(claim: AnalyticsDeliveryClaim, consent: AnalyticsConsent, context: NonNullable<Awaited<ReturnType<AnalyticsWorkerDependencies['findConsent']>>>) {
  // The repository claim is made from the already-sanitized event store. Only
  // current consent and minimized attribution identifiers are overlaid here.
  return {
    ...claim.event,
    consent,
    attribution: context.latestAttribution,
    clientId: consent.analytics ? context.clientId : null,
    appInstanceId: consent.analytics ? context.appInstanceId : null
  } as RetryEvent;
}

export async function runAnalyticsWorkerOnce(
  config: AnalyticsWorkerConfig,
  dependencies: AnalyticsWorkerDependencies = defaultDependencies
) {
  const now = dependencies.now ?? (() => new Date());
  const claims = await dependencies.claimDeliveries(config.owner, config.batchSize, config.maxAttempts, config.leaseMs);
  let delivered = 0;
  let skipped = 0;
  let failed = 0;

  for (const claim of claims) {
    try {
      const current = await dependencies.findConsent(claim.event.userId, claim.event.anonymousId);
      const consent: AnalyticsConsent = {
        analytics: current?.analytics ?? false,
        marketing: current?.marketing ?? false
      };
      if (!consent.analytics) {
        await dependencies.skipAll(claim.eventId, 'analytics_consent_withdrawn');
        skipped += 1;
        dependencies.log?.({ eventId: claim.eventId, provider: claim.provider, status: 'skipped' }, 'analytics delivery skipped');
        continue;
      }

      if (!current) {
        await dependencies.complete(claim.eventId, claim.provider, config.owner, 'skipped', 'analytics_consent_unknown', null);
        skipped += 1;
        continue;
      }

      const roles = claim.event.userId ? await dependencies.findRoles(claim.event.userId) : [];
      const role = roles.find(value => isNativeAnalyticsProviderRole(value)) ?? null;
      const approved = eligibleAnalyticsProviders(consent, claim.event.clientDeliveredProviders ?? [], {
        source: claim.event.source as AnalyticsSource,
        role
      });
      if (!approved.includes(claim.provider)) {
        await dependencies.complete(claim.eventId, claim.provider, config.owner, 'skipped', 'provider_not_eligible', null);
        skipped += 1;
        dependencies.log?.({ eventId: claim.eventId, provider: claim.provider, status: 'skipped' }, 'analytics delivery skipped');
        continue;
      }

      const event = retryEventWithConsent(claim, consent, current);
      const results = await dependencies.dispatch(event, [claim.provider], dependencies.log);
      const result = results.find(value => value.provider === claim.provider);
      if (result?.ok) {
        await dependencies.complete(claim.eventId, claim.provider, config.owner, 'delivered', undefined, null);
        delivered += 1;
        dependencies.log?.({ eventId: claim.eventId, provider: claim.provider, status: 'delivered' }, 'analytics delivery completed');
      } else {
        const error = result?.error ?? 'provider_rejected';
        const nextAttemptAt = claim.attempts >= config.maxAttempts
          ? null
          : new Date(now().getTime() + analyticsRetryDelayMs(claim.attempts, config.baseBackoffMs, config.maxBackoffMs));
        await dependencies.complete(claim.eventId, claim.provider, config.owner, 'failed', error, nextAttemptAt);
        failed += 1;
        dependencies.log?.({ eventId: claim.eventId, provider: claim.provider, status: 'failed', error: safeErrorClass(error) }, 'analytics delivery failed');
      }
    } catch (error) {
      const nextAttemptAt = claim.attempts >= config.maxAttempts
        ? null
        : new Date(now().getTime() + analyticsRetryDelayMs(claim.attempts, config.baseBackoffMs, config.maxBackoffMs));
      await dependencies.complete(claim.eventId, claim.provider, config.owner, 'failed', safeErrorClass(error), nextAttemptAt).catch(() => undefined);
      failed += 1;
      dependencies.log?.({ eventId: claim.eventId, provider: claim.provider, status: 'failed', error: safeErrorClass(error) }, 'analytics delivery failed');
    }
  }
  return { claimed: claims.length, delivered, skipped, failed };
}

export function createDefaultAnalyticsWorkerConfig(overrides: Partial<AnalyticsWorkerConfig> = {}): AnalyticsWorkerConfig {
  return {
    owner: `kitabu-analytics-${process.pid}`,
    batchSize: 25,
    maxAttempts: 5,
    leaseMs: 60_000,
    baseBackoffMs: 5_000,
    maxBackoffMs: 15 * 60_000,
    ...overrides
  };
}
