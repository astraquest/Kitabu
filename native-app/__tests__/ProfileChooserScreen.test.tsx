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

test('routes named parent and child profiles and exposes footer actions', async () => {
  const onParent = jest.fn();
  const onChild = jest.fn();
  const onAddAccount = jest.fn();
  const onOpenTerms = jest.fn();
  const onOpenPrivacy = jest.fn();
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
        onOpenTerms={onOpenTerms}
        onOpenPrivacy={onOpenPrivacy}
      />,
    );
  });

  expect(renderer!.root.findByProps({ children: "Who's using Kitabu?" })).toBeTruthy();
  expect(renderer!.root.findByProps({ children: 'Choose your profile to continue' })).toBeTruthy();
  expect(renderer!.root.findByProps({ children: 'Njeri Wambui' })).toBeTruthy();
  expect(renderer!.root.findByProps({ children: 'Amani Wambui' })).toBeTruthy();
  expect(renderer!.root.findByProps({ children: 'Parent' })).toBeTruthy();
  expect(renderer!.root.findByProps({ children: 'Student' })).toBeTruthy();
  expect(renderer!.root.findAllByProps({ children: 'Teacher' })).toHaveLength(0);

  await act(() => renderer!.root.findByProps({ accessibilityLabel: 'Open parent profile' }).props.onPress());
  await act(() => renderer!.root.findByProps({ accessibilityLabel: 'Open Amani Wambui profile' }).props.onPress());
  await act(() => renderer!.root.findByProps({ accessibilityLabel: 'Sign Up' }).props.onPress());
  await act(() => renderer!.root.findByProps({ accessibilityLabel: 'Terms' }).props.onPress());
  await act(() => renderer!.root.findByProps({ accessibilityLabel: 'Privacy' }).props.onPress());

  expect(onParent).toHaveBeenCalledTimes(1);
  expect(onChild).toHaveBeenCalledWith('child-1');
  expect(onAddAccount).toHaveBeenCalledTimes(1);
  expect(onOpenTerms).toHaveBeenCalledTimes(1);
  expect(onOpenPrivacy).toHaveBeenCalledTimes(1);
  expect(renderer!.root.findByProps({ children: 'Terms' })).toBeTruthy();
  expect(renderer!.root.findByProps({ children: 'Privacy' })).toBeTruthy();
});

test('does not render named profile cards while associated profiles are loading', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <ProfileChooserScreen
        children={[]}
        isLoading
        mascotKey="elephant"
        onAddAccount={jest.fn()}
        onChild={jest.fn()}
        onParent={jest.fn()}
        parentName="Njeri Wambui"
      />,
    );
  });

  expect(renderer!.root.findByProps({ accessibilityLabel: 'Loading family profiles' })).toBeTruthy();
  expect(renderer!.root.findAllByProps({ children: 'Njeri Wambui' })).toHaveLength(0);
});
