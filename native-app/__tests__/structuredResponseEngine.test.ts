import {
  createStructuredResponseState,
  getStructuredResponseMaxLength,
  normalizeStructuredResponse,
  serializeStructuredResponse,
  updateStructuredResponseState,
} from '../src/features/interactiveLearning/structuredResponse';
import type { StructuredResponseSceneProps } from '../src/features/interactiveLearning/structuredResponse';

const numericProps: StructuredResponseSceneProps = {
  mode: 'numeric',
  input: { maxLength: 8, allowMultiline: false },
  normalization: {
    allowSurroundingWhitespace: true,
    allowThousandsSeparators: true,
  },
  accessibility: { inputLabel: { default: 'Answer' } },
};

test('state is deterministic, bounded, and submit-ready only for a non-empty canonical value', () => {
  expect(createStructuredResponseState(numericProps, ' 12,000 ')).toEqual({
    value: ' 12,000 ',
    remainingCharacters: 0,
    canSubmit: true,
  });

  expect(createStructuredResponseState(numericProps, '         ')).toEqual({
    value: '        ',
    remainingCharacters: 0,
    canSubmit: false,
  });
});

test('serialization applies contract normalization in stable order', () => {
  expect(serializeStructuredResponse(' 12,000 ', numericProps)).toBe('12000');

  const textProps: StructuredResponseSceneProps = {
    mode: 'short-text',
    normalization: {
      allowSurroundingWhitespace: true,
      collapseInternalWhitespace: true,
      caseSensitive: false,
      locale: 'en-KE',
    },
    accessibility: { inputLabel: { default: 'Answer' } },
  };
  expect(normalizeStructuredResponse('  Red   Soil  ', textProps)).toBe('red soil');
});

test('limits untrusted maxLength values to the schema range', () => {
  expect(getStructuredResponseMaxLength({ ...numericProps, input: { maxLength: 0 } } as StructuredResponseSceneProps)).toBe(1);
  expect(getStructuredResponseMaxLength({ ...numericProps, input: { maxLength: 900 } } as StructuredResponseSceneProps)).toBe(500);
  expect(getStructuredResponseMaxLength({ ...numericProps, input: { maxLength: 2.5 } } as StructuredResponseSceneProps)).toBe(500);
});

test('updates reuse state when no observable field changes', () => {
  const state = createStructuredResponseState(numericProps, '42');
  expect(updateStructuredResponseState(state, '42', numericProps)).toBe(state);
  expect(updateStructuredResponseState(state, '420', numericProps)).toEqual({
    value: '420',
    remainingCharacters: 5,
    canSubmit: true,
  });
});
