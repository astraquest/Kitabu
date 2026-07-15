import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { LearningCard } from '../../types';
import { ConceptIllustration } from './ConceptIllustration';
import { sceneTheme } from './sceneTheme';

const ACCENTS = {
  blue: { edge: '#4F7CE8', soft: '#E7EFFF' },
  green: { edge: '#2F9A78', soft: '#E2F7EF' },
  gold: { edge: '#D79A16', soft: '#FFF3C8' },
  coral: { edge: '#E36362', soft: '#FFE8E7' },
  purple: { edge: '#7457D9', soft: '#EEE9FF' },
  neutral: { edge: '#7890A8', soft: '#EDF3F7' },
} as const;

export function LearningCardTile({
  card,
  compact = false,
}: {
  card: LearningCard;
  compact?: boolean;
}) {
  const accent = ACCENTS[card.accent ?? 'neutral'];
  const stateLabel =
    card.state === 'selected'
      ? 'SELECTED'
      : card.state === 'warning'
      ? 'CHECK THIS'
      : null;

  return (
    <View
      style={[
        styles.card,
        compact && styles.compact,
        { backgroundColor: accent.soft, borderColor: accent.edge },
        card.state === 'muted' && styles.muted,
        card.state === 'selected' && styles.selected,
        card.state === 'warning' && styles.warning,
      ]}
    >
      <View style={[styles.notch, { backgroundColor: accent.edge }]} />
      <View style={styles.artwork}>
        <ConceptIllustration
          context="card"
          label={`${card.label} ${card.detail ?? ''}`}
          size={compact ? 32 : 42}
        />
      </View>
      <Text
        numberOfLines={compact ? 2 : 3}
        style={[styles.label, compact && styles.compactLabel]}
      >
        {card.label}
      </Text>
      {card.detail ? (
        <Text numberOfLines={2} style={styles.detail}>
          {card.detail}
        </Text>
      ) : null}
      {stateLabel ? (
        <Text style={[styles.state, { color: accent.edge }]}>{stateLabel}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    borderRadius: 17,
    borderWidth: 1.5,
    elevation: 2,
    justifyContent: 'center',
    minHeight: 72,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 10,
    shadowColor: sceneTheme.shadow,
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 6,
  },
  artwork: { marginBottom: 2 },
  compact: { minHeight: 58, paddingHorizontal: 8, paddingVertical: 7 },
  compactLabel: { fontSize: 12, lineHeight: 15 },
  detail: {
    color: sceneTheme.mutedInk,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 13,
    marginTop: 3,
    textAlign: 'center',
  },
  label: {
    color: sceneTheme.ink,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 18,
    textAlign: 'center',
  },
  muted: { opacity: 0.48 },
  notch: { height: 4, left: 13, position: 'absolute', right: 13, top: 0 },
  selected: { borderWidth: 2.5, transform: [{ translateY: -2 }] },
  state: { fontSize: 8, fontWeight: '900', letterSpacing: 0.8, marginTop: 4 },
  warning: { borderStyle: 'dashed' },
});
