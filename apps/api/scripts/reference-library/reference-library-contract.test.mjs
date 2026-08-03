import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalJson, validateReferencePayload } from './reference-library-contract.mjs';

function samplePayload() {
  return {
    document: {
      document_key: 'orion-checkpoint-vol1',
      country_code: 'KEN',
      curriculum_code: 'CBC',
      grade_level: 'PP1',
      title: 'PP1 Learning Activity References',
      source_identity: 'Orion Checkpoint Revision and Homework Book, Volume 1'
    },
    assets: [
      {
        path: 'assets/apple.png',
        type: 'illustration',
        description: 'Original child-friendly apple illustration.'
      }
    ],
    pages: [
      {
        page_number: 2,
        subject: 'Mathematics',
        learning_objectives: ['Count a group of objects accurately.'],
        activities: [
          {
            order: 1,
            title: 'Count familiar objects',
            instructions: 'Count each group and say the number.',
            activity_type: 'counting',
            prompt_data: {
              groups: [{ label: 'balls', quantity: 3 }],
              visual: { asset_path: 'assets/counting-balls.svg' }
            },
            skills: ['one-to-one counting'],
            visual_requirements: ['Use three simple, child-friendly balls.'],
            template_guidance: 'Use new quantities and original illustrations.'
          }
        ]
      }
    ]
  };
}

test('normalizes the PP1 reference contract and discovers prompt asset paths', () => {
  const payload = validateReferencePayload(samplePayload());

  assert.equal(payload.document.documentKey, 'orion-checkpoint-vol1');
  assert.equal(payload.pages[0].pageNumber, 2);
  assert.deepEqual(payload.assets, [{
    relativePath: 'assets/apple.png',
    assetType: 'illustration',
    description: 'Original child-friendly apple illustration.',
    checksum: null
  }]);
  assert.deepEqual(payload.pages[0].activities[0].assets, [{
    relativePath: 'assets/counting-balls.svg',
    assetType: 'image',
    description: null,
    checksum: null
  }]);
  assert.equal(canonicalJson(payload), canonicalJson(JSON.parse(JSON.stringify(payload))));
});

test('rejects asset paths that escape the local reference package', () => {
  const payload = samplePayload();
  payload.pages[0].activities[0].prompt_data.visual.asset_path = '../outside.svg';

  assert.throws(() => validateReferencePayload(payload), /must not escape the reference package/);
});

test('rejects capture metadata instead of persisting it with learning content', () => {
  const payload = samplePayload();
  payload.pages[0].activities[0].prompt_data.gps = { latitude: -1.29, longitude: 36.82 };

  assert.throws(() => validateReferencePayload(payload), /capture metadata/);
});
