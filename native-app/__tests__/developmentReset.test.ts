jest.mock('react-native', () => ({
  Platform: {
    OS: 'web',
  },
}));

const runtimeGlobal = globalThis as typeof globalThis & { __DEV__: boolean };
const processEnv = (globalThis as typeof globalThis & {
  process?: { env: Record<string, string | undefined> };
}).process?.env;

describe('development web reset', () => {
  const originalDev = runtimeGlobal.__DEV__;
  const originalRuntimeEnv = processEnv?.KITABU_APP_ENV;

  beforeEach(() => {
    jest.resetModules();
    runtimeGlobal.__DEV__ = true;
    if (processEnv) {
      processEnv.KITABU_APP_ENV = 'development';
    }
    const asyncStorage = require('@react-native-async-storage/async-storage');
    asyncStorage.getAllKeys.mockResolvedValue([
      'kitabu_downloaded_books:user-1',
      'kitabu:progressive-lesson:v1:lesson-1',
      'unrelated-host-storage',
    ]);
    asyncStorage.removeItem.mockClear();
  });

  afterEach(() => {
    runtimeGlobal.__DEV__ = originalDev;
    if (processEnv) {
      if (originalRuntimeEnv === undefined) {
        delete processEnv.KITABU_APP_ENV;
      } else {
        processEnv.KITABU_APP_ENV = originalRuntimeEnv;
      }
    }
  });

  test.each([
    ['development web', true, 'development', 'web', true],
    ['production web', true, 'production', 'web', false],
    ['staging web', true, 'staging', 'web', false],
    ['development native', true, 'development', 'android', false],
  ])('%s reset gate is %s', (_name, dev, runtimeEnv, platform, expected) => {
    runtimeGlobal.__DEV__ = dev;
    if (processEnv) {
      processEnv.KITABU_APP_ENV = runtimeEnv;
    }
    jest.doMock('react-native', () => ({ Platform: { OS: platform } }));

    const { isKitabuDevelopmentWebRuntime } = require('../src/services/runtimeConfig');

    expect(isKitabuDevelopmentWebRuntime()).toBe(expected);
  });

  test('clears app-owned state once and preserves unrelated web storage', async () => {
    jest.doMock('react-native', () => ({ Platform: { OS: 'web' } }));
    const { resetDevelopmentWebStateOnce } = require('../src/services/developmentReset');
    const asyncStorage = require('@react-native-async-storage/async-storage');

    await expect(resetDevelopmentWebStateOnce()).resolves.toBe(true);
    await expect(resetDevelopmentWebStateOnce()).resolves.toBe(true);

    const removedKeys = asyncStorage.removeItem.mock.calls.map(([key]: [string]) => key);
    expect(removedKeys).toEqual(expect.arrayContaining([
      'kitabu_native_profile',
      'kitabu_last_used_auth_role',
      'kitabu_focus_mode',
      'kitabu_onboarding_preferences',
      'secure.auth_session',
      'secure.login_credentials',
      'secure.kitabu_device_id',
      'kitabu_downloaded_books:user-1',
      'kitabu:progressive-lesson:v1:lesson-1',
    ]));
    expect(removedKeys).not.toContain('unrelated-host-storage');
    expect(asyncStorage.removeItem).toHaveBeenCalledTimes(new Set(removedKeys).size);
  });
});
