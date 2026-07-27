/**
 * Fast, dependency-free guard for authored Grade 1 Geometry missions.
 * Keeps content review deterministic while allowing each outcome file to be
 * authored independently.
 */
import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const geometryRoot = join(here, '../data/learning-content/KEN/CBC/G1/mathematics/outcomes/3.0');
const phases = ['warm-up', 'model', 'guided-practice', 'independent-practice', 'transfer', 'exit-check'];
const expectedOutcomes = {
  'ad7968e3-394c-4407-bdaa-4f353cdcb571': [
    'identify straight lines in different situations',
    'draw straight lines on different surfaces',
    'identify curved lines in different situations',
    'draw curved lines on different surfaces',
    'recognise straight and curved lines from real objects in the environment.',
  ],
  '77e1b45d-6336-40fd-967d-e5a7ff409fb0': [
    'identify rectangles, triangles, and circles in objects from the environment',
    'make patterns involving rectangles, triangles, circles, and ovals',
    'appreciate the beauty of patterns in different fabrics.',
  ],
};

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => entry.isDirectory()
    ? filesUnder(join(directory, entry.name))
    : entry.name.endsWith('.json') ? [join(directory, entry.name)] : []));
  return nested.flat();
}

const files = await filesUnder(geometryRoot);
assert.ok(files.length > 0, 'No Grade 1 Geometry outcome missions found.');

for (const file of files) {
  const size = await stat(file);
  assert.ok(size.size <= 100_000, `${file}: mission exceeds the 100 KB mobile-content budget.`);
  const content = JSON.parse(await readFile(file, 'utf8'));
  const { curriculum, mission } = content;

  assert.equal(curriculum?.country, 'KEN', `${file}: country must be KEN.`);
  assert.equal(curriculum?.curriculum, 'CBC', `${file}: curriculum must be CBC.`);
  assert.equal(curriculum?.grade, 'Grade 1', `${file}: grade must be Grade 1.`);
  assert.equal(curriculum?.subjectId, 'mathematics', `${file}: subject must be mathematics.`);
  assert.equal(curriculum?.strand, '3.0 Geometry', `${file}: strand must be 3.0 Geometry.`);
  assert.ok(typeof curriculum?.subStrandId === 'string' && curriculum.subStrandId.length > 0, `${file}: missing sub-strand source identifier.`);
  assert.ok(typeof curriculum?.outcomeId === 'string' && curriculum.outcomeId.length > 0, `${file}: missing outcome source identifier.`);
  assert.ok(typeof curriculum?.outcomeText === 'string' && curriculum.outcomeText.length > 0, `${file}: missing stored outcome text.`);
  const expected = expectedOutcomes[curriculum.subStrandId]?.[Number(curriculum.outcomePosition) - 1];
  assert.equal(curriculum.outcomeText, expected, `${file}: outcome text must match the stored Grade 1 curriculum exactly.`);
  assert.equal(mission?.interactions?.length, 6, `${file}: each mission needs exactly six interactions.`);

  mission.interactions.forEach((interaction, index) => {
    assert.equal(interaction.phase, phases[index], `${file}: interaction ${index + 1} must be ${phases[index]}.`);
    assert.equal(interaction.progressionLevel, index + 1, `${file}: interaction ${index + 1} has the wrong progression level.`);
    for (const key of ['mode', 'prompt', 'feedback', 'retryHint']) {
      assert.ok(typeof interaction[key] === 'string' && interaction[key].trim(), `${file}: interaction ${index + 1} needs ${key}.`);
    }
    assert.ok(Object.hasOwn(interaction, 'answer'), `${file}: interaction ${index + 1} needs deterministic answer data.`);
    if (interaction.mode === 'trace-construct') {
      assert.ok(typeof interaction.tapAlternative === 'string' && interaction.tapAlternative.trim(), `${file}: tracing must offer a tap alternative.`);
    }
  });
}

console.log(`Validated ${files.length} Grade 1 Geometry mission(s).`);
