import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthoredInteractionView } from './AuthoredInteractionView';

test('supports tap-first classification and emits only after every item is placed', () => {
  const onResponseChange = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  act(() => {
    renderer = ReactTestRenderer.create(
      <AuthoredInteractionView
        onResponseChange={onResponseChange}
        props={{
          mode: 'classify',
          instruction: 'Sort the food.',
          items: [{ id: 'mango', label: 'Mango' }, { id: 'carrot', label: 'Carrot' }],
          groups: [{ id: 'fruit', label: 'Fruit' }, { id: 'vegetable', label: 'Vegetable' }],
        }}
        sceneId="sort-food"
      />,
    );
  });

  act(() => renderer.root.findByProps({ accessibilityLabel: 'Mango' }).props.onPress());
  act(() => renderer.root.findByProps({ accessibilityLabel: 'Fruit' }).props.onPress());
  expect(onResponseChange).toHaveBeenLastCalledWith(null);

  act(() => renderer.root.findByProps({ accessibilityLabel: 'Carrot' }).props.onPress());
  act(() => renderer.root.findByProps({ accessibilityLabel: 'Vegetable' }).props.onPress());
  expect(onResponseChange).toHaveBeenLastCalledWith(
    '{"mode":"classify","assignments":{"mango":"fruit","carrot":"vegetable"}}',
  );

  act(() => renderer.unmount());
});
test('builds a repeated pattern to the public slot count and supports undo', () => {
  const onResponseChange = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  act(() => {
    renderer = ReactTestRenderer.create(
      <AuthoredInteractionView
        onResponseChange={onResponseChange}
        props={{
          mode: 'pattern',
          instruction: 'Build the pattern.',
          items: [{ id: 'circle', label: 'Circle' }, { id: 'square', label: 'Square' }],
          groups: [{ id: 'one', label: '1' }, { id: 'two', label: '2' }, { id: 'three', label: '3' }],
        }}
        sceneId="pattern-shapes"
      />,
    );
  });

  const circle = () => renderer.root.findByProps({ accessibilityLabel: 'Circle' });
  const square = () => renderer.root.findByProps({ accessibilityLabel: 'Square' });
  act(() => circle().props.onPress());
  act(() => square().props.onPress());
  expect(onResponseChange).toHaveBeenLastCalledWith(null);
  act(() => circle().props.onPress());
  expect(onResponseChange).toHaveBeenLastCalledWith(
    '{"mode":"pattern","sequence":["circle","square","circle"]}',
  );

  act(() => renderer.root.findByProps({ accessibilityLabel: 'Undo last pattern item' }).props.onPress());
  expect(onResponseChange).toHaveBeenLastCalledWith(null);

  act(() => renderer.unmount());
});
