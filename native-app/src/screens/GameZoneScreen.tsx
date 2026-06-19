import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';

interface GameZoneScreenProps {
  totalPoints: number;
  onBack: () => void;
  onPlayGame: (gameId: 'crazy-balloon' | 'quiz-battle') => void;
}

const GAMES = [
  {
    id: 'crazy-balloon' as const,
    title: 'Crazy Balloon',
    description: 'Pop fast-moving balloons before they escape the screen.',
    gradientTop: '#F472B6',
    gradientBottom: '#E11D48',
    badge: 'Arcade',
  },
  {
    id: 'quiz-battle' as const,
    title: 'Quiz Battle',
    description: 'Challenge other students in head-to-head quiz battles.',
    gradientTop: '#8B5CF6',
    gradientBottom: '#4F46E5',
    badge: 'PvP',
  },
];

export function GameZoneScreen({ totalPoints, onBack, onPlayGame }: GameZoneScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.topRow}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <ChevronLeft color="#1D4ED8" size={22} strokeWidth={2.4} />
        </Pressable>
      </View>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Live Arcade</Text>
          <Text style={styles.title}>Game Zone</Text>
        </View>
        <View style={styles.pointsCard}>
          <Text style={styles.pointsValue}>{totalPoints}</Text>
          <Text style={styles.pointsLabel}>points</Text>
        </View>
      </View>

      <View style={styles.list}>
        {GAMES.map(game => (
          <Pressable
            key={game.id}
            onPress={() => onPlayGame(game.id)}
            style={[
              styles.gameCard,
              { backgroundColor: game.gradientBottom, borderColor: game.gradientTop },
            ]}>
            <View
              style={[
                styles.decorCircleLarge,
                { backgroundColor: `${game.gradientTop}44` },
              ]}
            />
            <View
              style={[
                styles.decorCircleSmall,
                { backgroundColor: `${game.gradientTop}66` },
              ]}
            />
            <View style={styles.cardTopRow}>
              <Text style={styles.badge}>{game.badge}</Text>
              <Text style={styles.launchText}>Launch</Text>
            </View>
            <Text style={styles.gameTitle}>{game.title}</Text>
            <Text style={styles.gameDescription}>{game.description}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 36,
    gap: 18,
  },
  topRow: {
    alignItems: 'flex-start',
  },
  backButton: {
    alignItems: 'center',
    borderRadius: 999,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  header: {
    backgroundColor: '#FFF7ED',
    borderRadius: 28,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    color: '#EA580C',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  title: {
    color: '#0F172A',
    fontSize: 28,
    fontWeight: '800',
  },
  pointsCard: {
    minWidth: 92,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsValue: {
    color: '#EA580C',
    fontSize: 24,
    fontWeight: '800',
  },
  pointsLabel: {
    color: '#9A3412',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  list: {
    gap: 14,
  },
  gameCard: {
    overflow: 'hidden',
    borderRadius: 28,
    padding: 18,
    minHeight: 148,
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  decorCircleLarge: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    top: -30,
    right: -20,
  },
  decorCircleSmall: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    bottom: -10,
    left: -10,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    color: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.16)',
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: '800',
  },
  launchText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  gameTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  gameDescription: {
    color: '#F8FAFC',
    lineHeight: 21,
    maxWidth: '78%',
  },
});
