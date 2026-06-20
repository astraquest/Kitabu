import * as Haptics from 'expo-haptics';

export type HapticIntent =
  | 'success'
  | 'warning'
  | 'error'
  | 'selection'
  | 'impact';

export async function triggerHaptic(intent: HapticIntent) {
  try {
    if (intent === 'success') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }
    if (intent === 'warning') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (intent === 'error') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (intent === 'selection') {
      await Haptics.selectionAsync();
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    // Haptics should never block user flows.
  }
}
