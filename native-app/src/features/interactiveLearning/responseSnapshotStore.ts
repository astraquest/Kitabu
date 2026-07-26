import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'kitabu:interactive-response:v1:';

export type ResponseSnapshot = { sceneId: string; response: string; savedAt: string };

export async function loadResponseSnapshot(key: string, sceneId: string): Promise<ResponseSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(`${PREFIX}${key}`);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<ResponseSnapshot>;
    return value.sceneId === sceneId && typeof value.response === 'string' && typeof value.savedAt === 'string'
      ? value as ResponseSnapshot
      : null;
  } catch {
    return null;
  }
}

export async function saveResponseSnapshot(key: string, snapshot: ResponseSnapshot): Promise<void> {
  await AsyncStorage.setItem(`${PREFIX}${key}`, JSON.stringify(snapshot));
}

export async function clearResponseSnapshot(key: string): Promise<void> {
  await AsyncStorage.removeItem(`${PREFIX}${key}`);
}
