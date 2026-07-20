import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildProgressiveLearningPath,
  gradeProgressiveLessonStep,
  hasProgressiveLearningPath,
  listProgressiveLessonDefinitions
} from './progressiveLearning.js';

const GRADES = ['Grade 1', 'Grade 2', 'Grade 3'] as const;
const SUBJECTS = [
  'english',
  'kiswahili',
  'math',
  'environmental',
  'cre',
  'ire',
  'hygiene_nutrition',
  'creative_activities'
] as const;

test('publishes substantive KICD chapters for each requested lower-primary subject', () => {
  for (const grade of GRADES) {
    const allLessons = listProgressiveLessonDefinitions({ grade });
    assert.equal(allLessons.length, grade === 'Grade 1' ? 32 : SUBJECTS.length * 3);
    assert.equal(new Set(allLessons.map(lesson => lesson.lessonKey)).size, allLessons.length);

    for (const subjectId of SUBJECTS) {
      const lessons = listProgressiveLessonDefinitions({ grade, subjectId });
      const expectedLessonCount = grade === 'Grade 1' && subjectId === 'environmental' ? 11 : 3;
      assert.equal(lessons.length, expectedLessonCount, `${grade}:${subjectId} chapter count`);
      assert.ok(hasProgressiveLearningPath(subjectId, grade));

      for (const lesson of lessons) {
        assert.equal(lesson.grade, grade);
        assert.ok(lesson.strand.length >= 3);
        assert.ok(lesson.subStrand.length >= 3);
        assert.ok(lesson.objective.length >= 30);
        assert.equal(lesson.steps.length, 5);
        assert.equal(lesson.steps.filter(step => step.phase === 'guided').length, 2);
        assert.equal(
          lesson.steps.filter(step => step.phase === 'checkpoint').length,
          lesson.steps.length - 2
        );
        assert.doesNotMatch(JSON.stringify(lesson), /"answer"\s*:/);

        for (const step of lesson.steps) {
          assert.ok(step.hint.length >= 20);
          assert.equal(step.interaction, undefined);
          assert.equal(step.options.length, 4);
          assert.equal(new Set(step.options).size, 4);
          const correct = step.options.filter(option =>
            gradeProgressiveLessonStep(lesson.lessonKey, step.id, option)?.isCorrect
          );
          assert.equal(correct.length, 1, `${step.id} must have exactly one answer`);
        }
      }
    }
  }
});

test('builds independent sequential paths for lower-primary subjects and math aliases', () => {
  const math = buildProgressiveLearningPath('mathematics', [], 'Grade 1');
  assert.equal(math.subjectId, 'math');
  assert.equal(math.subjectName, 'Mathematics');
  assert.equal(math.nodes.length, 3);
  assert.equal(math.nodes[0].status, 'current');
  assert.ok(math.nodes.slice(1).every(node => node.status === 'locked'));

  const creative = buildProgressiveLearningPath('creative_activities', [], 'Grade 3');
  assert.equal(creative.subjectName, 'Creative Activities');
  assert.equal(creative.nodes.length, 3);
});

