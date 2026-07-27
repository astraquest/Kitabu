import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCurriculumAuthoredPath } from './curriculumCompatibilityLesson.js';

const subject = {
  subjectId: 'source-subject-uuid',
  subjectCode: 'mathematics',
  subjectName: 'Mathematical Activities',
  subjectOfficialName: 'Mathematical Activities',
  subjectDisplayName: 'Mathematics',
  strands: [{
    id: 'numbers-strand',
    number: '1.0',
    title: 'Numbers',
    subStrands: [
      {
        id: 'number-concept-source',
        number: '1.1',
        title: 'Number Concept',
        topics: [{ id: 'number-concept-topic', canonicalKey: 'numbers:number-concept', code: '1.1', title: 'Number Concept' }],
        isCompleted: false,
        needsRemediation: false,
        masteryScore: null,
      },
      {
        id: 'whole-numbers-source',
        number: '1.2',
        title: 'Whole Numbers',
        topics: [{ id: 'whole-numbers-topic', canonicalKey: 'numbers:whole-numbers', code: '1.2', title: 'Whole Numbers' }],
        isCompleted: false,
        needsRemediation: false,
        masteryScore: null,
      },
    ],
  }],
};

const authoredLessons = [{
  lessonKey: 'math-grade-3-number-concept',
  lessonVersion: 2,
  strand: 'Numbers',
  subStrand: 'Number Concept',
  objective: 'Build fluency with number concepts.',
  estimatedMinutes: 10,
}];

test('shows only verified authored content and blocks the first unpublished topic', () => {
  const path = buildCurriculumAuthoredPath(subject, [], 'Grade 3', authoredLessons);

  assert.equal(path.subjectId, 'mathematics');
  assert.equal(path.subjectName, 'Mathematics');
  assert.equal(path.nodes[0]?.lessonKey, 'math-grade-3-number-concept');
  assert.equal(path.nodes[0]?.availability, 'published');
  assert.equal(path.nodes[0]?.status, 'current');
  assert.equal(path.nodes[1]?.lessonKey, null);
  assert.equal(path.nodes[1]?.availability, 'content_pending');
  assert.equal(path.nodes[1]?.status, 'locked');
});

test('uses the canonical topic identity and unlocks strictly after completion', () => {
  const path = buildCurriculumAuthoredPath(subject, [{
    lesson_key: 'math-grade-3-number-concept',
    curriculum_topic_id: 'number-concept-topic',
    best_score: 100,
    status: 'completed',
    attempt_count: 1,
  }], 'Grade 3', authoredLessons);

  assert.equal(path.nodes[0]?.id, 'number-concept-topic');
  assert.equal(path.nodes[0]?.curriculumTopicId, 'number-concept-topic');
  assert.equal(path.nodes[0]?.curriculumTopicKey, 'numbers:number-concept');
  assert.equal(path.nodes[0]?.status, 'completed');
  assert.equal(path.nodes[1]?.status, 'content_pending');
  assert.equal(path.nodes[1]?.strandNumber, '1.0');
  assert.equal(path.nodes[1]?.subStrandNumber, '1.2');
});

test('does not unlock authored progression from a different curriculum activity', () => {
  const subjectWithLegacyCompletion = {
    ...subject,
    strands: [{
      ...subject.strands[0],
      subStrands: subject.strands[0].subStrands.map(subStrand => ({
        ...subStrand,
        isCompleted: true,
        masteryScore: 100,
      })),
    }],
  };
  const path = buildCurriculumAuthoredPath(
    subjectWithLegacyCompletion,
    [],
    'Grade 3',
    authoredLessons,
  );

  assert.equal(path.nodes[0]?.status, 'current');
  assert.equal(path.nodes[0]?.bestScore, null);
  assert.equal(path.nodes[1]?.status, 'locked');
});

test('does not auto-bind a repeated topic title without an explicit curriculum code', () => {
  const repeated = {
    ...subject,
    strands: [{
      ...subject.strands[0],
      subStrands: [
        { ...subject.strands[0].subStrands[0], id: 'word-1', number: '1.3.1', title: 'Word Classes', topics: [{ id: 'topic-1', code: '1.3.1', title: 'Word Classes' }] },
        { ...subject.strands[0].subStrands[0], id: 'word-2', number: '2.3.1', title: 'Word Classes', topics: [{ id: 'topic-2', code: '2.3.1', title: 'Word Classes' }] },
      ],
    }],
  };
  const lesson = [{ ...authoredLessons[0], lessonKey: 'words', subStrand: 'Word Classes' }];
  const ambiguous = buildCurriculumAuthoredPath(repeated, [], 'Grade 3', lesson);
  assert.ok(ambiguous.nodes.every(node => node.availability === 'content_pending'));

  const explicit = buildCurriculumAuthoredPath(repeated, [], 'Grade 3', [{
    ...lesson[0],
    strand: 'Legacy Language Strand Name',
    curriculumTopicCode: '2.3.1',
  }]);
  assert.equal(explicit.nodes[0]?.availability, 'content_pending');
  assert.equal(explicit.nodes[1]?.lessonKey, 'words');
});

