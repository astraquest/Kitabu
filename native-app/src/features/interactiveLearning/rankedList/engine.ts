import type { RankedListSceneProps } from './types';

export function serializeRankedListResponse(itemIds: string[]) {
  return `sequence:${itemIds.join('>')}`;
}

export function isCompleteRankedList(itemIds: string[], props: RankedListSceneProps) {
  return itemIds.length === props.items.length && new Set(itemIds).size === props.items.length;
}

export function moveRankedListItem(itemIds: string[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (index < 0 || index >= itemIds.length || target < 0 || target >= itemIds.length) return itemIds;
  const next = [...itemIds];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