test('uses short curriculum-aligned literacy challenges for Grade 1 English', () => {
  const lessons = listProgressiveLessonDefinitions({ grade: 'Grade 1', subjectId: 'english' });
  const bySubStrand = new Map(lessons.map(lesson => [lesson.subStrand, lesson]));
  const listening = bySubStrand.get('Attentive Listening');
  const vocabulary = bySubStrand.get('Pronunciation and Vocabulary');
  const structures = bySubStrand.get('Language Structures');

  assert.ok(listening);
  assert.ok(vocabulary);
  assert.ok(structures);
  assert.ok(lessons.every(lesson => lesson.lessonVersion === 3));
  assert.deepEqual(
    listening.steps.map(step => step.prompt),
    [
      'Teacher says, “Point to the door.” What should you do?',
      'Amina is speaking. What should Kamau do?',
      'Teacher says, “Stand up.” Which action matches?',
      'You hear, “Touch your head.” What should you touch?',
      'Which learner is listening well?'
    ]
  );
  assert.deepEqual(
    vocabulary.steps.map(step => step.prompt),
    [
      'Which letter completes CH _ IR?',
      'Which letter completes C _ T?',
      'Which letter completes S _ N?',
      'Which letter completes P _ N?',
      'Which letters complete B __ K?'
    ]
  );
  assert.deepEqual(
    structures.steps.map(step => step.prompt),
    [
      'Complete the sentence: I __ Amina.',
      'Complete the sentence: This __ a book.',
      'Complete the sentence: We __ happy.',
      'Asha is my sister. __ is kind.',
      'Complete the greeting: Good __!'
    ]
  );
  assert.equal(gradeProgressiveLessonStep(vocabulary.lessonKey, vocabulary.steps[0].id, 'A')?.isCorrect, true);
  assert.equal(gradeProgressiveLessonStep(vocabulary.lessonKey, vocabulary.steps[0].id, 'E')?.isCorrect, false);
  assert.deepEqual(vocabulary.steps.map(step => step.visual.kind), Array(5).fill('picture_word'));
  assert.deepEqual(
    vocabulary.steps.map(step =>
      step.visual.kind === 'picture_word' ? step.visual.caption : null
    ),
    ['chair', 'cat', 'sun', 'pen', 'book']
  );
  assert.equal(gradeProgressiveLessonStep(structures.lessonKey, structures.steps[0].id, 'am')?.isCorrect, true);
  assert.equal(gradeProgressiveLessonStep(structures.lessonKey, structures.steps[0].id, 'is')?.isCorrect, false);
  assert.doesNotMatch(
    lessons.flatMap(lesson => lesson.steps.map(step => step.prompt)).join(' '),
    /best demonstrates|recommended practice|best shows understanding/i
  );
});

test('uses the simplified English presentation pattern for Grade 1 Kiswahili', () => {
  const lessons = listProgressiveLessonDefinitions({ grade: 'Grade 1', subjectId: 'kiswahili' });
  const bySubStrand = new Map(lessons.map(lesson => [lesson.subStrand, lesson]));
  const greetings = bySubStrand.get('Kusikiliza na Kuzungumza: Maamkuzi');
  const instructions = bySubStrand.get('Kusikiliza na Kuzungumza: Maagizo');
  const vocabulary = bySubStrand.get('Kusikiliza na Kuzungumza: Msamiati');

  assert.ok(greetings);
  assert.ok(instructions);
  assert.ok(vocabulary);
  assert.ok(lessons.every(lesson => lesson.lessonVersion === 2));
  assert.deepEqual(
    greetings.steps.map(step => step.prompt),
    ['Asubuhi?', 'Ukiambiwa: Habari?', 'Mchana?', 'Jioni?', 'Ukiondoka?']
  );
  assert.deepEqual(
    instructions.steps.map(step => step.prompt),
    [
      'Mwalimu: Simama.',
      'Mwalimu: Keti.',
      'Mwalimu: Fungua kitabu.',
      'Mwalimu: Piga makofi.',
      'Mwalimu: Funga mlango.'
    ]
  );
  assert.deepEqual(
    vocabulary.steps.map(step =>
      step.visual.kind === 'picture_word'
        ? [step.visual.object, step.visual.wordPattern, step.visual.caption]
        : null
    ),
    [
      ['chair', 'K _ TI', 'kiti'],
      ['book', 'KITA _ U', 'kitabu'],
      ['pen', 'KALA _ U', 'kalamu'],
      ['table', 'ME _ A', 'meza'],
      ['pencil', 'PEN _ ELI', 'penseli']
    ]
  );
  assert.equal(
    gradeProgressiveLessonStep(vocabulary.lessonKey, vocabulary.steps[0].id, 'I')?.isCorrect,
    true
  );
  assert.equal(
    gradeProgressiveLessonStep(vocabulary.lessonKey, vocabulary.steps[0].id, 'A')?.isCorrect,
    false
  );
});

