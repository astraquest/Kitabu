import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const memoryStore = new Map<string, string>();
// Expo SecureStore keys may only contain letters, numbers, ".", "-", and "_".
// A colon here makes every native read/write fail and silently fall back to memory.
const securePrefix = 'secure.';
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
  if (Platform.OS === 'web') {
    try {
      return await AsyncStorage.getItem(`${securePrefix}${key}`);
    } catch {
      return memoryStore.get(`${securePrefix}${key}`) ?? null;
    }
  }

  try {
    const value = await withTimeout(
      SecureStore.getItemAsync(`${securePrefix}${key}`),
      SECURE_STORAGE_TIMEOUT_MS,
    );
    return value ?? null;
  } catch {
    return null;
  }
}

async function setSecureItem(key: string, value: string) {
  memoryStore.set(`${securePrefix}${key}`, value);

  if (Platform.OS === 'web') {
    try {
      await AsyncStorage.setItem(`${securePrefix}${key}`, value);
    } catch {
      // Keep the in-memory copy when browser persistence is unavailable.
    }
    return;
  }

  try {
    await withTimeout(
      SecureStore.setItemAsync(`${securePrefix}${key}`, value),
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

export async function removeWebStorageKey(key: string): Promise<void> {
  memoryStore.delete(key);

  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // The in-memory copy is already cleared when browser persistence fails.
  }
}
