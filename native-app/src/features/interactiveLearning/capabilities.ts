import type { RuntimeCapabilities } from '../../../../packages/runtime-contracts/src/interactive-learning/capabilities';

export type NativeCapabilityOverrides = Pick<
  RuntimeCapabilities,
  'online' | 'reducedMotion'
>;

/**
 * Capabilities guaranteed by the current Expo native host without probing the
 * device. Volatile runtime state is supplied explicitly by the caller.
 */
export const NATIVE_RUNTIME_CAPABILITIES: RuntimeCapabilities = {
  installedRenderers: ['native'],
  availableInputs: ['touch'],
  deviceTier: 'baseline',
  reducedMotion: true,
  online: false,
};

export function createNativeRuntimeCapabilities(
  overrides: Partial<NativeCapabilityOverrides> = {},
): RuntimeCapabilities {
  return {
    ...NATIVE_RUNTIME_CAPABILITIES,
    installedRenderers: [...NATIVE_RUNTIME_CAPABILITIES.installedRenderers],
    availableInputs: [...NATIVE_RUNTIME_CAPABILITIES.availableInputs],
    ...overrides,
  };
}
