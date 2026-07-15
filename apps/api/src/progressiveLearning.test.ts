import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildProgressiveLearningPath,
  buildMathematicsLearningPath,
  getProgressiveLessonDefinition,
  gradeProgressiveLessonStep,
  hasProgressiveLearningPath,
  listProgressiveLessonDefinitions,
  serializeProgressiveClassifyAnswer,
  serializeProgressiveSequenceAnswer
} from './progressiveLearning.js';

test('publishes six complete Mathematics lessons without answer keys', () => {
  const lessons = listProgressiveLessonDefinitions({ grade: 'Grade 7', subjectId: 'math' });
  assert.equal(lessons.length, 6);

  for (const lesson of lessons) {
    assert.equal(lesson.steps.length, 5);
    assert.equal(lesson.steps.filter(step => step.phase === 'checkpoint').length, 3);
    assert.doesNotMatch(JSON.stringify(lesson), /"answer"\s*:/);
  }
});

test('grades normalized answers on the server and returns authored remediation', () => {
  const lesson = getProgressiveLessonDefinition('math-g7-equality-balance');
  assert.ok(lesson);
  const firstStep = lesson.steps[0];

  assert.deepEqual(
    gradeProgressiveLessonStep(lesson.lessonKey, firstStep.id, ' 4   ZEBRAS '),
    {
      isCorrect: true,
      phase: 'guided',
      misconceptionCode: null,
      message: 'Exactly. A balanced scale shows equal values.',
      hint: 'Balanced means the total value on the left equals the total value on the right.'
    }
  );

  const incorrect = gradeProgressiveLessonStep(lesson.lessonKey, firstStep.id, '2 zebras');
  assert.equal(incorrect?.isCorrect, false);
  assert.equal(incorrect?.misconceptionCode, 'EQUALITY_VISUAL_COUNT');
});

test('locks lessons sequentially and preserves completed progress', () => {
  const initial = buildMathematicsLearningPath([], 'Grade 7');
  assert.equal(initial.grade, 'Grade 7');
  assert.equal(initial.nodes[0].status, 'current');
  assert.ok(initial.nodes.slice(1).every(node => node.status === 'locked'));

  const next = buildMathematicsLearningPath([
    {
      lesson_key: initial.nodes[0].lessonKey,
      best_score: 100,
      status: 'completed',
      attempt_count: 1
    }
  ], 'Grade 7');
  assert.equal(next.nodes[0].status, 'completed');
  assert.equal(next.nodes[1].status, 'current');
  assert.equal(next.progressPercent, 17);
});

test('uses varied visual objects instead of relying on abstract cubes', () => {
  const objects = new Set<string>();
  for (const lesson of listProgressiveLessonDefinitions({ grade: 'Grade 7', subjectId: 'math' })) {
    for (const step of lesson.steps) {
      if (step.visual.kind === 'balance') {
        [...step.visual.left, ...step.visual.right].forEach(item => objects.add(item.object));
      } else if (step.visual.kind === 'groups') {
        objects.add(step.visual.object);
      } else if (step.visual.kind === 'market') {
        step.visual.items.forEach(item => objects.add(item.object));
      } else if (step.visual.kind === 'story') {
        step.visual.objects.forEach(item => objects.add(item.object));
      }
    }
  }

  assert.ok(objects.has('elephant'));
  assert.ok(objects.has('zebra'));
  assert.ok(objects.has('giraffe'));
  assert.ok(objects.has('flamingo'));
  assert.ok(objects.size >= 10);
});

const GRADE_4_SUBJECTS = [
  'math',
  'english',
  'science',
  'kiswahili',
  'social',
  'agriculture',
  'creative_arts',
  'religious_education',
  'ai_education'
];

