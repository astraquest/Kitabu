import assert from 'node:assert/strict';
import test from 'node:test';

import { loadGrade1MathematicsLessonSeeds } from './grade1MathematicsContent.js';

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
