import {
  analyticsEventInputSchema,
  deterministicInactivityEventId,
  dispatchAnalyticsEvent,
  eligibleAnalyticsProviders,
  isNativeAnalyticsProviderRole,
  sanitizeAnalyticsEvent,
  type AnalyticsProvider
} from './analytics.js';
import {
  claimAnalyticsInactivityEpisode,
  findAnalyticsUserRoles,
  findCurrentAnalyticsConsentContext,
  listInactiveAnalyticsCandidates,
  markAnalyticsInactivityEpisodeEmitted,
  recordAnalyticsDeliveryAttempt,
  recordAnalyticsEvent,
  type InactiveAnalyticsCandidate
} from './repositories.js';
import { withTransaction } from './repositories.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export type AnalyticsInactivityConfig = {
  thresholdDays: number;
  batchSize: number;
};

export type AnalyticsInactivityResult = {
  scanned: number;
  emitted: number;
  skipped: number;
};

type InactivityConsent = NonNullable<Awaited<ReturnType<typeof findCurrentAnalyticsConsentContext>>>;

export function inactivityDays(now: Date, lastActivityAt: Date) {
  return Math.max(0, Math.floor((now.getTime() - lastActivityAt.getTime()) / DAY_MS));
}

export function intersectAnalyticsProviders(
  storedProviders: readonly AnalyticsProvider[],
  currentlyEligibleProviders: readonly AnalyticsProvider[]
) {
  return storedProviders.filter(provider => currentlyEligibleProviders.includes(provider));
}

export function buildInactivityEvent(
  candidate: InactiveAnalyticsCandidate,
  context: InactivityConsent,
  now: Date
) {
  const daysInactive = inactivityDays(now, candidate.lastActivityAt);
  const parsed = analyticsEventInputSchema.parse({
    eventId: deterministicInactivityEventId(candidate.userId, candidate.lastActivityAt),
    name: 'user_inactive',
    occurredAt: now.toISOString(),
    anonymousId: context.anonymousId || candidate.userId,
    platform: 'server',
    source: 'server',
    properties: {
      days_inactive: daysInactive,
      last_surface: candidate.lastSurface.slice(0, 80)
    },
    consent: { analytics: context.analytics, marketing: context.marketing },
    clientDeliveredProviders: [],
    attribution: context.latestAttribution,
    clientId: context.clientId ?? undefined,
    appInstanceId: context.appInstanceId ?? undefined
  });
  return sanitizeAnalyticsEvent(parsed, candidate.userId);
}

export type InactivityTransaction = {
  claimEpisode: (userId: string, lastActivityAt: Date) => Promise<boolean>;
  findConsent: (userId: string) => Promise<InactivityConsent | null>;
  findRoles: (userId: string) => Promise<string[]>;
  insertEvent: (event: ReturnType<typeof sanitizeAnalyticsEvent>, providers: AnalyticsProvider[]) => Promise<void>;
  markEmitted: (userId: string, lastActivityAt: Date, eventId: string) => Promise<void>;
};

export type InactivityCandidateProcessorDependencies = {
  transaction: <T>(work: (transaction: InactivityTransaction) => Promise<T>) => Promise<T>;
  findConsent: (userId: string) => Promise<InactivityConsent | null>;
  findRoles: (userId: string) => Promise<string[]>;
  dispatch: (event: ReturnType<typeof sanitizeAnalyticsEvent>, providers: readonly AnalyticsProvider[]) => Promise<Array<{ provider: AnalyticsProvider; ok: boolean; error?: string }>>;
  audit: (eventId: string, results: Array<{ provider: AnalyticsProvider; ok: boolean; error?: string }>) => Promise<void>;
};

