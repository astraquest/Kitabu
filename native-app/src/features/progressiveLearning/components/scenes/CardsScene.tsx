import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import type { LearningVisualSpec } from '../../types';
import { LearningCardTile } from './LearningCardTile';
import { SceneFrame } from './SceneFrame';

type CardsSpec = Extract<LearningVisualSpec, { kind: 'cards' }>;

export function CardsScene({
  spec,
}: {
  spec: CardsSpec;
}) {
  return (
    <SceneFrame
      accessibilityLabel={spec.caption}
      sceneKey={`cards-${spec.caption}`}
      tone="cream"
    >
      <View
        style={[
          styles.cards,
          spec.layout === 'row' && styles.row,
          spec.layout === 'stack' && styles.stack,
        ]}
      >
        {spec.cards.map((card, index) => {
          return (
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
          );
        })}
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
