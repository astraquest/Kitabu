import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AvatarArt, LocalAvatarKey } from './AvatarArt';
import type { PublicSignupRole } from '../types/app';

export type AccountChoiceRole = Extract<PublicSignupRole, 'student' | 'teacher' | 'parent'>;

export type AccountChoice = {
  id: string;
  role: AccountChoiceRole;
  name: string;
  detail: string;
  avatar: LocalAvatarKey;
};

type Props = {
  choices: AccountChoice[];
  selectedId: string | null;
  lastUsedRole?: AccountChoiceRole | null;
  onSelect: (choice: AccountChoice) => void;
};

export function AccountChoiceGrid({ choices, selectedId, lastUsedRole = null, onSelect }: Props) {
  return (
    <View style={styles.grid}>
      {choices.map(choice => {
        const active = selectedId === choice.id;
        const lastUsed = lastUsedRole === choice.role;

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Continue as ${choice.name}${lastUsed ? ', last used' : ''}`}
            accessibilityState={{ selected: active }}
            key={choice.id}
            onPress={() => onSelect(choice)}
            style={({ pressed }) => [
              styles.card,
              active && styles.cardActive,
              pressed && styles.cardPressed,
            ]}>
            <View style={styles.badgeSlot}>
              {lastUsed ? (
                <View style={styles.lastUsedBadge}>
                  <Text style={styles.lastUsedBadgeText}>Last used</Text>
                </View>
              ) : null}
            </View>
            <View style={[styles.avatarFrame, active && styles.avatarFrameActive]}>
              <AvatarArt avatarKey={choice.avatar} size={52} />
            </View>
            <Text style={[styles.name, active && styles.nameActive]}>{choice.name}</Text>
            <Text style={[styles.detail, active && styles.detailActive]}>{choice.detail}</Text>
            {active ? <Text style={styles.selectedText}>Selected</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  card: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 16,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 154,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  cardActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  badgeSlot: {
    alignItems: 'center',
    height: 20,
    justifyContent: 'center',
    width: '100%',
  },
  lastUsedBadge: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  lastUsedBadgeText: {
    color: '#92400E',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  avatarFrame: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    padding: 4,
  },
  avatarFrameActive: {
    backgroundColor: '#DBEAFE',
  },
  name: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 8,
    textAlign: 'center',
  },
  nameActive: {
    color: '#0F172A',
  },
  detail: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  detailActive: {
    color: '#475569',
  },
  selectedText: {
    color: '#1D4ED8',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 5,
  },
});
