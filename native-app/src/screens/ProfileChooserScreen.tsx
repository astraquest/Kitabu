import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { OnboardingMascotKey, ParentChildSummary } from '../types/app';

type Props = {
  parentName: string;
  mascotKey: OnboardingMascotKey;
  children: ParentChildSummary[];
  onParent: () => void;
  onChild: (childId: string) => void;
  onAddChild: () => void;
};

export function ProfileChooserScreen({ parentName, mascotKey, children, onParent, onChild, onAddChild }: Props) {
  return (
    <View style={styles.screen}>
      <Text style={styles.kicker}>KITABU FAMILY</Text>
      <Text style={styles.title}>Who is learning today?</Text>
      <Text style={styles.subtitle}>Choose a profile to continue with the right dashboard and permissions.</Text>
      <Pressable accessibilityLabel="Open parent profile" onPress={onParent} style={styles.card}>
        <Text style={styles.emoji}>{mascotKey === 'lion' ? '🦁' : mascotKey === 'elephant' ? '🐘' : '👨‍👩‍👧'}</Text>
        <View><Text style={styles.cardTitle}>{parentName || 'Parent'}</Text><Text style={styles.cardMeta}>Parent dashboard</Text></View>
      </Pressable>
      {children.map(child => (
        <Pressable accessibilityLabel={`Open ${child.name} profile`} key={child.id} onPress={() => onChild(child.id)} style={styles.card}>
          <Text style={styles.emoji}>🎒</Text><View><Text style={styles.cardTitle}>{child.name}</Text><Text style={styles.cardMeta}>{child.grade} · Student dashboard</Text></View>
        </Pressable>
      ))}
      <Pressable onPress={onAddChild} style={styles.add}><Text style={styles.addText}>+ Add another child</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#FFFDF9', flex: 1, gap: 14, justifyContent: 'center', padding: 24 },
  kicker: { color: '#B45309', fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: '#123F59', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#52636A', fontSize: 15, lineHeight: 22, marginBottom: 8 },
  card: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E8E0D4', borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 14, padding: 16 },
  emoji: { fontSize: 30 },
  cardTitle: { color: '#123F59', fontSize: 17, fontWeight: '900' },
  cardMeta: { color: '#6B7280', fontSize: 13, marginTop: 3 },
  add: { alignItems: 'center', borderColor: '#F97316', borderRadius: 14, borderWidth: 1, padding: 14 },
  addText: { color: '#C2410C', fontSize: 15, fontWeight: '900' },
});
