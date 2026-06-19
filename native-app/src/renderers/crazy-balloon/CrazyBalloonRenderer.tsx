import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CrazyBalloonRenderState } from './mapCrazyBalloonRenderState';

interface CrazyBalloonRendererProps {
  renderState: CrazyBalloonRenderState;
  onPopBalloon: (id: number) => void;
}

export function CrazyBalloonRenderer({
  renderState,
  onPopBalloon,
}: CrazyBalloonRendererProps) {
  return (
    <View style={styles.playfield}>
      <View style={styles.sun} />
      <View style={styles.cloud} />
      <View style={[styles.cloud, styles.cloudTwo]} />
      <View style={[styles.hill, styles.backHill]} />
      <View style={styles.hill} />

      {renderState.balloons.map(balloon => (
        <Pressable
          key={balloon.id}
          onPress={() => onPopBalloon(balloon.id)}
          style={[
            styles.balloon,
            {
              left: `${balloon.leftPct}%`,
              bottom: `${balloon.bottomPct}%`,
              backgroundColor: balloon.color,
            },
            balloon.label === 'hazard' && styles.hazardBalloon,
          ]}>
          <View style={styles.balloonShine} />
          {balloon.label === 'hazard' ? (
            <Text style={styles.hazardMark}>!</Text>
          ) : null}
          <View style={styles.balloonKnot} />
          <View style={styles.balloonString} />
        </Pressable>
      ))}

      {renderState.showHint ? (
        <View style={styles.hintCard}>
          <Text style={styles.hintTitle}>Pop to Score</Text>
          <Text style={styles.hintBody}>
            Tap clean balloons quickly. Warning balloons trigger a rescue question.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  playfield: {
    flex: 1,
    marginTop: 56,
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#7DD3FC',
  },
  sun: {
    position: 'absolute',
    top: 24,
    right: 28,
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FACC15',
  },
  cloud: {
    position: 'absolute',
    top: 58,
    left: 36,
    width: 92,
    height: 42,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.76)',
  },
  cloudTwo: { top: 120, left: 220, width: 110 },
  hill: {
    position: 'absolute',
    left: -40,
    right: -40,
    bottom: -18,
    height: 150,
    borderTopLeftRadius: 120,
    borderTopRightRadius: 120,
    backgroundColor: '#22C55E',
  },
  backHill: {
    bottom: 42,
    left: 80,
    right: -80,
    height: 118,
    backgroundColor: '#4ADE80',
  },
  balloon: {
    position: 'absolute',
    width: 58,
    height: 72,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  hazardBalloon: {
    borderColor: 'rgba(15,23,42,0.5)',
    borderWidth: 3,
  },
  balloonShine: {
    position: 'absolute',
    left: 14,
    top: 12,
    width: 14,
    height: 22,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.42)',
  },
  hazardMark: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
  },
  balloonKnot: {
    position: 'absolute',
    bottom: -5,
    width: 12,
    height: 10,
    borderRadius: 3,
    backgroundColor: 'rgba(15,23,42,0.24)',
    transform: [{ rotate: '45deg' }],
  },
  balloonString: {
    position: 'absolute',
    bottom: -30,
    width: 2,
    height: 28,
    backgroundColor: 'rgba(15,23,42,0.22)',
  },
  hintCard: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 28,
    backgroundColor: 'rgba(15,23,42,0.72)',
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  hintTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  hintBody: { color: '#E2E8F0', lineHeight: 21 },
});
