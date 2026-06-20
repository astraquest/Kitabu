import React from 'react';
import { Linking } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

import { QuizBattleScreen } from '../src/screens/QuizBattleScreen';

test('requires an opponent and offers WhatsApp invite when no classmates are online', async () => {
  const onAddPoints = jest.fn();
  const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <QuizBattleScreen onBack={jest.fn()} onAddPoints={onAddPoints} />,
    );
  });

  expect(renderer!.root.findAllByProps({ children: 'Choose an opponent' }).length).toBeGreaterThan(0);
  expect(renderer!.root.findAllByProps({ children: 'No classmates online' }).length).toBeGreaterThan(0);
  const startBattle = renderer!.root.findAll(
    node =>
      typeof node.props.onPress === 'function' &&
      node.findAllByProps({ children: 'Start battle' }).length > 0,
  )[0];
  expect(startBattle.props.disabled).toBe(true);

  const invite = renderer!.root.findAll(
    node =>
      typeof node.props.onPress === 'function' &&
      node.findAllByProps({ children: 'Invite on WhatsApp' }).length > 0,
  )[0];

  await ReactTestRenderer.act(() => invite.props.onPress());

  expect(openUrl).toHaveBeenCalledWith(expect.stringContaining('whatsapp://send?text='));
  expect(onAddPoints).not.toHaveBeenCalled();
});
