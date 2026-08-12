import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildProgressiveLearningPath,
  getProgressiveLessonDefinition,
  gradeProgressiveLessonStep,
  hasProgressiveLearningPath,
  listProgressiveLessonDefinitions,
  serializeProgressiveChoiceAnswer,
  serializeProgressiveClassifyAnswer
} from './progressiveLearning.js';

const EXPECTED_FIRST_THREE: Record<string, Record<string, string[]>> = {
  'Grade 5': {
    agriculture: ['Soil Conservation', 'Water Conservation', 'Conserving Wild Animals'],
    creative_arts: ['Wind Musical Instruments', 'Football', 'Rhythm'],
    english: ['Listening and Speaking', 'Identifying Objects That Are Near or Far', 'Pronunciation and Vocabulary'],
    kiswahili: ['Matamshi Bora: Sauti f/v, s/z, l/r na th/dh', 'Kusoma', 'Kuandika Insha ya Wasifu'],
    math: ['Whole Numbers', 'Addition', 'Subtraction'],
    science: ['Classification of Plants', 'The Human Breathing System', 'Mixtures and Water Safety'],
    social: ['Elements of a Map', 'Location, Position and Size of Kenya', 'Main Physical Features in Kenya'],
    religious_education: ['Purpose of Religious Education', 'Respect for Religious Diversity', 'Sacred Texts']
  },
  'Grade 6': {
    agriculture: ['Controlling Soil Erosion', 'Conserving Water: Sunken Seedbeds and Shallow Pits', 'Conserving Wild Animals'],
    creative_arts: ['String Musical Instruments and Drawing', 'Painting and Collage', 'Volleyball'],
    english: ['Listening for Meaning and Key Details', 'Word Classes', 'Filling Forms'],
    kiswahili: ['Matamshi Bora d/nd, ch/sh, j/nj na g/ng', 'Maamkuzi na Maagano', 'Kuandika Insha za Masimulizi'],
    math: ['Whole Numbers', 'Multiplication', 'Division'],
    science: ['Fungi', 'Human Circulatory System', 'Change of Matter State'],
    social: ['Position and Size of Countries in Eastern Africa', 'Main Physical Features in Eastern Africa', 'Climatic Regions in Eastern Africa'],
    religious_education: ['Honesty and Integrity', 'Respect in the Family', 'Respectful Worship Across Traditions']
  },
  'Grade 7': {
    agriculture: ['Soil Pollution Control', 'Water Conservation Measures', 'Agroforestry'],
    business_studies: ['Introduction to Business Studies', 'Money', 'Personal Goals'],
    creative_arts: ['Introduction to Creative Arts and Sports', 'Components of Creative Arts and Sports', 'Drawing and Painting'],
    english: ['Polite Introductions', 'Conversation Skills', 'Polite Interruption'],
    integrated_science: ['Introduction to Integrated Science', 'Laboratory Safety', 'Basic Science Skills'],
    kiswahili: ['Kusikiliza na Kujibu Mazungumzo', 'Kushiriki Mazungumzo', 'Miktadha ya Mazungumzo'],
    life_skills: ['Personal Strengths and Values', 'Personal Growth', 'Self Esteem'],
    math: ['Whole Numbers', 'Integers', 'Fractions'],
    pre_technical_studies: ['Introduction to Pre-Technical Studies', 'Safety in the Immediate Environment', 'Computer Concepts'],
    religious_education: ['Meaning and Importance of Religious Education', 'Respect for Religious Diversity', 'Religious Beliefs and Practices'],
    social: ['Rationale for Studying Social Studies', 'Career Opportunities in Social Studies', 'Self Exploration and Career Choice']
  },
  'Grade 8': {
    agriculture: ['Soil Conservation Measures', 'Water Harvesting and Storage', 'Kitchen and Backyard Gardening'],
    business_studies: ['Financial Goals', 'Income', 'Budgeting and Spending'],
    creative_arts: ['Roles of Creative Arts and Sports', 'Components of Creative Arts and Sports', 'Drawing and Painting'],
    english: ['Listening Comprehension', 'Active Listening', 'Tone and Mood'],
    integrated_science: ['Elements and Compounds', 'Physical and chemical changes', 'Classes of fire'],
    kiswahili: ['Ufahamu wa Kusikiliza', 'Usikilizaji Makini', 'Matamshi'],
    life_skills: ['Personal Strengths and Growth Areas', 'Personal Habits', 'Values and Choices'],
    math: ['Integers', 'Fractions', 'Decimals'],
    pre_technical_studies: ['Fire Safety', 'Data Safety', 'Plane Geometry'],
    religious_education: ['Purpose of Religious Education', 'Core Moral Values', 'Respect for Religious Diversity'],
    social: ['Social Studies Inquiry', 'Sources of Information', 'Map Scale']
  }
};

function curriculumLessons() {
  return Object.entries(EXPECTED_FIRST_THREE).flatMap(([grade, subjects]) =>
    Object.keys(subjects).flatMap(subjectId =>
      listProgressiveLessonDefinitions({ grade, subjectId }).slice(0, 3)
    )
  );
}

