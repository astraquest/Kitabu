import React from 'react';
import { Image, ImageSourcePropType, StyleSheet, View } from 'react-native';

export type CanonicalAvatarKey =
  | 'girl1'
  | 'boy1'
  | 'mum1'
  | 'dad1'
  | 'girl2'
  | 'boy2'
  | 'mum2'
  | 'dad2';

/** Includes keys accepted from older persisted profile data. */
export type LocalAvatarKey = CanonicalAvatarKey | 'avatar-afro-boy' | 'avatar-afro-girl';

export type AvatarRole = 'student' | 'parent' | 'teacher' | 'other';
export type AvatarGender = 'male' | 'female' | 'not_specified' | 'Not Specified';

export const LOCAL_AVATAR_OPTIONS: Array<{
  key: LocalAvatarKey;
  label: string;
}> = [
  { key: 'girl1', label: 'Girl 1' },
  { key: 'boy1', label: 'Boy 1' },
  { key: 'mum1', label: 'Mum 1' },
  { key: 'dad1', label: 'Dad 1' },
  { key: 'girl2', label: 'Girl 2' },
  { key: 'boy2', label: 'Boy 2' },
  { key: 'mum2', label: 'Mum 2' },
  { key: 'dad2', label: 'Dad 2' },
];

const AVATAR_IMAGES: Record<CanonicalAvatarKey, ImageSourcePropType> = {
  girl1: require('../../assets/avatars/girl1.png'),
  boy1: require('../../assets/avatars/boy1.png'),
  mum1: require('../../assets/avatars/mum1.png'),
  dad1: require('../../assets/avatars/dad1.png'),
  girl2: require('../../assets/avatars/girl2.png'),
  boy2: require('../../assets/avatars/boy2.png'),
  mum2: require('../../assets/avatars/mum2.png'),
  dad2: require('../../assets/avatars/dad2.png'),
};

const LEGACY_AVATAR_KEYS: Record<string, CanonicalAvatarKey> = {
  'avatar-afro-boy': 'boy1',
  'avatar-afro-girl': 'girl1',
};

export function isLocalAvatarKey(value?: string): value is CanonicalAvatarKey {
  return Boolean(value && value in AVATAR_IMAGES);
}

/** Converts persisted legacy keys while keeping existing canonical choices stable. */
export function normalizeLocalAvatarKey(value?: string | null): CanonicalAvatarKey | null {
  if (!value) return null;
  if (isLocalAvatarKey(value)) return value;
  return LEGACY_AVATAR_KEYS[value] ?? null;
}

function isUpperPrimaryGrade(grade?: string | null) {
  const match = grade?.match(/\d+/);
  return Boolean(match && Number(match[0]) >= 5);
}

/**
 * Deterministic defaults use the first supplied family image when gender is not specified.
 * This chooses an asset only; it does not infer or persist a personal attribute.
 */
export function selectAvatarKey({
  role,
  grade,
  gender,
  existingAvatarKey,
}: {
  role: AvatarRole;
  grade?: string | null;
  gender?: AvatarGender | null;
  existingAvatarKey?: string | null;
}): CanonicalAvatarKey {
  const existing = normalizeLocalAvatarKey(existingAvatarKey);
  if (existing) return existing;

  const suffix = isUpperPrimaryGrade(grade) ? '2' : '1';
  const isAdult = role === 'parent' || role === 'teacher';
  if (gender === 'female') {
    return (isAdult ? `mum${suffix}` : `girl${suffix}`) as CanonicalAvatarKey;
  }
  if (gender === 'male') {
    return (isAdult ? `dad${suffix}` : `boy${suffix}`) as CanonicalAvatarKey;
  }
  return (isAdult ? `mum${suffix}` : `boy${suffix}`) as CanonicalAvatarKey;
}

interface AvatarArtProps {
  avatarKey: LocalAvatarKey | string;
  size?: number;
  accessibilityLabel?: string;
}

export function AvatarArt({ avatarKey, size = 72, accessibilityLabel }: AvatarArtProps) {
  const resolvedKey = normalizeLocalAvatarKey(avatarKey) ?? 'boy1';
  const borderRadius = size / 2;

  return (
    <View
      style={[
        styles.frame,
        {
          width: size,
          height: size,
          borderRadius,
        },
      ]}>
      <Image
        accessibilityLabel={accessibilityLabel ?? `${resolvedKey} avatar`}
        accessible
        resizeMode="cover"
        source={AVATAR_IMAGES[resolvedKey]}
        style={{ width: size, height: size }}
        testID={`avatar-art-${resolvedKey}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
  },
});
