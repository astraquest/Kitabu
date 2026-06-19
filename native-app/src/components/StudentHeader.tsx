import React, { useMemo } from 'react';
import {
  Platform,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Bell, ChevronLeft } from 'lucide-react-native';
import { AvatarArt, isLocalAvatarKey } from './AvatarArt';

const logoAsset = require('../assets/logo.png');

interface StudentHeaderProps {
  userAvatar?: string;
  onOpenProfile: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationCount?: number;
  showPreviewExit?: boolean;
  onExitPreview?: () => void;
}

function getAvatarUri(seed?: string) {
  if (!seed) {
    return 'https://api.dicebear.com/7.x/adventurer/png?seed=Cookie';
  }

  if (seed.startsWith('avatar-seed-')) {
    const normalizedSeed = seed.replace(/^avatar-seed-/, '');
    return `https://api.dicebear.com/7.x/adventurer/png?seed=${encodeURIComponent(normalizedSeed)}`;
  }

  if (seed.startsWith('http://') || seed.startsWith('https://')) {
    return seed
      .replace('/svg?seed=', '/png?seed=')
      .replace('/svg/', '/png/');
  }

  return `https://api.dicebear.com/7.x/adventurer/png?seed=${encodeURIComponent(seed)}`;
}

export function StudentHeader({
  userAvatar,
  onOpenProfile,
  onOpenNotifications,
  unreadNotificationCount = 0,
  showPreviewExit = false,
  onExitPreview,
}: StudentHeaderProps) {
  const avatarUri = useMemo(() => getAvatarUri(userAvatar), [userAvatar]);

  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        {showPreviewExit ? (
          <Pressable
            accessibilityLabel="Return to Teacher Portal"
            accessibilityRole="button"
            onPress={onExitPreview}
            style={({ pressed }) => [
              styles.previewBackButton,
              pressed && styles.controlPressed,
            ]}>
            <ChevronLeft color="#1D4ED8" size={18} strokeWidth={2.5} />
          </Pressable>
        ) : null}
        <View style={styles.logoBadge} accessible={false}>
          <Image source={logoAsset} style={styles.logoImage} resizeMode="contain" />
        </View>
        <View>
          <Text style={styles.brandText}>
            KITABU<Text style={styles.brandAccent}>.AI</Text>
          </Text>
          {showPreviewExit ? (
            <Text style={styles.previewLabel}>Student Portal Preview</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          accessibilityLabel="Notifications"
          accessibilityRole="button"
          onPress={onOpenNotifications}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.controlPressed,
          ]}>
          <Bell color="#4B5563" size={19} strokeWidth={2.25} />
          {unreadNotificationCount > 0 ? (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
              </Text>
            </View>
          ) : null}
        </Pressable>

        <Pressable
          accessibilityLabel="Open User Profile"
          accessibilityRole="button"
          onPress={onOpenProfile}
          style={({ pressed }) => [
            styles.avatarButton,
            pressed && styles.controlPressed,
          ]}>
          {userAvatar && isLocalAvatarKey(userAvatar) ? (
            <AvatarArt avatarKey={userAvatar} size={36} />
          ) : (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#F3F4F6',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  previewBackButton: {
    alignItems: 'center',
    borderRadius: 999,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  logoBadge: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 2,
    height: 32,
    justifyContent: 'center',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    width: 32,
  },
  logoImage: {
    width: 24,
    height: 24,
  },
  brandText: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  previewLabel: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
    marginTop: Platform.OS === 'android' ? -1 : 0,
  },
  brandAccent: {
    color: '#6D28D9',
  },
  actionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: 999,
    height: 36,
    justifyContent: 'center',
    position: 'relative',
    width: 36,
  },
  notificationBadge: {
    alignItems: 'center',
    backgroundColor: '#DC2626',
    borderColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1.5,
    minHeight: 16,
    justifyContent: 'center',
    minWidth: 16,
    paddingHorizontal: 3,
    position: 'absolute',
    right: 3,
    top: 1,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    lineHeight: 12,
  },
  avatarButton: {
    borderRadius: 999,
    elevation: 1,
    height: 36,
    overflow: 'hidden',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    width: 36,
  },
  avatarImage: {
    height: '100%',
    width: '100%',
  },
  controlPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.98 }],
  },
});
