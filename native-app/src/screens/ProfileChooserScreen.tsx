import React from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { AvatarArt, selectAvatarKey } from '../components/AvatarArt';
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '../content/legal';
import type { GenderOption, OnboardingMascotKey, ParentChildSummary } from '../types/app';

const logoAsset = require('../assets/logo.png');

type Props = {
  parentName: string;
  parentGender?: GenderOption | 'Not Specified';
  parentGrade?: string;
  parentAvatarKey?: string;
  /** Kept for callers that still hydrate the onboarding mascot alongside profile data. */
  mascotKey?: OnboardingMascotKey;
  children: ParentChildSummary[];
  isLoading?: boolean;
  onParent: () => void;
  onChild: (childId: string) => void;
  onAddAccount: () => void;
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
};

export function ProfileChooserScreen({
  parentName,
  parentGender,
  parentGrade,
  parentAvatarKey,
  children,
  isLoading = false,
  onParent,
  onChild,
  onAddAccount,
  onOpenTerms,
  onOpenPrivacy,
}: Props) {
  const { width } = useWindowDimensions();
  const isWide = width >= 760;
  const parentAvatar = selectAvatarKey({
    role: 'parent',
    grade: parentGrade,
    gender: parentGender,
    existingAvatarKey: parentAvatarKey,
  });

  function openLegalUrl(url: string, callback?: () => void) {
    if (callback) {
      callback();
      return;
    }
    Linking.openURL(url).catch(() => undefined);
  }

  return (
    <LinearGradient
      colors={['#06143B', '#0D2E73', '#243AA6', '#4B2BB8']}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={styles.screen}>
      <View pointerEvents="none" style={styles.orbTop} />
      <View pointerEvents="none" style={styles.orbBottom} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.card, isWide && styles.cardWide]}>
          <View style={styles.brandPill}>
            <View style={styles.brandLogoFrame}>
              <BrandLogo />
            </View>
            <Text style={styles.brandText}>KITABU AI</Text>
          </View>

          <Text style={styles.title}>Who's using Kitabu?</Text>
          <Text style={styles.subtitle}>Choose your profile to continue</Text>

          {isLoading ? (
            <View accessibilityLabel="Loading family profiles" style={styles.loadingState}>
              <ActivityIndicator color="#FFFFFF" size="large" />
              <Text style={styles.loadingText}>Loading your family profiles…</Text>
            </View>
          ) : (
            <View style={[styles.profileGrid, isWide && styles.profileGridWide]}>
              <ProfileCard
                accessibilityLabel="Open parent profile"
                avatarKey={parentAvatar}
                name={parentName || 'Parent'}
                onPress={onParent}
                roleLabel="Parent"
                wide={isWide}
              />
              {children.map(child => (
                <ProfileCard
                  accessibilityLabel={`Open ${child.name} profile`}
                  avatarKey={selectAvatarKey({
                    role: 'student',
                    grade: child.grade,
                    gender: child.gender,
                    existingAvatarKey: child.avatar,
                  })}
                  detail={child.grade}
                  key={child.id}
                  name={child.name}
                  onPress={() => onChild(child.id)}
                  roleLabel="Student"
                  wide={isWide}
                />
              ))}
            </View>
          )}

          <View style={styles.separator} />
          <View style={styles.signupRow}>
            <Text style={styles.footerText}>Don’t have an account? </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign Up"
              onPress={onAddAccount}>
              <Text style={styles.footerAction}>Sign Up</Text>
            </Pressable>
          </View>
          <View style={styles.legalRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Terms"
              onPress={() => openLegalUrl(TERMS_OF_SERVICE_URL, onOpenTerms)}>
              <Text style={styles.legalAction}>Terms</Text>
            </Pressable>
            <Text style={styles.legalDot}>•</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Privacy"
              onPress={() => openLegalUrl(PRIVACY_POLICY_URL, onOpenPrivacy)}>
              <Text style={styles.legalAction}>Privacy</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

function BrandLogo() {
  return (
    <Image
      accessible
      accessibilityLabel="Kitabu AI logo"
      resizeMode="contain"
      source={logoAsset}
      style={styles.logoImage}
    />
  );
}

function ProfileCard({
  accessibilityLabel,
  avatarKey,
  detail,
  name,
  onPress,
  roleLabel,
  wide,
}: {
  accessibilityLabel: string;
  avatarKey: Parameters<typeof AvatarArt>[0]['avatarKey'];
  detail?: string;
  name: string;
  onPress: () => void;
  roleLabel: string;
  wide: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.profileCard,
        wide && styles.profileCardWide,
        pressed && styles.profileCardPressed,
      ]}>
      <View style={styles.avatarRing}>
        <AvatarArt accessibilityLabel={`${name} avatar`} avatarKey={avatarKey} size={116} />
      </View>
      <Text numberOfLines={1} style={styles.profileName}>{name}</Text>
      <Text style={styles.profileRole}>{roleLabel}</Text>
      {detail ? <Text style={styles.profileDetail}>{detail}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  orbTop: {
    backgroundColor: 'rgba(115, 143, 255, 0.16)',
    borderRadius: 180,
    height: 360,
    position: 'absolute',
    right: -130,
    top: -150,
    width: 360,
  },
  orbBottom: {
    backgroundColor: 'rgba(52, 211, 153, 0.08)',
    borderRadius: 150,
    bottom: -100,
    height: 300,
    left: -130,
    position: 'absolute',
    width: 300,
  },
  card: {
    alignItems: 'center',
    backgroundColor: 'rgba(32, 75, 145, 0.72)',
    borderColor: 'rgba(190, 215, 255, 0.48)',
    borderRadius: 34,
    borderWidth: 1.2,
    maxWidth: 1000,
    paddingHorizontal: 20,
    paddingVertical: 34,
    width: '100%',
  },
  cardWide: {
    paddingHorizontal: 42,
    paddingVertical: 48,
  },
  brandPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(154, 190, 255, 0.28)',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  brandLogoFrame: {
    backgroundColor: '#FFFFFF',
    borderRadius: 5,
    height: 36,
    overflow: 'hidden',
    width: 36,
  },
  logoImage: {
    backgroundColor: '#FFFFFF',
    height: 36,
    width: 36,
  },
  brandText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.7,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900',
    marginTop: 32,
    textAlign: 'center',
  },
  subtitle: {
    color: '#C7D6F4',
    fontSize: 18,
    marginTop: 10,
    textAlign: 'center',
  },
  loadingState: {
    alignItems: 'center',
    minHeight: 180,
    justifyContent: 'center',
    width: '100%',
  },
  loadingText: {
    color: '#D7E4FF',
    fontSize: 14,
    marginTop: 14,
  },
  profileGrid: {
    alignItems: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'center',
    marginTop: 34,
    width: '100%',
  },
  profileGridWide: {
    gap: 16,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(92, 139, 207, 0.25)',
    borderColor: 'rgba(213, 230, 255, 0.34)',
    borderRadius: 24,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    maxWidth: 300,
    minHeight: 214,
    paddingHorizontal: 10,
    paddingVertical: 20,
  },
  profileCardPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
  profileCardWide: {
    flexBasis: '30%',
  },
  avatarRing: {
    backgroundColor: '#C8B6FF',
    borderColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 3,
    padding: 3,
  },
  profileName: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '900',
    marginTop: 13,
    maxWidth: '100%',
    textAlign: 'center',
  },
  profileRole: {
    color: '#D7E4FF',
    fontSize: 16,
    marginTop: 5,
    textAlign: 'center',
  },
  profileDetail: {
    color: '#B8CCEF',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  separator: {
    backgroundColor: 'rgba(214, 229, 255, 0.24)',
    height: 1,
    marginTop: 38,
    width: '92%',
  },
  signupRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    color: '#C7D6F4',
    fontSize: 16,
  },
  footerAction: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  legalRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 20,
    marginTop: 24,
  },
  legalAction: {
    color: '#C7D6F4',
    fontSize: 16,
    fontWeight: '700',
  },
  legalDot: {
    color: '#C7D6F4',
    fontSize: 18,
  },
});
