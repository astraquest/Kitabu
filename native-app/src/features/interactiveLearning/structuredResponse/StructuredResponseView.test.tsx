import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { StructuredResponseView } from './StructuredResponseView';

const accessibility = {
  inputLabel: { default: 'Enter your answer' },
  spokenPrompt: { default: 'Type the value shown.' },
  responseFormatHint: { default: 'Use digits only.' },
};

test('configures numeric input and emits normalized empty responses', () => {
  const onResponseChange = jest.fn();
  const onSubmit = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  act(() => {
    renderer = ReactTestRenderer.create(
      <StructuredResponseView
        accessibility={accessibility}
        input={{ placeholder: { default: '0.0' }, maxLength: 8 }}
        mode="numeric"
        onResponseChange={onResponseChange}
        onSubmit={onSubmit}
        value="12.5"
      />,
    );
  });

  const input = renderer.root.findByProps({ accessibilityLabel: 'Enter your answer' });
  expect(input.props.accessibilityHint).toBe('Type the value shown.');
  expect(input.props.keyboardType).toBe('decimal-pad');
  expect(input.props.placeholder).toBe('0.0');
  expect(input.props.maxLength).toBe(8);
  expect(renderer.root.findByProps({ accessibilityLabel: '4 of 8 characters used' })).toBeTruthy();

  act(() => input.props.onChangeText(''));
  expect(onResponseChange).toHaveBeenCalledWith(null);
  act(() => input.props.onChangeText('13'));
  expect(onResponseChange).toHaveBeenLastCalledWith('13');
  act(() => input.props.onSubmitEditing());
  expect(onSubmit).toHaveBeenCalledTimes(1);

  act(() => renderer.unmount());
});

test('disables submission for blank or disabled responses and exposes button state', () => {
  const onSubmit = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  act(() => {
    renderer = ReactTestRenderer.create(
      <StructuredResponseView
        accessibility={accessibility}
        mode="short-text"
        onResponseChange={jest.fn()}
        onSubmit={onSubmit}
        submitLabel="Submit response"
        value="   "
      />,
    );
  });

  let button = renderer.root.findByProps({ accessibilityRole: 'button' });
  expect(button.props.disabled).toBe(true);
  expect(button.props.accessibilityState).toEqual({ disabled: true });
  expect(renderer.root.findByProps({ accessibilityLabel: 'Enter your answer' }).props.onSubmitEditing)
    .toBeUndefined();

  act(() => {
    renderer.update(
      <StructuredResponseView
        accessibility={accessibility}
        disabled
        mode="short-text"
        onResponseChange={jest.fn()}
        onSubmit={onSubmit}
        submitLabel="Submit response"
        value="ready"
      />,
    );
  });

  button = renderer.root.findByProps({ accessibilityRole: 'button' });
  expect(button.props.disabled).toBe(true);
  expect(renderer.root.findByProps({ accessibilityLabel: 'Enter your answer' }).props.editable)
    .toBe(false);
  expect(onSubmit).not.toHaveBeenCalled();

  act(() => renderer.unmount());
});

test('supports multiline text without return-key submission and announces errors', () => {
  const onSubmit = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  act(() => {
    renderer = ReactTestRenderer.create(
      <StructuredResponseView
        accessibility={accessibility}
        errorMessage="Answer needs more detail."
        input={{ allowMultiline: true, maxLength: 120 }}
        mode="short-text"
        onResponseChange={jest.fn()}
        onSubmit={onSubmit}
        value="A short explanation"
      />,
    );
  });

  const input = renderer.root.findByProps({ accessibilityLabel: 'Enter your answer' });
  expect(input.props.multiline).toBe(true);
  expect(input.props.textAlignVertical).toBe('top');
  expect(input.props.onSubmitEditing).toBeUndefined();
  expect(renderer.root.findByProps({ accessibilityLiveRegion: 'polite' }).props.children)
    .toBe('Answer needs more detail.');
  expect(renderer.root.findByProps({ accessibilityLabel: '19 of 120 characters used' }))
    .toBeTruthy();

  act(() => renderer.root.findByProps({ accessibilityRole: 'button' }).props.onPress());
  expect(onSubmit).toHaveBeenCalledTimes(1);

  act(() => renderer.unmount());
});