test('publishes three substantive Grade 4 chapters for every supported app subject', () => {
  const allGrade4Lessons = listProgressiveLessonDefinitions({ grade: 'Grade 4' });
  assert.equal(allGrade4Lessons.length, GRADE_4_SUBJECTS.length * 3);
  assert.equal(new Set(allGrade4Lessons.map(lesson => lesson.lessonKey)).size, allGrade4Lessons.length);

  for (const subjectId of GRADE_4_SUBJECTS) {
    const lessons = listProgressiveLessonDefinitions({ grade: 'Grade 4', subjectId });
    assert.equal(lessons.length, 3, `${subjectId} should publish three chapters`);
    assert.ok(hasProgressiveLearningPath(subjectId, 'Grade 4'));

    for (const lesson of lessons) {
      assert.equal(lesson.grade, 'Grade 4');
      assert.ok(lesson.strand.length >= 3);
      assert.ok(lesson.subStrand.length >= 3);
      assert.ok(lesson.objective.length >= 30);
      assert.equal(lesson.steps.length, 5);
      assert.equal(lesson.steps.filter(step => step.phase === 'guided').length, 2);
      assert.equal(lesson.steps.filter(step => step.phase === 'checkpoint').length, 3);
      assert.ok(new Set(lesson.steps.map(step => step.visual.kind)).size >= 2, `${lesson.lessonKey} needs varied visuals`);
      assert.doesNotMatch(JSON.stringify(lesson), /"answer"\s*:/);

      for (const step of lesson.steps) {
        assert.ok(step.hint.length >= 20);
        assert.ok(step.successMessage.length >= 25);
        if (step.interaction) {
          assert.equal(step.options.length, 0);
          assert.ok(step.interaction.items.length >= 3);
        } else {
          assert.equal(step.options.length, 4);
          assert.equal(new Set(step.options).size, 4);
          const correctOptions = step.options.filter(option =>
            gradeProgressiveLessonStep(lesson.lessonKey, step.id, option)?.isCorrect
          );
          assert.equal(correctOptions.length, 1, `${step.id} must have exactly one gradeable answer`);
        }
      }
    }

    assert.ok(
      lessons.flatMap(lesson => lesson.steps).some(step => step.interaction),
      `${subjectId} needs at least one active interaction`
    );
  }
});

test('keeps interaction answers private and grades deterministic sequence and bucket responses', () => {
  const math = getProgressiveLessonDefinition('math-g4-place-value');
  assert.ok(math);
  const sequenceStep = math.steps.find(step => step.interaction?.kind === 'sequence_builder');
  assert.ok(sequenceStep);
  assert.doesNotMatch(JSON.stringify(sequenceStep), /sequence:pv-b/);
  const sequenceResponse = serializeProgressiveSequenceAnswer(['pv-b', 'pv-d', 'pv-a', 'pv-e', 'pv-c']);
  assert.equal(gradeProgressiveLessonStep(math.lessonKey, sequenceStep.id, sequenceResponse)?.isCorrect, true);
  assert.equal(
    gradeProgressiveLessonStep(math.lessonKey, sequenceStep.id, serializeProgressiveSequenceAnswer(['pv-a', 'pv-b', 'pv-c', 'pv-d', 'pv-e']))?.isCorrect,
    false
  );

  const values = getProgressiveLessonDefinition('religion-g4-values');
  assert.ok(values);
  const bucketStep = values.steps.find(step => step.interaction?.kind === 'bucket_sort');
  assert.ok(bucketStep);
  const bucketResponse = serializeProgressiveClassifyAnswer({
    harm: ['value-d', 'value-b'],
    trust: ['value-c', 'value-a']
  });
  assert.equal(gradeProgressiveLessonStep(values.lessonKey, bucketStep.id, bucketResponse)?.isCorrect, true);
  assert.doesNotMatch(JSON.stringify(bucketStep), /classify:harm=/);
});

test('does not state meaningful multiple-choice answers directly in clue captions', () => {
  for (const lesson of listProgressiveLessonDefinitions({ grade: 'Grade 4' })) {
    for (const step of lesson.steps) {
      if (step.interaction || step.visual.kind === 'cards' || step.visual.kind === 'classify') continue;
      const correct = step.options.find(option =>
        gradeProgressiveLessonStep(lesson.lessonKey, step.id, option)?.isCorrect
      );
      if (!correct || correct.trim().length < 4) continue;
      assert.ok(
        !step.visual.caption.toLocaleLowerCase('en-KE').includes(correct.trim().toLocaleLowerCase('en-KE')),
        `${step.id} caption reveals its answer`
      );
    }
  }
});

test('builds independent sequential Grade 4 paths and supports curriculum subject aliases', () => {
  const science = buildProgressiveLearningPath('science_technology', [], 'Grade 4');
  assert.equal(science.subjectId, 'science');
  assert.equal(science.subjectName, 'Science & Technology');
  assert.equal(science.nodes.length, 3);
  assert.equal(science.nodes[0].status, 'current');
  assert.ok(science.nodes.slice(1).every(node => node.status === 'locked'));

  const agriculture = buildProgressiveLearningPath('agriculture_nutrition', [], 'Grade 4');
  assert.equal(agriculture.subjectId, 'agriculture');
  assert.equal(agriculture.nodes.length, 3);

  assert.equal(buildProgressiveLearningPath('creative_arts_sports', [], 'Grade 4').subjectId, 'creative_arts');
  assert.equal(buildProgressiveLearningPath('cre_ire_hre', [], 'Grade 4').subjectId, 'religious_education');
});
