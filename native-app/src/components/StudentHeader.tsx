import React, { useMemo } from 'react';
import {
  Platform,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Bell, Check, ChevronDown, ChevronLeft } from 'lucide-react-native';
import { AvatarArt, normalizeLocalAvatarKey } from './AvatarArt';
import { CountryFlagIcon, resolveCountryCode } from './CountryFlagIcon';
import { SUPPORTED_GRADES } from '../constants/grades';

const logoAsset = require('../assets/logo.png');

function displayGradeLabel(grade: string) {
  if (grade === 'Grade 11') {
    return 'Form 3';
  }
  if (grade === 'Grade 12') {
    return 'Form 4';
  }
  return grade;
}

interface StudentHeaderProps {
  userAvatar?: string;
  userCountry?: string | null;
  onOpenProfile: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationCount?: number;
  currentGrade?: string;
  onSelectGrade?: (grade: string) => void;
  showPreviewExit?: boolean;
  onExitPreview?: () => void;
}

function getAvatarUri(seed?: string) {
  if (!seed) {
    return 'https://api.dicebear.com/7.x/adventurer/png?seed=Cookie';
  }

  if (seed.startsWith('avatar-seed-')) {
    const normalizedSeed = seed.replace(/^avatar-seed-/, '');
    return `https://api.dicebear.com/7.x/adventurer/png?seed=${encodeURIComponent(
      normalizedSeed,
    )}`;
  }

  if (seed.startsWith('http://') || seed.startsWith('https://')) {
    return seed.replace('/svg?seed=', '/png?seed=').replace('/svg/', '/png/');
  }

  return `https://api.dicebear.com/7.x/adventurer/png?seed=${encodeURIComponent(
    seed,
  )}`;
}

export function StudentHeader({
  userAvatar,
  userCountry,
  onOpenProfile,
  onOpenNotifications,
  unreadNotificationCount = 0,
  currentGrade,
  onSelectGrade,
  showPreviewExit = false,
  onExitPreview,
}: StudentHeaderProps) {
  const avatarUri = useMemo(() => getAvatarUri(userAvatar), [userAvatar]);
  const localAvatarKey = normalizeLocalAvatarKey(userAvatar);
  const [gradeMenuOpen, setGradeMenuOpen] = React.useState(false);
  const showGradeSelect = Boolean(currentGrade && onSelectGrade);
  const countryCode = resolveCountryCode(userCountry);

  function selectGrade(grade: string) {
    onSelectGrade?.(grade);
    setGradeMenuOpen(false);
  }

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
            ]}
          >
            <ChevronLeft color="#1D4ED8" size={18} strokeWidth={2.5} />
          </Pressable>
        ) : null}
        <View style={styles.logoBadge} accessible={false}>
          <Image
            source={logoAsset}
            style={styles.logoImage}
            resizeMode="contain"
          />
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
        {showGradeSelect ? (
          <>
            <Pressable
              accessibilityLabel="Select learning grade"
              accessibilityRole="button"
              accessibilityState={{ expanded: gradeMenuOpen }}
              onPress={() => setGradeMenuOpen(open => !open)}
              style={({ pressed }) => [
                styles.gradeSelectButton,
                gradeMenuOpen && styles.gradeSelectButtonActive,
                pressed && styles.controlPressed,
              ]}
            >
              <CountryFlagIcon
                countryCode={countryCode}
                width={18}
                height={12}
              />
              <Text style={styles.gradeSelectText}>
                {displayGradeLabel(currentGrade)}
              </Text>
              <ChevronDown
                color="#1D4ED8"
                size={13}
                strokeWidth={2.6}
                style={gradeMenuOpen ? styles.chevronOpen : undefined}
              />
            </Pressable>
            <Modal
              animationType="fade"
              onRequestClose={() => setGradeMenuOpen(false)}
              transparent
              visible={gradeMenuOpen}
            >
              <Pressable
                accessibilityLabel="Close grade menu"
                style={styles.gradeMenuBackdrop}
                onPress={() => setGradeMenuOpen(false)}
              >
                <Pressable style={styles.gradeMenu} onPress={() => undefined}>
                  <Text style={styles.gradeMenuLabel}>Learning level</Text>
                  <ScrollView
                    contentContainerStyle={styles.gradeMenuList}
                    showsVerticalScrollIndicator={false}
                  >
                    {SUPPORTED_GRADES.map(grade => {
                      const active = grade === currentGrade;

                      return (
                        <Pressable
                          key={grade}
                          accessibilityLabel={`Select ${displayGradeLabel(
                            grade,
                          )}`}
                          accessibilityRole="menuitem"
                          accessibilityState={{ selected: active }}
                          onPress={() => selectGrade(grade)}
                          style={({ pressed }) => [
                            styles.gradeOption,
                            active && styles.gradeOptionActive,
                            pressed && styles.gradeOptionPressed,
                          ]}
                        >
                          <Text
                            style={[
                              styles.gradeOptionText,
                              active && styles.gradeOptionTextActive,
                            ]}
                          >
                            {displayGradeLabel(grade)}
                          </Text>
                          {active ? (
                            <Check
                              color="#1D4ED8"
                              size={16}
                              strokeWidth={2.7}
                            />
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </Pressable>
              </Pressable>
            </Modal>
          </>
        ) : null}
        <Pressable
          accessibilityLabel="Notifications"
          accessibilityRole="button"
          onPress={onOpenNotifications}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.controlPressed,
          ]}
        >
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
          ]}
        >
          {localAvatarKey ? (
            <AvatarArt avatarKey={localAvatarKey} size={36} />
          ) : (
            <Image
              resizeMethod="resize"
              source={{ cache: 'default', uri: avatarUri }}
              style={styles.avatarImage}
            />
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
    elevation: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 10,
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
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  logoImage: {
    width: 34,
    height: 34,
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
    color: '#DC2626',
  },
  actionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  gradeSelectButton: {
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderRadius: 9,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    height: 32,
    justifyContent: 'center',
    minWidth: 101,
    paddingHorizontal: 8,
  },
  gradeSelectButtonActive: {
    backgroundColor: '#DBEAFE',
    borderColor: '#93C5FD',
  },
  gradeSelectText: {
    color: '#1E3A8A',
    fontSize: 11,
    fontWeight: '900',
  },
  chevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  gradeMenuBackdrop: {
    flex: 1,
    paddingTop: 58,
  },
  gradeMenu: {
    alignSelf: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 14,
    borderWidth: 1,
    elevation: 8,
    marginRight: 92,
    maxHeight: 330,
    paddingHorizontal: 8,
    paddingVertical: 8,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    width: 156,
  },
  gradeMenuLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingVertical: 6,
    textTransform: 'uppercase',
  },
  gradeMenuList: {
    gap: 2,
  },
  gradeOption: {
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 38,
    paddingHorizontal: 10,
  },
  gradeOptionActive: {
    backgroundColor: '#EFF6FF',
  },
  gradeOptionPressed: {
    opacity: 0.82,
  },
  gradeOptionText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '800',
  },
  gradeOptionTextActive: {
    color: '#1D4ED8',
    fontWeight: '900',
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
