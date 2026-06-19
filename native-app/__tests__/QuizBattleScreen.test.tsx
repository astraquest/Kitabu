import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import { QuizBattleScreen } from '../src/screens/QuizBattleScreen';

test('plays through quiz battle and awards points', async () => {
  const onAddPoints = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <QuizBattleScreen onBack={jest.fn()} onAddPoints={onAddPoints} />,
    );
  });

  for (const answer of ['96', 'children', 'Heart', 'Book']) {
    const option = renderer!.root.findAll(
      node =>
        typeof node.props.onPress === 'function' &&
        node.findAllByProps({ children: answer }).length > 0,
    )[0];
    await ReactTestRenderer.act(() => {
      option.props.onPress();
    });
    const actionLabel =
      answer === 'Book' ? 'Finish battle' : 'Lock answer';
    const action = renderer!.root.findAll(
      node =>
        typeof node.props.onPress === 'function' &&
        node.findAllByProps({ children: actionLabel }).length > 0,
    )[0];
    await ReactTestRenderer.act(() => action.props.onPress());
  }

  expect(onAddPoints).toHaveBeenCalledWith(25);
  expect(renderer!.root.findAllByProps({ children: 'Battle won' }).length).toBeGreaterThan(0);
});
