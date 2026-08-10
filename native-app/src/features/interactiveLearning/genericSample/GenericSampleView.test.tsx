import ReactTestRenderer, { act } from 'react-test-renderer';

import { GenericSampleView } from './GenericSampleView';
import type { GenericSampleSceneProps } from './types';

const props: GenericSampleSceneProps = {
  title: 'Parts of a plant',
  instructions: 'Choose the part that takes in water.',
  body: 'Plants have different parts with different jobs.',
  steps: ['Look at the choices.', 'Tap one answer.'],
  options: [{ id: 'root', label: 'Root' }, { id: 'leaf', label: 'Leaf' }],
  inputKind: 'choice',
  list: ['Roots hold the plant.', 'Leaves make food.'],
  table: { columns: ['Part', 'Job'], rows: [['Root', 'Takes in water']] },
  presentation: { model: { label: 'Plant model' } },
};

test('renders learner-safe content and emits a bounded choice response', () => {
  const onResponseChange = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(
      <GenericSampleView props={props} value="" onResponseChange={onResponseChange} />,
    );
  });

  expect(renderer.root.findByProps({ children: 'Parts of a plant' })).toBeTruthy();
  expect(renderer.root.findByProps({ children: 'Plant model' })).toBeTruthy();
  expect(renderer.root.findByProps({ accessibilityLabel: 'Root' })).toBeTruthy();

  act(() => renderer.root.findByProps({ accessibilityLabel: 'Root' }).props.onPress());
  expect(onResponseChange).toHaveBeenCalledWith('root');
  act(() => renderer.unmount());
});

test('renders bounded text input and forwards response text', () => {
  const onResponseChange = jest.fn();
  const inputProps: GenericSampleSceneProps = {
    title: 'Name the process',
    instructions: 'Type your response.',
    inputKind: 'text',
    inputMaxLength: 40,
    events: [{ type: 'submit' }],
  };
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(
      <GenericSampleView props={inputProps} value="" onResponseChange={onResponseChange} />,
    );
  });
  const input = renderer.root.findByProps({ accessibilityLabel: 'Your response' });

  act(() => input.props.onChangeText('photosynthesis'));
  expect(onResponseChange).toHaveBeenLastCalledWith('photosynthesis');
  expect(renderer.root.findByProps({ children: 'Continue' })).toBeTruthy();
  act(() => renderer.unmount());
});
