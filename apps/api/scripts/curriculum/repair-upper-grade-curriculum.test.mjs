import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canonicalGroups,
  canonicalSubjectCode,
} from './repair-upper-grade-curriculum.mjs';

test('normalizes source-specific Grade 5 and senior-secondary subject codes', () => {
  assert.equal(canonicalSubjectCode('KEN-CBC-G5-MATHEMATICS'), 'mathematics');
  assert.equal(canonicalSubjectCode('CHRISTIAN_RELIGIOUS_EDUCATION_CRE'), 'cre');
  assert.equal(canonicalSubjectCode('HINDU_RELIGIOUS_EDUCATION_HRE'), 'hre');
  assert.equal(canonicalSubjectCode('ISLAMIC_RELIGIOUS_EDUCATION_IRE'), 'ire');
  assert.equal(canonicalSubjectCode('INDIGENOUS_LANGUAGE'), 'indigenous_languages');
  assert.equal(canonicalSubjectCode('MANDARIN_CHINESE'), 'mandarin');
});

test('groups repeated language skill strands while preserving every source strand', () => {
  const subject = {
    subjectCode: 'KEN-CBC-G5-ENGLISH',
    subjectName: 'English',
    strands: [
      { code: '1.1', title: 'Listening and Speaking', subStrands: [] },
      { code: '1.2', title: 'Reading', subStrands: [] },
      { code: '1.3', title: 'Grammar in Use', subStrands: [] },
      { code: '1.4', title: 'Writing', subStrands: [] },
      { code: '2.1', title: 'Listening and speaking', subStrands: [] },
      { code: '2.2', title: 'Reading', subStrands: [] },
      { code: '2.3', title: 'Grammar in use', subStrands: [] },
      { code: '2.4', title: 'Writing', subStrands: [] },
    ],
  };
  const groups = canonicalGroups(subject);
  assert.equal(groups.length, 4);
  assert.ok(groups.every(group => group.repairKind === 'repeated_language_hierarchy'));
  assert.deepEqual(groups.map(group => group.sourceStrands.length), [2, 2, 2, 2]);
});

test('does not collapse legitimate non-language or already-canonical hierarchies', () => {
  const religiousEducation = canonicalGroups({
    subjectCode: 'christian_religious_education',
    subjectName: 'Christian Religious Education',
    strands: [
      { code: '1.0', title: 'Creation', subStrands: [] },
      { code: '2.0', title: 'Creation', subStrands: [] },
    ],
  });
  assert.equal(religiousEducation.length, 2);
  assert.ok(religiousEducation.every(group => group.repairKind === 'source_hierarchy'));

  const seniorEnglish = canonicalGroups({
    subjectCode: 'ENGLISH',
    subjectName: 'English',
    strands: [
      { code: '1.0', title: 'Communication Skills', subStrands: [] },
      { code: '2.0', title: 'Reading for Meaning', subStrands: [] },
    ],
  });
  assert.equal(seniorEnglish.length, 2);
  assert.ok(seniorEnglish.every(group => group.repairKind === 'source_hierarchy'));
});

test('applies reviewed source-title corrections without changing source records', () => {
  const groups = canonicalGroups({
    grade: 4,
    gradeLevel: 'Grade 4',
    subjectCode: 'english',
    subjectName: 'English',
    strands: [
      { code: '1.3', title: 'Grammar in Use', subStrands: [] },
      { code: '2.3', title: 'Grammar in uses', subStrands: [] },
    ],
  });
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].sourceStrands.map(strand => strand.title), [
    'Grammar in Use',
    'Grammar in uses',
  ]);
});
