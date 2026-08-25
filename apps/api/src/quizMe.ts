export type QuizMeGeneratedQuestion = {
  type: 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY';
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
};

export function quizMeQuestionKey(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

export function parseQuizMeGeneratedQuestions(value: string, expectedCount: number): QuizMeGeneratedQuestion[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as { questions?: unknown }).questions)) return null;
  const questions = (parsed as { questions: unknown[] }).questions;
  if (questions.length !== expectedCount) return null;
  const seen = new Set<string>();
  const normalized: QuizMeGeneratedQuestion[] = [];
  for (const item of questions) {
    if (!item || typeof item !== 'object') return null;
    const record = item as Record<string, unknown>;
    const type = record.type;
    const prompt = typeof record.text === 'string' ? record.text.trim() : '';
    const answer = typeof record.correctAnswer === 'string' ? record.correctAnswer.trim() : typeof record.correctAnswer === 'boolean' ? String(record.correctAnswer) : '';
    const explanation = typeof record.explanation === 'string' ? record.explanation.trim() : '';
    if (!prompt || !answer || !['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY'].includes(String(type))) return null;
    const key = quizMeQuestionKey(prompt);
    if (seen.has(key)) return null;
    seen.add(key);
    const options = Array.isArray(record.options)
      ? record.options.filter((option): option is string => typeof option === 'string' && option.trim().length > 0).map(option => option.trim())
      : [];
    if (type === 'MCQ') {
      if (options.length < 2 || options.length > 6 || !options.some(option => quizMeQuestionKey(option) === quizMeQuestionKey(answer))) return null;
    } else if (type === 'TRUE_FALSE') {
      if (options.length !== 2 || !options.some(option => quizMeQuestionKey(option) === 'true') || !options.some(option => quizMeQuestionKey(option) === 'false')) return null;
      if (!['true', 'false'].includes(quizMeQuestionKey(answer))) return null;
    } else if (options.length > 0) {
      return null;
    }
    normalized.push({ type: type as QuizMeGeneratedQuestion['type'], prompt, options, correctAnswer: answer, explanation });
  }
  return normalized;
}
