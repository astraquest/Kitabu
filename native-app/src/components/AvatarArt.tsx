import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

export type LocalAvatarKey = 'avatar-afro-boy' | 'avatar-afro-girl';

export const LOCAL_AVATAR_OPTIONS: Array<{
  key: LocalAvatarKey;
  label: string;
}> = [
  { key: 'avatar-afro-boy', label: 'Boy' },
  { key: 'avatar-afro-girl', label: 'Girl' },
];

export function isLocalAvatarKey(value?: string): value is LocalAvatarKey {
  return value === 'avatar-afro-boy' || value === 'avatar-afro-girl';
}

interface AvatarArtProps {
  avatarKey: LocalAvatarKey;
  size?: number;
}

export function AvatarArt({ avatarKey, size = 72 }: AvatarArtProps) {
  const isGirl = avatarKey === 'avatar-afro-girl';
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
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <Defs>
          <LinearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={isGirl ? '#F97316' : '#15803D'} />
            <Stop offset="100%" stopColor={isGirl ? '#16A34A' : '#F97316'} />
          </LinearGradient>
          <LinearGradient id="shirt" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={isGirl ? '#F97316' : '#10B981'} />
            <Stop offset="100%" stopColor={isGirl ? '#FB7185' : '#2563EB'} />
          </LinearGradient>
        </Defs>

        <Rect width="120" height="120" rx="60" fill="url(#bg)" />
        <Circle cx="60" cy="52" r="30" fill="#2B211D" />
        <Path
          d={
            isGirl
              ? 'M26 58c4-24 20-36 34-36s30 12 34 36c-4-7-10-12-18-15-5 9-13 13-25 13-8 0-17-1-25-4-1 2-1 4 0 6z'
              : 'M24 56c2-24 19-38 36-38s34 14 36 38c-5-5-12-8-19-10-4 7-11 11-22 11-11 0-20-3-27-7-2 1-3 4-4 6z'
          }
          fill="#241814"
        />
        <Ellipse cx="60" cy="61" rx="27" ry="31" fill="#8B5E3C" />
        <Circle cx="49" cy="59" r="3" fill="#1F2937" />
        <Circle cx="71" cy="59" r="3" fill="#1F2937" />
        <Path d="M53 72c4 3 10 3 14 0" stroke="#7C2D12" strokeWidth="3" strokeLinecap="round" />
        <Path d="M54 65c4 2 8 2 12 0" stroke="#7C2D12" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
        <Ellipse cx="40" cy="64" rx="4" ry="5" fill="#8B5E3C" />
        <Ellipse cx="80" cy="64" rx="4" ry="5" fill="#8B5E3C" />
        {isGirl ? (
          <>
            <Path d="M32 47c4-20 16-29 28-29s24 9 28 29l-7 10c-4-6-10-10-20-10-11 0-18 4-23 11l-6-11z" fill="#2A1717" />
            <Circle cx="27" cy="60" r="9" fill="#2A1717" />
            <Circle cx="93" cy="60" r="9" fill="#2A1717" />
          </>
        ) : (
          <Path d="M28 48c6-17 18-26 32-26 16 0 28 10 32 28-9-6-20-10-32-10s-23 3-32 8z" fill="#221816" />
        )}
        <Path d="M29 116c3-22 16-34 31-34 15 0 28 12 31 34H29z" fill="url(#shirt)" />
        {isGirl ? (
          <Path d="M48 91c4 5 8 7 12 7s8-2 12-7" stroke="#FDF2F8" strokeWidth="3" strokeLinecap="round" />
        ) : (
          <Path d="M60 85v31" stroke="#DBEAFE" strokeWidth="3" strokeLinecap="round" />
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
  },
});
