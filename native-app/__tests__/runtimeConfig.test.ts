jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
  },
}));

describe('runtimeConfig', () => {
  const runtimeGlobal = globalThis as typeof globalThis & { __DEV__: boolean };
  const processEnv = (globalThis as typeof globalThis & {
    process?: { env: Record<string, string | undefined> };
  }).process?.env;
  const originalDev = runtimeGlobal.__DEV__;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    jest.resetModules();
    runtimeGlobal.__DEV__ = true;
    globalThis.fetch = jest.fn();
    if (processEnv) {
      delete processEnv.KITABU_USE_LOCAL_API;
      delete processEnv.KITABU_PREFER_LOCAL_API;
    }
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    runtimeGlobal.__DEV__ = originalDev;
  });

  it('tries local Android endpoints before production in development', () => {
    const runtimeConfig = require('../src/services/runtimeConfig');

    runtimeConfig.resetKitabuApiRuntimeStateForTests();

    expect(runtimeConfig.getKitabuApiBaseUrls()).toEqual([
      'http://10.0.2.2:4000',
      'http://localhost:4000',
      'https://app.kitabu.ai',
    ]);
  });

  it('falls back to the production API after a local network failure', async () => {
    if (processEnv) {
      processEnv.KITABU_USE_LOCAL_API = 'true';
    }
    const localFailure = new TypeError('Network request failed');
    const okResponse = { ok: true, json: jest.fn() };

    globalThis.fetch = jest
      .fn()
      .mockRejectedValueOnce(localFailure)
      .mockRejectedValueOnce(localFailure)
      .mockResolvedValueOnce(okResponse as never)
      .mockResolvedValueOnce(okResponse as never);

    const runtimeConfig = require('../src/services/runtimeConfig');

    runtimeConfig.resetKitabuApiRuntimeStateForTests();

    const response = await runtimeConfig.fetchKitabuApi('/auth/login', { method: 'POST' });

    expect(response).toBe(okResponse);
    expect(globalThis.fetch).toHaveBeenNthCalledWith(1, 'http://10.0.2.2:4000/auth/login', { method: 'POST' });
    expect(globalThis.fetch).toHaveBeenNthCalledWith(2, 'http://localhost:4000/auth/login', { method: 'POST' });
    expect(globalThis.fetch).toHaveBeenNthCalledWith(3, 'https://app.kitabu.ai/auth/login', { method: 'POST' });
    expect(runtimeConfig.getKitabuApiBaseUrl()).toBe('https://app.kitabu.ai');

    await runtimeConfig.fetchKitabuApi('/me/account', { method: 'GET' });
    expect(globalThis.fetch).toHaveBeenNthCalledWith(4, 'https://app.kitabu.ai/me/account', { method: 'GET' });
  });
});
