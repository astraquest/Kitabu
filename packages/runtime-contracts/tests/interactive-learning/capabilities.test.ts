import assert from 'node:assert/strict';
import test from 'node:test';

import {
  type RenderCandidate,
  type RuntimeCapabilities,
  selectRenderCapability,
} from '../../src/interactive-learning/capabilities.ts';

const preferred = (overrides: Partial<RenderCandidate> = {}): RenderCandidate => ({
  id: 'preferred-native',
  renderer: 'native',
  input: 'touch-or-keyboard',
  supportsReducedMotion: true,
  availableOffline: true,
  ...overrides,
});

const device = (overrides: Partial<RuntimeCapabilities> = {}): RuntimeCapabilities => ({
  installedRenderers: ['native', 'dom'],
  availableInputs: ['touch'],
  deviceTier: 'baseline',
  reducedMotion: false,
  online: true,
  ...overrides,
});

test('selects the preferred renderer deterministically when it is supported', () => {
  const result = selectRenderCapability(
    {
      preferred: preferred(),
      fallbacks: [preferred({ id: 'fallback-dom', renderer: 'dom' })],
    },
    device(),
  );

  assert.equal(result.status, 'selected');
  if (result.status === 'selected') {
    assert.equal(result.candidate.id, 'preferred-native');
    assert.equal(result.usedFallback, false);
    assert.equal(result.reason, 'preferred-supported');
    assert.deepEqual(result.rejected, []);
  }
});

test('accepts a keyboard alternative when touch is unavailable', () => {
  const result = selectRenderCapability(
    { preferred: preferred({ input: 'touch-or-keyboard' }) },
    device({ availableInputs: ['keyboard'] }),
  );

  assert.equal(result.status, 'selected');
});

test('uses the first declared fallback and explains why the preferred candidate failed', () => {
  const result = selectRenderCapability(
    {
      preferred: preferred({ renderer: 'webgl' }),
      fallbacks: [
        preferred({ id: 'first-dom', renderer: 'dom' }),
        preferred({ id: 'second-native' }),
      ],
    },
    device(),
  );

  assert.equal(result.status, 'selected');
  if (result.status === 'selected') {
    assert.equal(result.candidate.id, 'first-dom');
    assert.equal(result.usedFallback, true);
    assert.equal(result.reason, 'fallback-selected');
    assert.deepEqual(result.rejected, [
      { candidateId: 'preferred-native', reasons: ['renderer-not-installed'] },
    ]);
  }
});

test('enforces reduced motion and offline support independently', () => {
  const reducedMotion = selectRenderCapability(
    { preferred: preferred({ supportsReducedMotion: false }) },
    device({ reducedMotion: true }),
  );
  assert.deepEqual(reducedMotion, {
    status: 'rejected',
    reason: 'no-supported-renderer',
    rejected: [
      { candidateId: 'preferred-native', reasons: ['reduced-motion-not-supported'] },
    ],
  });

  const offline = selectRenderCapability(
    { preferred: preferred({ availableOffline: false }) },
    device({ online: false }),
  );
  assert.deepEqual(offline, {
    status: 'rejected',
    reason: 'no-supported-renderer',
    rejected: [
      { candidateId: 'preferred-native', reasons: ['offline-not-supported'] },
    ],
  });
});

test('defaults to the baseline tier and rejects candidates above the device budget', () => {
  assert.equal(
    selectRenderCapability(
      { preferred: preferred({ minimumDeviceTier: undefined }) },
      device({ deviceTier: 'baseline' }),
    ).status,
    'selected',
  );

  assert.deepEqual(
    selectRenderCapability(
      { preferred: preferred({ minimumDeviceTier: 'standard' }) },
      device({ deviceTier: 'baseline' }),
    ),
    {
      status: 'rejected',
      reason: 'no-supported-renderer',
      rejected: [
        { candidateId: 'preferred-native', reasons: ['device-tier-too-low'] },
      ],
    },
  );
});

test('returns every explicit rejection reason in stable evaluation order', () => {
  const result = selectRenderCapability(
    {
      preferred: preferred({
        renderer: 'webgl',
        minimumDeviceTier: 'high',
        input: 'touch',
        supportsReducedMotion: false,
        availableOffline: false,
      }),
    },
    device({
      installedRenderers: ['native'],
      availableInputs: ['keyboard'],
      deviceTier: 'baseline',
      reducedMotion: true,
      online: false,
    }),
  );

  assert.deepEqual(result, {
    status: 'rejected',
    reason: 'no-supported-renderer',
    rejected: [
      {
        candidateId: 'preferred-native',
        reasons: [
          'renderer-not-installed',
          'device-tier-too-low',
          'input-not-available',
          'reduced-motion-not-supported',
          'offline-not-supported',
        ],
      },
    ],
  });
});
