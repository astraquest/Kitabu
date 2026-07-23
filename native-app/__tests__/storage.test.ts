import * as SecureStore from 'expo-secure-store';

import { loadSecureJson, saveSecureJson } from '../src/services/storage';

const getItemAsync = SecureStore.getItemAsync as jest.Mock;
const setItemAsync = SecureStore.setItemAsync as jest.Mock;

beforeEach(() => {
  getItemAsync.mockReset().mockResolvedValue(null);
  setItemAsync.mockReset().mockResolvedValue(undefined);
});

test('uses Expo-compatible keys for secure native persistence', async () => {
  await saveSecureJson('auth_session', { accessToken: 'access-token' });

  expect(setItemAsync).toHaveBeenCalledWith(
    'secure.auth_session',
    JSON.stringify({ accessToken: 'access-token' }),
  );
});

test('loads secure values from the same Expo-compatible key', async () => {
  getItemAsync.mockResolvedValue(JSON.stringify({ email: 'learner@kitabu.ai' }));

  await expect(loadSecureJson('login_credentials_test', null)).resolves.toEqual({
    email: 'learner@kitabu.ai',
  });
  expect(getItemAsync).toHaveBeenCalledWith('secure.login_credentials_test');
});
