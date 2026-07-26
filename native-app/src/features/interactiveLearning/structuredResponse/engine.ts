import type { StructuredResponseSceneProps } from './types';

export const STRUCTURED_RESPONSE_DEFAULT_MAX_LENGTH = 500;
export const STRUCTURED_RESPONSE_MAX_LENGTH = 500;

export interface StructuredResponseState {
  value: string;
  remainingCharacters: number;
  canSubmit: boolean;
}

/** Returns the contract-bounded input limit, even for untrusted runtime props. */
export function getStructuredResponseMaxLength(props: StructuredResponseSceneProps): number {
  const configured = props.input?.maxLength;
  if (!Number.isInteger(configured)) {
    return STRUCTURED_RESPONSE_DEFAULT_MAX_LENGTH;
  }

  return Math.min(STRUCTURED_RESPONSE_MAX_LENGTH, Math.max(1, configured as number));
}

/** Applies the same deterministic limit used by the native text input. */
export function limitStructuredResponse(
  value: string,
  props: StructuredResponseSceneProps,
): string {
  return value.slice(0, getStructuredResponseMaxLength(props));
}

export function normalizeStructuredResponse(
  value: string,
  props: StructuredResponseSceneProps,
): string {
  const normalization = props.normalization;
  let normalized = limitStructuredResponse(value, props);

  if (normalization?.allowSurroundingWhitespace) {
    normalized = normalized.trim();
  }
  if (normalization?.collapseInternalWhitespace) {
    normalized = normalized.replace(/\s+/g, ' ');
  }
  if (props.mode === 'numeric' && normalization?.allowThousandsSeparators) {
    normalized = normalized.replace(/,/g, '');
  }
  if (props.mode === 'short-text' && normalization?.caseSensitive === false) {
    normalized = normalized.toLocaleLowerCase(normalization.locale);
  }

  return normalized;
}

/** Canonical wire value sent to the grader. */
export function serializeStructuredResponse(
  value: string,
  props: StructuredResponseSceneProps,
): string {
  return normalizeStructuredResponse(value, props);
}

export function createStructuredResponseState(
  props: StructuredResponseSceneProps,
  value = '',
): StructuredResponseState {
  const limitedValue = limitStructuredResponse(value, props);
  const maxLength = getStructuredResponseMaxLength(props);

  return {
    value: limitedValue,
    remainingCharacters: maxLength - limitedValue.length,
    canSubmit: serializeStructuredResponse(limitedValue, props).length > 0,
  };
}

export function updateStructuredResponseState(
  state: StructuredResponseState,
  value: string,
  props: StructuredResponseSceneProps,
): StructuredResponseState {
  const next = createStructuredResponseState(props, value);
  return next.value === state.value &&
    next.remainingCharacters === state.remainingCharacters &&
    next.canSubmit === state.canSubmit
    ? state
    : next;
}
