import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { requestPushPermission } from '../src/services/pushNotifications';

test('creates the Android channel before requesting real notification permission', async () => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
  const setChannel = Notifications.setNotificationChannelAsync as jest.Mock;
  const requestPermission = Notifications.requestPermissionsAsync as jest.Mock;

  const result = await requestPushPermission();

  expect(setChannel).toHaveBeenCalledWith(
    'daily-study-reminders',
    expect.objectContaining({ name: 'Study reminders' }),
  );
  expect(setChannel.mock.invocationCallOrder[0]).toBeLessThan(
    requestPermission.mock.invocationCallOrder[0],
  );
  expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledTimes(1);
  expect(result).toEqual({ status: 'granted', granted: true, tokenReady: true });
});
