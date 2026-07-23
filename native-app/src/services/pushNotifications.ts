import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

import { apiRequest } from './apiClient';
import { loadJson, saveJson } from './storage';

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
  tokenReady: boolean;
}

const REMINDER_CHANNEL_ID = 'daily-study-reminders';
const PENDING_PUSH_TOKEN_KEY = 'kitabu.pendingPushToken.v1';

interface StoredPushToken {
  platform: 'ios' | 'android';
  token: string;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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
    return { status: 'unsupported', granted: false, tokenReady: false };
  }

  try {
    // Android 13+ does not surface the notification permission dialog until
    // the app has created a channel. This must happen before requesting access.
    await ensureAndroidReminderChannel();
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
      const tokenReady = await persistExpoPushToken();
      return { status: 'granted', granted: true, tokenReady };
    }

    return { status: 'denied', granted: false, tokenReady: false };
  } catch (permissionError) {
    console.warn('[pushNotifications] Permission request failed', permissionError);
    return { status: 'error', granted: false, tokenReady: false };
  }
}

async function persistExpoPushToken() {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return false;
  }

  try {
    const configuredProjectId =
      Constants.easConfig?.projectId ||
      (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId ||
      (Constants.expoConfig?.extra?.kitabuExpoProjectId as string | undefined);
    const token = await Notifications.getExpoPushTokenAsync(
      configuredProjectId ? { projectId: configuredProjectId } : undefined,
    );
    await saveJson<StoredPushToken>(PENDING_PUSH_TOKEN_KEY, {
      platform: Platform.OS,
      token: token.data,
    });
    return true;
  } catch (tokenError) {
    // Permission remains granted. Registration is retried after authentication
    // and on subsequent app launches when connectivity/project metadata exists.
    console.warn('[pushNotifications] Expo push token unavailable', tokenError);
    return false;
  }
}

export async function registerPushTokenForAuthenticatedUser() {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return false;
  }

  let stored = await loadJson<StoredPushToken | null>(PENDING_PUSH_TOKEN_KEY, null);
  if (!stored) {
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted || !(await persistExpoPushToken())) {
      return false;
    }
    stored = await loadJson<StoredPushToken | null>(PENDING_PUSH_TOKEN_KEY, null);
  }

  if (!stored) {
    return false;
  }

  await apiRequest<{ registered: boolean }>('/notifications/push-token', {
    method: 'POST',
    body: JSON.stringify(stored),
  });
  return true;
}
