import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SvgUri } from 'react-native-svg';
import {
  ArrowLeft,
  Play,
  RotateCcw,
  Search,
  Trophy,
  UserPlus,
  X,
} from 'lucide-react-native';

import { DEFAULT_GRADE } from '../constants/grades';
import { useCrazyBalloonRuntime } from '../hooks/useCrazyBalloonRuntime';
import { CrazyBalloonRenderer } from '../renderers/crazy-balloon/CrazyBalloonRenderer';
import { mapCrazyBalloonRenderState } from '../renderers/crazy-balloon/mapCrazyBalloonRenderState';
import { useCrazyBalloonEffects } from '../runtime/effects/GameEffectsController';

const ONLINE_PLAYERS: Array<{ id: string; name: string; avatar: string; rank: number }> = [];

type GameView =
  | 'menu'
  | 'lobby'
  | 'playing'
  | 'rescue_quiz'
  | 'gameover'
  | 'multi_result';

interface CrazyBalloonScreenProps {
  onBack: () => void;
  onAddPoints: (points: number) => void;
}

function isSvgAvatar(uri: string) {
  return /\.svg(\?|$)/i.test(uri);
}

export function CrazyBalloonScreen({
  onAddPoints,
  onBack,
}: CrazyBalloonScreenProps) {
  const runtime = useCrazyBalloonRuntime();
  const [searchQuery, setSearchQuery] = useState('');
  const [opponentName, setOpponentName] = useState<string | null>(null);
  const [opponentAvatar, setOpponentAvatar] = useState<string | null>(null);
  const awardedStatusRef = useRef<string | null>(null);
  const view = runtime.state.status as GameView;
  const playMode = runtime.state.mode;
  const opponentScore = runtime.state.opponentScore;
  const opponentAlive = runtime.state.opponentAlive;
  const score = runtime.state.score;
  const livesUsed = runtime.state.livesUsed;
  const quizData = runtime.state.rescueQuestion
    ? {
        q: runtime.state.rescueQuestion.prompt,
        options: runtime.state.rescueQuestion.options,
        a: runtime.state.rescueQuestion.answer,
        timeLeft: runtime.state.rescueTimeLeftSec,
      }
    : null;
  const matchResult = runtime.state.matchResult || 'win';
  const renderState = useMemo(
    () => mapCrazyBalloonRenderState(runtime.state),
    [runtime.state],
  );
  const effect = useCrazyBalloonEffects(runtime.events);

  const filteredPlayers = useMemo(
    () =>
      ONLINE_PLAYERS.filter(player =>
        player.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
      ),
    [searchQuery],
  );

  function startSingle() {
    setOpponentName(null);
    setOpponentAvatar(null);
    awardedStatusRef.current = null;
    runtime.startSingle();
  }

  function startMulti(name: string, avatar?: string) {
    setOpponentName(name);
    setOpponentAvatar(avatar || null);
    awardedStatusRef.current = null;
    runtime.startMulti();
  }

  useEffect(() => {
    if (
      playMode !== 'multi' ||
      (view !== 'playing' && view !== 'rescue_quiz') ||
      !opponentAlive
    ) {
      return;
    }

    const timer = setInterval(() => {
      runtime.addOpponentScore(10);
      if (Math.random() < 0.007) {
        runtime.setOpponentAlive(false);
        setTimeout(() => runtime.finish('win'), 300);
      }
    }, 800);

    return () => clearInterval(timer);
  }, [opponentAlive, playMode, runtime, view]);

  useEffect(() => {
    const statusKey = `${runtime.state.status}:${runtime.state.matchResult}:${runtime.state.score}:${runtime.state.opponentScore}`;
    if (
      (runtime.state.status === 'gameover' ||
        runtime.state.status === 'match_result') &&
      awardedStatusRef.current !== statusKey
    ) {
      const awardedPoints =
        runtime.state.matchResult === 'win'
          ? runtime.state.score + 100
          : runtime.state.score;
      onAddPoints(awardedPoints);
      awardedStatusRef.current = statusKey;
    }
  }, [
    onAddPoints,
    runtime.state.matchResult,
    runtime.state.opponentScore,
    runtime.state.score,
    runtime.state.status,
  ]);

  function answerQuiz(answer: string) {
    if (!quizData) {
      return;
    }
    runtime.answerRescue(answer);
  }

  return (
    <View style={styles.root}>
      <View style={styles.topHud}>
        <View style={styles.leftHud}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <ArrowLeft size={24} color="#475569" />
          </Pressable>
          {livesUsed > 0 && (view === 'playing' || view === 'rescue_quiz') ? (
            <View style={styles.lifeRowInline}>
              <View
                style={[
                  styles.lifeDot,
                  styles.lifeAvailable,
                  livesUsed >= 1 && styles.lifeUsed,
                ]}
              />
              <View
                style={[styles.lifeDot, livesUsed >= 2 && styles.lifeUsed]}
              />
            </View>
          ) : null}
        </View>
        {view !== 'menu' && view !== 'lobby' ? (
          <View style={styles.rightHud}>
            <View style={styles.scoreChip}>
              <Trophy size={18} color="#CA8A04" />
              <Text style={styles.scoreChipText}>{score}</Text>
            </View>
            {playMode === 'multi' && opponentName ? (
              <View
                style={[
                  styles.opponentChip,
                  opponentAlive ? styles.aliveChip : styles.deadChip,
                ]}>
                <View style={styles.opponentAvatarWrap}>
                  {opponentAvatar ? (
                    isSvgAvatar(opponentAvatar) ? (
                      <SvgUri uri={opponentAvatar} width="100%" height="100%" />
                    ) : (
                      <Image
                        source={{ uri: opponentAvatar }}
                        style={styles.opponentAvatarImage}
                      />
                    )
                  ) : null}
                  <View
                    style={[
                      styles.avatarOnlineDot,
                      opponentAlive ? styles.statusAlive : styles.statusDead,
                    ]}
                  />
                </View>
                <View>
                  <Text style={styles.opponentStatusText}>
                    {opponentAlive ? 'Alive' : 'Dead'}
                  </Text>
                  <Text style={styles.opponentScoreText}>{opponentScore}</Text>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      <CrazyBalloonRenderer
        renderState={renderState}
        onPopBalloon={runtime.popBalloon}
      />

      {effect ? (
        <View
          pointerEvents="none"
          style={[
            styles.effectOverlay,
            effect === 'danger_flash' && styles.effectDanger,
            effect === 'victory_flash' && styles.effectVictory,
            effect === 'defeat_flash' && styles.effectDefeat,
            effect === 'score_pulse' && styles.effectScore,
          ]}
        />
      ) : null}

      {livesUsed > 0 && (view === 'playing' || view === 'rescue_quiz') ? (
        <View style={styles.lifeRow}>
          <View style={[styles.lifeDot, livesUsed >= 1 && styles.lifeUsed]} />
          <View style={[styles.lifeDot, livesUsed >= 2 && styles.lifeUsed]} />
        </View>
      ) : null}

      {view === 'menu' ? (
        <View style={styles.overlay}>
          <View style={styles.menuCard}>
            <Text style={styles.menuTitle}>Crazy Balloon</Text>
            <Text style={styles.menuBody}>
              Pop clean balloons as fast as you can. Warning balloons test your focus with a quick rescue question.
            </Text>
            <Pressable
              onPress={startSingle}
              style={[styles.primaryButton, styles.menuActionButton]}>
              <View>
                <Text style={styles.primaryButtonText}>Start Reflex Run</Text>
                <Text style={styles.menuActionMeta}>Tap accuracy</Text>
              </View>
              <View style={styles.menuActionIcon}>
                <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
              </View>
            </Pressable>
            <Pressable
              onPress={() => {
                setOpponentName(null);
                setOpponentAvatar(null);
                awardedStatusRef.current = null;
                runtime.openLobby();
              }}
              style={[
                styles.secondaryButton,
                styles.menuActionButton,
                styles.inviteButton,
              ]}>
              <View>
                <Text style={styles.secondaryButtonText}>Practice Duel</Text>
                <Text style={styles.menuActionMeta}>Local simulation</Text>
              </View>
              <View style={styles.menuActionIcon}>
                <UserPlus size={20} color="#FFFFFF" />
              </View>
            </Pressable>
          </View>
        </View>
      ) : null}

      {view === 'lobby' ? (
        <View style={styles.overlay}>
          <View style={styles.lobbyCard}>
            <View style={styles.lobbyHeader}>
              <Text style={styles.sectionTitle}>Select Opponent</Text>
              <Pressable
                onPress={() => runtime.returnMenu()}
                style={styles.lobbyCloseButton}>
                <X size={16} color="#334155" />
              </Pressable>
            </View>
            <View style={styles.searchWrap}>
              <Search size={16} color="#94A3B8" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by name..."
                placeholderTextColor="#94A3B8"
                style={styles.searchInput}
              />
            </View>
            <ScrollView contentContainerStyle={styles.lobbyList}>
              <Text style={styles.onlineLabel}>Online - {DEFAULT_GRADE}</Text>
              {filteredPlayers.length > 0 ? (
                filteredPlayers.map(player => (
                  <Pressable
                    key={player.id}
                    onPress={() => startMulti(player.name, player.avatar)}
                    style={styles.lobbyRow}>
                    <View style={styles.avatarStub}>
                      {isSvgAvatar(player.avatar) ? (
                        <SvgUri uri={player.avatar} width="100%" height="100%" />
                      ) : (
                        <Image
                          source={{ uri: player.avatar }}
                          style={styles.avatarImage}
                        />
                      )}
                      <View style={styles.avatarOnlineDot} />
                    </View>
                    <View style={styles.lobbyMain}>
                      <Text style={styles.lobbyTitle}>{player.name}</Text>
                      <Text style={styles.lobbyMeta}>{player.rank} pts</Text>
                    </View>
                    <Text style={styles.challengeText}>Challenge</Text>
                  </Pressable>
                ))
              ) : (
                <View style={styles.emptyLobbyState}>
                  <Text style={styles.emptyLobbyTitle}>No live opponents</Text>
                  <Text style={styles.emptyLobbyBody}>
                    Multiplayer opponents will appear here when live matchmaking is connected.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      ) : null}

      {view === 'rescue_quiz' && quizData ? (
        <View style={styles.overlay}>
          <View style={styles.quizCard}>
            <View style={styles.quizMeter}>
              <View
                style={[
                  styles.quizMeterFill,
                  { width: `${(quizData.timeLeft / 5) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.quizTag}>Warning Balloon</Text>
            <Text style={styles.quizQuestion}>{quizData.q}</Text>
            <View style={styles.quizOptions}>
              {quizData.options.map((option, optionIndex) => (
                <Pressable
                  key={option}
                  onPress={() => answerQuiz(option)}
                  style={styles.quizOption}>
                  <View style={styles.quizOptionMarker}>
                    <Text style={styles.quizOptionMarkerText}>
                      {String.fromCharCode(65 + optionIndex)}
                    </Text>
                  </View>
                  <Text style={styles.quizOptionText}>{option}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.quizTimer}>
              {quizData.timeLeft.toFixed(1)}s remaining
            </Text>
            {playMode === 'multi' && opponentName ? (
              <Text style={styles.quizPressureText}>
                Hurry! {opponentName} is still scoring!
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {view === 'gameover' ? (
        <View style={styles.overlay}>
          <View style={styles.resultCard}>
            <Text style={styles.resultBadge}>Focus</Text>
            <Text style={styles.resultTitle}>Game Over</Text>
            <Text style={styles.resultDetail}>The warning balloon ended the run.</Text>
            <Text style={styles.resultScore}>{score}</Text>
            <Pressable onPress={startSingle} style={styles.primaryButton}>
              <RotateCcw size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {view === 'multi_result' ? (
        <View style={styles.overlay}>
          <View style={styles.resultCard}>
            <Text style={styles.resultBadge}>
              {matchResult === 'win' ? 'Win' : 'Retry'}
            </Text>
            <Text style={styles.resultTitle}>
              {matchResult === 'win' ? 'You Won!' : 'You Lost'}
            </Text>
            <Text style={styles.resultSubtle}>
              You {score} - {opponentScore} {opponentName}
            </Text>
            <Pressable
              onPress={() =>
                opponentName
                  ? startMulti(opponentName, opponentAvatar || undefined)
                  : runtime.returnMenu()
              }
              style={styles.primaryButton}>
              <RotateCcw size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Rematch</Text>
            </Pressable>
            <Pressable
              onPress={() => runtime.returnMenu()}
              style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Main Menu</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E0F2FE' },
  topHud: {
    position: 'absolute',
    top: 10,
    left: 16,
    right: 16,
    zIndex: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftHud: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rightHud: { alignItems: 'flex-end', gap: 8 },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  scoreChip: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreChipText: { color: '#0F172A', fontWeight: '800' },
  opponentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  opponentAvatarWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  opponentAvatarImage: { width: '100%', height: '100%' },
  opponentStatusText: {
    color: '#334155',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  opponentScoreText: { color: '#0F172A', fontSize: 14, fontWeight: '900' },
  aliveChip: { backgroundColor: 'rgba(187,247,208,0.92)' },
  deadChip: { backgroundColor: 'rgba(254,202,202,0.92)' },
  effectOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    marginTop: 56,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  effectDanger: { backgroundColor: 'rgba(239,68,68,0.14)' },
  effectVictory: { backgroundColor: 'rgba(34,197,94,0.12)' },
  effectDefeat: { backgroundColor: 'rgba(127,29,29,0.16)' },
  effectScore: { backgroundColor: 'rgba(37,99,235,0.08)' },
  lifeRow: {
    position: 'absolute',
    top: 56,
    left: 24,
    flexDirection: 'row',
    gap: 6,
    zIndex: 13,
  },
  lifeRowInline: { flexDirection: 'row', gap: 6 },
  lifeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  lifeAvailable: { backgroundColor: '#22C55E' },
  lifeUsed: { backgroundColor: '#EF4444' },
  statusAlive: { backgroundColor: '#22C55E' },
  statusDead: { backgroundColor: '#EF4444' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  menuCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    gap: 14,
  },
  menuTitle: {
    color: '#0F172A',
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
  },
  menuBody: { color: '#475569', textAlign: 'center', lineHeight: 21 },
  primaryButton: {
    backgroundColor: '#2563EB',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  secondaryButton: {
    backgroundColor: '#E2E8F0',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButtonText: { color: '#0F172A', fontWeight: '800', fontSize: 16 },
  menuActionButton: {
    minHeight: 84,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  menuActionMeta: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  menuActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteButton: { backgroundColor: '#A855F7' },
  lobbyCard: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '82%',
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 20,
    gap: 12,
  },
  sectionTitle: { color: '#0F172A', fontSize: 22, fontWeight: '800' },
  lobbyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lobbyCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 2,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: '#0F172A',
    fontWeight: '600',
  },
  lobbyList: { gap: 10, paddingBottom: 8 },
  emptyLobbyState: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    gap: 8,
    marginTop: 4,
    paddingHorizontal: 18,
    paddingVertical: 24,
  },
  emptyLobbyTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyLobbyBody: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  onlineLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  lobbyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 12,
  },
  avatarStub: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#DBEAFE',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarOnlineDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  lobbyMain: { flex: 1 },
  lobbyTitle: { color: '#0F172A', fontWeight: '800' },
  lobbyMeta: { color: '#64748B', fontSize: 12, fontWeight: '600' },
  challengeText: { color: '#7C3AED', fontWeight: '800' },
  quizCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    gap: 14,
  },
  quizMeter: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  quizMeterFill: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#22C55E',
  },
  quizTag: {
    color: '#B91C1C',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  quizQuestion: {
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
  },
  quizOptions: { gap: 12 },
  quizOption: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 62,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  quizOptionMarker: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  quizOptionMarkerText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '900',
  },
  quizOptionText: { color: '#0F172A', flex: 1, fontSize: 16, fontWeight: '800', lineHeight: 22 },
  quizTimer: { color: '#64748B', textAlign: 'center', fontWeight: '700' },
  quizPressureText: {
    color: '#FCA5A5',
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
  },
  resultCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 24,
    gap: 12,
    alignItems: 'center',
  },
  resultBadge: {
    backgroundColor: '#DBEAFE',
    borderRadius: 999,
    color: '#1D4ED8',
    fontSize: 14,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 8,
    textTransform: 'uppercase',
  },
  resultTitle: {
    color: '#0F172A',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  resultDetail: { color: '#64748B', fontWeight: '600', textAlign: 'center' },
  resultScore: { color: '#2563EB', fontSize: 50, fontWeight: '900' },
  resultSubtle: { color: '#64748B', fontWeight: '700', textAlign: 'center' },
});
