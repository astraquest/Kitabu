import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import type { LearningVisualSpec } from '../../types';
import { ObjectCluster } from './ObjectCluster';
import { SceneFrame } from './SceneFrame';
import { sceneTheme } from './sceneTheme';

type MarketSpec = Extract<LearningVisualSpec, { kind: 'market' }>;

export function MarketScene({ spec }: { spec: MarketSpec }) {
  return (
    <SceneFrame accessibilityLabel={spec.caption} sceneKey={`market-${spec.caption}`} tone="cream">
      <View style={styles.scene}>
        <Svg height="48" viewBox="0 0 320 48" width="100%">
          <Rect fill={sceneTheme.ink} height="10" rx="5" width="286" x="17" y="3" />
          <Path d="M24 13 H296 L286 38 H34Z" fill={sceneTheme.coral} />
          <Path d="M24 13 H62 L58 38 H34Z M100 13 H138 L137 38 H96Z M176 13 H214 L218 38 H177Z M252 13 H296 L286 38 H258Z" fill="#FFF2D0" />
          <Path d="M34 38 Q48 51 62 38 Q79 51 96 38 Q117 51 137 38 Q157 51 177 38 Q198 51 218 38 Q238 51 258 38 Q272 51 286 38Z" fill={sceneTheme.coral} />
        </Svg>
        <View style={styles.stall}>
          {spec.items.map((item, index) => (
            <View key={`${item.object}-${index}`} style={styles.product}>
              <ObjectCluster count={item.count} kind={item.object} size="compact" />
              {typeof item.price === 'number' ? (
                <View style={styles.priceTag}>
                  <Text style={styles.currency}>KSh</Text><Text style={styles.price}>{item.price}</Text>
                </View>
              ) : null}
              <Text numberOfLines={2} style={styles.label}>{item.label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.counter}><View style={styles.counterStripe} /></View>
      </View>
    </SceneFrame>
  );
}

const styles = StyleSheet.create({
  counter: { backgroundColor: '#B86A3A', borderRadius: 5, height: 17, marginHorizontal: 13, marginTop: -3, overflow: 'hidden' },
  counterStripe: { backgroundColor: '#E99A59', height: 5, marginTop: 4 },
  currency: { color: '#9A4E16', fontSize: 8, fontWeight: '900' },
  label: { color: sceneTheme.mutedInk, fontSize: 9, fontWeight: '800', lineHeight: 11, minHeight: 21, textAlign: 'center' },
  price: { color: '#76370F', fontSize: 14, fontWeight: '900' },
  priceTag: { alignItems: 'baseline', backgroundColor: '#FFE69B', borderRadius: 7, flexDirection: 'row', gap: 2, marginTop: 1, paddingHorizontal: 6, paddingVertical: 2, transform: [{ rotate: '-2deg' }] },
  product: { alignItems: 'center', flex: 1, justifyContent: 'flex-end', minWidth: 75 },
  scene: { minHeight: 148 },
  stall: { backgroundColor: '#FFFFFF', borderColor: '#EBCDA9', borderTopWidth: 0, borderWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginHorizontal: 13, minHeight: 92, padding: 7 },
});
