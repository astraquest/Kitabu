import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AvatarArt } from '../components/AvatarArt';
import type { OnboardingMascotKey, ParentChildSummary } from '../types/app';

type Props = {
  parentName: string;
  mascotKey: OnboardingMascotKey;
  children: ParentChildSummary[];
  onParent: () => void;
  onChild: (childId: string) => void;
  onAddAccount: () => void;
};

export function ProfileChooserScreen({
  parentName,
  mascotKey,
  children,
  onParent,
  onChild,
  onAddAccount,
}: Props) {
  return (
    <View style={styles.screen}>
      <Text style={styles.kicker}>KITABU FAMILY</Text>
      <Text style={styles.title}>Who's using Kitabu?</Text>
      <Text style={styles.subtitle}>
        Choose a profile to continue with the right dashboard and permissions.
      </Text>
      <Pressable accessibilityLabel="Open parent profile" onPress={onParent} style={styles.card}>
        <AvatarArt
          avatarKey={mascotKey === 'lion' ? 'avatar-afro-boy' : 'avatar-afro-girl'}
          size={48}
        />
        <View>
          <Text style={styles.cardTitle}>{parentName || 'Parent'}</Text>
          <Text style={styles.cardMeta}>Parent dashboard</Text>
        </View>
      </Pressable>
      {children.map(child => (
        <Pressable
          accessibilityLabel={`Open ${child.name} profile`}
          key={child.id}
          onPress={() => onChild(child.id)}
          style={styles.card}>
          <AvatarArt avatarKey="avatar-afro-boy" size={48} />
          <View>
            <Text style={styles.cardTitle}>{child.name}</Text>
            <Text style={styles.cardMeta}>{child.grade} · Student dashboard</Text>
          </View>
        </Pressable>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="+ Add account"
        onPress={onAddAccount}
        style={styles.add}>
        <Text style={styles.addText}>+ Add account</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#0B1C32',
    flex: 1,
    gap: 14,
    justifyContent: 'center',
    padding: 24,
  },
  kicker: {
    color: '#FDE68A',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
  },
  subtitle: {
    color: '#CBD5E1',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  card: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 16,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  cardMeta: {
    color: '#CBD5E1',
    fontSize: 13,
    marginTop: 3,
  },
  add: {
    alignItems: 'center',
    borderColor: 'rgba(253,230,138,0.7)',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  addText: {
    color: '#FDE68A',
    fontSize: 15,
    fontWeight: '900',
  },
});
