import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../data/quiz-bank/KEN/CBC/questions/grade-1');
const tags = ['quiz_me', 'take_quiz', 'quiz_battle', 'homework', 'flashcards', 'games'];
const choices = (correct, first, second, third) => [correct, first, second, third];
const imageFor = value => `image-library/v1/${value}.png`;
const contexts = [
  'school', 'home', 'the reading corner', 'morning work', 'a friend visit',
  'the class table', 'story time', 'break time', 'a game', 'a lesson',
  'art time', 'the library', 'a family visit', 'a class visit', 'play time',
  'the school garden', 'a clean-up time', 'a music lesson', 'a reading group', 'a morning assembly',
];

const englishWords = [
  ['apple', 'A', 'P', 'L', 'M'], ['banana', 'B', 'N', 'M', 'T'], ['book', 'B', 'K', 'T', 'S'], ['cat', 'C', 'A', 'D', 'M'],
  ['dog', 'D', 'O', 'G', 'P'], ['ball', 'B', 'A', 'L', 'R'],
];
const english = Array.from({ length: 100 }, (_, index) => {
  const number = index + 1;
  const [word, correct, first, second, third] = englishWords[index % englishWords.length];
  const type = index % 5;
  const context = contexts[Math.floor(index / englishWords.length)];
  const prompt = type === 0
    ? `At ${context}, look at the ${word} picture. Which letter does ${word} begin with?`
    : type === 1
      ? `At ${context}, look at the ${word} picture. Which word names it?`
    : type === 2
        ? `At ${context}, look at the ${word} picture. The teacher says, “Point to the ${word}.” What should you do?`
        : type === 3
          ? `At ${context}, look at the ${word} picture. Complete the sentence: This __ a ${word}.`
          : `At ${context}, look at the ${word} picture while the teacher speaks. What should you do first?`;
  const correctAnswer = type === 0 ? correct : type === 1 ? word : type === 2 ? `Point to the ${word}.` : type === 3 ? 'is' : 'Look at the teacher and listen';
  const options = type === 0 ? choices(correct, first, second, third)
    : type === 1 ? choices(word, 'table', 'shoe', 'tree')
    : type === 2 ? choices(`Point to the ${word}.`, 'Turn away.', 'Close your eyes.', 'Talk to a friend.')
    : type === 3 ? choices('is', 'am', 'are', 'be')
    : choices('Look at the teacher and listen', 'Talk to a friend', 'Run away', 'Close your ears');
  return { questionNumber: number, type: 'MCQ', prompt, options, correctAnswer, explanation: type === 0 ? `${word[0].toUpperCase()} is the first letter in ${word}.` : type === 1 ? `The picture is a ${word}.` : type === 2 ? `Pointing to the ${word} follows the teacher's instruction.` : type === 3 ? 'We use is with This.' : 'Careful listeners face the speaker and listen.', difficulty: (index % 5) + 1, strandTitle: type === 3 ? 'Language Use' : 'Listening and Speaking', subStrandTitle: type === 0 || type === 1 ? 'Pronunciation and Vocabulary' : type === 2 || type === 4 ? 'Attentive Listening' : 'Language Structures', learningOutcome: type === 3 ? 'Use am, is and are in simple sentences.' : 'Listen, speak and use familiar English words clearly.', cognitiveLevel: type === 0 ? 'recall' : type === 1 ? 'understand' : 'apply', featureTags: tags, imageKey: imageFor(word) };
});
const objects = ['apple', 'banana', 'ball', 'book', 'cat', 'dog'];
const math = [];
const addMath = (prompt, answer, options, explanation, difficulty = 2, visual) => math.push({
  questionNumber: math.length + 1, type: 'MCQ', prompt, options, correctAnswer: String(answer), explanation,
  difficulty, strandTitle: 'Numbers', subStrandTitle: 'Number Concept',
  learningOutcome: 'Count, compare and use numbers up to 20 in everyday activities.',
  cognitiveLevel: difficulty > 2 ? 'apply' : 'understand', featureTags: tags, ...(visual ? { imageKey: visual.imageKey, visual } : {}),
});
const numberOptions = (answer, distractors) => [String(answer), ...distractors.map(String)];
const pictureAddition = (left, right, object, options) => {
  const answer = left + right;
  addMath(`${left} + ${right} = ?`, answer, numberOptions(answer, options), `${left} plus ${right} equals ${answer}.`, 1 + Number(answer > 8), {
    kind: 'picture_group', equation: `${left} + ${right}`, imageKey: imageFor(object), groups: [{ count: left }, { count: right }],
  });
};
[
  [1, 2, 'apple', [2, 4, 1]], [2, 3, 'banana', [4, 6, 3]], [3, 2, 'ball', [4, 6, 3]],
  [4, 1, 'book', [4, 6, 3]], [2, 4, 'cat', [5, 7, 4]], [3, 3, 'dog', [5, 7, 4]],
  [5, 2, 'apple', [6, 8, 5]], [4, 4, 'banana', [7, 9, 6]], [6, 3, 'ball', [8, 10, 7]],
  [5, 5, 'book', [9, 11, 8]], [7, 2, 'cat', [8, 10, 7]], [6, 4, 'dog', [9, 11, 8]],
  [8, 3, 'apple', [10, 12, 9]], [7, 4, 'banana', [10, 12, 9]], [9, 2, 'ball', [10, 12, 9]],
  [6, 6, 'book', [11, 13, 10]], [8, 4, 'cat', [11, 13, 10]], [7, 5, 'dog', [11, 13, 10]],
  [9, 4, 'apple', [12, 14, 11]], [8, 5, 'banana', [12, 14, 11]],
].forEach(([left, right, object, options]) => pictureAddition(left, right, object, options));

