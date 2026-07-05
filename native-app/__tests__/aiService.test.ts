jest.mock('../src/services/runtimeConfig', () => ({
  fetchKitabuApi: jest.fn(),
}));

jest.mock('../src/services/requestHelpers', () => ({
  buildKitabuRequestHeaders: jest.fn(() =>
    Promise.resolve({ 'Content-Type': 'application/json' }),
  ),
  readJsonResponse: jest.fn(async response => {
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  }),
}));

import { askHomeworkHelper } from '../src/services/aiService';
import { fetchKitabuApi } from '../src/services/runtimeConfig';

const mockFetchKitabuApi = fetchKitabuApi as jest.Mock;

function mockAiText(text: string) {
  mockFetchKitabuApi.mockResolvedValue({
    ok: true,
    text: () => Promise.resolve(JSON.stringify({ text })),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

test('answers simple greetings without calling the AI proxy', async () => {
  await expect(askHomeworkHelper('helo')).resolves.toBe(
    'Hi! What are we working on today?',
  );

  expect(mockFetchKitabuApi).not.toHaveBeenCalled();
});

test('sends mastery-focused chat instructions to the AI proxy', async () => {
  mockAiText('Start with one small step. What do you think comes next?');

  await askHomeworkHelper('Help me with fractions', [], 'chat');

  const [, init] = mockFetchKitabuApi.mock.calls[0];
  const body = JSON.parse(init.body);

  expect(body.systemInstruction).toContain('1-3 short sentences');
  expect(body.systemInstruction).toContain('Do not dump the full answer');
  expect(body.systemInstruction).toContain('Ask only one short question');
  expect(body.systemInstruction).toContain('Never ask a questionnaire');
});

test('compacts long chat responses at a natural boundary', async () => {
  mockAiText(
    [
      'Great question.',
      'A fraction shows equal parts of a whole.',
      'The bottom number tells how many equal parts the whole has.',
      'The top number tells how many parts we are using.',
      'For example, three quarters means the whole is split into four equal parts and we have three of them.',
      'You can compare fractions by checking if the pieces are the same size.',
      'If the denominators match, compare the top numbers.',
      'Now try one: which is bigger, three eighths or five eighths?',
    ].join(' '),
  );

  const response = await askHomeworkHelper('Explain fractions', [], 'chat');

  expect(response.split(/\s+/).length).toBeLessThanOrEqual(85);
  expect(response).toMatch(/[.!?]$/);
});

test('keeps short answer-only responses interactive', async () => {
  mockAiText('A noun names a person, place, or thing.');

  const response = await askHomeworkHelper('What is a noun?', [], 'chat');

  expect(response).toBe(
    'A noun names a person, place, or thing. Want to try the next step?',
  );
});
