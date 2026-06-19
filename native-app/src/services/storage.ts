import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

const memoryStore = new Map<string, string>();
const securePrefix = 'secure:';
const SECURE_STORAGE_TIMEOUT_MS = 2500;

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('Secure storage timed out')), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

async function getSecureItem(key: string) {
  try {
    const credentials = await withTimeout(
      Keychain.getGenericPassword({
        service: `${securePrefix}${key}`,
      }),
      SECURE_STORAGE_TIMEOUT_MS,
    );
    return credentials ? credentials.password : null;
  } catch {
    return null;
  }
}

async function setSecureItem(key: string, value: string) {
  memoryStore.set(`${securePrefix}${key}`, value);

  try {
    await withTimeout(
      Keychain.setGenericPassword(key, value, {
        service: `${securePrefix}${key}`,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }),
      SECURE_STORAGE_TIMEOUT_MS,
    );
  } catch {
    memoryStore.set(`${securePrefix}${key}`, value);
  }
}

async function getItem(key: string) {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value !== null) {
      return value;
    }
  } catch {
    // Fall back to in-memory storage when native persistence is unavailable.
  }

  return memoryStore.get(key) ?? null;
}

async function setItem(key: string, value: string) {
  memoryStore.set(key, value);

  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    // Keep the in-memory copy so the session remains usable.
  }
}

export async function loadSecureJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = (await getSecureItem(key)) ?? memoryStore.get(`${securePrefix}${key}`) ?? null;
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function saveSecureJson<T>(key: string, value: T): Promise<void> {
  try {
    await setSecureItem(key, JSON.stringify(value));
  } catch {
    // Secure persistence errors should not break the UI flow.
  }
}

export async function loadJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function saveJson<T>(key: string, value: T): Promise<void> {
  try {
    await setItem(key, JSON.stringify(value));
  } catch {
    // Persistence errors should not break the UI flow.
  }
}