test('publishes all Grade 1 Environmental strands with picture-led science challenges', () => {
  const lessons = listProgressiveLessonDefinitions({ grade: 'Grade 1', subjectId: 'environmental' });
  const scienceLessons = listProgressiveLessonDefinitions({ grade: 'Grade 1', subjectId: 'science' });
  const bySubStrand = new Map(lessons.map(lesson => [lesson.subStrand, lesson]));
  const path = buildProgressiveLearningPath('environmental', [], 'Grade 1');
  const sciencePath = buildProgressiveLearningPath('science', [], 'Grade 1');

  assert.equal(scienceLessons.length, 11);
  assert.ok(hasProgressiveLearningPath('science', 'Grade 1'));
  assert.equal(path.nodes.length, 11);
  assert.equal(sciencePath.nodes.length, 11);
  assert.equal(sciencePath.subjectId, 'environmental');
  assert.equal(path.nodes[0].status, 'current');
  assert.ok(path.nodes.slice(1).every(node => node.status === 'locked'));

  assert.deepEqual(
    lessons.map(lesson => lesson.strand),
    [
      ...Array(5).fill('Social Environment'),
      ...Array(3).fill('Natural Environment'),
      ...Array(3).fill('Resources in Our Environment')
    ]
  );
  assert.deepEqual(
    lessons.map(lesson => lesson.subStrand),
    [
      'Cleaning My Body',
      'Our Home',
      'Family Needs',
      'Our School',
      'Our Market',
      'Weather and the Sky',
      'Soil',
      'Sound',
      'Water',
      'Plants',
      'Animals'
    ]
  );
  assert.ok(lessons.every(lesson => lesson.lessonVersion === 2));

  const body = bySubStrand.get('Cleaning My Body');
  const plants = bySubStrand.get('Plants');
  const animals = bySubStrand.get('Animals');
  assert.ok(body);
  assert.ok(plants);
  assert.ok(animals);
  assert.deepEqual(
    body.steps.map(step => step.visual.kind === 'picture_choice' ? step.visual.object : null),
    ['face', 'teeth', 'hand', 'foot', 'hair']
  );
  assert.deepEqual(
    plants.steps.map(step => step.visual.kind === 'picture_choice' ? step.visual.object : null),
    ['flower', 'leaf', 'stem', 'roots', 'roots']
  );
  assert.deepEqual(
    animals.steps.map(step => step.visual.kind === 'picture_choice' ? step.visual.object : null),
    ['goat', 'chicken', 'cat', 'giraffe', 'lion']
  );
  assert.equal(
    gradeProgressiveLessonStep(animals.lessonKey, animals.steps[0].id, 'Grass')?.isCorrect,
    true
  );
});

test('publishes only grade-appropriate arithmetic challenges in lower-primary Number Concept', () => {
  const expected = {
    'Grade 1': [
      [6, '+', 3, '9'],
      [10, '-', 4, '6'],
      [7, '+', 5, '12'],
      [13, '-', 6, '7'],
      [9, '+', 8, '17']
    ],
    'Grade 2': [
      [14, '-', 6, '8'],
      [7, '+', 8, '15'],
      [16, '-', 9, '7'],
      [5, '×', 3, '15'],
      [18, '÷', 3, '6']
    ],
    'Grade 3': [
      [4, '×', 6, '24'],
      [27, '÷', 3, '9'],
      [35, '-', 17, '18'],
      [16, '+', 29, '45'],
      [7, '×', 8, '56']
    ]
  } as const;

  for (const grade of GRADES) {
    const lesson = listProgressiveLessonDefinitions({ grade, subjectId: 'math' })
      .find(candidate => candidate.subStrand === 'Number Concept');
    assert.ok(lesson, `${grade} should include the Number Concept lesson`);
    assert.equal(lesson.steps.length, expected[grade].length);
    lesson.steps.forEach((step, index) => {
      const [leftOperand, operator, rightOperand, answer] = expected[grade][index];
      assert.deepEqual(step.visual, {
        kind: 'arithmetic',
        leftOperand,
        operator,
        rightOperand,
        caption: 'Work out the number sentence, then choose the answer that matches your calculation.'
      });
      assert.equal(
        gradeProgressiveLessonStep(lesson.lessonKey, step.id, answer)?.isCorrect,
        true
      );
    });
  }
});
