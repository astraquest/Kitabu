import { sanitizeTutorResponseForDisplay } from '../src/services/tutorResponseFormatting';

test('hides tutor scaffolding while retaining useful teaching content', () => {
  const response = `Photosynthesis Starter

* Hint: Think of photosynthesis as a food-making factory for plants.

* Question: What does light provide to the plant?

Your Turn... (Respond with your choice and brief reasoning)`;

  expect(sanitizeTutorResponseForDisplay(response)).toBe(
    'Think of photosynthesis as a food-making factory for plants.\nWhat does light provide to the plant?',
  );
});

test('removes choice-analysis narration but keeps the next focused question', () => {
  const response = `Clarifying Your Choice & Next Step

* Your Choice Analysis: You selected 3. Light, but expressed uncertainty ("not sure").
This is internal analysis that should not be shown.

* Focused Question to Strengthen Understanding:
What would happen to oxygen production in a completely dark room?

Your Turn... (Respond with your reasoning)`;

  expect(sanitizeTutorResponseForDisplay(response)).toBe(
    'What would happen to oxygen production in a completely dark room?',
  );
});
