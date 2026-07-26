/** The small set of renderer families understood by the runtime host. */
export type RuntimeRenderer = 'native' | 'dom' | 'webgl' | 'adapter';

/** A coarse device budget. Baseline must remain sufficient for core learning. */
export type DeviceTier = 'baseline' | 'standard' | 'high';

export type InteractionInput = 'touch' | 'keyboard';

export interface RuntimeCapabilities {
  installedRenderers: readonly RuntimeRenderer[];
  availableInputs: readonly InteractionInput[];
  deviceTier: DeviceTier;
  reducedMotion: boolean;
  online: boolean;
}

/**
 * A concrete way to render a scene. Candidates are tried in their declared
 * order, so authors (not device-dependent heuristics) control fallback order.
 */
export interface RenderCandidate {
  id: string;
  renderer: RuntimeRenderer;
  minimumDeviceTier?: DeviceTier;
  input?: 'none' | InteractionInput | 'touch-or-keyboard';
  supportsReducedMotion: boolean;
  availableOffline: boolean;
}

export type CapabilityRejectionCode =
  | 'renderer-not-installed'
  | 'device-tier-too-low'
  | 'input-not-available'
  | 'reduced-motion-not-supported'
  | 'offline-not-supported';

export interface CandidateRejection {
  candidateId: string;
  reasons: CapabilityRejectionCode[];
}

export interface CapabilityRequest {
  preferred: RenderCandidate;
  fallbacks?: readonly RenderCandidate[];
}

export type CapabilitySelection =
  | {
      status: 'selected';
      candidate: RenderCandidate;
      usedFallback: boolean;
      reason: 'preferred-supported' | 'fallback-selected';
      rejected: CandidateRejection[];
    }
  | {
      status: 'rejected';
      reason: 'no-supported-renderer';
      rejected: CandidateRejection[];
    };

const DEVICE_TIER_RANK: Record<DeviceTier, number> = {
  baseline: 0,
  standard: 1,
  high: 2,
};

function rejectionReasons(
  candidate: RenderCandidate,
  capabilities: RuntimeCapabilities,
): CapabilityRejectionCode[] {
  const reasons: CapabilityRejectionCode[] = [];
  const rejectIf = (condition: boolean, reason: CapabilityRejectionCode): void => {
    if (condition) reasons.push(reason);
  };

  rejectIf(
    !capabilities.installedRenderers.includes(candidate.renderer),
    'renderer-not-installed',
  );

  const minimumDeviceTier = candidate.minimumDeviceTier ?? 'baseline';
  rejectIf(
    DEVICE_TIER_RANK[capabilities.deviceTier] < DEVICE_TIER_RANK[minimumDeviceTier],
    'device-tier-too-low',
  );

  const requiredInput = candidate.input ?? 'none';
  const hasRequiredInput =
    requiredInput === 'none' ||
    (requiredInput === 'touch-or-keyboard'
      ? capabilities.availableInputs.includes('touch') ||
        capabilities.availableInputs.includes('keyboard')
      : capabilities.availableInputs.includes(requiredInput));
  rejectIf(!hasRequiredInput, 'input-not-available');
  rejectIf(
    capabilities.reducedMotion && !candidate.supportsReducedMotion,
    'reduced-motion-not-supported',
  );
  rejectIf(!capabilities.online && !candidate.availableOffline, 'offline-not-supported');

  return reasons;
}

/** Selects the first fully supported candidate without silently weakening requirements. */
export function selectRenderCapability(
  request: CapabilityRequest,
  capabilities: RuntimeCapabilities,
): CapabilitySelection {
  const candidates = [request.preferred, ...(request.fallbacks ?? [])];
  const rejected: CandidateRejection[] = [];

  for (const [index, candidate] of candidates.entries()) {
    const reasons = rejectionReasons(candidate, capabilities);
    if (reasons.length === 0) {
      return {
        status: 'selected',
        candidate,
        usedFallback: index > 0,
        reason: index === 0 ? 'preferred-supported' : 'fallback-selected',
        rejected,
      };
    }
    rejected.push({ candidateId: candidate.id, reasons });
  }

  return {
    status: 'rejected',
    reason: 'no-supported-renderer',
    rejected,
  };
}
