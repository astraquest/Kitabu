import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { registerPushToken } from './notificationService';
import type { PushTokenPlatform } from './notificationService';
import { getKitabuDeviceId } from './requestHelpers';

/**
 * Push notification permission handling for the onboarding Reminder (S16) opt-in.
 *
 * Tapping "Remind me" surfaces the real OS permission prompt. The result is
 * surfaced back to the caller so the onboarding flow can record whether daily
 * study reminders are enabled and proceed regardless of the user's choice.
 */
export type PushPermissionStatus = 'granted' | 'denied' | 'unsupported' | 'error';

export interface PushPermissionResult {
  status: PushPermissionStatus;
  /** True only when the OS reports an explicit grant. */
  granted: boolean;
}

export interface PushRegistrationResult extends PushPermissionResult {
  registered: boolean;
  token?: string;
  errorMessage?: string;
}

const REMINDER_CHANNEL_ID = 'daily-study-reminders';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

function getPushPlatform(): PushTokenPlatform | null {
  if (Platform.OS === 'ios' || Platform.OS === 'android' || Platform.OS === 'web') {
    return Platform.OS;
  }

  return null;
}

function getExpoProjectId() {
  const constants = Constants as typeof Constants & {
    easConfig?: { projectId?: string | null };
  };
  const extra = (Constants.expoConfig?.extra ?? {}) as {
    eas?: { projectId?: string | null };
    kitabuExpoProjectId?: string | null;
  };

  return extra.kitabuExpoProjectId || extra.eas?.projectId || constants.easConfig?.projectId || '';
}

/**
 * Ensures the Android notification channel used for study reminders exists.
 * No-op on iOS/web. Channels must exist before notifications can be delivered
 * on Android 8+, so we create it as part of the opt-in.
 */
async function ensureAndroidReminderChannel() {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: 'Study reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#F97316',
    });
  } catch (channelError) {
    // Channel creation should never block the opt-in; deliveries simply fall
    // back to the default channel if this fails.
    console.warn('[pushNotifications] Failed to create reminder channel', channelError);
  }
}

/**
 * Requests OS-level permission to send push notifications.
 *
 * Returns `unsupported` on platforms without notification support (e.g. web)
 * and `error` if the native call throws, so callers can keep onboarding moving
 * without crashing. Already-granted permissions short-circuit the prompt.
 */
export async function requestPushPermission(): Promise<PushPermissionResult> {
  if (Platform.OS === 'web') {
    return { status: 'unsupported', granted: false };
  }

  try {
    const existing = await Notifications.getPermissionsAsync();

    let status = existing.status;
    let canAskAgain = existing.canAskAgain;

    if (status !== 'granted' && canAskAgain) {
      const requested = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      status = requested.status;
      canAskAgain = requested.canAskAgain;
    }

    if (status === 'granted') {
      await ensureAndroidReminderChannel();
      return { status: 'granted', granted: true };
    }

    return { status: 'denied', granted: false };
  } catch (permissionError) {
    console.warn('[pushNotifications] Permission request failed', permissionError);
    return { status: 'error', granted: false };
  }
}

async function registerGrantedPushNotifications(): Promise<PushRegistrationResult> {
  const platform = getPushPlatform();
  if (!platform || platform === 'web') {
    return { status: 'unsupported', granted: false, registered: false };
  }

  try {
    await ensureAndroidReminderChannel();

    const projectId = getExpoProjectId();
    const pushToken = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    await registerPushToken({
      platform,
      token: pushToken.data,
      deviceId: await getKitabuDeviceId(),
    });

    return {
      status: 'granted',
      granted: true,
      registered: true,
      token: pushToken.data,
    };
  } catch (registrationError) {
    const errorMessage =
      registrationError instanceof Error ? registrationError.message : 'Push token registration failed';
    if (!/sign in again|authentication required/i.test(errorMessage)) {
      console.warn('[pushNotifications] Push token registration failed', registrationError);
    }
    return {
      status: 'error',
      granted: true,
      registered: false,
      errorMessage,
    };
  }
}

export async function registerPushNotificationsIfGranted(): Promise<PushRegistrationResult> {
  if (Platform.OS === 'web') {
    return { status: 'unsupported', granted: false, registered: false };
  }

  try {
    const permission = await Notifications.getPermissionsAsync();
    if (permission.status !== 'granted') {
      return { status: 'denied', granted: false, registered: false };
    }
  } catch (permissionError) {
    console.warn('[pushNotifications] Permission check failed', permissionError);
    return { status: 'error', granted: false, registered: false };
  }

  return registerGrantedPushNotifications();
}

export async function requestAndRegisterPushNotifications(): Promise<PushRegistrationResult> {
  const permission = await requestPushPermission();
  if (!permission.granted) {
    return { ...permission, registered: false };
  }

  return registerGrantedPushNotifications();
}

export function addPushNotificationListeners(input: {
  onReceived?: (notification: Notifications.Notification) => void;
  onResponse?: (response: Notifications.NotificationResponse) => void;
}) {
  if (Platform.OS === 'web') {
    return () => undefined;
  }

  const received = Notifications.addNotificationReceivedListener(notification => {
    input.onReceived?.(notification);
  });
  const response = Notifications.addNotificationResponseReceivedListener(notificationResponse => {
    input.onResponse?.(notificationResponse);
  });

  return () => {
    received.remove();
    response.remove();
  };
}
