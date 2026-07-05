import React from 'react';
import {
  Image,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Crown, Flame, Trophy } from 'lucide-react-native';

const quizBattleIcon = require('../assets/game-icons/quiz-battle.png');
const crazyBalloonIcon = require('../assets/game-icons/crazy-balloon.png');
const chessMasterIcon = require('../assets/game-icons/chess-master.png');
const manyangaIcon = require('../assets/game-icons/manyanga.png');

interface GameZoneScreenProps {
  totalPoints: number;
  rank?: number;
  playersOnline?: number;
  onBack: () => void;
  onPlayGame: (gameId: 'crazy-balloon' | 'quiz-battle' | 'chess-master' | 'manyanga') => void;
}

interface GameCard {
  id: 'crazy-balloon' | 'quiz-battle' | 'chess-master' | 'manyanga';
  title: string;
  description: string;
  icon: ImageSourcePropType;
  gradient: [string, string];
}

const GAMES: GameCard[] = [
  {
    id: 'quiz-battle',
    title: 'Quiz Battle',
    description: 'Challenge other students in head-to-head quiz battles',
    icon: quizBattleIcon,
    gradient: ['#7C3AED', '#4F46E5'],
  },
  {
    id: 'crazy-balloon',
    title: 'Crazy Balloon',
    description: 'Pop balloons, dodge hidden monsters, and answer rescue questions fast',
    icon: crazyBalloonIcon,
    gradient: ['#4E9A4C', '#2F6B3A'],
  },
  {
    id: 'chess-master',
    title: 'Chess Master',
    description: 'Master the royal game of chess with tactical puzzles and strategic battles',
    icon: chessMasterIcon,
    gradient: ['#2E6FB5', '#2C7A7B'],
  },
  {
    id: 'manyanga',
    title: 'Manyanga!',
    description: 'Race matatus through Nairobi streets in this adrenaline-packed bus racing game',
    icon: manyangaIcon,
    gradient: ['#C0574D', '#8B3A2F'],
  },
];

export function GameZoneScreen({
  totalPoints,
  rank = 1,
  playersOnline = 1,
  onBack,
  onPlayGame,
}: GameZoneScreenProps) {
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton} hitSlop={10}>
          <ChevronLeft color="#9A3412" size={24} strokeWidth={2.6} />
        </Pressable>

        <View style={styles.headerCenter}>
          <View style={styles.titleRow}>
            <Flame color="#EA580C" size={22} strokeWidth={2.4} />
            <Text style={styles.title}>Game Zone</Text>
          </View>
          <View style={styles.onlineRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>
              {playersOnline} {playersOnline === 1 ? 'player' : 'players'} online
            </Text>
          </View>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Trophy color="#EA580C" size={16} strokeWidth={2.4} />
              <Text style={styles.statValue}>{totalPoints}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Crown color="#EA580C" size={16} strokeWidth={2.4} />
              <Text style={styles.statValue}>#{rank}</Text>
            </View>
          </View>
          <Text style={styles.statsLabel}>Points & Rank</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Available Games ({GAMES.length})</Text>

        <View style={styles.list}>
          {GAMES.map(game => (
            <Pressable
              key={game.id}
              onPress={() => onPlayGame(game.id)}
              style={({ pressed }) => [styles.cardWrapper, pressed && styles.cardPressed]}>
              <LinearGradient
                colors={game.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gameCard}>
                <View style={styles.iconTile}>
                  <Image source={game.icon} style={styles.gameIcon} resizeMode="cover" />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.gameTitle}>{game.title}</Text>
                  <Text style={styles.gameDescription}>{game.description}</Text>
                </View>
                <View style={styles.cardOnlineDot} />
              </LinearGradient>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFF3E4',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    width: 28,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#EA580C',
    fontSize: 24,
    fontWeight: '800',
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  onlineText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE7D0',
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statValue: {
    color: '#C2410C',
    fontSize: 15,
    fontWeight: '800',
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#FDBA74',
  },
  statsLabel: {
    color: '#EA580C',
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 18,
  },
  list: {
    gap: 16,
  },
  cardWrapper: {
    borderRadius: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 5,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  gameCard: {
    borderRadius: 24,
    padding: 16,
    minHeight: 116,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconTile: {
    width: 76,
    height: 76,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gameIcon: {
    width: '100%',
    height: '100%',
  },
  cardBody: {
    flex: 1,
    gap: 6,
    paddingRight: 12,
  },
  gameTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  gameDescription: {
    color: '#F1F5F9',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
  },
  cardOnlineDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4ADE80',
  },
});
