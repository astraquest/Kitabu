import type { TraceConstructSceneProps } from './types';

export function normalizeTraceConstructSelection(ids: string[], props: TraceConstructSceneProps): string[] {
  const available = new Set(props.targets.map(target => target.id));
  return [...new Set(ids)].filter(id => available.has(id)).slice(0, props.selectionCount);
}

export function toggleTraceConstructTarget(id: string, selected: string[], props: TraceConstructSceneProps): string[] {
  if (selected.includes(id)) return selected.filter(item => item !== id);
  return normalizeTraceConstructSelection([...selected, id], props);
}

export function isTraceConstructComplete(selected: string[], props: TraceConstructSceneProps): boolean {
  return selected.length === props.selectionCount;
}

export function serializeTraceConstructResponse(selected: string[]): string {
  return `selection:${selected.join('|')}`;
}
