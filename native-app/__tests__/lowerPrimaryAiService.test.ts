import {
  getLowerPrimaryAiFeedback,
  getLowerPrimaryPracticeVariant,
} from '../src/features/progressiveLearning/api/lowerPrimaryAiService';
import { apiJsonRequest } from '../src/services/requestHelpers';

jest.mock('../src/services/requestHelpers', () => ({
  apiJsonRequest: jest.fn(),
}));

const request = apiJsonRequest as jest.Mock;

const feedbackInput = {
  grade: 'Grade 1',
  subjectId: 'mathematics',
  lessonKey: 'g1-mass-compare',
  stepId: 'check-2',
  prompt: 'Which is heavier?',
  learnerResponse: 'Feather',
  authoredHint: 'Think about how hard it is to lift.',
  misconceptionCode: 'mass_confusion',
  attemptNumber: 2,
};

describe('lowerPrimaryAiService', () => {
  beforeEach(() => request.mockReset());

  it('posts feedback context and normalizes the safe display payload', async () => {
    request.mockResolvedValue({ message: '  Try lifting each one in your mind.  ', nextPrompt: 'Which needs more strength?' });

    await expect(getLowerPrimaryAiFeedback(feedbackInput)).resolves.toEqual({
      message: 'Try lifting each one in your mind.',
      nextPrompt: 'Which needs more strength?',
    });
    expect(request).toHaveBeenCalledWith('/learning/lower-primary/ai-feedback', {
      method: 'POST',
      body: JSON.stringify(feedbackInput),
    });
  });

  it('returns null when AI feedback is unavailable or malformed', async () => {
    request.mockRejectedValueOnce(new Error('offline'));
    await expect(getLowerPrimaryAiFeedback(feedbackInput)).resolves.toBeNull();

    request.mockResolvedValueOnce({ message: 10 });
    await expect(getLowerPrimaryAiFeedback(feedbackInput)).resolves.toBeNull();
  });

  it('accepts only a complete, bounded practice variant', async () => {
    request.mockResolvedValue({
      id: 'mass-variant-1',
      prompt: 'Pick the heavier object.',
      hint: 'Imagine lifting both.',
      options: ['Stone', 'Leaf', 2, ''],
      componentScene: { type: 'number-manipulatives' },
    });

    await expect(getLowerPrimaryPracticeVariant({
      grade: 'Grade 1', subjectId: 'mathematics', lessonKey: 'g1-mass-compare', stepId: 'check-2', attemptNumber: 3,
    })).resolves.toEqual({
      id: 'mass-variant-1',
      prompt: 'Pick the heavier object.',
      hint: 'Imagine lifting both.',
      options: ['Stone', 'Leaf'],
      componentScene: { type: 'number-manipulatives' },
    });
  });

  it('uses a null fallback for invalid or failed practice variants', async () => {
    request.mockResolvedValueOnce({ id: 'x', prompt: 'Try', hint: '', options: ['A', 'B'] });
    await expect(getLowerPrimaryPracticeVariant({
      grade: 'Grade 1', subjectId: 'mathematics', lessonKey: 'x', stepId: 'y', attemptNumber: 3,
    })).resolves.toBeNull();

    request.mockRejectedValueOnce(new Error('unavailable'));
    await expect(getLowerPrimaryPracticeVariant({
      grade: 'Grade 1', subjectId: 'mathematics', lessonKey: 'x', stepId: 'y', attemptNumber: 3,
    })).resolves.toBeNull();
  });
});
