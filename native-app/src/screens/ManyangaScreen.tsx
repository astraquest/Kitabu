import React, { useEffect, useMemo, useRef } from 'react';
import {
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ArrowLeft, Play, RotateCcw } from 'lucide-react-native';

import { useManyangaRuntime } from '../hooks/useManyangaRuntime';
import { ManyangaRenderer } from '../renderers/manyanga/ManyangaRenderer';
import { mapManyangaRenderState } from '../renderers/manyanga/mapManyangaRenderState';
import { useManyangaEffects } from '../runtime/effects/GameEffectsController';
import { triggerHaptic } from '../services/haptics';

const MAX_RESCUES = 3;
const RESCUE_DURATION_SEC = 5;
const SWIPE_THRESHOLD_PX = 28;

interface ManyangaScreenProps {
  onBack: () => void;
  onAddPoints: (points: number) => void;
}

export function ManyangaScreen({ onAddPoints, onBack }: ManyangaScreenProps) {
  const runtime = useManyangaRuntime();
  const awardedStatusRef = useRef<string | null>(null);
  const { status, rescuesUsed, coins, rescueQuestion, rescueTimeLeftSec } =
    runtime.state;
  const score = Math.floor(runtime.state.scoreFloat);
  const distanceM = Math.floor(runtime.state.distanceM);
  const renderState = useMemo(
    () => mapManyangaRenderState(runtime.state),
    [runtime.state],
  );
  const effect = useManyangaEffects(runtime.events);

  const steerFnRef = useRef(runtime.steer);
  const fieldWidthRef = useRef(Dimensions.get('window').width);
  const swipeHandledRef = useRef(false);

  useEffect(() => {
    steerFnRef.current = runtime.steer;
  }, [runtime.steer]);

  // Swipe left/right to change lanes; a plain tap steers toward the tapped half.
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          swipeHandledRef.current = false;
        },
        onPanResponderMove: (_event, gesture) => {
          if (
            !swipeHandledRef.current &&
            Math.abs(gesture.dx) >= SWIPE_THRESHOLD_PX &&
            Math.abs(gesture.dx) > Math.abs(gesture.dy)
          ) {
            swipeHandledRef.current = true;
            steerFnRef.current(gesture.dx < 0 ? 'left' : 'right');
          }
        },
        onPanResponderRelease: (event, gesture) => {
          if (swipeHandledRef.current) {
            return;
          }
          if (
            Math.abs(gesture.dx) >= SWIPE_THRESHOLD_PX &&
            Math.abs(gesture.dx) > Math.abs(gesture.dy)
          ) {
            steerFnRef.current(gesture.dx < 0 ? 'left' : 'right');
            return;
          }
          steerFnRef.current(
            event.nativeEvent.pageX < fieldWidthRef.current / 2
              ? 'left'
              : 'right',
          );
        },
      }),
    [],
  );

  useEffect(() => {
    if (runtime.events.length === 0) {
      return;
    }
    const latest = runtime.events[runtime.events.length - 1];
    if (latest.type === 'crashed' || latest.type === 'game_over') {
      triggerHaptic('error');
    } else if (latest.type === 'rescued') {
      triggerHaptic('success');
    }
  }, [runtime.events]);

  useEffect(() => {
    const statusKey = `${status}:${score}:${distanceM}`;
    if (status === 'gameover' && awardedStatusRef.current !== statusKey) {
      onAddPoints(score);
      awardedStatusRef.current = statusKey;
    }
  }, [distanceM, onAddPoints, score, status]);

  function startRun() {
    awardedStatusRef.current = null;
    runtime.start();
  }

  const timeRatio = Math.max(0, rescueTimeLeftSec / RESCUE_DURATION_SEC);

  return (
    <View style={styles.root}>
      <ManyangaRenderer renderState={renderState} />

      {status === 'playing' ? (
        <View
          style={styles.steerLayer}
          onLayout={event => {
            fieldWidthRef.current = event.nativeEvent.layout.width;
          }}
          {...panResponder.panHandlers}
        />
      ) : null}

      <View style={styles.topHud} pointerEvents="box-none">
        <Pressable onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={24} color="#0F172A" />
        </Pressable>
        {status !== 'menu' ? (
          <View style={styles.rightHud} pointerEvents="none">
            <Text style={styles.scoreText}>{score}</Text>
            <View style={styles.coinChip}>
              <View style={styles.coinDot} />
              <Text style={styles.coinChipText}>{coins}</Text>
            </View>
            <Text style={styles.speedText}>{renderState.speedKmh} km/h</Text>
            <View style={styles.rescueRow}>
              {[0, 1, 2].map(index => (
                <View
                  key={index}
                  style={[
                    styles.rescueDot,
                    index < rescuesUsed && styles.rescueDotUsed,
                  ]}
                />
              ))}
            </View>
          </View>
        ) : null}
      </View>

      {effect ? (
        <View
          pointerEvents="none"
          style={[
            styles.effectOverlay,
            effect === 'danger_flash' && styles.effectDanger,
            effect === 'victory_flash' && styles.effectVictory,
            effect === 'defeat_flash' && styles.effectDefeat,
          ]}
        />
      ) : null}

      {status === 'menu' ? (
        <View style={styles.overlay}>
          <View style={styles.menuCard}>
            <Text style={styles.menuTitle}>MANYANGA!</Text>
            <Text style={styles.menuSubtitle}>
              Race matatus through Nairobi streets
            </Text>
            <Text style={styles.menuBody}>
              Swipe or tap left and right to change lanes. Dodge traffic, grab
              coins, and rack up points the further you go.
            </Text>
            <View style={styles.menuRules}>
              <Text style={styles.menuRulesText}>
                Crash? Answer a question in 5 seconds to keep racing. You get{' '}
                {MAX_RESCUES} rescues per run.
              </Text>
            </View>
            <Pressable onPress={startRun} style={styles.primaryButton}>
              <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Start Racing</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {status === 'rescue_quiz' && rescueQuestion ? (
        <View style={styles.rescueOverlay}>
          <View style={styles.glassCard}>
            <View style={styles.glassSheen} pointerEvents="none" />
            <View style={styles.rescueMeter}>
              <View
                style={[
                  styles.rescueMeterFill,
                  { width: `${timeRatio * 100}%` },
                  rescueTimeLeftSec <= 2 && styles.rescueMeterUrgent,
                ]}
              />
            </View>
            <Text style={styles.rescueTag}>
              🚨 CRASH! Answer to keep racing
            </Text>
            <Text style={styles.rescueCount}>
              Rescue {Math.min(rescuesUsed + 1, MAX_RESCUES)} of {MAX_RESCUES}
            </Text>
            <Text style={styles.rescueQuestion}>{rescueQuestion.prompt}</Text>
            <View style={styles.rescueOptions}>
              {rescueQuestion.options.map((option, optionIndex) => (
                <Pressable
                  key={option}
                  onPress={() => runtime.answerRescue(option)}
                  style={styles.rescueOption}>
                  <View style={styles.rescueOptionMarker}>
                    <Text style={styles.rescueOptionMarkerText}>
                      {String.fromCharCode(65 + optionIndex)}
                    </Text>
                  </View>
                  <Text style={styles.rescueOptionText}>{option}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.rescueTimer}>
              {rescueTimeLeftSec.toFixed(1)}s remaining
            </Text>
          </View>
        </View>
      ) : null}

      {status === 'gameover' ? (
        <View style={styles.overlay}>
          <View style={styles.resultCard}>
            <Text style={styles.resultBadge}>Race Over</Text>
            <Text style={styles.resultTitle}>Game Over</Text>
            <Text style={styles.resultScore}>{score}</Text>
            <Text style={styles.resultDetail}>
              {distanceM} m raced · {coins} coins collected
            </Text>
            <Text style={styles.resultPoints}>+{score} points earned</Text>
            <Pressable onPress={startRun} style={styles.primaryButton}>
              <RotateCcw size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Play Again</Text>
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
  root: { flex: 1, backgroundColor: '#7DD3FC' },
  steerLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  topHud: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    zIndex: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  rightHud: { alignItems: 'flex-end', gap: 6 },
  scoreText: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '900',
    textShadowColor: 'rgba(15,23,42,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  coinChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15,23,42,0.55)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  coinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FBBF24',
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  coinChipText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
  speedText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '800',
    textShadowColor: 'rgba(15,23,42,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  rescueRow: { flexDirection: 'row', gap: 6 },
  rescueDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  rescueDotUsed: { backgroundColor: '#EF4444' },
  effectOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 8,
  },
  effectDanger: { backgroundColor: 'rgba(239,68,68,0.18)' },
  effectVictory: { backgroundColor: 'rgba(34,197,94,0.14)' },
  effectDefeat: { backgroundColor: 'rgba(127,29,29,0.2)' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 20,
  },
  menuCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    gap: 12,
    alignItems: 'center',
  },
  menuTitle: {
    color: '#EA580C',
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 1,
  },
  menuSubtitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  menuBody: { color: '#475569', textAlign: 'center', lineHeight: 21 },
  menuRules: {
    backgroundColor: '#FFF7ED',
    borderRadius: 16,
    padding: 12,
  },
  menuRulesText: {
    color: '#9A3412',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 19,
  },
  primaryButton: {
    alignSelf: 'stretch',
    backgroundColor: '#EA580C',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  secondaryButton: {
    alignSelf: 'stretch',
    backgroundColor: '#E2E8F0',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { color: '#0F172A', fontWeight: '800', fontSize: 16 },
  rescueOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 20,
  },
  glassCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
    borderRadius: 28,
    padding: 22,
    gap: 12,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  glassSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '46%',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  rescueMeter: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  rescueMeterFill: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#22C55E',
  },
  rescueMeterUrgent: { backgroundColor: '#F59E0B' },
  rescueTag: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  rescueCount: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '800',
  },
  rescueQuestion: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
  },
  rescueOptions: { gap: 10 },
  rescueOption: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 58,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  rescueOptionMarker: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderRadius: 10,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  rescueOptionMarkerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  rescueOptionText: {
    color: '#FFFFFF',
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  rescueTimer: {
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    fontWeight: '800',
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
    backgroundColor: '#FFEDD5',
    borderRadius: 999,
    color: '#C2410C',
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
  resultScore: { color: '#EA580C', fontSize: 52, fontWeight: '900' },
  resultDetail: { color: '#64748B', fontWeight: '600', textAlign: 'center' },
  resultPoints: { color: '#16A34A', fontWeight: '800' },
});
