import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

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

const REMINDER_CHANNEL_ID = 'daily-study-reminders';

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