test('publishes the curriculum-first three chapters for every Grade 5–8 core subject', () => {
  for (const [grade, subjects] of Object.entries(EXPECTED_FIRST_THREE)) {
    for (const [subjectId, expectedSubStrands] of Object.entries(subjects)) {
      const lessons = listProgressiveLessonDefinitions({ grade, subjectId });
      assert.ok(hasProgressiveLearningPath(subjectId, grade));
      assert.deepEqual(
        lessons.slice(0, 3).map(lesson => lesson.subStrand),
        expectedSubStrands,
        `${grade} ${subjectId} must preserve stored curriculum order`
      );

      const path = buildProgressiveLearningPath(subjectId, [], grade);
      assert.equal(path.nodes[0]?.status, 'current');
      assert.ok(path.nodes.slice(1).every(node => node.status === 'locked'));
      assert.deepEqual(path.nodes.slice(0, 3).map(node => node.lessonKey), lessons.slice(0, 3).map(lesson => lesson.lessonKey));
    }
  }
});

test('enforces the five-step Brilliant-level interaction and visual contract', () => {
  const lessons = curriculumLessons();
  const interactionAnswerPositions = [0, 0, 0, 0];
  const checkpointAnswerPositions = [0, 0, 0, 0];
  const interactionKinds = new Map<string, number>();
  let legacyOpeningCount = 0;
  assert.equal(lessons.length, 114);
  assert.equal(new Set(lessons.map(lesson => lesson.lessonKey)).size, lessons.length);

  for (const lesson of lessons) {
    assert.equal(lesson.steps.length, 5);
    assert.equal(lesson.steps.filter(step => step.phase === 'guided').length, 2);
    assert.equal(lesson.steps.filter(step => step.phase === 'checkpoint').length, 3);
    assert.equal(new Set(lesson.steps.map(step => step.prompt.trim().toLocaleLowerCase('en-KE'))).size, 5);
    assert.deepEqual(new Set(lesson.steps.map(step => step.visual.kind)), new Set(['classify', 'scene', 'cards', 'sequence']));
    assert.doesNotMatch(JSON.stringify(lesson), /"answer"\s*:/);

    const opening = lesson.steps[0];
    assert.equal(opening.options.length, 0);
    if (opening.componentScene) {
      assert.equal(lesson.lessonKey, 'math-g6-whole-numbers');
      assert.equal(
        (opening.componentScene as { component?: { componentId?: string } }).component?.componentId,
        'structured-response'
      );
      assert.equal(gradeProgressiveLessonStep(lesson.lessonKey, opening.id, '700000')?.isCorrect, true);
      assert.equal(gradeProgressiveLessonStep(lesson.lessonKey, opening.id, '700,000')?.isCorrect, true);
    } else {
    legacyOpeningCount += 1;
    assert.equal(opening.interaction?.items.length, 4);

    const interaction = opening.interaction;
    assert.ok(interaction);
    interactionKinds.set(interaction.kind, (interactionKinds.get(interaction.kind) ?? 0) + 1);
    const acceptedItems = interaction.items.filter(candidate => {
      const response = interaction.kind === 'bucket_sort'
        ? serializeProgressiveClassifyAnswer({
            supported: [candidate.id],
            rethink: interaction.items.filter(item => item.id !== candidate.id).map(item => item.id)
          })
        : serializeProgressiveChoiceAnswer(candidate.id);
      return gradeProgressiveLessonStep(lesson.lessonKey, opening.id, response)?.isCorrect;
    });
    assert.equal(acceptedItems.length, 1, `${lesson.lessonKey} opening interaction must have one solution`);
    const openingResponse = interaction.kind === 'bucket_sort'
      ? serializeProgressiveClassifyAnswer({
          supported: [acceptedItems[0].id],
          rethink: interaction.items.filter(item => item.id !== acceptedItems[0].id).map(item => item.id)
        })
      : serializeProgressiveChoiceAnswer(acceptedItems[0].id);
    assert.ok((gradeProgressiveLessonStep(lesson.lessonKey, opening.id, openingResponse)?.message.length ?? 0) >= 30);
    interactionAnswerPositions[interaction.items.indexOf(acceptedItems[0])] += 1;
    }

    for (const step of lesson.steps.slice(1)) {
      assert.equal(step.interaction, undefined);
      if (step.componentScene) {
        assert.equal(lesson.lessonKey, 'math-g6-whole-numbers');
        assert.equal(
          gradeProgressiveLessonStep(
            lesson.lessonKey,
            step.id,
            'sequence:number-7420>number-18305>number-51090>number-99999'
          )?.isCorrect,
          true
        );
        continue;
      }
      assert.equal(step.options.length, 4);
      assert.equal(new Set(step.options).size, 4);
      const acceptedOptions = step.options.filter(option =>
        gradeProgressiveLessonStep(lesson.lessonKey, step.id, option)?.isCorrect
      );
      assert.equal(acceptedOptions.length, 1, `${step.id} must have exactly one answer`);
      checkpointAnswerPositions[step.options.indexOf(acceptedOptions[0])] += 1;
      assert.ok(step.hint.length >= 20);
      assert.ok((gradeProgressiveLessonStep(lesson.lessonKey, step.id, acceptedOptions[0])?.message.length ?? 0) >= 30);
    }
    assert.doesNotMatch(JSON.stringify(lesson), /"successMessage"\s*:/);
  }

  assert.ok(
    interactionAnswerPositions.every(count => count >= legacyOpeningCount * 0.15),
    `opening answers must be distributed across positions: ${interactionAnswerPositions.join(', ')}`
  );
  assert.ok((interactionKinds.get('bucket_sort') ?? 0) >= lessons.length * 0.3);
  assert.ok((interactionKinds.get('choice_sprint') ?? 0) >= lessons.length * 0.3);
  assert.ok(
    checkpointAnswerPositions.every(count => count >= lessons.length * 4 * 0.15),
    `checkpoint answers must be distributed across positions: ${checkpointAnswerPositions.join(', ')}`
  );
  assert.ok(
    new Set(lessons.flatMap(lesson => lesson.steps.map(step => step.hint))).size >= lessons.length * 3,
    'coaching hints must stay topic-specific instead of collapsing into generic feedback'
  );
});

