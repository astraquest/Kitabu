import React from 'react';
import { Image, Text, View } from 'react-native';
import { SvgUri } from 'react-native-svg';

import { AvatarArt, LocalAvatarKey, selectAvatarKey } from '../AvatarArt';

function initials(name: string) {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function hasRenderableAvatar(value?: string) {
  return Boolean(value && /^(https?:|data:|file:|blob:)/i.test(value));
}

function fallbackAvatarKey(name: string): LocalAvatarKey {
  const seed = name
    .split('')
    .reduce((total, character) => total + character.charCodeAt(0), 0);

  return selectAvatarKey({
    role: 'teacher',
    gender: seed % 2 === 0 ? 'female' : 'male',
  });
}

interface TeacherAvatarBadgeProps {
  styles: Record<string, any>;
  name: string;
  avatar?: string;
  size?: number;
}

export function TeacherAvatarBadge({
  styles,
  name,
  avatar,
  size = 40,
}: TeacherAvatarBadgeProps) {
  const renderableAvatar = hasRenderableAvatar(avatar);
  const isSvgAvatar = Boolean(renderableAvatar && avatar && /\.svg(\?|$)/i.test(avatar));

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}>
      {renderableAvatar && avatar ? (
        isSvgAvatar ? (
          <SvgUri uri={avatar} width="100%" height="100%" />
        ) : (
          <Image source={{ uri: avatar }} style={styles.avatarImage} resizeMode="cover" />
        )
      ) : styles.avatarArtFallback ? (
        <AvatarArt avatarKey={fallbackAvatarKey(name)} size={size} />
      ) : (
        <Text style={styles.avatarText}>{initials(name)}</Text>
      )}
    </View>
  );
}
