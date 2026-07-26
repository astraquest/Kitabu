import { isCompleteRankedList, moveRankedListItem, serializeRankedListResponse } from '../src/features/interactiveLearning/rankedList/engine';
import type { RankedListSceneProps } from '../src/features/interactiveLearning/rankedList/types';

const props: RankedListSceneProps = {
  mode: 'ranked-list',
  items: [
    { id: 'a', label: '2', value: 2, accessibleDescription: 'two' },
    { id: 'b', label: '1', value: 1, accessibleDescription: 'one' },
  ],
  orderingRules: { direction: 'ascending' },
  allowMultiplePlacements: false,
  unplacedPolicy: 'all-items-required',
  layout: { orientation: 'vertical', showPositionNumbers: true },
  shuffleSeed: 'test',
  explanationPolicy: { required: false },
  keyboardMoveModel: 'move-buttons',
};

test('moves cards without requiring drag and serializes the existing sequence format', () => {
  const order = moveRankedListItem(['a', 'b'], 1, -1);
  expect(order).toEqual(['b', 'a']);
  expect(serializeRankedListResponse(order)).toBe('sequence:b>a');
  expect(isCompleteRankedList(order, props)).toBe(true);
});

test('rejects incomplete and duplicate orders and ignores moves past boundaries', () => {
  expect(isCompleteRankedList(['a'], props)).toBe(false);
  expect(isCompleteRankedList(['a', 'a'], props)).toBe(false);
  expect(moveRankedListItem(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
});
