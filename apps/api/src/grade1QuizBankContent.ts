import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export type Grade1QuizBankQuestion = {
  questionNumber: number;
  prompt: string;
  options: [string, string, string, string];
  correctAnswer: string;
  explanation: string;
  cognitiveLevel: 'recall' | 'understand' | 'apply' | 'analyze' | 'create';
  subStrandTitle: string;
  imageKey: string;
  visual?: {
    kind: 'picture_group';
    equation: string;
    imageKey: string;
    groups: Array<{ count: number }>;
  };
};

type QuizBankFile = { questions: Grade1QuizBankQuestion[] };

function questionFile(subjectId: 'english' | 'mathematics') {
  const relative = ['data', 'quiz-bank', 'KEN', 'CBC', 'questions', 'grade-1', `${subjectId}.json`];
  const candidates = [
    fileURLToPath(new URL(`../data/quiz-bank/KEN/CBC/questions/grade-1/${subjectId}.json`, import.meta.url)),
    join(process.cwd(), ...relative),
    resolve(process.cwd(), 'apps', 'api', ...relative),
  ];
  const found = candidates.find(existsSync);
  if (!found) throw new Error(`Grade 1 ${subjectId} QuizBank file is missing.`);
  return found;
}

function load(subjectId: 'english' | 'mathematics'): Grade1QuizBankQuestion[] {
  const parsed = JSON.parse(readFileSync(questionFile(subjectId), 'utf8')) as QuizBankFile;
  if (!Array.isArray(parsed.questions)) throw new Error(`Grade 1 ${subjectId} QuizBank questions are invalid.`);
  return parsed.questions;
}

/** Returns canonical QuizBank questions so authored lessons cannot drift from their source. */
export function grade1QuizBankLessonQuestions(
  subjectId: 'english' | 'mathematics',
  subStrandTitle: string,
  count: number,
): Grade1QuizBankQuestion[] {
  const selected = load(subjectId).filter(question => question.subStrandTitle === subStrandTitle).slice(0, count);
  if (selected.length !== count) {
    throw new Error(`Grade 1 ${subjectId} QuizBank needs ${count} ${subStrandTitle} questions.`);
  }
  return selected;
}
