import assert from 'node:assert/strict';
import test from 'node:test';

import {
  HeadlessFakeComponentAdapter,
  runInteractiveLearningHarness,
} from '../../src/interactive-learning/harness.ts';

test('enforces the host lifecycle instead of accepting out-of-order commands', () => {
  const adapter = new HeadlessFakeComponentAdapter();

  assert.throws(() => adapter.ready(), /expected loaded, received created/);
  assert.throws(() => adapter.interact('42'), /expected ready, received created/);

  adapter.load();
  assert.throws(() => adapter.load(), /expected created, received loaded/);

  adapter.ready();
  adapter.complete();
  assert.throws(() => adapter.createSnapshot(), /expected ready, received completed/);
});

test('produces an identical event and snapshot trace for identical input', () => {
  const first = runInteractiveLearningHarness('73,405');
  const second = runInteractiveLearningHarness('73,405');

  assert.deepEqual(second, first);
  assert.deepEqual(
    first.trace.map(({ direction, envelope }) => [direction, envelope.type, envelope.sequence]),
    [
      ['host-to-component', 'LOAD', 1],
      ['component-to-host', 'READY', 2],
      ['component-to-host', 'INTERACTION', 3],
      ['component-to-host', 'EVIDENCE', 4],
      ['component-to-host', 'STATE_SNAPSHOT', 5],
      ['host-to-component', 'RESTORE_STATE', 6],
      ['component-to-host', 'COMPLETED', 7],
    ],
  );

  const interaction = first.trace[2]?.envelope;
  const evidence = first.trace[3]?.envelope;
  assert.equal(evidence?.payload && typeof evidence.payload === 'object'
    ? (evidence.payload as { sourceEventIds: string[] }).sourceEventIds[0]
    : undefined, interaction?.eventId);
});

test('restores a snapshot into a fresh adapter and resumes from copied state', () => {
  const source = new HeadlessFakeComponentAdapter();
  source.load();
  source.ready();
  source.interact('840,000');
  const snapshot = source.createSnapshot();

  const resumed = new HeadlessFakeComponentAdapter();
  resumed.load();
  resumed.ready();
  resumed.restore(snapshot);

  assert.deepEqual(resumed.currentState(), {
    response: '840,000',
    interactionCount: 1,
    completed: false,
  });

  snapshot.state.response = 'mutated after restore';
  assert.equal(resumed.currentState().response, '840,000');

  resumed.complete();
  assert.equal(resumed.currentState().completed, true);
});

test('rejects a snapshot bound to another attempt', () => {
  const source = runInteractiveLearningHarness().snapshot;
  const resumed = new HeadlessFakeComponentAdapter();
  resumed.load();
  resumed.ready();

  assert.throws(
    () => resumed.restore({ ...source, attemptId: 'another-attempt' }),
    /snapshot restore failed: BINDING_MISMATCH/,
  );
});
