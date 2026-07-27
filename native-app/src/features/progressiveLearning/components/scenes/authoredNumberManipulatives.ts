import type { NumberManipulativesMode } from './NumberManipulativesScene';

type JsonRecord = Record<string, unknown>;

export type AuthoredNumberManipulativesScene = {
  initialValue: number;
  max: number;
  min: number;
  mode: NumberManipulativesMode;
  unitLabel: string;
  feedback?: string;
  retryHint?: string;
};

const MODES: readonly NumberManipulativesMode[] = [
  'count', 'represent', 'combine', 'take-away', 'number-line', 'measure',
];

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function wholeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 50
    ? value
    : null;
}

function text(value: unknown, maximum = 220): string | undefined {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim().slice(0, maximum)
    : undefined;
}

/**
 * Accepts the compact authored scene shape used by outcome compilers and AI
 * practice. It deliberately accepts only bounded numeric data before it reaches
 * the Grade 1 renderer.
 */
export function adaptAuthoredNumberManipulatives(
  componentScene: unknown,
): AuthoredNumberManipulativesScene | null {
  if (!isRecord(componentScene)) return null;
  const component = isRecord(componentScene.component) ? componentScene.component : null;
  const props = component?.componentId === 'number-manipulatives' && isRecord(componentScene.props)
    ? componentScene.props
    : componentScene.mode === 'number-manipulatives'
      ? componentScene
      : null;
  if (!props) return null;

  const min = wholeNumber(props.min) ?? 0;
  const max = wholeNumber(props.max ?? props.availableCount);
  const initialValue = wholeNumber(props.initialValue) ?? min;
  const rawMode = props.interactionMode ?? props.activityMode;
  const mode: NumberManipulativesMode =
    rawMode === 'take-away' || rawMode === 'number-line' || rawMode === 'measure'
      ? rawMode
      : rawMode === 'combine' || rawMode === 'put-together'
        ? 'combine'
        : rawMode === 'count' || rawMode === 'represent' || rawMode === 'build-set' || rawMode === 'build-tens-and-ones'
          ? rawMode === 'count' ? 'count' : 'represent'
          : 'represent';

  if (max === null || min > max || initialValue < min || initialValue > max) {
    return null;
  }
  if (!MODES.includes(mode)) return null;

  return {
    initialValue,
    min,
    max,
    mode,
    unitLabel: text(props.unitLabel ?? props.object, 40) ?? 'counters',
    feedback: text(props.feedback),
    retryHint: text(props.retryHint),
  };
}
