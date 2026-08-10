import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveEducationalAssetAltText, educationalAssetOverlapsGrade, educationalVisualTypes, normalizeEducationalGrade } from './classification.js';
import { normalizeEducationalAssetCurriculumUnitIds, serializeEducationalAssetRelationshipMetadata } from './curriculumLinks.js';
import { requireRoles } from '../rbac.js';
import { educationalAssetClassificationEditSchema, mergeEducationalAssetClassification } from './classificationEdit.js';

test('classification exposes the controlled visual types', () => {
  assert.deepEqual(educationalVisualTypes, ['VOCABULARY_IMAGE', 'ICON', 'PHOTO', 'ILLUSTRATION', 'SCIENTIFIC_DIAGRAM', 'MAP', 'CHEMICAL_STRUCTURE', 'UI_ICON']);
});

test('grade filters normalize grade labels and overlap inclusive ranges', () => {
  assert.equal(normalizeEducationalGrade('Grade 4'), 4);
  assert.equal(normalizeEducationalGrade('unknown'), null);
  assert.equal(educationalAssetOverlapsGrade({ gradeMin: 3, gradeMax: 5 }, 'Grade 4'), true);
  assert.equal(educationalAssetOverlapsGrade({ gradeMin: 3, gradeMax: 5 }, 6), false);
});

test('alt text uses explicit input, description, then the required title without inventing claims', () => {
  assert.equal(deriveEducationalAssetAltText({ altText: '  A   reviewed label  ', description: 'A supplied description', title: 'Heart diagram' }), 'A reviewed label');
  assert.equal(deriveEducationalAssetAltText({ description: '  A supplied description\nwith spacing ', title: 'Heart diagram' }), 'A supplied description with spacing');
  assert.equal(deriveEducationalAssetAltText({ title: '  Heart diagram  ' }), 'Heart diagram');
  assert.equal(deriveEducationalAssetAltText({ description: 'A'.repeat(600), title: 'Fallback title' }).length, 500);
  assert.equal(deriveEducationalAssetAltText({ description: 'A supplied description', title: 'Heart diagram' }).includes('blood pumps oxygenated blood'), false);
});

test('classification edits are strict, bounded, normalized, and preserve omitted fields', () => {
  const parsed = educationalAssetClassificationEditSchema.parse({
    subject: '  Science ', keywords: ['  cells ', ' biology '], altText: null, gradeMin: 3,
  });
  const merged = mergeEducationalAssetClassification({
    visualType: 'ILLUSTRATION', subject: null, topic: 'Cells', subtopic: null, keywords: [], synonyms: [],
    gradeMin: 1, gradeMax: 6, language: 'en', containsText: false, altText: 'Existing label', educationalDescription: null,
  }, parsed, { title: 'Plant cell diagram', description: '  Labeled plant cell diagram  ' });
  assert.deepEqual(merged, {
    visualType: 'ILLUSTRATION', subject: 'Science', topic: 'Cells', subtopic: null, keywords: ['cells', 'biology'], synonyms: [],
    gradeMin: 3, gradeMax: 6, language: 'en', containsText: false, altText: 'Labeled plant cell diagram', educationalDescription: null,
  });
  assert.throws(() => educationalAssetClassificationEditSchema.parse({ providerKey: 'blocked' }), /unrecognized key/i);
  assert.throws(() => educationalAssetClassificationEditSchema.parse({ keywords: Array.from({ length: 51 }, () => 'term') }), /<=50/);
  assert.throws(() => mergeEducationalAssetClassification(merged, educationalAssetClassificationEditSchema.parse({ gradeMin: 7 }), { title: 'Plant cell diagram', description: null }), /gradeMin/);
});

test('curriculum link IDs are validated, deduplicated, and sorted deterministically', () => {
  const first = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const second = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  assert.deepEqual(normalizeEducationalAssetCurriculumUnitIds([second.toUpperCase(), first, second]), [first, second]);
  assert.throws(() => normalizeEducationalAssetCurriculumUnitIds(['not-a-uuid']), /valid UUIDs/);
});

test('curriculum relationship metadata is a bounded JSON object', () => {
  assert.equal(serializeEducationalAssetRelationshipMetadata(), '{}');
  assert.equal(serializeEducationalAssetRelationshipMetadata({ strand: 'Animals', reviewed: true }), '{"strand":"Animals","reviewed":true}');
  assert.throws(() => serializeEducationalAssetRelationshipMetadata([] as unknown as Record<string, unknown>), /JSON object/);
  assert.throws(() => serializeEducationalAssetRelationshipMetadata({ notes: 'x'.repeat(4001) }), /4000 bytes/);
});

test('curriculum link route authorization is platform-admin only', async () => {
  let deniedStatus = 0;
  const denied = await requireRoles(
    { user: { roles: ['school_admin'] } } as never,
    { status: (status: number) => { deniedStatus = status; return { send: () => undefined }; } } as never,
    ['platform_admin'],
  );
  assert.equal(denied, true);
  assert.equal(deniedStatus, 403);

  const allowed = await requireRoles(
    { user: { roles: ['platform_admin'] } } as never,
    { status: () => { throw new Error('platform admin should be allowed'); } } as never,
    ['platform_admin'],
  );
  assert.equal(allowed, undefined);
});
