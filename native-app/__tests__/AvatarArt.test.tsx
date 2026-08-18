import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  AvatarArt,
  LOCAL_AVATAR_OPTIONS,
  isLocalAvatarKey,
  normalizeLocalAvatarKey,
  selectAvatarKey,
} from '../src/components/AvatarArt';

test('exposes all supplied raster avatar keys and renders a testable image', async () => {
  const keys = LOCAL_AVATAR_OPTIONS.map(option => option.key);
  expect(keys).toEqual(['girl1', 'boy1', 'mum1', 'dad1', 'girl2', 'boy2', 'mum2', 'dad2']);
  keys.forEach(key => expect(isLocalAvatarKey(key)).toBe(true));

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(() => {
    renderer = ReactTestRenderer.create(<AvatarArt avatarKey="girl2" size={48} />);
  });

  expect(renderer!.root.findByProps({ testID: 'avatar-art-girl2' })).toBeTruthy();
});

test('normalizes legacy keys to raster assets', () => {
  expect(normalizeLocalAvatarKey('avatar-afro-boy')).toBe('boy1');
  expect(normalizeLocalAvatarKey('avatar-afro-girl')).toBe('girl1');
  expect(normalizeLocalAvatarKey('unknown')).toBeNull();
});

test('selects lower and upper primary student and adult assets by gender', () => {
  expect(selectAvatarKey({ role: 'student', grade: 'Grade 4', gender: 'female' })).toBe('girl1');
  expect(selectAvatarKey({ role: 'student', grade: 'Grade 4', gender: 'male' })).toBe('boy1');
  expect(selectAvatarKey({ role: 'parent', grade: 'Grade 4', gender: 'female' })).toBe('mum1');
  expect(selectAvatarKey({ role: 'parent', grade: 'Grade 4', gender: 'male' })).toBe('dad1');
  expect(selectAvatarKey({ role: 'student', grade: 'Grade 5', gender: 'female' })).toBe('girl2');
  expect(selectAvatarKey({ role: 'student', grade: 'Grade 5', gender: 'male' })).toBe('boy2');
  expect(selectAvatarKey({ role: 'teacher', grade: 'Grade 5', gender: 'female' })).toBe('mum2');
  expect(selectAvatarKey({ role: 'teacher', grade: 'Grade 5', gender: 'male' })).toBe('dad2');
});

test('uses documented deterministic fallback and preserves an existing key', () => {
  expect(selectAvatarKey({ role: 'student', grade: 'Grade 4', gender: 'not_specified' })).toBe('boy1');
  expect(selectAvatarKey({ role: 'parent', grade: 'Grade 5' })).toBe('mum2');
  expect(
    selectAvatarKey({
      role: 'student',
      grade: 'Grade 4',
      gender: 'female',
      existingAvatarKey: 'boy2',
    }),
  ).toBe('boy2');
});
