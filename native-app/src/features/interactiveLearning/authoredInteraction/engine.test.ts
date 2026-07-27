import {
  isAssignmentComplete,
  moveItem,
  patternTargetLength,
  restoreAssignments,
  restoreSequence,
  serializeAssignments,
  serializeOrder,
  serializePattern,
} from './engine';
import type { AuthoredInteractionSceneProps } from './types';

const classifyProps: AuthoredInteractionSceneProps = {
  mode: 'classify',
  instruction: 'Put each item in a group.',
  items: [
    { id: 'mango', label: 'Mango' },
    { id: 'carrot', label: 'Carrot' },
  ],
  groups: [
    { id: 'fruit', label: 'Fruit' },
    { id: 'vegetable', label: 'Vegetable' },
  ],
};

test('serializes complete assignments in authored item order without answers', () => {
  const assignments = { carrot: 'vegetable', mango: 'fruit' };
  expect(isAssignmentComplete(assignments, ['mango', 'carrot'])).toBe(true);
  expect(serializeAssignments('classify', assignments, ['mango', 'carrot'])).toBe(
    '{"mode":"classify","assignments":{"mango":"fruit","carrot":"vegetable"}}',
  );
  expect(restoreAssignments(serializeAssignments('classify', assignments, ['mango', 'carrot']), classifyProps))
    .toEqual({ mango: 'fruit', carrot: 'vegetable' });
});

test('drops unknown item and group ids from a restored assignment response', () => {
  const response = JSON.stringify({
    mode: 'classify',
    assignments: { mango: 'fruit', secret: 'fruit', carrot: 'unknown' },
  });
  expect(restoreAssignments(response, classifyProps)).toEqual({ mango: 'fruit' });
});

test('moves order items and restores only a complete unique public sequence', () => {
  const props: AuthoredInteractionSceneProps = {
    mode: 'order',
    instruction: 'Order the days.',
    items: [{ id: 'mon', label: 'Monday' }, { id: 'tue', label: 'Tuesday' }],
  };
  expect(moveItem(['mon', 'tue'], 1, -1)).toEqual(['tue', 'mon']);
  expect(serializeOrder(['tue', 'mon'])).toBe('sequence:tue>mon');
  expect(restoreSequence('sequence:tue>mon', props)).toEqual(['tue', 'mon']);
  expect(restoreSequence('sequence:tue>secret', props)).toEqual(['mon', 'tue']);
});

test('uses public pattern slots as target length and allows repeated choices', () => {
  const props: AuthoredInteractionSceneProps = {
    mode: 'pattern',
    instruction: 'Make the pattern.',
    items: [{ id: 'circle', label: 'Circle' }, { id: 'square', label: 'Square' }],
    groups: [
      { id: 'slot-1', label: 'First' },
      { id: 'slot-2', label: 'Second' },
      { id: 'slot-3', label: 'Third' },
    ],
  };
  const response = serializePattern(['circle', 'square', 'circle']);
  expect(patternTargetLength(props)).toBe(3);
  expect(restoreSequence(response, props)).toEqual(['circle', 'square', 'circle']);
});
