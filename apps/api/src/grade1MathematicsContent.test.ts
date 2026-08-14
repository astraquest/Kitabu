import assert from 'node:assert/strict';
import test from 'node:test';

import { loadGrade1MathematicsLessonSeeds } from './grade1MathematicsContent.js';
import { grade1QuizBankLessonQuestions } from './grade1QuizBankContent.js';
import { gradeProgressiveLessonStep, listProgressiveLessonDefinitions } from './progressiveLearning.js';
import { buildCurriculumAuthoredPath } from './curriculumCompatibilityLesson.js';

test('loads every compiled Grade 1 Mathematics outcome mission', () => {
  const lessons = loadGrade1MathematicsLessonSeeds();

  assert.equal(lessons.length, 53);
  assert.equal(new Set(lessons.map(lesson => lesson.key)).size, 53);
  assert.ok(lessons.every(lesson => lesson.grade === 'Grade 1' && lesson.subjectId === 'math'));
  assert.ok(lessons.every(lesson => lesson.steps.length === 6));
  assert.equal(new Set(lessons.map(lesson => lesson.curriculumLocationKey)).size, 53);
  assert.equal(lessons.flatMap(lesson => lesson.steps).length, 318);
  const imageKeys = lessons.flatMap(lesson => lesson.steps)
    .map(step => step.visual.kind === 'picture_choice' ? step.visual.imageKey : undefined)
    .filter((key): key is string => Boolean(key));
  assert.ok(imageKeys.includes('image-library/v1/banana.png'));
  assert.ok(imageKeys.includes('image-library/v1/ball.png'));
  const questions = grade1QuizBankLessonQuestions('mathematics', 'Number Concept', 6);
  const publishedMission = listProgressiveLessonDefinitions({ grade: 'Grade 1', subjectId: 'math' })
    .find(lesson => lesson.lessonKey === lessons[0].key)!;
  assert.deepEqual(lessons[0].steps.map(step => step.prompt), questions.map(() => 'Solve this question'));
  assert.deepEqual(lessons[0].steps.map(step => step.supportText), questions.map(question => question.prompt));
  assert.deepEqual(lessons[0].steps.map(step => step.options), questions.map(question => question.options));
  for (const [index, question] of questions.entries()) {
    const step = lessons[0].steps[index];
    assert.equal(gradeProgressiveLessonStep(lessons[0].key, publishedMission.steps[index].id, question.correctAnswer)?.isCorrect, true);
    assert.equal(step.visual.kind, 'picture_group');
    assert.equal(step.visual.kind === 'picture_group' && step.visual.imageKey, question.imageKey);
    assert.equal(step.visual.kind === 'picture_group' && step.visual.equation, question.visual?.equation);
    assert.deepEqual(step.visual.kind === 'picture_group' && step.visual.groups, question.visual?.groups);
  }
});

test('maps all authored activities without placeholders or public grading data', () => {
  const lessons = loadGrade1MathematicsLessonSeeds();
  const steps = lessons.flatMap(lesson => lesson.steps);
  const supportedComponents = new Set([
    'number-manipulatives',
    'authored-interaction',
    'trace-construct',
  ]);

  for (const step of steps) {
    assert.equal(step.options.includes('Try another answer'), false);
    if (!step.componentScene) {
      assert.ok(step.options.length >= 2, `${step.prompt}: choice step needs authored options`);
      continue;
    }

    const scene = step.componentScene as {
      identity?: { sceneId?: unknown; schemaVersion?: unknown };
      component?: { componentId?: unknown; componentVersion?: unknown };
      props?: Record<string, unknown>;
    };
    assert.equal(typeof scene.identity?.sceneId, 'string');
    assert.equal(scene.identity?.schemaVersion, '1.0.1');
    assert.ok(supportedComponents.has(String(scene.component?.componentId)));
    assert.equal(scene.component?.componentVersion, '1.0.0');
    assert.ok(scene.props && typeof scene.props === 'object');
    assert.equal('answer' in scene.props!, false, `${step.prompt}: public props expose answer`);
    assert.equal('target' in scene.props!, false, `${step.prompt}: public props expose numeric target`);
  }

  const privateObjectSteps = steps.filter(step => step.lowerPrimaryInteraction);
  assert.ok(privateObjectSteps.length > 0);
  assert.ok(privateObjectSteps.every(step =>
    Object.keys(step.lowerPrimaryInteraction?.expected ?? {}).length > 0));
});

test('binds the live Grade 1 Number Concept placeholder to the first authored outcome mission', () => {
  const [seed] = loadGrade1MathematicsLessonSeeds();
  const firstMission = listProgressiveLessonDefinitions({ grade: 'Grade 1', subjectId: 'math' })
    .find(lesson => lesson.lessonKey === seed.key)!;
  const subject = {
    subjectId: 'math',
    subjectCode: 'mathematics',
    subjectName: 'Mathematics',
    strands: [{
      id: 'numbers-strand',
      number: '1.0',
      title: 'Numbers',
      subStrands: [{
        id: 'number-concept',
        number: '1.1',
        title: 'Number Concept',
        topics: [{ id: 'number-concept-topic', code: '1.1', title: 'Pre-number activities' }],
        outcomes: [{ id: 'outcome-1', text: 'Sort objects.' }],
        isCompleted: false,
        needsRemediation: false,
      }],
    }],
  };
  const path = buildCurriculumAuthoredPath(subject, [], 'Grade 1', [firstMission]);
  const [node] = path.nodes;

  assert.equal(node.availability, 'published');
  assert.equal(node.status, 'current');
  assert.equal(node.lessonKey, firstMission.lessonKey);
  assert.equal(node.lessonVersion, firstMission.lessonVersion);
  assert.equal(node.curriculumOutcomeId, firstMission.curriculumOutcomeId);
  assert.equal(node.curriculumTopicId, 'number-concept-topic');
});
