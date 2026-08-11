jest.mock('../src/services/apiClient', () => ({
  apiRequest: jest.fn(),
}));

import { apiRequest } from '../src/services/apiClient';
import {
  getLocalCalendarDateKey,
  requestDailyStudentWelcome,
} from '../src/services/dailyWelcomeService';

const audio = {
  base64Audio: 'AQID',
  mimeType: 'audio/wav',
  model: 'test-model',
  voice: 'Samora',
};

beforeEach(() => {
  jest.clearAllMocks();
});

test('formats the local calendar date without UTC conversion', () => {
  expect(getLocalCalendarDateKey(new Date(2026, 7, 12, 23, 30))).toBe('2026-08-12');
});

test('requests once for the local day and returns only a valid ready response', async () => {
  (apiRequest as jest.Mock).mockResolvedValue({ status: 'ready', text: 'Hi Amina, welcome back to Kitabu. Let’s get started.', audio });
  const response = await requestDailyStudentWelcome('2026-08-12');

  expect(apiRequest).toHaveBeenCalledTimes(1);
  expect(apiRequest).toHaveBeenCalledWith('/me/daily-welcome', expect.objectContaining({ method: 'POST' }));
  expect(response.status).toBe('ready');
  if (response.status !== 'ready') {
    throw new Error('Expected a ready daily welcome response');
  }
});

test('does not treat pending or malformed audio as playable', async () => {
  (apiRequest as jest.Mock).mockResolvedValueOnce({ status: 'pending', text: 'Hi Amina, welcome back to Kitabu. Let’s get started.' });
  expect((await requestDailyStudentWelcome('2026-08-12')).status).toBe('pending');

  (apiRequest as jest.Mock).mockResolvedValueOnce({ status: 'ready', text: '', audio });
  expect((await requestDailyStudentWelcome('2026-08-13')).status).toBe('unavailable');
});
