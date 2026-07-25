import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCurriculumCompatibilityLesson,
  buildCurriculumCompatibilityPath,
  type CurriculumSubStrandContext
} from './curriculumCompatibilityLesson.js';
import {
  gradeProgressiveLessonDefinitionStep,
  toProgressiveLessonPublic
} from './progressiveLearning.js';

const context: CurriculumSubStrandContext = {
  sub_strand_id: 'topic-1',
  sub_strand_title: 'Weather Instruments',
  sub_strand_description: 'Connect each weather instrument to the quantity it measures.',
  outcomes: [{ text: 'Identify instruments used to measure weather conditions.' }],
  inquiry_questions: [{ text: 'How do weather measurements support daily decisions?' }],
  pages: [
    { title: 'Observe', content: 'A rain gauge measures rainfall collected over a known period.' },
    { title: 'Compare', content: 'A thermometer measures temperature while a wind vane shows direction.' },
    { title: 'Connect', content: 'Reliable records help people compare conditions over time.' }
  ],
  strand_title: 'Weather',
  grade_level: 'Grade 9',
  subject_id: 'general_science',
  subject_name: 'General Science'
};

test('converts stored curriculum pages into the progressive lesson contract', () => {
  const privateLesson = buildCurriculumCompatibilityLesson(context);
  const lesson = toProgressiveLessonPublic(privateLesson);

  assert.equal(lesson.lessonKey, 'curriculum-topic-1');
  assert.equal(lesson.subjectId, 'science');
  assert.equal(lesson.steps.length, 3);
  assert.equal(lesson.steps[0].phase, 'guided');
  assert.equal(lesson.steps[2].phase, 'checkpoint');
  assert.doesNotMatch(JSON.stringify(lesson), /"answer"\s*:/);
  assert.equal(
    gradeProgressiveLessonDefinitionStep(privateLesson, lesson.steps[2].id, 'Finish lesson')?.isCorrect,
    true
  );
});

test('builds progressive compatibility nodes without a legacy delivery branch', () => {
  const path = buildCurriculumCompatibilityPath({
    subjectId: 'general_science',
    subjectName: 'General Science',
    strands: [{
      title: 'Weather',
      subStrands: [
        {
          id: 'topic-1',
          title: 'Weather Instruments',
          description: context.sub_strand_description,
          outcomes: context.outcomes,
          isCompleted: false,
          needsRemediation: false,
          masteryScore: null
        },
        {
          id: 'topic-2',
          title: 'Weather Records',
          description: 'Record and compare weather data.',
          outcomes: [],
          isCompleted: false,
          needsRemediation: false,
          masteryScore: null
        }
      ]
    }]
  }, [], 'Grade 9');

  assert.equal(path.subjectId, 'science');
  assert.deepEqual(path.nodes.map(node => node.lessonKey), ['curriculum-topic-1', 'curriculum-topic-2']);
  assert.deepEqual(path.nodes.map(node => node.status), ['current', 'locked']);
  assert.doesNotMatch(JSON.stringify(path), /legacy/i);

  const practisedPath = buildCurriculumCompatibilityPath({
    subjectId: 'general_science',
    subjectName: 'General Science',
    strands: [{
      title: 'Weather',
      subStrands: [
        {
          id: 'topic-1',
          title: 'Weather Instruments',
          isCompleted: false,
          needsRemediation: false,
          masteryScore: null
        },
        {
          id: 'topic-2',
          title: 'Weather Records',
          isCompleted: false,
          needsRemediation: false,
          masteryScore: null
        }
      ]
    }]
  }, [{
    lesson_key: 'curriculum-topic-1',
    best_score: 67,
    status: 'needs_practice',
    attempt_count: 1
  }], 'Grade 9');
  assert.deepEqual(
    practisedPath.nodes.map(node => node.status),
    ['needs_practice', 'current']
  );
});

test('preserves canonical curriculum identity and numbering on lower-primary paths', () => {
  const path = buildCurriculumCompatibilityPath({
    subjectId: 'source-subject-uuid',
    subjectCode: 'mathematics',
    subjectName: 'Mathematical Activities',
    subjectOfficialName: 'Mathematical Activities',
    subjectDisplayName: 'Mathematics',
    strands: [{
      id: 'numbers-strand',
      number: '1.0',
      title: 'Numbers',
      subStrands: [{
        id: 'whole-numbers-sub-strand',
        number: '1.2',
        title: 'Whole Numbers',
        description: 'Read and write whole numbers.',
        isCompleted: false,
        needsRemediation: false,
        masteryScore: null
      }]
    }]
  }, [], 'Grade 3', [{
    lessonKey: 'math-grade-3-whole-numbers',
    lessonVersion: 2,
    strand: 'Numbers',
    subStrand: 'Whole Numbers',
    objective: 'Build fluency with whole numbers.',
    estimatedMinutes: 10
  }]);

  assert.equal(path.subjectId, 'mathematics');
  assert.equal(path.subjectName, 'Mathematics');
  assert.equal(path.subjectOfficialName, 'Mathematical Activities');
  assert.equal(path.nodes[0]?.id, 'whole-numbers-sub-strand');
  assert.equal(path.nodes[0]?.strandId, 'numbers-strand');
  assert.equal(path.nodes[0]?.strandNumber, '1.0');
  assert.equal(path.nodes[0]?.strandTitle, 'Numbers');
  assert.equal(path.nodes[0]?.subStrandNumber, '1.2');
  assert.equal(path.nodes[0]?.lessonKey, 'math-grade-3-whole-numbers');
  assert.equal(path.nodes[0]?.lessonVersion, 2);
});