[
  ['1 + 3 = ?', 4, [3, 5, 2]], ['What is 4 + 2?', 6, [5, 7, 4]], ['5 + 3 = ?', 8, [7, 9, 6]],
  ['What is 6 + 4?', 10, [9, 11, 8]], ['9 + 5 = ?', 14, [13, 15, 12]], ['What is 8 + 6?', 14, [13, 15, 12]],
  ['9 + 7 = ?', 16, [15, 17, 14]], ['What is 10 + 5?', 15, [14, 16, 13]], ['11 + 3 = ?', 14, [13, 15, 12]],
  ['What is 12 + 4?', 16, [15, 17, 14]], ['13 + 2 = ?', 15, [14, 16, 13]], ['What is 5 + 4?', 9, [8, 10, 7]],
  ['15 + 3 = ?', 18, [17, 19, 16]], ['What is 16 + 2?', 18, [17, 19, 16]], ['9 + 9 = ?', 18, [17, 19, 16]],
  ['What is 7 + 7?', 14, [13, 15, 12]], ['6 + 8 = ?', 14, [13, 15, 12]], ['What is 11 + 6?', 17, [16, 18, 15]],
  ['12 + 7 = ?', 19, [18, 20, 17]], ['What is 10 + 10?', 20, [19, 18, 10]],
].forEach(([prompt, answer, distractors], index) => addMath(prompt, answer, numberOptions(answer, distractors), `${prompt.replace('?', '')} ${answer}.`, 2 + (index % 2)));

[
  ['5 - 2 = ?', 3, [2, 4, 1]], ['What is 6 - 1?', 5, [4, 6, 3]], ['7 - 3 = ?', 4, [3, 5, 2]],
  ['What is 8 - 4?', 4, [3, 5, 2]], ['9 - 2 = ?', 7, [6, 8, 5]], ['What is 10 - 5?', 5, [4, 6, 3]],
  ['11 - 3 = ?', 8, [7, 9, 6]], ['What is 12 - 4?', 8, [7, 9, 6]], ['13 - 5 = ?', 8, [7, 9, 6]],
  ['What is 14 - 6?', 8, [7, 9, 6]], ['15 - 7 = ?', 8, [7, 9, 6]], ['What is 16 - 8?', 8, [7, 9, 6]],
  ['17 - 9 = ?', 8, [7, 9, 6]], ['What is 18 - 10?', 8, [7, 9, 6]], ['19 - 4 = ?', 15, [14, 16, 13]],
  ['What is 20 - 6?', 14, [13, 15, 12]], ['13 - 1 = ?', 12, [11, 13, 10]], ['What is 18 - 7?', 11, [10, 12, 9]],
  ['16 - 5 = ?', 11, [10, 12, 9]], ['What is 20 - 9?', 11, [10, 12, 9]],
].forEach(([prompt, answer, distractors], index) => addMath(prompt, answer, numberOptions(answer, distractors), `${prompt.replace('?', '')} ${answer}.`, 2 + (index % 2)));

[
  ['Which number comes after 6?', 7, [5, 8, 9]], ['Which number comes before 9?', 8, [7, 10, 6]],
  ['Which number comes after 12?', 13, [11, 14, 10]], ['Which number comes before 15?', 14, [13, 16, 12]],
  ['What number is missing? 2, 3, __, 5', 4, [1, 6, 7]], ['What number is missing? 7, __, 9, 10', 8, [6, 10, 11]],
  ['What number is missing? 14, 15, __, 17', 16, [13, 18, 19]], ['What number is missing? __, 5, 6, 7', 4, [3, 8, 9]],
  ['Which number comes after 19?', 20, [18, 17, 10]], ['Which number comes before 11?', 10, [9, 12, 8]],
  ['What number is missing? 9, 10, __, 12', 11, [8, 13, 14]], ['What number is missing? 16, __, 18, 19', 17, [15, 20, 14]],
  ['Which number comes after 3?', 4, [2, 5, 6]], ['Which number comes before 20?', 19, [18, 17, 10]],
  ['What number is missing? 11, __, 13, 14', 12, [10, 15, 16]],
].forEach(([prompt, answer, distractors], index) => addMath(prompt, answer, numberOptions(answer, distractors), `${answer} completes the counting order.`, 1 + (index % 2)));

