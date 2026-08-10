import AsyncStorage from '@react-native-async-storage/async-storage';

import { isKitabuDevelopmentWebRuntime } from './runtimeConfig';
import { removeWebStorageKey } from './storage';

// These are app-owned web persistence keys. Keep this list explicit so a
// development reset cannot remove unrelated storage owned by the host page.
const APP_STORAGE_KEYS = [
  'kitabu_native_profile',
  'kitabu_last_used_auth_role',
  'kitabu_optional_phone_number',
  'kitabu_try_one_bob_offer_seen_at',
  'kitabu_focus_mode',
  'kitabu_onboarding_preferences',
  'kitabu.pendingPushToken.v1',
  'kitabu_podcasts_active_tab',
  'kitabu:progressive-check-queue:v1',
];

// User-scoped and feature-scoped caches use stable app-owned prefixes.
const APP_STORAGE_PREFIXES = [
  'kitabu_downloaded_books:',
  'kitabu:interactive-response:v1:',
  'kitabu:progressive-lesson:v1:',
];

// SecureStore is backed by AsyncStorage on web (see storage.ts).
const SECURE_STORAGE_KEYS = [
  'secure.auth_session',
  'secure.login_credentials',
  'secure.kitabu_device_id',
];

let developmentWebResetPromise: Promise<void> | null = null;

async function clearDevelopmentWebState() {
  const keys = new Set([...APP_STORAGE_KEYS, ...SECURE_STORAGE_KEYS]);

  try {
    const storedKeys = await AsyncStorage.getAllKeys();
    storedKeys
      .filter(key => APP_STORAGE_PREFIXES.some(prefix => key.startsWith(prefix)))
      .forEach(key => keys.add(key));
  } catch {
    // Explicit keys are still cleared if key enumeration is unavailable.
  }

  await Promise.all(
    [...keys].map(key => removeWebStorageKey(key)),
  );
}

export async function resetDevelopmentWebStateOnce() {
  if (!isKitabuDevelopmentWebRuntime()) {
    return false;
  }

  // Module scope makes this once per page load, including React Strict Mode
  // effect replays and hook remounts during development.
  developmentWebResetPromise ??= clearDevelopmentWebState();
  await developmentWebResetPromise;
  return true;
}
