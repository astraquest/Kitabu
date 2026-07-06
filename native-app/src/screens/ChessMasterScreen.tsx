import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Chess, Square } from 'chess.js';
import { ArrowLeft, Crown, RefreshCw, Swords, Users } from 'lucide-react-native';

import {
  ChessMatch,
  ChessMove,
  ChessOpponent,
  createChessMatch,
  getChessMatches,
  getChessMoves,
  getChessOpponents,
  submitChessMove,
} from '../services/chessService';

const chessIcon = require('../assets/game-icons/chess-master.png');

const PIECES: Record<string, string> = {
  wp: '♙',
  wn: '♘',
  wb: '♗',
  wr: '♖',
  wq: '♕',
  wk: '♔',
  bp: '♟',
  bn: '♞',
  bb: '♝',
  br: '♜',
  bq: '♛',
  bk: '♚',
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'];

interface ChessMasterScreenProps {
  currentUserId: string;
  onBack: () => void;
}

function formatRoleLabel(roles: string[]) {
  if (roles.includes('student')) return 'Student';
  if (roles.includes('teacher')) return 'Teacher';
  if (roles.includes('parent')) return 'Parent';
  if (roles.includes('school_admin')) return 'School Admin';
  return 'Player';
}

function getBoardSquares(playerColor: 'white' | 'black') {
  const ranks = playerColor === 'white' ? [...RANKS].reverse() : RANKS;
  const files = playerColor === 'white' ? FILES : [...FILES].reverse();
  return ranks.flatMap(rank => files.map(file => `${file}${rank}` as Square));
}

function describeResult(match: ChessMatch, currentUserId: string) {
  if (match.status !== 'completed') {
    return match.turnUserId === currentUserId ? 'Your move' : `${match.opponent.name}'s move`;
  }
  if (!match.winnerUserId) {
    return `Draw${match.result ? ` by ${match.result.replace(/_/g, ' ')}` : ''}`;
  }
  return match.winnerUserId === currentUserId ? 'You won' : `${match.opponent.name} won`;
}

export function ChessMasterScreen({ currentUserId, onBack }: ChessMasterScreenProps) {
  const [opponents, setOpponents] = useState<ChessOpponent[]>([]);
  const [matches, setMatches] = useState<ChessMatch[]>([]);
  const [moves, setMoves] = useState<ChessMove[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedMatch = matches.find(match => match.id === selectedMatchId) ?? matches[0] ?? null;
  const chess = useMemo(
    () => new Chess(selectedMatch?.currentFen),
    [selectedMatch?.currentFen],
  );
  const boardSquares = useMemo(
    () => getBoardSquares(selectedMatch?.playerColor ?? 'white'),
    [selectedMatch?.playerColor],
  );
  const legalTargets = useMemo(() => {
    if (!selectedSquare || !selectedMatch || selectedMatch.turnUserId !== currentUserId) {
      return new Set<string>();
    }
    return new Set(chess.moves({ square: selectedSquare, verbose: true }).map(move => move.to));
  }, [chess, currentUserId, selectedMatch, selectedSquare]);

  async function refresh({ silent = false } = {}) {
    if (!silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const [nextOpponents, nextMatches] = await Promise.all([
        getChessOpponents(),
        getChessMatches(),
      ]);
      setOpponents(nextOpponents);
      setMatches(nextMatches);
      if (!selectedMatchId && nextMatches[0]) {
        setSelectedMatchId(nextMatches[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load Chess Master.');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    refresh().catch(() => undefined);
    const timer = setInterval(() => {
      refresh({ silent: true }).catch(() => undefined);
    }, 8000);
    return () => clearInterval(timer);
    // selectedMatchId is intentionally excluded so polling does not reset the timer on selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedMatch?.id) {
      setMoves([]);
      return;
    }
    getChessMoves(selectedMatch.id)
      .then(setMoves)
      .catch(() => setMoves([]));
  }, [selectedMatch?.id, selectedMatch?.updatedAt]);

  async function startDuel(opponent: ChessOpponent) {
    setBusy(true);
    setError(null);
    try {
      const match = await createChessMatch(opponent.id);
      setMatches(current => [match, ...current.filter(item => item.id !== match.id)]);
      setSelectedMatchId(match.id);
      setSelectedSquare(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the duel.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSquarePress(square: Square) {
    if (!selectedMatch || selectedMatch.status !== 'active') {
      return;
    }
    if (selectedMatch.turnUserId !== currentUserId) {
      setError('Wait for your opponent to move.');
      return;
    }

    const piece = chess.get(square);
    const ownTurnColor = chess.turn();

    if (!selectedSquare) {
      if (piece?.color === ownTurnColor) {
        setSelectedSquare(square);
      }
      return;
    }

    if (selectedSquare === square) {
      setSelectedSquare(null);
      return;
    }

    if (piece?.color === ownTurnColor) {
      setSelectedSquare(square);
      return;
    }

    const preview = new Chess(selectedMatch.currentFen);
    const move = preview.move({ from: selectedSquare, to: square, promotion: 'q' });
    if (!move) {
      setError('That move is not legal.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const result = await submitChessMove(selectedMatch.id, {
        from: selectedSquare,
        to: square,
        promotion: 'q',
      });
      setMatches(current =>
        current.map(match => (match.id === result.match.id ? result.match : match)),
      );
      setMoves(current => [...current, result.move]);
      setSelectedSquare(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Move rejected.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <ArrowLeft color="#9A3412" size={22} strokeWidth={2.6} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Image source={chessIcon} style={styles.headerIcon} />
          <View>
            <Text style={styles.eyebrow}>Live Duel</Text>
            <Text style={styles.title}>Chess Master</Text>
          </View>
        </View>
        <Pressable onPress={() => refresh()} style={styles.refreshButton} disabled={busy}>
          <RefreshCw color="#0F172A" size={18} strokeWidth={2.4} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#15803D" />
          <Text style={styles.muted}>Loading online players...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Users color="#15803D" size={18} strokeWidth={2.5} />
              <Text style={styles.sectionTitle}>Online Players</Text>
            </View>
            <Text style={styles.countText}>{opponents.length} online</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.opponentList}>
            {opponents.length ? (
              opponents.map(opponent => (
                <Pressable
                  key={opponent.id}
                  onPress={() => startDuel(opponent)}
                  disabled={busy}
                  style={({ pressed }) => [styles.opponentCard, pressed && styles.pressed]}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>
                      {opponent.name
                        .split(' ')
                        .map(part => part[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.opponentName} numberOfLines={1}>
                    {opponent.name}
                  </Text>
                  <Text style={styles.opponentMeta} numberOfLines={1}>
                    {opponent.grade || formatRoleLabel(opponent.roles)}
                  </Text>
                  <View style={styles.duelPill}>
                    <Swords color="#FFFFFF" size={13} strokeWidth={2.6} />
                    <Text style={styles.duelPillText}>Duel</Text>
                  </View>
                </Pressable>
              ))
            ) : (
              <View style={styles.emptyOpponents}>
                <Text style={styles.emptyTitle}>No online opponents yet</Text>
                <Text style={styles.emptyText}>Keep this screen open and refresh when classmates come online.</Text>
              </View>
            )}
          </ScrollView>

          {selectedMatch ? (
            <View style={styles.matchPanel}>
              <View style={styles.matchTopRow}>
                <View>
                  <Text style={styles.matchEyebrow}>Current Match</Text>
                  <Text style={styles.matchTitle}>vs {selectedMatch.opponent.name}</Text>
                </View>
                <View style={styles.turnBadge}>
                  <Crown color="#EA580C" size={14} strokeWidth={2.6} />
                  <Text style={styles.turnBadgeText}>{describeResult(selectedMatch, currentUserId)}</Text>
                </View>
              </View>

              <View style={styles.board}>
                {boardSquares.map(square => {
                  const piece = chess.get(square);
                  const isSelected = selectedSquare === square;
                  const isLegal = legalTargets.has(square);
                  const fileIndex = FILES.indexOf(square[0]);
                  const rankIndex = RANKS.indexOf(square[1]);
                  const isLight = (fileIndex + rankIndex) % 2 === 0;

                  return (
                    <Pressable
                      key={square}
                      onPress={() => handleSquarePress(square)}
                      style={[
                        styles.square,
                        isLight ? styles.lightSquare : styles.darkSquare,
                        isSelected && styles.selectedSquare,
                        isLegal && styles.legalSquare,
                      ]}>
                      <Text
                        style={[
                          styles.piece,
                          piece?.color === 'w' ? styles.whitePiece : styles.blackPiece,
                        ]}>
                        {piece ? PIECES[`${piece.color}${piece.type}`] : ''}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.movesPanel}>
                <Text style={styles.movesTitle}>Recent Moves</Text>
                <Text style={styles.movesText}>
                  {moves.length ? moves.slice(-8).map(move => move.san).join('  ') : 'No moves yet.'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyMatch}>
              <Text style={styles.emptyTitle}>Start a Chess Master duel</Text>
              <Text style={styles.emptyText}>Choose any online user above and play a live two-player match.</Text>
            </View>
          )}

          {matches.length > 1 ? (
            <View style={styles.matchesList}>
              <Text style={styles.sectionTitle}>Your Matches</Text>
              {matches.map(match => (
                <Pressable
                  key={match.id}
                  onPress={() => {
                    setSelectedMatchId(match.id);
                    setSelectedSquare(null);
                  }}
                  style={[
                    styles.matchRow,
                    selectedMatch?.id === match.id && styles.matchRowActive,
                  ]}>
                  <Text style={styles.matchRowTitle}>vs {match.opponent.name}</Text>
                  <Text style={styles.matchRowMeta}>{describeResult(match, currentUserId)}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>
      )}
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
    borderBottomColor: '#FED7AA',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  backButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerTitleWrap: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  headerIcon: {
    borderRadius: 14,
    height: 48,
    width: 48,
  },
  eyebrow: {
    color: '#EA580C',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '900',
  },
  refreshButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  content: {
    gap: 18,
    padding: 18,
    paddingBottom: 36,
  },
  loadingWrap: {
    alignItems: 'center',
    flex: 1,
    gap: 10,
    justifyContent: 'center',
  },
  muted: {
    color: '#64748B',
    fontWeight: '700',
  },
  errorText: {
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    color: '#B91C1C',
    fontWeight: '800',
    padding: 12,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
  },
  countText: {
    color: '#15803D',
    fontWeight: '900',
  },
  opponentList: {
    gap: 12,
    paddingRight: 18,
  },
  opponentCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 22,
    borderWidth: 1,
    gap: 7,
    padding: 14,
    width: 132,
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.98 }],
  },
  avatarCircle: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  avatarText: {
    color: '#15803D',
    fontSize: 17,
    fontWeight: '900',
  },
  opponentName: {
    color: '#0F172A',
    fontWeight: '900',
    maxWidth: 108,
  },
  opponentMeta: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    maxWidth: 108,
  },
  duelPill: {
    alignItems: 'center',
    backgroundColor: '#EA580C',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  duelPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  emptyOpponents: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    width: 270,
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '900',
  },
  emptyText: {
    color: '#64748B',
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 6,
  },
  matchPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 26,
    borderWidth: 1,
    gap: 16,
    padding: 14,
  },
  matchTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  matchEyebrow: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  matchTitle: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '900',
  },
  turnBadge: {
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  turnBadgeText: {
    color: '#9A3412',
    fontSize: 12,
    fontWeight: '900',
  },
  board: {
    alignSelf: 'center',
    aspectRatio: 1,
    borderColor: '#0F172A',
    borderRadius: 18,
    borderWidth: 2,
    flexDirection: 'row',
    flexWrap: 'wrap',
    overflow: 'hidden',
    width: '100%',
  },
  square: {
    alignItems: 'center',
    height: '12.5%',
    justifyContent: 'center',
    width: '12.5%',
  },
  lightSquare: {
    backgroundColor: '#F8E7C7',
  },
  darkSquare: {
    backgroundColor: '#15803D',
  },
  selectedSquare: {
    backgroundColor: '#FDBA74',
  },
  legalSquare: {
    borderColor: '#F97316',
    borderWidth: 2,
  },
  piece: {
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 32,
  },
  whitePiece: {
    color: '#FFFFFF',
    textShadowColor: '#0F172A',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  blackPiece: {
    color: '#111827',
  },
  movesPanel: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 12,
  },
  movesTitle: {
    color: '#0F172A',
    fontWeight: '900',
    marginBottom: 4,
  },
  movesText: {
    color: '#475569',
    fontWeight: '700',
    lineHeight: 20,
  },
  emptyMatch: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  matchesList: {
    gap: 10,
  },
  matchRow: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  matchRowActive: {
    borderColor: '#EA580C',
  },
  matchRowTitle: {
    color: '#0F172A',
    fontWeight: '900',
  },
  matchRowMeta: {
    color: '#64748B',
    fontWeight: '700',
    marginTop: 3,
  },
});
