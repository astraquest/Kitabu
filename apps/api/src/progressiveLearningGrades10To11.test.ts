import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildProgressiveLearningPath,
  gradeProgressiveLessonStep,
  hasProgressiveLearningPath,
  listProgressiveLessonDefinitions,
  serializeProgressiveChoiceAnswer,
  serializeProgressiveClassifyAnswer
} from './progressiveLearning.js';

const GRADES = ['Grade 10', 'Grade 11'];
const SUBJECTS = ['math', 'english', 'kiswahili', 'science', 'social'];

test('publishes five progressive chapters for every Grade 10 and 11 core subject', () => {
  const keys = new Set<string>();
  for (const grade of GRADES) {
    for (const subjectId of SUBJECTS) {
      const lessons = listProgressiveLessonDefinitions({ grade, subjectId });
      assert.equal(lessons.length, 5, `${grade} ${subjectId} must publish five chapters`);
      assert.ok(hasProgressiveLearningPath(subjectId, grade));

      for (const lesson of lessons) {
        assert.equal(lesson.steps.length, 5);
        assert.equal(lesson.steps.filter(step => step.phase === 'guided').length, 2);
        assert.equal(lesson.steps.filter(step => step.phase === 'checkpoint').length, 3);
        assert.equal(new Set(lesson.steps.map(step => step.prompt)).size, 5);
        assert.ok(!keys.has(lesson.lessonKey), `duplicate lesson key ${lesson.lessonKey}`);
        keys.add(lesson.lessonKey);
      }

      const path = buildProgressiveLearningPath(subjectId, [], grade);
      assert.equal(path.nodes.length, 5);
      assert.equal(path.nodes[0]?.status, 'current');
      assert.ok(path.nodes.slice(1).every(node => node.status === 'locked'));
    }
  }
  assert.equal(keys.size, 50);
});

test('keeps answers private and grades every senior activity deterministically', () => {
  for (const grade of GRADES) {
    for (const subjectId of SUBJECTS) {
      for (const lesson of listProgressiveLessonDefinitions({ grade, subjectId })) {
        assert.doesNotMatch(JSON.stringify(lesson), /"answer"\s*:/);
        for (const step of lesson.steps) {
          const responses = step.interaction?.kind === 'bucket_sort'
            ? step.interaction.items.map(candidate => serializeProgressiveClassifyAnswer({
                supported: [candidate.id],
                rethink: step.interaction!.items.filter(item => item.id !== candidate.id).map(item => item.id)
              }))
            : step.interaction?.kind === 'choice_sprint'
              ? step.interaction.items.map(item => serializeProgressiveChoiceAnswer(item.id))
              : step.options;
          assert.equal(
            responses.filter(response => gradeProgressiveLessonStep(lesson.lessonKey, step.id, response)?.isCorrect).length,
            1,
            `${step.id} must accept exactly one answer`
          );
          assert.ok(step.hint.length >= 20);
        }
      }
    }
  }
});

test('normalizes senior QuizBank subject aliases to app subject ids', () => {
  assert.equal(buildProgressiveLearningPath('mathematics', [], 'Grade 10').subjectId, 'math');
  assert.equal(buildProgressiveLearningPath('general_science', [], 'Grade 10').subjectId, 'science');
  assert.equal(buildProgressiveLearningPath('history_citizenship', [], 'Grade 11').subjectId, 'social');
});
