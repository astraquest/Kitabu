import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import type { LearningVisualSpec } from '../../types';
import { LearningCardTile } from './LearningCardTile';
import { SceneFrame } from './SceneFrame';
import { sceneTheme } from './sceneTheme';

type CardsSpec = Extract<LearningVisualSpec, { kind: 'cards' }>;

export function CardsScene({ spec }: { spec: CardsSpec }) {
  return (
    <SceneFrame
      accessibilityLabel={spec.caption}
      sceneKey={`cards-${spec.caption}`}
      tone="cream"
    >
      <View style={styles.header}>
        <Svg height="30" viewBox="0 0 86 30" width="86">
          <Path
            d="M3 21 Q16 4 29 21 T55 21 T81 21"
            fill="none"
            stroke={sceneTheme.orange}
            strokeLinecap="round"
            strokeWidth="5"
          />
          <Circle cx="16" cy="8" fill={sceneTheme.teal} r="5" />
          <Circle cx="43" cy="8" fill={sceneTheme.yellow} r="5" />
          <Circle cx="70" cy="8" fill={sceneTheme.coral} r="5" />
        </Svg>
        <Text style={styles.eyebrow}>DISCOVER THE PATTERN</Text>
      </View>
      {spec.instruction ? (
        <Text style={styles.instruction}>{spec.instruction}</Text>
      ) : null}
      <View
        style={[
          styles.cards,
          spec.layout === 'row' && styles.row,
          spec.layout === 'stack' && styles.stack,
        ]}
      >
        {spec.cards.map((card, index) => (
          <View
            key={card.id}
            style={[
              styles.item,
              spec.layout === 'row' && styles.rowItem,
              spec.layout === 'stack' && styles.stackItem,
              spec.layout === 'stack' &&
                stackCardStyle(index, spec.cards.length),
            ]}
          >
            <LearningCardTile card={card} compact={spec.cards.length > 4} />
          </View>
        ))}
      </View>
    </SceneFrame>
  );
}

function stackCardStyle(index: number, total: number): ViewStyle {
  return {
    marginLeft: index === 0 ? 0 : -18,
    transform: [{ rotate: `${(index - (total - 1) / 2) * 2}deg` }],
  };
}

const styles = StyleSheet.create({
  cards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    minHeight: 132,
  },
  eyebrow: {
    color: sceneTheme.mutedInk,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 4,
  },
  instruction: {
    color: sceneTheme.ink,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  item: { flexBasis: '45%', flexGrow: 1, maxWidth: '49%' },
  row: { flexWrap: 'nowrap' },
  rowItem: { flexBasis: 0, maxWidth: undefined, minWidth: 0 },
  stack: {
    alignItems: 'center',
    flexWrap: 'nowrap',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  stackItem: { flexBasis: 98, flexGrow: 0, maxWidth: 112, minWidth: 78 },
});