export async function processAnalyticsInactivityCandidate(
  candidate: InactiveAnalyticsCandidate,
  now: Date,
  dependencies: InactivityCandidateProcessorDependencies
): Promise<'emitted' | 'skipped'> {
  const prepared = await dependencies.transaction(async transaction => {
    if (!await transaction.claimEpisode(candidate.userId, candidate.lastActivityAt)) return null;
    const context = await transaction.findConsent(candidate.userId);
    if (!context?.analytics) return { event: null, providers: [] as AnalyticsProvider[] };
    const roles = await transaction.findRoles(candidate.userId);
    const role = roles.find(value => isNativeAnalyticsProviderRole(value)) ?? null;
    const event = buildInactivityEvent(candidate, context, now);
    const providers = eligibleAnalyticsProviders(event.consent, [], { source: 'server', role });
    await transaction.insertEvent(event, providers);
    await transaction.markEmitted(candidate.userId, candidate.lastActivityAt, event.eventId);
    return { event, providers };
  });
  if (!prepared?.event) return 'skipped';

  const current = await dependencies.findConsent(candidate.userId);
  const roles = await dependencies.findRoles(candidate.userId);
  const role = roles.find(value => isNativeAnalyticsProviderRole(value)) ?? null;
  const currentlyEligible = current?.analytics
    ? eligibleAnalyticsProviders(current, [], { source: 'server', role })
    : [];
  const providers = intersectAnalyticsProviders(prepared.providers, currentlyEligible);
  if (!current?.analytics || providers.length === 0) return 'emitted';
  const event = buildInactivityEvent(candidate, current, now);
  const results = await dependencies.dispatch(event, providers);
  await dependencies.audit(event.eventId, results);
  return 'emitted';
}

export type InactivityDependencies = {
  listCandidates: (cutoff: Date, limit: number) => Promise<InactiveAnalyticsCandidate[]>;
  processCandidate: (candidate: InactiveAnalyticsCandidate, now: Date) => Promise<'emitted' | 'skipped'>;
  log?: (data: unknown, message: string) => void;
};

const productionDependencies: InactivityDependencies = {
  listCandidates: (cutoff, limit) => withTransaction(client => listInactiveAnalyticsCandidates(client, cutoff, limit)),
  processCandidate: (candidate, now) => processAnalyticsInactivityCandidate(candidate, now, productionProcessorDependencies),
  log: (data, message) => console.info(message, data)
};

const productionProcessorDependencies: InactivityCandidateProcessorDependencies = {
  transaction: work => withTransaction(client => work({
    claimEpisode: (userId, lastActivityAt) => claimAnalyticsInactivityEpisode(client, userId, lastActivityAt),
    findConsent: userId => findCurrentAnalyticsConsentContext(userId, null, client),
    findRoles: userId => findAnalyticsUserRoles(userId, client),
    insertEvent: async (event, providers) => { await recordAnalyticsEvent(client, event, providers); },
    markEmitted: async (userId, lastActivityAt, eventId) => { await markAnalyticsInactivityEpisodeEmitted(client, userId, lastActivityAt, eventId); }
  })),
  findConsent: userId => findCurrentAnalyticsConsentContext(userId, null),
  findRoles: userId => findAnalyticsUserRoles(userId),
  dispatch: (event, providers) => dispatchAnalyticsEvent(event, providers),
  audit: async (eventId, results) => {
    try {
      await withTransaction(async client => {
        for (const result of results) {
          await recordAnalyticsDeliveryAttempt(client, eventId, result.provider, result.ok ? 'delivered' : 'failed', result.error);
        }
      });
    } catch {
      // Stored delivery rows remain retryable if audit persistence fails.
    }
  }
};

export async function runAnalyticsInactivityOnce(
  config: AnalyticsInactivityConfig,
  dependencies: InactivityDependencies = productionDependencies,
  now = new Date()
): Promise<AnalyticsInactivityResult> {
  const cutoff = new Date(now.getTime() - Math.max(1, config.thresholdDays) * DAY_MS);
  const candidates = await dependencies.listCandidates(cutoff, Math.max(1, Math.min(config.batchSize, 100)));
  let emitted = 0;
  let skipped = 0;
  for (const candidate of candidates) {
    try {
      const outcome = await dependencies.processCandidate(candidate, now);
      if (outcome === 'emitted') emitted += 1;
      else skipped += 1;
      dependencies.log?.({ status: outcome }, 'analytics inactivity maintenance');
    } catch (error) {
      skipped += 1;
      dependencies.log?.({ status: 'failed', error: error instanceof Error ? error.name : 'maintenance_failed' }, 'analytics inactivity maintenance failed');
    }
  }
  return { scanned: candidates.length, emitted, skipped };
}