[
  ['Which number is greater: 5 or 3?', 5, [3, 4, 2]], ['Which number is greater: 12 or 15?', 15, [12, 14, 16]],
  ['Which number is smaller: 7 or 9?', 7, [9, 8, 6]], ['Which number is smaller: 18 or 16?', 16, [18, 17, 15]],
  ['Which number is greater: 10 or 8?', 10, [8, 9, 11]], ['Which number is smaller: 4 or 6?', 4, [6, 5, 3]],
  ['What number is missing? 1, 3, 5, __', 7, [6, 8, 9]], ['What number is missing? 2, 4, __, 8', 6, [5, 7, 10]],
  ['What number is missing? 10, 12, 14, __', 16, [15, 17, 18]], ['What number is missing? 20, 18, __, 14', 16, [15, 17, 12]],
  ['Which number is greater: 17 or 19?', 19, [17, 18, 20]], ['Which number is smaller: 13 or 11?', 11, [13, 12, 10]],
  ['What number is missing? 5, 10, 15, __', 20, [18, 19, 10]], ['What number is missing? 3, 6, 9, __', 12, [10, 11, 15]],
  ['Which number is greater: 14 or 12?', 14, [12, 13, 15]],
].forEach(([prompt, answer, distractors], index) => addMath(prompt, answer, numberOptions(answer, distractors), `${answer} is the number that fits.`, 2 + (index % 2)));

[
  ['What comes next? 2, 4, 2, 4, __', 2, [4, 3, 5]], ['What comes next? 1, 2, 1, 2, __', 1, [2, 3, 4]],
  ['What comes next? 5, 6, 5, 6, __', 5, [6, 4, 7]], ['What comes next? 3, 6, 3, 6, __', 3, [6, 4, 9]],
  ['What comes next? 10, 9, 10, 9, __', 10, [9, 8, 11]], ['What comes next? 7, 8, 7, 8, __', 7, [8, 6, 9]],
  ['What comes next? 1, 3, 5, 7, __', 9, [8, 10, 6]], ['What comes next? 2, 5, 8, __', 11, [10, 12, 9]],
  ['What comes next? 20, 18, 16, __', 14, [15, 13, 12]], ['What comes next? 4, 8, 12, __', 16, [14, 15, 18]],
].forEach(([prompt, answer, distractors], index) => addMath(prompt, answer, numberOptions(answer, distractors), `${answer} continues the number pattern.`, 2 + (index % 2)));

if (math.length !== 100) throw new Error(`Expected 100 mathematics questions, found ${math.length}.`);

for (const question of [...english, ...math]) {
  if (/\bat\s+at\b/i.test(question.prompt)) throw new Error(`Repeated context token in question ${question.questionNumber}`);
  if (/picture\. Which number shows \d+\s+\w+s\?/i.test(question.prompt)) throw new Error(`Single-image quantity mismatch in question ${question.questionNumber}`);
}

for (const question of english) {
  if (/picture's morning visit|before using the|which word names the picture:/i.test(question.prompt)) {
    throw new Error(`English question ${question.questionNumber} has an unnatural picture context.`);
  }
}

for (const question of english.filter(question => /Which letter does .+ begin with\?$/i.test(question.prompt))) {
  const word = question.prompt.match(/does ([a-z]+) begin/i)?.[1];
  if (!word || question.correctAnswer !== word[0].toUpperCase()) {
    throw new Error(`First-letter question ${question.questionNumber} has an incorrect answer.`);
  }
  if (!question.explanation.startsWith(`${question.correctAnswer} is the first letter`)) {
    throw new Error(`First-letter question ${question.questionNumber} has an inconsistent explanation.`);
  }
}

for (const question of math.filter(question => /If you add \d+ more counter/.test(question.prompt))) {
  const add = Number(question.prompt.match(/add (\d+) more counter/)?.[1]);
  const expected = add === 1 ? '1 more counter,' : `${add} more counters,`;
  if (!question.prompt.includes(expected)) {
    throw new Error(`Math question ${question.questionNumber} has incorrect counter pluralization.`);
  }
}

mkdirSync(root, { recursive: true });
for (const [name, subjectName, questions] of [['english', 'English', english], ['mathematics', 'Mathematics', math]]) {
  writeFileSync(resolve(root, `${name}.json`), `${JSON.stringify({ countryCode: 'KEN', curriculumCode: 'CBC', gradeLevel: 'Grade 1', subjectId: name, subjectName, questions }, null, 2)}\n`);
}
