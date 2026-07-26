import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearResponseSnapshot, loadResponseSnapshot, saveResponseSnapshot } from '../src/features/interactiveLearning/responseSnapshotStore';
import { enqueueCheck, loadQueuedChecks, replaceQueuedChecks } from '../src/features/progressiveLearning/api/offlineLearningStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

beforeEach(async () => AsyncStorage.clear());

test('restores only the response bound to the same scene and clears it safely', async () => {
  await saveResponseSnapshot('attempt:step', { sceneId: 'scene-a', response: '700000', savedAt: '2026-07-26T00:00:00.000Z' });
  expect(await loadResponseSnapshot('attempt:step', 'scene-a')).toMatchObject({ response: '700000' });
  expect(await loadResponseSnapshot('attempt:step', 'scene-b')).toBeNull();
  await clearResponseSnapshot('attempt:step');
  expect(await loadResponseSnapshot('attempt:step', 'scene-a')).toBeNull();
});

test('queues each idempotent check once and preserves unsent work', async () => {
  const item = { endpoint: '/check', body: '{"response":"700000"}', clientEventId: 'event-1' };
  await enqueueCheck(item);
  await enqueueCheck(item);
  expect(await loadQueuedChecks()).toEqual([item]);
  await replaceQueuedChecks([]);
  expect(await loadQueuedChecks()).toEqual([]);
});
