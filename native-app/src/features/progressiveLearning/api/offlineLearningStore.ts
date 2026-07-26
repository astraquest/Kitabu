import AsyncStorage from '@react-native-async-storage/async-storage';

const LESSON_PREFIX = 'kitabu:progressive-lesson:v1:';
const QUEUE_KEY = 'kitabu:progressive-check-queue:v1';

export type QueuedCheck = { endpoint: string; body: string; clientEventId: string };

export async function cacheLessonStart(key: string, value: unknown) {
  await AsyncStorage.setItem(`${LESSON_PREFIX}${key}`, JSON.stringify(value));
}

export async function loadCachedLessonStart<T>(key: string): Promise<T | null> {
  try {
    const value = await AsyncStorage.getItem(`${LESSON_PREFIX}${key}`);
    return value ? JSON.parse(value) as T : null;
  } catch {
    return null;
  }
}

export async function enqueueCheck(check: QueuedCheck) {
  const queue = await loadQueuedChecks();
  if (!queue.some(item => item.clientEventId === check.clientEventId)) queue.push(check);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function loadQueuedChecks(): Promise<QueuedCheck[]> {
  try {
    const value = await AsyncStorage.getItem(QUEUE_KEY);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter(item => item && typeof item.endpoint === 'string' && typeof item.body === 'string' && typeof item.clientEventId === 'string') : [];
  } catch {
    return [];
  }
}

export async function replaceQueuedChecks(queue: QueuedCheck[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}
