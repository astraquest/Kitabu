import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { ProfileChooserScreen } from '../src/screens/ProfileChooserScreen';
import type { ParentChildSummary } from '../src/types/app';

const child = {
  id: 'child-1',
  name: 'Amani Wambui',
  email: 'amani@example.com',
  grade: 'Grade 4',
} as ParentChildSummary;

test('routes named parent and child profiles and exposes add account', async () => {
  const onParent = jest.fn();
  const onChild = jest.fn();
  const onAddAccount = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <ProfileChooserScreen
        parentName="Njeri Wambui"
        mascotKey="elephant"
        children={[child]}
        onParent={onParent}
        onChild={onChild}
        onAddAccount={onAddAccount}
      />,
    );
  });

  expect(renderer!.root.findByProps({ children: "Who's using Kitabu?" })).toBeTruthy();
  expect(renderer!.root.findByProps({ children: 'Njeri Wambui' })).toBeTruthy();
  expect(renderer!.root.findByProps({ children: 'Amani Wambui' })).toBeTruthy();

  await act(() => renderer!.root.findByProps({ accessibilityLabel: 'Open parent profile' }).props.onPress());
  await act(() => renderer!.root.findByProps({ accessibilityLabel: 'Open Amani Wambui profile' }).props.onPress());
  await act(() => renderer!.root.findByProps({ accessibilityLabel: '+ Add account' }).props.onPress());

  expect(onParent).toHaveBeenCalledTimes(1);
  expect(onChild).toHaveBeenCalledWith('child-1');
  expect(onAddAccount).toHaveBeenCalledTimes(1);
});