test('keeps each published learning outcome as its own ordered mission', () => {
  const outcomeSubject = {
    ...subject,
    strands: [{
      ...subject.strands[0],
      subStrands: [{
        ...subject.strands[0].subStrands[0],
        outcomes: [
          { id: 'official-outcome-1', text: 'Count objects to ten.' },
          { id: 'official-outcome-2', text: 'Match objects in pairs.' },
        ],
      }],
    }],
  };
  const missions = [
    { ...authoredLessons[0], lessonKey: 'g1-count', title: 'Count to ten', curriculumOutcomeId: 'official-outcome-1' },
    { ...authoredLessons[0], lessonKey: 'g1-match', title: 'Match pairs', curriculumOutcomeId: 'official-outcome-2' },
  ];
  const path = buildCurriculumAuthoredPath(outcomeSubject, [{
    lesson_key: 'g1-count',
    curriculum_topic_id: 'number-concept-topic',
    best_score: 100,
    status: 'completed',
    attempt_count: 1,
  }], 'Grade 1', missions);

  assert.equal(path.totalCount, 2);
  assert.match(path.nodes[0]?.id ?? '', /curriculum-outcome:.*official-outcome-1$/);
  assert.equal(path.nodes[0]?.status, 'completed');
  assert.equal(path.nodes[1]?.curriculumOutcomeId, 'official-outcome-2');
  assert.equal(path.nodes[1]?.status, 'current');
});

test('scopes reused outcome IDs to their strand and sub-strand location', () => {
  const outcomeSubject = {
    ...subject,
    strands: [{
      ...subject.strands[0],
      subStrands: [
        {
          ...subject.strands[0].subStrands[0],
          outcomes: [{ id: 'outcome-1', text: 'Sort objects.' }],
        },
        {
          ...subject.strands[0].subStrands[1],
          outcomes: [{ id: 'outcome-1', text: 'Count objects.' }],
        },
      ],
    }],
  };
  const missions = [
    {
      ...authoredLessons[0],
      lessonKey: 'sort-objects',
      subStrand: 'Number Concept',
      curriculumOutcomeId: 'outcome-1',
      objective: 'Sort objects.',
    },
    {
      ...authoredLessons[0],
      lessonKey: 'count-objects',
      subStrand: 'Whole Numbers',
      curriculumOutcomeId: 'outcome-1',
      objective: 'Count objects.',
    },
  ];

  const path = buildCurriculumAuthoredPath(outcomeSubject, [], 'Grade 1', missions);

  assert.deepEqual(path.nodes.map(node => node.lessonKey), ['sort-objects', 'count-objects']);
  assert.equal(new Set(path.nodes.map(node => node.id)).size, 2);
  assert.deepEqual(path.nodes.map(node => node.status), ['current', 'locked']);
  assert.ok(path.nodes.every(node => node.availability === 'published'));
});

test('keeps published outcome missions in exact completed, current and locked order', () => {
  const outcomeSubject = {
    ...subject,
    strands: [{
      ...subject.strands[0],
      subStrands: [{
        ...subject.strands[0].subStrands[0],
        outcomes: [
          { id: 'outcome-1', text: 'First outcome.' },
          { id: 'outcome-2', text: 'Second outcome.' },
          { id: 'outcome-3', text: 'Third outcome.' },
        ],
      }],
    }],
  };
  const missions = ['outcome-1', 'outcome-2', 'outcome-3'].map((outcomeId, index) => ({
    ...authoredLessons[0],
    lessonKey: `mission-${index + 1}`,
    curriculumOutcomeId: outcomeId,
  }));
  const path = buildCurriculumAuthoredPath(outcomeSubject, [{
    lesson_key: 'mission-1',
    best_score: 100,
    status: 'completed',
    attempt_count: 1,
  }], 'Grade 1', missions);

  assert.deepEqual(path.nodes.map(node => node.lessonKey), ['mission-1', 'mission-2', 'mission-3']);
  assert.deepEqual(path.nodes.map(node => node.availability), ['published', 'published', 'published']);
  assert.deepEqual(path.nodes.map(node => node.status), ['completed', 'current', 'locked']);
});

test('does not bind an outcome by global ID or matching objective text', () => {
  const outcomeSubject = {
    ...subject,
    strands: [{
      ...subject.strands[0],
      subStrands: [{
        ...subject.strands[0].subStrands[0],
        outcomes: [{ id: 'outcome-1', text: 'Count objects.' }],
      }],
    }],
  };
  const misplacedMission = [{
    ...authoredLessons[0],
    lessonKey: 'wrong-location',
    subStrand: 'Whole Numbers',
    curriculumOutcomeId: 'outcome-1',
    objective: 'Count objects.',
  }];

  const path = buildCurriculumAuthoredPath(outcomeSubject, [], 'Grade 1', misplacedMission);

  assert.equal(path.nodes[0]?.lessonKey, null);
  assert.equal(path.nodes[0]?.availability, 'content_pending');
  assert.equal(path.nodes[0]?.status, 'content_pending');
});
