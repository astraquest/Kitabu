jest.mock('../src/services/apiClient', () => ({
  apiRequest: jest.fn(),
}));

import { apiRequest } from '../src/services/apiClient';
import { startQuizMeSession, submitQuizMeAnswer } from '../src/services/quizMeService';

const mockedApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe('QuizMe session service', () => {
  beforeEach(() => mockedApiRequest.mockReset());

  it('starts a server-owned session without client scoring fields', async () => {
    mockedApiRequest.mockResolvedValue({
      sessionId: 'session-1',
      grade: 'Grade 4',
      subjectId: 'mathematics',
      subjectName: 'Mathematics',
      strand: 'Numbers',
      subStrand: 'Place value',
      questionCount: 1,
      questions: [{ id: 1, sessionQuestionId: 'question-1', bankId: 'bank-1', type: 'MCQ', text: 'Which?', options: ['A', 'B'], difficulty: 2, strand: 'Numbers', subStrand: 'Place value' }],
    });

    const result = await startQuizMeSession({
      grade: 'Grade 4',
      subjectId: 'mathematics',
      subjectName: 'Mathematics',
      strand: 'Numbers',
      subStrand: 'Place value',
      questionCount: 1,
    });

    expect(mockedApiRequest).toHaveBeenCalledWith('/quiz-me/sessions', expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(String(mockedApiRequest.mock.calls[0][1]?.body))).not.toHaveProperty('correctAnswer');
    expect(result.questions[0]).not.toHaveProperty('correctAnswer');
  });

  it('submits answers to the authoritative answer endpoint', async () => {
    mockedApiRequest.mockResolvedValue({ sessionQuestionId: 'question-1', isCorrect: true, score: 1, feedback: 'Correct', alreadySubmitted: false });
    await submitQuizMeAnswer('session-1', 'question-1', 'A');
    expect(mockedApiRequest).toHaveBeenCalledWith(
      '/quiz-me/sessions/session-1/questions/question-1/answer',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ answer: 'A' }) }),
    );
  });
});
