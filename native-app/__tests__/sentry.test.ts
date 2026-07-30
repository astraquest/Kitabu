import * as Sentry from '@sentry/react-native';

import { captureAppException, getSentryConfig } from '../src/observability/sentry';

const mockedSentry = Sentry as jest.Mocked<typeof Sentry>;

test('initializes Sentry with an immutable native release identity', () => {
  const config = getSentryConfig();

  expect(config.release).toMatch(/^ai\.kitabu2\.twa@/);
  expect(config.dsn).toMatch(/^https:\/\//);
  expect(mockedSentry.init).toHaveBeenCalledWith(expect.objectContaining({ release: config.release, dsn: config.dsn }));
});

test('redacts credential-like error context before sending', () => {
  captureAppException(new Error('request failed'), {
    endpoint: '/v1/profile',
    authorization: 'Bearer should-not-leak',
    nested: { refreshToken: 'should-not-leak' },
  });

  expect(mockedSentry.captureException).toHaveBeenCalledWith(
    expect.any(Error),
    expect.objectContaining({
      extra: {
        endpoint: '/v1/profile',
        authorization: '[REDACTED]',
        nested: { refreshToken: '[REDACTED]' },
      },
    }),
  );
});
