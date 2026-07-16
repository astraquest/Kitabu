import { askHomeworkHelper } from '../src/services/aiService';

test('uses five concise named greeting responses interchangeably', async () => {
  const replies: string[] = [];

  for (let index = 0; index < 5; index += 1) {
    replies.push(
      await askHomeworkHelper('hello', [], 'chat', undefined, {
        grade: 'Grade 10',
        studentName: 'Amina Njeri',
      }),
    );
  }

  expect(new Set(replies)).toEqual(
    new Set([
      'Hi, Amina! What can I help you with today?',
      'Hello, Amina! What would you like help with?',
      'Hey, Amina! What are we working on today?',
      'Hi there, Amina! What do you need a hand with?',
      'Good to see you, Amina! What can we tackle together?',
    ]),
  );
  expect(replies.every(reply => !reply.includes('\n'))).toBe(true);
});

test('subject shortcuts ask the named student what they need in one sentence', async () => {
  await expect(
    askHomeworkHelper('I need help with Mathematics', [], 'chat', undefined, {
      grade: 'Grade 10',
      studentName: 'Kitabu Demo Student',
    }),
  ).resolves.toBe('Sure, Student—what do you need help with in Mathematics?');
});
