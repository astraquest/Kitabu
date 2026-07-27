import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildContentIndex, canonicalIndexPath } from './build-grade1-mathematics-content-index.mjs';

const validMission = {
  curriculum: {
    country: 'KEN', curriculum: 'CBC', grade: 'Grade 1', subject: 'Mathematical Activities',
    strand: '2.0 Measurement', subStrand: '2.3 Capacity', outcomeText: 'Compare containers.',
  },
  mission: {
    title: 'Compare containers.',
    interactions: [
      ['warm-up', 'Tap the cup.'], ['model', 'Watch the cup fill.'], ['guided-practice', 'Choose the fuller cup.'],
      ['independent-practice', 'Choose again.'], ['transfer', 'Find a bottle.'], ['exit-check', 'Show what you know.'],
    ].map(([phase, prompt]) => ({ phase, mode: 'picture-choice', prompt, answer: 'cup', feedback: 'Good job!', retryHint: 'Look again.' })),
  },
};

async function fixture(mission = validMission) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'kitabu-g1-index-'));
  const folder = path.join(root, 'outcomes', '2.0', '2.3');
  await mkdir(folder, { recursive: true });
  await writeFile(path.join(folder, 'capacity.json'), JSON.stringify(mission));
  return root;
}

test('builds an index for a valid outcome mission', async () => {
  const root = await fixture();
  try {
    const index = await buildContentIndex(root);
    assert.equal(index.missionCount, 1);
    assert.equal(index.interactionCount, 6);
    assert.equal(index.missions[0].path, 'outcomes/2.0/2.3/capacity.json');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('validates the committed Grade 1 Mathematics mission set', async () => {
  const index = await buildContentIndex();
  assert.equal(index.missionCount, 53);
  assert.equal(index.interactionCount, 318);
  assert.ok(index.missions.every((mission) => mission.title === mission.curriculum.outcomeText));
});

test('rejects a mission with an invalid progressive phase', async () => {
  const invalid = structuredClone(validMission);
  invalid.mission.interactions[2].phase = 'practice';
  const root = await fixture(invalid);
  try {
    await assert.rejects(() => buildContentIndex(root), /guided-practice/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('rejects a mission without deterministic answer data', async () => {
  const invalid = structuredClone(validMission);
  delete invalid.mission.interactions[5].answer;
  const root = await fixture(invalid);
  try {
    await assert.rejects(() => buildContentIndex(root), /deterministic answer data/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('rejects an unapproved presentation alias for a curriculum outcome', async () => {
  const invalid = structuredClone(validMission);
  invalid.mission.title = 'Container Safari';
  const root = await fixture(invalid);
  try {
    await assert.rejects(() => buildContentIndex(root), /must exactly match curriculum\.outcomeText/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('normalizes legacy sub-strand folder names in generated index paths only', () => {
  assert.equal(
    canonicalIndexPath('outcomes/2.0/2.3-capacity/outcome-4.json'),
    'outcomes/2.0/2.3/outcome-4.json',
  );
  assert.equal(
    canonicalIndexPath('outcomes/1.0/1.2-whole-numbers/outcome-1.json'),
    'outcomes/1.0/1.2/outcome-1.json',
  );
  assert.equal(canonicalIndexPath('outcomes/3.0/3.1/outcome-1.json'), 'outcomes/3.0/3.1/outcome-1.json');
});