test('supports manifest subject aliases for the new progressive paths', () => {
  assert.equal(buildProgressiveLearningPath('mathematics', [], 'Grade 5').subjectId, 'math');
  assert.equal(buildProgressiveLearningPath('science_technology', [], 'Grade 5').subjectId, 'science');
  assert.equal(buildProgressiveLearningPath('agriculture_nutrition', [], 'Grade 5').subjectId, 'agriculture');
  assert.equal(buildProgressiveLearningPath('mathematics', [], 'Grade 6').subjectId, 'math');
  assert.equal(buildProgressiveLearningPath('creative_arts_sports', [], 'Grade 8').subjectId, 'creative_arts');
  assert.equal(buildProgressiveLearningPath('social_studies', [], 'Grade 8').subjectId, 'social');
  assert.equal(buildProgressiveLearningPath('cre_ire_hre', [], 'Grade 7').subjectId, 'religious_education');
});

test('publishes the Grade 6 human-cell labelled 3D MCQ lesson', () => {
  const lesson = listProgressiveLessonDefinitions({ grade: 'Grade 6', subjectId: 'science' })
    .find(candidate => candidate.lessonKey === 'science-g6-human-cell');
  assert.ok(lesson);
  assert.equal(lesson.steps.length, 5);
  assert.ok(lesson.steps.every(step => step.options.length === 4));
  assert.ok(lesson.steps.every(step => new Set(step.options).size === 4));

  const modelUrl = 'https://dkudchritxmpummaeoq.supabase.co/storage/v1/object/public/educational-3d/3D%20files/v1/human-cell-1-4b4d7dd88c72.glb';
  for (const [index, step] of lesson.steps.entries()) {
    const scene = step.componentScene as {
      component?: { componentId?: string };
      props?: { modelUrl?: string; markers?: unknown[]; options?: unknown[]; activeMarker?: string };
    };
    assert.equal(scene.component?.componentId, 'labelled-cell-3d');
    assert.equal(scene.props?.modelUrl, modelUrl);
    assert.equal(scene.props?.markers?.length, 5);
    assert.equal(scene.props?.options?.length, 4);
    assert.equal(scene.props?.activeMarker, ['membrane', 'cytoplasm', 'nucleus', 'mitochondrion', 'golgi'][index]);
  }

  const privateLesson = getProgressiveLessonDefinition('science-g6-human-cell');
  assert.ok(privateLesson);
  assert.doesNotMatch(JSON.stringify(privateLesson), /"answer"\s*:/);
  const publishedPath = buildProgressiveLearningPath('science', [], 'Grade 6');
  const pathNode = publishedPath.nodes.find(node => node.lessonKey === 'science-g6-human-cell');
  assert.ok(pathNode);
  assert.equal(pathNode?.availability, 'published');

  const authored = lesson.steps.map(step => step.options.find(option =>
    gradeProgressiveLessonStep(lesson.lessonKey, step.id, option)?.isCorrect
  ));
  assert.deepEqual(authored, ['Cell membrane', 'Cytoplasm', 'Nucleus', 'Mitochondrion', 'Golgi apparatus']);
  assert.ok(lesson.steps.every((step, index) =>
    gradeProgressiveLessonStep(lesson.lessonKey, step.id, authored[index]!)?.isCorrect
  ));
  assert.equal(gradeProgressiveLessonStep(lesson.lessonKey, lesson.steps[0].id, 'Nucleus')?.isCorrect, false);
});

test('keeps the three Grade 7 curriculum chapters before the six equation extensions', () => {
  assert.deepEqual(
    listProgressiveLessonDefinitions({ grade: 'Grade 7', subjectId: 'math' }).map(lesson => lesson.lessonKey),
    [
      'math-g7-whole-numbers',
      'math-g7-integers',
      'math-g7-fractions',
      'math-g7-equality-balance',
      'math-g7-forming-equations',
      'math-g7-undo-add-subtract',
      'math-g7-undo-multiply-divide',
      'math-g7-equations-in-life',
      'math-g7-linear-equations-review'
    ]
  );
});
