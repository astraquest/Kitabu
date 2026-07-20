import React from 'react';
import { Image, ImageSourcePropType, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, Crown, Flame, Trophy } from 'lucide-react-native';

interface GameZoneScreenProps {
  totalPoints: number;
  rank?: number;
  playersOnline?: number;
  onBack: () => void;
  onPlayGame: (gameId: 'crazy-balloon' | 'quiz-battle' | 'storypot' | 'chess-master' | 'manyanga') => void;
}

const crazyBalloonIcon = require('../assets/game-icons/crazy-balloon.png');
const quizBattleIcon = require('../assets/game-icons/quiz-battle.png');
const storyPotIcon = require('../assets/game-icons/storypot.png');
const chessMasterIcon = require('../assets/game-icons/chess-master.png');
const manyangaIcon = require('../assets/game-icons/manyanga.png');

const GAMES = [
  {
    id: 'quiz-battle' as const,
    title: 'Quiz Battle',
    description: 'Challenge other students in head-to-head quiz battles.',
    gradientTop: '#15803D',
    gradientBottom: '#4F46E5',
    badge: 'PvP',
    icon: quizBattleIcon as ImageSourcePropType,
  },
  {
    id: 'storypot' as const,
    title: 'StoryPot',
    description: 'Create amazing stories with AI and compete to be the best storyteller.',
    gradientTop: '#22C55E',
    gradientBottom: '#166534',
    badge: 'Creative',
    icon: storyPotIcon as ImageSourcePropType,
  },
  {
    id: 'chess-master' as const,
    title: 'Chess Master',
    description: 'Challenge online users in live two-player chess duels.',
    gradientTop: '#38BDF8',
    gradientBottom: '#0F766E',
    badge: '2 Player',
    icon: chessMasterIcon as ImageSourcePropType,
  },
  {
    id: 'manyanga' as const,
    title: 'Manyanga!',
    description: 'Race matatus through Nairobi streets in this adrenaline-packed bus racing game.',
    gradientTop: '#FB923C',
    gradientBottom: '#B91C1C',
    badge: 'Racing',
    icon: manyangaIcon as ImageSourcePropType,
  },
  {
    id: 'crazy-balloon' as const,
    title: 'Crazy Balloon',
    description: 'Pop balloons, dodge hidden monsters, and answer rescue questions fast.',
    gradientTop: '#F97316',
    gradientBottom: '#E11D48',
    badge: 'Rescue Arcade',
    icon: crazyBalloonIcon as ImageSourcePropType,
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
        <Pressable onPress={onBack} style={styles.backButton}>
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
              <Trophy color="#C65A26" size={16} strokeWidth={2.4} />
              <Text style={styles.statValue}>{totalPoints}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Crown color="#C65A26" size={16} strokeWidth={2.4} />
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
              style={[
                styles.gameCard,
                { backgroundColor: game.gradientBottom, borderColor: game.gradientTop },
              ]}>
              <View style={[styles.decorCircleLarge, { backgroundColor: `${game.gradientTop}3D` }]} />
              <View style={[styles.decorCircleSmall, { backgroundColor: `${game.gradientTop}66` }]} />
              <View style={styles.onlineGameDot} />
              <View style={styles.gameBody}>
                <View style={styles.gameIconFrame}>
                  <Image source={game.icon} style={styles.gameIcon} resizeMode="cover" />
                </View>
                <View style={styles.gameCopy}>
                  <Text style={styles.gameTitle}>{game.title}</Text>
                  <Text style={styles.gameDescription}>{game.description}</Text>
                  <Text style={styles.badge}>{game.badge}</Text>
                </View>
              </View>
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
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderBottomColor: '#FFEDD5',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 18,
  },
  backButton: {
    alignItems: 'center',
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  title: {
    color: '#C65A26',
    fontSize: 26,
    fontWeight: '900',
  },
  onlineRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  onlineDot: {
    backgroundColor: '#86EFAC',
    borderRadius: 6,
    height: 12,
    width: 12,
  },
  onlineText: {
    color: '#7C2D12',
    fontSize: 17,
    fontWeight: '800',
  },
  statsCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#FED7AA',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#9A3412',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  statsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  statItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  statValue: {
    color: '#9A3412',
    fontSize: 18,
    fontWeight: '900',
  },
  statDivider: {
    backgroundColor: '#FDBA74',
    height: 20,
    width: 1,
  },
  statsLabel: {
    color: '#9A3412',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  content: {
    gap: 18,
    padding: 22,
    paddingBottom: 36,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 28,
    fontWeight: '900',
  },
  list: {
    gap: 18,
  },
  gameCard: {
    borderRadius: 28,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 150,
    overflow: 'hidden',
    padding: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
  },
  decorCircleLarge: {
    borderRadius: 70,
    height: 140,
    position: 'absolute',
    right: -20,
    top: -30,
    width: 140,
  },
  decorCircleSmall: {
    borderRadius: 40,
    bottom: -10,
    height: 80,
    left: -10,
    position: 'absolute',
    width: 80,
  },
  onlineGameDot: {
    backgroundColor: '#86EFAC',
    borderRadius: 7,
    height: 14,
    position: 'absolute',
    right: 26,
    top: 24,
    width: 14,
  },
  gameBody: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 18,
  },
  gameIconFrame: {
    borderRadius: 22,
    borderColor: 'rgba(255,255,255,0.34)',
    borderWidth: 1,
    height: 78,
    overflow: 'hidden',
    width: 78,
  },
  gameIcon: {
    height: '100%',
    width: '100%',
  },
  gameCopy: {
    flex: 1,
    gap: 5,
  },
  badge: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    opacity: 0.85,
    textTransform: 'uppercase',
  },
  gameTitle: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
  },
  gameDescription: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
});
