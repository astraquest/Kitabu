import * as Speech from 'expo-speech';

import { synthesizeSpeech } from '../src/services/aiService';
import { speechPlaybackBridge } from '../src/services/nativeBridges';

jest.mock('../src/services/aiService', () => ({
  synthesizeSpeech: jest.fn(() => Promise.reject(new Error('Gemini unavailable'))),
}));

test('server speech errors do not fall back to device speech', async () => {
  await expect(
    speechPlaybackBridge.speak('Choose the best answer.', { voiceName: 'Samora' }),
  ).rejects.toThrow('Gemini unavailable');
  expect(synthesizeSpeech).toHaveBeenCalledWith('Choose the best answer.', 'Samora');
  expect(Speech.speak).not.toHaveBeenCalled();
});
