import { buildKitabuRequestHeaders, getUserFacingApiError } from '../src/services/requestHelpers';

test('hides raw validation payloads from users', () => {
  const message = JSON.stringify([
    {
      origin: 'string',
      code: 'invalid_format',
      format: 'email',
      pattern: '/email/',
      path: ['email'],
      message: 'Invalid email address',
    },
    {
      origin: 'string',
      code: 'too_small',
      minimum: 8,
      inclusive: true,
      path: ['password'],
      message: 'Too small',
    },
  ]);

  expect(getUserFacingApiError({ message })).toBe('Enter a valid email address.');
});

test('keeps normal API messages intact', () => {
  expect(getUserFacingApiError({ message: 'Invalid email or password' })).toBe(
    'Invalid email or password',
  );
});

test('masks internal JavaScript errors from users', () => {
  expect(
    getUserFacingApiError({ message: "Cannot read property 'accessToken' of null" }),
  ).toBe('Request failed');
});

test('returns field guidance when validation issues are structured', () => {
  expect(
    getUserFacingApiError({
      issues: [{ code: 'invalid_format', path: ['phoneNumber'], message: 'Invalid phone number' }],
    }),
  ).toBe('Enter a valid phone number.');
});

test('does not send JSON content type for bodyless requests', async () => {
  await expect(buildKitabuRequestHeaders(undefined, true, false)).resolves.toEqual(
    expect.not.objectContaining({ 'Content-Type': expect.any(String) }),
  );
});

test('builds public request headers when stored auth session is null', async () => {
  await expect(buildKitabuRequestHeaders()).resolves.toEqual(
    expect.objectContaining({
      'Content-Type': 'application/json',
      'x-kitabu-device-label': 'Kitabu Native App',
    }),
  );
});
