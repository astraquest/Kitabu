import type {
  AuthoredAssignments,
  AuthoredInteractionSceneProps,
} from './types';

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function serializeAssignments(
  mode: 'classify' | 'match',
  assignments: AuthoredAssignments,
  itemIds: string[],
): string {
  const orderedAssignments: AuthoredAssignments = {};
  itemIds.forEach(id => {
    if (assignments[id] !== undefined) orderedAssignments[id] = assignments[id];
  });
  return JSON.stringify({ mode, assignments: orderedAssignments });
}

export function serializeOrder(sequence: string[]): string {
  return `sequence:${sequence.join('>')}`;
}

export function serializePattern(sequence: string[]): string {
  return JSON.stringify({ mode: 'pattern', sequence });
}

export function isAssignmentComplete(assignments: AuthoredAssignments, itemIds: string[]): boolean {
  return itemIds.length > 0 && itemIds.every(id => typeof assignments[id] === 'string');
}

export function patternTargetLength(props: AuthoredInteractionSceneProps): number {
  return props.groups?.length ?? 1;
}

export function moveItem(sequence: string[], index: number, direction: -1 | 1): string[] {
  const target = index + direction;
  if (index < 0 || index >= sequence.length || target < 0 || target >= sequence.length) return sequence;
  const next = [...sequence];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function restoreAssignments(
  response: string | undefined,
  props: AuthoredInteractionSceneProps,
): AuthoredAssignments {
  if (!response || (props.mode !== 'classify' && props.mode !== 'match')) return {};
  try {
    const parsed: unknown = JSON.parse(response);
    if (!isRecord(parsed) || parsed.mode !== props.mode || !isRecord(parsed.assignments)) return {};
    const itemIds = new Set(props.items.map(item => item.id));
    const groupIds = new Set((props.groups ?? []).map(group => group.id));
    const restored: AuthoredAssignments = {};
    Object.entries(parsed.assignments).forEach(([itemId, groupId]) => {
      if (itemIds.has(itemId) && typeof groupId === 'string' && groupIds.has(groupId)) {
        restored[itemId] = groupId;
      }
    });
    return restored;
  } catch {
    return {};
  }
}

export function restoreSequence(response: string | undefined, props: AuthoredInteractionSceneProps): string[] {
  const itemIds = new Set(props.items.map(item => item.id));
  if (!response) return props.mode === 'order' ? props.items.map(item => item.id) : [];

  if (props.mode === 'order' && response.startsWith('sequence:')) {
    const sequence = response.slice('sequence:'.length).split('>').filter(Boolean);
    return sequence.length === props.items.length && new Set(sequence).size === sequence.length &&
      sequence.every(id => itemIds.has(id))
      ? sequence
      : props.items.map(item => item.id);
  }

  if (props.mode === 'pattern') {
    try {
      const parsed: unknown = JSON.parse(response);
      if (!isRecord(parsed) || parsed.mode !== 'pattern' || !Array.isArray(parsed.sequence)) return [];
      const sequence = parsed.sequence.filter((id): id is string => typeof id === 'string' && itemIds.has(id));
      return sequence.slice(0, patternTargetLength(props));
    } catch {
      return [];
    }
  }

  return [];
}
