import {
  NATIVE_RUNTIME_CAPABILITIES,
  createNativeRuntimeCapabilities,
} from '../src/features/interactiveLearning/capabilities';

describe('native interactive-learning capabilities', () => {
  it('reports only capabilities guaranteed by the Expo native host', () => {
    expect(NATIVE_RUNTIME_CAPABILITIES).toEqual({
      installedRenderers: ['native'],
      availableInputs: ['touch'],
      deviceTier: 'baseline',
      reducedMotion: true,
      online: false,
    });
  });

  it('applies explicit runtime state without changing the host profile', () => {
    expect(
      createNativeRuntimeCapabilities({ online: true, reducedMotion: false }),
    ).toEqual({
      installedRenderers: ['native'],
      availableInputs: ['touch'],
      deviceTier: 'baseline',
      reducedMotion: false,
      online: true,
    });

    expect(NATIVE_RUNTIME_CAPABILITIES.online).toBe(false);
    expect(NATIVE_RUNTIME_CAPABILITIES.reducedMotion).toBe(true);
  });

  it('returns fresh capability arrays for each runtime profile', () => {
    const first = createNativeRuntimeCapabilities();
    const second = createNativeRuntimeCapabilities();

    expect(first).not.toBe(second);
    expect(first.installedRenderers).not.toBe(second.installedRenderers);
    expect(first.availableInputs).not.toBe(second.availableInputs);
  });
});
