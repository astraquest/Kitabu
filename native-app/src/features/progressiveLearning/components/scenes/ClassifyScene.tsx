import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { LearningVisualSpec } from '../../types';
import { LearningCardTile } from './LearningCardTile';
import { SceneFrame } from './SceneFrame';
import { sceneTheme } from './sceneTheme';

type ClassifySpec = Extract<LearningVisualSpec, { kind: 'classify' }>;

const BUCKETS = [
  { body: '#DDE9FF', edge: '#4F7CE8' },
  { body: '#DDF7F1', edge: '#2F9A78' },
  { body: '#FFF1C4', edge: '#D49A22' },
  { body: '#FFE4E2', edge: '#DF6663' },
] as const;

export function ClassifyScene({ spec }: { spec: ClassifySpec }) {
  return (
    <SceneFrame
      accessibilityLabel={spec.caption}
      sceneKey={`classify-${spec.caption}`}
      tone="mint"
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>NOTICE • COMPARE • SORT</Text>
        <Svg height="18" viewBox="0 0 120 18" width="120">
          <Path
            d="M2 4 Q26 16 48 5 T92 5"
            fill="none"
            stroke={sceneTheme.orange}
            strokeDasharray="4 4"
            strokeLinecap="round"
            strokeWidth="3"
          />
          <Path d="M89 1 L104 6 L92 15Z" fill={sceneTheme.orange} />
        </Svg>
      </View>
      <View style={styles.buckets}>
        {spec.buckets.map((bucket, index) => {
          const palette = BUCKETS[index % BUCKETS.length];
          return (
            <View
              key={bucket.id}
              style={[
                styles.bucket,
                { backgroundColor: palette.body, borderColor: palette.edge },
              ]}
            >
              <View
                style={[styles.bucketRim, { backgroundColor: palette.edge }]}
              />
              <View style={[styles.handle, { borderColor: palette.edge }]} />
              <Text numberOfLines={2} style={styles.bucketLabel}>
                {bucket.label}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>SORT THESE</Text>
        <View style={styles.dividerLine} />
      </View>
      <View style={styles.items}>
        {spec.items.map(item => (
          <View key={item.id} style={styles.item}>
            <LearningCardTile card={item} compact />
          </View>
        ))}
      </View>
    </SceneFrame>
  );
}

const styles = StyleSheet.create({
  bucket: {
    alignItems: 'center',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    borderTopWidth: 0,
    borderWidth: 2,
    flexBasis: 62,
    flexGrow: 1,
    justifyContent: 'center',
    maxWidth: 108,
    minHeight: 61,
    paddingHorizontal: 5,
    paddingTop: 10,
    position: 'relative',
  },
  bucketLabel: {
    color: sceneTheme.ink,
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 13,
    textAlign: 'center',
  },
  bucketRim: {
    borderRadius: 999,
    height: 7,
    left: -5,
    position: 'absolute',
    right: -5,
    top: -3,
  },
  buckets: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginHorizontal: 3,
    marginTop: 6,
  },
  divider: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    marginVertical: 9,
  },
  dividerLine: { backgroundColor: sceneTheme.border, flex: 1, height: 1 },
  dividerText: {
    color: sceneTheme.mutedInk,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  eyebrow: {
    color: sceneTheme.ink,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  handle: {
    borderBottomWidth: 0,
    borderRadius: 999,
    borderWidth: 2,
    height: 17,
    position: 'absolute',
    top: -13,
    width: 36,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  item: { flexBasis: '45%', flexGrow: 1, maxWidth: '49%' },
  items: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    justifyContent: 'center',
  },
});
